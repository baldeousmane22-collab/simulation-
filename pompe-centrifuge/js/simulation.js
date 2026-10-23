/* =====================================================================
   simulation.js — Modèle physique du banc « pompe centrifuge »
   ---------------------------------------------------------------------
   Ce module ne dessine rien : il calcule le point de fonctionnement
   (débit, hauteur), les pressions, la puissance, le rendement, le NPSH
   et les températures à partir des commandes et des pannes actives.

   Hypothèses du modèle (volontairement simples et pédagogiques) :
   - pompe centrifuge monocellulaire, roue fermée Ø 160 mm, 2900 tr/min ;
     courbe H(Q) = H0 × (N/N0)² − a × Q² (lois de similitude) ;
   - puissance absorbée P = (N/N0)³ × (P0 + b × Q × N0/N) : minimale à
     vanne fermée, elle augmente avec le débit ;
   - courbe du réseau : Hréseau = Hgéo + (k_fixe + k_vanne + k_asp) × Q² ;
     le point de fonctionnement est l'intersection des deux courbes ;
   - NPSH disponible = (Patm − Pv)/(ρg) − hauteur d'aspiration − pertes
     d'aspiration ; si NPSHdisp < NPSHrequis, la pompe cavite (hauteur
     qui chute, bruit, vibrations) ;
   - l'eau suit le point de fonctionnement avec un petit retard (inertie
     de la colonne d'eau), le variateur accélère selon une rampe.
   ===================================================================== */

export const CARAC = {
  N0: 2900,            // vitesse nominale (tr/min) à 50 Hz
  H0: 32,              // hauteur à débit nul (m) à N0
  A: 0.015,            // courbe de la pompe : H = H0 − A × Q² (Q en m³/h)
  Q_BEP: 20,           // débit au meilleur rendement (m³/h)
  P0: 0.9,             // puissance absorbée à débit nul (kW) à N0
  B: 0.075,            // pente de la puissance (kW par m³/h)
  P_MOTEUR: 3,         // puissance nominale du moteur (kW)
  I_NOM: 6.1,          // intensité nominale (A) sous 400 V
  H_GEO: 4,            // hauteur géométrique de refoulement (m)
  K_FIXE: 0.008,       // pertes de charge du refoulement (m / (m³/h)²)
  K_ASP: 0.004,        // pertes de charge de l'aspiration (crépine, clapet, coudes)
  K_VANNE: 0.01,       // vanne de refoulement : k = K_VANNE × (1/u² − 1)
  NPSH_R0: 1.2,        // NPSH requis à débit nul (m) à N0
  NPSH_R2: 0.009,      // NPSH requis : + NPSH_R2 × Q²
  RAMPE: 20,           // rampe du variateur (Hz/s)
  PATM_M: 10.33        // pression atmosphérique (m de colonne d'eau)
};

/* Pression de vapeur saturante de l'eau (m de colonne d'eau) selon la température (°C) */
export function pressionVapeur(t) {
  // Formule d'Antoine (eau, 1 à 100 °C), mmHg → m d'eau
  const mmHg = Math.pow(10, 8.07131 - 1730.63 / (233.426 + t));
  return mmHg * 0.0136;
}
const lisser = (ancien, cible, tau, dt) => ancien + (cible - ancien) * Math.min(1, dt / tau);
export const mVersBar = (h) => h * 1000 * 9.81 / 1e5;

/* ---------------------------------------------------------------------
   Courbes (fonctions pures, utilisées aussi pour tracer le graphique)
   --------------------------------------------------------------------- */
/* Hauteur de la pompe (m) pour un débit Q (m³/h) et une vitesse relative n = N/N0 */
export function hauteurPompe(Q, n, usure = 1, sens = 1) {
  const k = sens > 0 ? 1 : 0.45;          // roue tournant à l'envers : ≈ 45 % de la hauteur
  return Math.max(0, k * usure * CARAC.H0 * n * n - CARAC.A / usure * Q * Q);
}
export function puissancePompe(Q, n) {
  if (n <= 0.001) return 0;
  return n * n * n * (CARAC.P0 + CARAC.B * Q / n);
}
export function npshRequis(Q, n) { return CARAC.NPSH_R0 * n * n + CARAC.NPSH_R2 * Q * Q; }
export function coefVanne(ouverture) {
  const u = Math.max(0.001, ouverture / 100);
  return CARAC.K_VANNE * (1 / (u * u) - 1);
}

