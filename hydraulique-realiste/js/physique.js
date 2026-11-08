/* =====================================================================
   physique.js — Modèle physique d'un circuit hydraulique réel
   ---------------------------------------------------------------------
   Centrale : moteur électrique 1450 tr/min + pompe à engrenages
   (cylindrée fixe, fuites internes fonction de la pression et de la
   viscosité, cavitation si l'aspiration est trop dépressionnaire),
   limiteur de pression à clapet (dynamique du clapet), distributeur 4/3
   à commande électrique (tiroir à retard du 1er ordre, centre fermé ou
   tandem), réducteur de débit unidirectionnel sur la ligne A (contrôle
   de la descente), vérin double effet vertical qui soulève une charge.

   Équations :
   - compressibilité : dp/dt = B / V · ΣQ     (B = module de compressibilité effectif)
   - orifice         : Q = Cd · S · √(2Δp/ρ)   (raccordement laminaire près de Δp = 0)
   - vérin           : m·a = pA·SA − pB·SB − m·g − frottements (Stribeck)
   - huile ISO VG 46 : viscosité fonction de la température
   - thermique       : puissance perdue → échauffement du réservoir
   Unités SI dans le calcul (Pa, m³/s, m, kg) ; affichage en bar, L/min, mm.
   ===================================================================== */

export const BAR = 1e5;
const RHO = 870;               // masse volumique de l'huile (kg/m³)
const CD = 0.65;               // coefficient de débit des orifices
const P_TRANS = 0.6 * BAR;     // transition laminaire / turbulent des orifices
const G = 9.81;

export const CARAC = {
  cylindree: 10e-6,            // m³/tr (10 cm³/tr)
  vitesse: 1450,               // tr/min
  D: 0.050, d: 0.028,          // alésage et tige du vérin (m)
  course: 0.500,               // course (m)
  masseMobile: 28,             // piston + tige + plateau (kg)
  Smax: 11e-6,                 // section maxi d'un passage du distributeur (m²)
  volReservoir: 40,            // litres
  Vtuyau: 0.25e-3,             // volume d'huile dans chaque flexible (m³)
  Vmort: 0.06e-3               // volume mort d'une chambre (m³)
};
export const SA = Math.PI * CARAC.D ** 2 / 4;
export const SB = SA - Math.PI * CARAC.d ** 2 / 4;

export const PANNES = {
  usurePompe:  { nom: 'Pompe usée (fuites internes)', symptome: 'Le vérin ralentit fortement quand la charge augmente ; débit faible à haute pression.', cause: 'Jeux internes de la pompe à engrenages agrandis : rendement volumétrique effondré.', remede: 'Mesurer le débit sous pression (débitmètre), remplacer ou réviser la pompe.' },
  filtreAsp:   { nom: 'Crépine d\'aspiration colmatée', symptome: 'Bruit de cavitation, vacuomètre très bas, débit irrégulier, mousse dans le réservoir.', cause: 'La pompe aspire mal : dépression excessive, l\'huile se vaporise (cavitation).', remede: 'Nettoyer / remplacer la crépine, vérifier le niveau et la viscosité de l\'huile.' },
  limiteur:    { nom: 'Limiteur de pression déréglé (25 bar)', symptome: 'Pression plafonnée vers 25 bar : la charge lourde ne monte pas, l\'huile chauffe.', cause: 'Ressort du limiteur cassé ou vis de réglage desserrée.', remede: 'Contrôler au manomètre, régler le tarage, remplacer le ressort si besoin.' },
  jointPiston: { nom: 'Joint de piston usé', symptome: 'Distributeur au neutre, la charge descend lentement ; pressions A et B s\'égalisent.', cause: 'Fuite interne de la chambre A vers la chambre B à travers le piston.', remede: 'Test de fuite interne, remplacement du kit de joints du vérin.' },
  air:         { nom: 'Air dans l\'huile', symptome: 'Mouvement spongieux, oscillations, à-coups, bruit ; pressions qui ondulent.', cause: 'Prise d\'air à l\'aspiration ou niveau bas : le module de compressibilité chute.', remede: 'Purger le circuit, resserrer les raccords d\'aspiration, compléter le niveau.' },
  refroid:     { nom: 'Refroidisseur en panne', symptome: 'Température qui monte sans arrêt, huile fluide, vitesse qui baisse à chaud.', cause: 'Échangeur encrassé ou ventilateur arrêté : la chaleur n\'est plus évacuée.', remede: 'Nettoyer l\'échangeur, vérifier le ventilateur et le thermostat.' }
};

const borne = (v, a, b) => (v < a ? a : v > b ? b : v);

/* Débit à travers un orifice de section s (m²) sous la différence de pression dp (Pa). */
function orifice(s, dp) {
  if (s <= 0) return 0;
  return CD * s * Math.sqrt(2 / RHO) * dp / Math.sqrt(Math.abs(dp) + P_TRANS);
}
/* Deux orifices en série : section équivalente. */
function serie(s1, s2) {
  if (s1 <= 0 || s2 <= 0) return 0;
  return 1 / Math.sqrt(1 / (s1 * s1) + 1 / (s2 * s2));
}

export class Circuit {
  constructor() {
    this.reglages = {
      moteur: false,
      pTarage: 100,            // bar
      charge: 500,             // kg
      reducteur: 40,           // % d'ouverture du réducteur (descente)
      ouverture: 100,          // % de course maxi du tiroir (commande proportionnelle)
      centre: 'ferme',         // 'ferme' | 'tandem'
      accelThermique: 10
    };
    this.pannes = {};
    for (const k of Object.keys(PANNES)) this.pannes[k] = false;
    this.commande = 0;         // -1 descente, 0 neutre, +1 montée
    this.reinitialiser();
  }

  reinitialiser() {
    this.t = 0;
    this.pP = 0; this.pA = 0; this.pB = 0; this.pT = 0;
    this.x = 0.02; this.v = 0;   // position (m) et vitesse (m/s) de la tige
    this.tiroir = 0;             // position du tiroir -1…+1
    this.clapet = 0;             // ouverture du clapet du limiteur 0…1
    this.n = 0;                  // vitesse du moteur (tr/min)
    this.temp = 32;              // °C
    this.pAsp = 1.0;             // pression absolue à l'aspiration (bar)
    this.qPompe = 0; this.qLim = 0; this.qA = 0; this.qB = 0; this.qT = 0;
    this.remplissage = 1;
    this.puissance = 0; this.pertes = 0;
    this.bute = 0;
    this.cycles = 0;
  }

  /* Viscosité cinématique (cSt) de l'huile ISO VG 46. */
  viscosite() { return 46 * Math.exp(-0.032 * (this.temp - 40)); }