/* ---------------------------------------------------------------------
   Classe SimulationPompe
   --------------------------------------------------------------------- */
export class SimulationPompe {
  constructor() { this.reinitialiser(); }

  reinitialiser() {
    this.cmd = {
      marche: false,        // variateur : marche / arrêt
      frequence: 50,        // consigne de fréquence (Hz)
      vanneRef: 40,         // ouverture de la vanne de refoulement (%)
      vanneAsp: true,       // vanne d'aspiration ouverte
      aspiration: 2,        // hauteur d'aspiration (m) : niveau de la bâche sous l'axe de la pompe (négatif = en charge)
      temperature: 20       // température de l'eau (°C)
    };
    this.pannes = {
      crepine: false, clapetPied: false, roue: false, sens: false,
      garniture: false, roulement: false, entreeAir: false
    };
    this.f = 0;               // fréquence appliquée (rampe)
    this.n = 0;               // vitesse relative N / N0
    this.Q = 0;               // débit (m³/h)
    this.H = 0;               // hauteur manométrique (m)
    this.amorcee = true;      // corps de pompe et aspiration pleins d'eau
    this.tCorps = 20;         // température de l'eau dans le corps de pompe (°C)
    this.tPalier = 20;        // température du palier (°C)
    this.cavitation = 0;      // intensité de la cavitation (0 à 1)
    this.temps = 0;
    this.angle = 0;           // angle de la roue (rad) pour la 3D
    this._arretDepuis = 0;
    this.res = {
      pAsp: 0, pRef: 0, puissance: 0, intensite: 0, rendement: 0, npshDisp: 0, npshReq: 0,
      vibration: 0, fuiteGarniture: 0, bulles: 0, kReseau: 0, message: '', alerte: '', alerteVerte: false
    };
    this.calculer(0);
  }

  get vitesse() { return this.n * CARAC.N0; }   // tr/min

  /* Remplir d'eau le corps de pompe et la conduite d'aspiration (bouchon d'amorçage) */
  amorcer() {
    if (this.n > 0.05) return false;
    this.amorcee = true;
    return true;
  }

  /* Coefficient du réseau (m / (m³/h)²) et pertes d'aspiration */
  kAspiration() {
    let k = CARAC.K_ASP * (this.pannes.crepine ? 7 : 1);
    if (!this.cmd.vanneAsp) k = 50;     // vanne d'aspiration fermée : la pompe « tire » dans le vide
    return k;
  }
  kReseau() { return CARAC.K_FIXE + coefVanne(this.cmd.vanneRef) + this.kAspiration(); }

  /* NPSH disponible pour un débit Q */
  npshDisponible(Q) {
    const pv = pressionVapeur(Math.max(this.cmd.temperature, this.tCorps * 0.3 + this.cmd.temperature * 0.7));
    return CARAC.PATM_M - pv - this.cmd.aspiration - this.kAspiration() * Q * Q;
  }

  /* Hauteur réellement fournie (avec cavitation, air) pour un débit Q */
  _hauteur(Q) {
    const pn = this.pannes;
    let h = hauteurPompe(Q, this.n, pn.roue ? 0.82 : 1, pn.sens ? -1 : 1);
    const manque = npshRequis(Q, this.n) - this.npshDisponible(Q);
    if (manque > 0) h *= Math.max(0.15, 1 - 0.22 * manque);   // cavitation : la hauteur s'effondre
    if (pn.entreeAir) h *= 0.85;
    return h;
  }