  /* Un pas de simulation physique (dt en secondes). */
  pas(dt) {
    const R = this.reglages, Pn = this.pannes, C = CARAC;
    const nu = this.viscosite();
    const fluidite = 46 / nu;                       // > 1 quand l'huile est chaude
    let B = 1.0e9 * borne(0.6 + 0.4 * this.pP / (100 * BAR), 0.6, 1);   // flexibles + huile
    if (Pn.air) B = 1.2e8 + 0.5e8 * borne(this.pP / (80 * BAR), 0, 1);

    // --- moteur électrique : montée en vitesse ~0,3 s
    const nCible = R.moteur ? C.vitesse * (1 - 0.025 * borne(this.puissance / 5500, 0, 1.4)) : 0;
    this.n += (nCible - this.n) * Math.min(1, dt / (R.moteur ? 0.12 : 0.35));

    // --- pompe : débit théorique, cavitation, fuites internes
    const qTh = C.cylindree * this.n / 60;
    const colmat = Pn.filtreAsp ? 7 : 1;
    const dpAsp = (0.035 + 0.05 * colmat * (qTh / 2.4e-4) ** 2) * (nu / 46) ** 0.5;
    this.pAsp = 1.0 - dpAsp;                        // bar absolus
    const remp = borne((this.pAsp - 0.45) / 0.3, 0.25, 1);
    this.remplissage += (remp - this.remplissage) * Math.min(1, dt / 0.05);
    // fuites internes ≈ 8 % du débit nominal à 100 bar et 40 °C (pompe neuve), ≈ 45 % si usée
    let fuite = (Pn.usurePompe ? 1.1e-11 : 1.9e-12) * fluidite * Math.max(this.pP, 0);
    fuite = Math.min(fuite, qTh * this.remplissage);
    let qPompe = qTh * this.remplissage - fuite;
    if (Pn.filtreAsp && this.remplissage < 0.98) qPompe *= 1 - 0.12 * Math.abs(Math.sin(this.t * 157));
    this.qPompe = Math.max(qPompe, 0);

    // --- limiteur de pression : clapet à ressort, petit amortissement
    const pTar = (Pn.limiteur ? 25 : R.pTarage) * BAR;
    const ouvCible = borne((this.pP - pTar) / (0.12 * pTar + 6 * BAR), 0, 1);
    this.clapet += (ouvCible - this.clapet) * Math.min(1, dt / 0.004);
    const sLim = this.clapet * 1.2e-5;
    this.qLim = orifice(sLim, this.pP - this.pT);

    // --- distributeur 4/3 : tiroir à électroaimants (retard ≈ 35 ms)
    const consigne = this.commande * R.ouverture / 100;
    this.tiroir += (consigne - this.tiroir) * Math.min(1, dt / 0.035);
    const s = this.tiroir, recouv = 0.12;
    const ouv = borne((Math.abs(s) - recouv) / (1 - recouv), 0, 1);
    const S = ouv * C.Smax;
    const sFuiteTiroir = 0.0015e-6 * fluidite;      // fuites du tiroir au neutre
    const sPA = s > 0 ? S : sFuiteTiroir, sBT = s > 0 ? S : sFuiteTiroir;
    const sPB = s < 0 ? S : sFuiteTiroir, sAT = s < 0 ? S : sFuiteTiroir;
    const sPT = R.centre === 'tandem' ? C.Smax * 1.4 * borne(1 - Math.abs(s) / 0.35, 0, 1) : 0;

    // --- réducteur de débit unidirectionnel sur A : libre vers le vérin, freiné au retour
    const sRed = Math.max(R.reducteur / 100, 0.01) * 10e-6;
    const sClapetAR = 30e-6;
    // amortisseurs de fin de course (dernier 18 mm)
    const amortA = this.x < 0.018 ? borne(this.x / 0.018, 0.08, 1) : 1;
    const amortB = C.course - this.x < 0.018 ? borne((C.course - this.x) / 0.018, 0.08, 1) : 1;

    let qPA = 0, qAT = 0;
    if (this.pP >= this.pA) qPA = orifice(serie(sPA, sClapetAR + sRed), this.pP - this.pA);
    else qPA = orifice(serie(sPA, sRed * amortA), this.pP - this.pA);
    qAT = orifice(serie(sAT, sRed * amortA), this.pA - this.pT);
    const qPB = orifice(sPB, this.pP - this.pB);
    const qBT = orifice(serie(sBT, 20e-6 * amortB), this.pB - this.pT);
    const qPT = orifice(sPT, this.pP - this.pT);
    const qFuiteVerin = (Pn.jointPiston ? 6.5e-12 : 2e-14) * fluidite * (this.pA - this.pB);

    // --- vérin : chambres compressibles
    const VA = C.Vtuyau + C.Vmort + SA * this.x;
    const VB = C.Vtuyau + C.Vmort + SB * (C.course - this.x);
    const VP = 0.35e-3;
    const dpP = B / VP * (this.qPompe - this.qLim - qPA - qPB - qPT);
    const dpA = B / VA * (qPA - qAT - qFuiteVerin - SA * this.v);
    const dpB = B / VB * (qPB - qBT + qFuiteVerin + SB * this.v);
    this.pP = Math.max(this.pP + dpP * dt, -0.2 * BAR);
    this.pA = Math.max(this.pA + dpA * dt, -0.9 * BAR);
    this.pB = Math.max(this.pB + dpB * dt, -0.9 * BAR);

    // --- retour réservoir : contre-pression du filtre de retour
    this.qT = qAT + qBT + this.qLim + qPT;
    this.pT += ((0.4 * BAR + 2.5 * BAR * (this.qT / 2.4e-4) ** 2) * (this.qT > 0 ? 1 : 0) - this.pT) * Math.min(1, dt / 0.02);

    // --- mécanique : masse mobile + charge, frottements des joints (Stribeck)
    const m = C.masseMobile + R.charge;
    const fHyd = this.pA * SA - this.pB * SB;
    const fNet = fHyd - m * G;
    const fCoul = 260 + 0.0018 * Math.abs(fHyd), fStat = 1.5 * fCoul, cVisq = 2200;
    if (Math.abs(this.v) < 2e-4 && Math.abs(fNet) <= fStat) {
      this.v = 0;
    } else {
      const sens = Math.abs(this.v) < 2e-4 ? Math.sign(fNet) : Math.sign(this.v);
      const fFrot = sens * (fCoul + (fStat - fCoul) * Math.exp(-Math.abs(this.v) / 0.01)) + cVisq * this.v;
      const vAvant = this.v;
      this.v += (fNet - fFrot) / m * dt;
      if (vAvant !== 0 && Math.sign(this.v) !== Math.sign(vAvant)) this.v = 0;
    }
    this.x += this.v * dt;
    this.bute = 0;
    if (this.x <= 0) { this.x = 0; if (this.v < 0) { this.bute = -1; this.v = 0; } }
    if (this.x >= C.course) { this.x = C.course; if (this.v > 0) { this.bute = 1; this.v = 0; } }

    this.qA = qPA - qAT; this.qB = qPB - qBT;

    // --- énergie et thermique
    this.puissance = Math.max(this.pP, 0) * (this.qPompe + fuite) / 0.88;   // puissance absorbée (W)
    const pUtile = Math.max(fHyd * this.v, 0);
    this.pertes = Math.max(this.puissance - pUtile, 0);
    const capa = C.volReservoir * 0.87 * 1900;           // J/K
    const refroid = Pn.refroid ? 3 : 55;                                     // W/K
    this.temp += (this.pertes - refroid * (this.temp - 28)) / capa * dt * R.accelThermique;
    this.temp = borne(this.temp, 15, 110);

    this.t += dt;
  }