  /* Point de fonctionnement : intersection pompe / réseau (dichotomie) */
  _pointFonctionnement() {
    const k = this.kReseau();
    if (this.cmd.vanneRef <= 0 || this.n < 0.02) return 0;
    const ecart = (Q) => this._hauteur(Q) - (CARAC.H_GEO + k * Q * Q);
    if (ecart(0) <= 0) return 0;
    let a = 0, b = 60;
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if (ecart(m) > 0) a = m; else b = m;
    }
    return a;
  }

  /* ----------------------- Calcul principal ------------------------ */
  calculer(dt) {
    const c = this.cmd, pn = this.pannes, K = CARAC, r = this.res;
    this.temps += dt;
    // Variateur : rampe d'accélération / décélération
    const cible = c.marche ? c.frequence : 0;
    if (this.f < cible) this.f = Math.min(cible, this.f + K.RAMPE * dt);
    else this.f = Math.max(cible, this.f - K.RAMPE * dt);
    this.n = this.f / 50;

    // Désamorçage : clapet de pied qui fuit (la conduite se vide à l'arrêt), prise d'air importante
    if (this.n < 0.02) this._arretDepuis += dt; else this._arretDepuis = 0;
    if (pn.clapetPied && c.aspiration > 0 && this._arretDepuis > 3) this.amorcee = false;
    if (c.aspiration <= 0) this.amorcee = true;   // pompe en charge : elle s'amorce seule

    // Point de fonctionnement
    let Qeq = 0;
    if (this.amorcee) Qeq = this._pointFonctionnement();
    this.Q = lisser(this.Q, Qeq, 0.6, dt);
    if (pn.entreeAir && this.n > 0.3) this.Q *= 1 - 0.04 * Math.max(0, Math.sin(this.temps * 7.3) * Math.sin(this.temps * 2.1));
    const Q = this.Q;
    const Hcible = this.amorcee ? this._hauteur(Q) : 0.04 * K.H0 * this.n * this.n;   // à sec : la pompe brasse de l'air
    this.H = lisser(this.H, Hcible, 0.25, dt);

    // Pressions : vacuomètre à l'aspiration, manomètre au refoulement (bar relatifs)
    const hAsp = this.amorcee ? -c.aspiration - this.kAspiration() * Q * Q : 0;
    r.pAsp = mVersBar(Math.max(-K.PATM_M + 0.3, hAsp));
    r.pRef = mVersBar(Math.max(0, hAsp + this.H));

    // Puissance, intensité, rendement
    let p = puissancePompe(this.amorcee ? Q : 0, this.n) * (this.amorcee ? 1 : 0.25);
    if (pn.sens) p *= 0.9;
    if (pn.roulement) p += 0.12 * this.n;
    r.puissance = p;
    const pHyd = 1000 * 9.81 * (Q / 3600) * this.H / 1000;   // kW
    r.puissanceHyd = pHyd;
    r.rendement = p > 0.05 ? Math.min(0.9, pHyd / p) : 0;
    r.intensite = this.n > 0.01 ? 1.9 * Math.min(1, this.n * 1.2) + p / (Math.sqrt(3) * 0.4 * 0.84 * 0.86) * 0.75 : 0;

    // NPSH et cavitation
    r.npshDisp = this.npshDisponible(Q);
    r.npshReq = npshRequis(Q, this.n);
    const manque = this.amorcee && this.n > 0.2 ? r.npshReq - r.npshDisp : -1;
    this.cavitation = lisser(this.cavitation, Math.max(0, Math.min(1, manque / 3 + (manque > 0 ? 0.25 : 0))), 0.3, dt);
    r.bulles = Math.max(this.cavitation, pn.entreeAir && this.n > 0.3 ? 0.45 : 0, !this.amorcee && this.n > 0.2 ? 0.7 : 0);

    // Échauffement de l'eau dans le corps à débit nul (temps accéléré ×5) et du palier
    const chaleur = this.n > 0.05 ? (p - pHyd) * 1000 : 0;          // W dissipés dans l'eau
    const renouvellement = Q / 3600 * 1000 * 4180;                  // W/K emportés par le débit
    const tEq = c.temperature + (renouvellement > 1 ? chaleur / renouvellement : chaleur / 25);
    this.tCorps = lisser(this.tCorps, Math.min(this.amorcee ? 110 : 140, tEq), renouvellement > 200 ? 4 : 60, dt);
    const tPalierEq = 25 + 20 * this.n + (pn.roulement ? 45 * this.n : 0);
    this.tPalier = lisser(this.tPalier, tPalierEq, 25, dt);

    // Vibrations (mm/s)
    let v = 0.6 * this.n + 4.5 * this.cavitation + (pn.roulement ? 4.2 * this.n : 0) + (pn.entreeAir ? 1.8 * this.n : 0);
    if (Q < 0.25 * K.Q_BEP * this.n && this.n > 0.3 && this.amorcee) v += 1.2;   // recirculation à faible débit
    if (pn.roue) v += 0.8 * this.n;
    r.vibration = lisser(r.vibration, v, 0.4, dt);
    r.fuiteGarniture = pn.garniture ? (this.n > 0.05 ? 1 : 0.35) * Math.max(0.2, r.pRef / 2.5) : 0;
    r.kReseau = this.kReseau();

    this.angle += (pn.sens ? -1 : 1) * this.n * 9 * dt;   // rotation affichée (ralentie)
    this._messages();
    return r;
  }

  _messages() {
    const r = this.res, c = this.cmd, pn = this.pannes;
    const f = (v, d = 1) => v.toFixed(d).replace('.', ',');
    let m = '', a = '', vert = false;
    if (!this.amorcee) {
      m = this.n > 0.05
        ? 'La pompe tourne mais ne débite pas : elle est désamorcée (pleine d\'air). Une pompe centrifuge ne peut pas aspirer de l\'air. Arrêtez-la, remplissez le corps de pompe (bouton « Amorcer ») et vérifiez le clapet de pied.'
        : 'Pompe désamorcée : la conduite d\'aspiration s\'est vidée. Remplissez le corps de pompe par le bouchon d\'amorçage avant de démarrer.';
      if (this.n > 0.05) a = 'Pompe désamorcée : marche à sec !';
    } else if (!c.marche && this.n < 0.02) {
      m = 'Pompe à l\'arrêt. Procédure de démarrage : vanne d\'aspiration ouverte, pompe amorcée, vanne de refoulement presque fermée (puissance absorbée minimale), puis « Marche » et ouverture progressive du refoulement.';
    } else if (!c.marche) {
      m = 'Arrêt : le variateur ralentit la pompe selon sa rampe (pas de coup de bélier).';
    } else if (!c.vanneAsp) {
      m = 'Vanne d\'aspiration fermée ! La pompe « tire » sur une conduite fermée : forte dépression, cavitation, destruction de la roue. Une vanne d\'aspiration reste toujours grande ouverte (elle ne sert qu\'à isoler).';
      a = 'Vanne d\'aspiration fermée';
    } else if (this.cavitation > 0.15) {
      m = 'Cavitation : NPSH disponible (' + f(r.npshDisp) + ' m) < NPSH requis (' + f(r.npshReq) + ' m). La pression à l\'entrée de la roue descend sous la pression de vapeur : des bulles se forment puis implosent (bruit de gravier, vibrations, érosion). Réduisez le débit, la hauteur d\'aspiration ou la température.';
      a = 'Cavitation !';
    } else if (c.vanneRef <= 0) {
      m = 'Vanne de refoulement fermée : débit nul, la pompe donne sa hauteur maximale (' + f(this.H) + ' m). Toute la puissance chauffe l\'eau du corps : à ne pas prolonger.';
    } else {
      m = 'Point de fonctionnement : Q = ' + f(this.Q) + ' m³/h, H = ' + f(this.H) + ' m (intersection courbe de pompe / courbe du réseau). Fermer la vanne de refoulement relève la courbe du réseau : moins de débit, plus de hauteur.';
    }
    if (!a) {
      if (this.tCorps > 85) a = 'Eau du corps de pompe à ' + Math.round(this.tCorps) + ' °C : débit trop faible';
      else if (r.intensite > CARAC.I_NOM * 1.05) a = 'Surintensité moteur : ' + f(r.intensite) + ' A > In';
      else if (r.vibration > 7.1) a = 'Vibrations élevées : ' + f(r.vibration) + ' mm/s';
      else if (this.tPalier > 80) a = 'Palier chaud : ' + Math.round(this.tPalier) + ' °C';
      else if (pn.garniture && r.fuiteGarniture > 0.5) a = 'Fuite à la garniture mécanique';
    }
    r.message = m; r.alerte = a; r.alerteVerte = vert;
  }
}