  /* Avance de « duree » secondes avec des sous-pas stables. */
  avancer(duree) {
    const dt = 4e-5;
    const n = Math.min(Math.ceil(duree / dt), 1200);
    for (let i = 0; i < n; i++) this.pas(duree / n);
  }

  /* Grandeurs d'affichage. */
  mesures() {
    const lmin = 6e4;
    return {
      pP: this.pP / BAR, pA: this.pA / BAR, pB: this.pB / BAR, pT: this.pT / BAR,
      x: this.x * 1000, v: this.v * 1000, n: this.n,
      qPompe: this.qPompe * lmin, qLim: this.qLim * lmin, qA: this.qA * lmin, qB: this.qB * lmin,
      qTh: CARAC.cylindree * this.n / 60 * lmin,
      temp: this.temp, nu: this.viscosite(), pAsp: this.pAsp,
      puissance: this.puissance / 1000, pertes: this.pertes / 1000,
      force: (this.pA * SA - this.pB * SB), poids: (CARAC.masseMobile + this.reglages.charge) * G,
      qT: this.qT * lmin, tiroir: this.tiroir, clapet: this.clapet, cavitation: this.remplissage < 0.97,
      rendVol: this.n > 10 ? this.qPompe / (CARAC.cylindree * this.n / 60 * this.remplissage + 1e-12) : 1
    };
  }
}
