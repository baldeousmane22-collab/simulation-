/* =====================================================================
   accouplement/simulation.js — Modèle physique du banc
   « moteur électrique + accouplement élastique + réducteur + charge »
   ---------------------------------------------------------------------
   Ce module ne dessine rien : il calcule vitesses, couples, intensité,
   températures, vibrations et alignement à partir des commandes et des
   pannes actives. La scène 3D et l'interface lisent ensuite l'état.

   Hypothèses du modèle (volontairement simples et pédagogiques) :
   - moteur asynchrone 4 pôles alimenté par un variateur de fréquence
     (loi U/f constante) : courbe de couple de Kloss autour de la vitesse
     de synchronisme ns = 1500 × f / 50 ;
   - réducteur à engrenages hélicoïdaux : Ns = Nm / i et Cs = Cm × i × η ;
   - charge = couple résistant constant réglable (frein de banc) ;
   - alignement : décalage (mm) et défaut angulaire (mm / 100 mm) entre
     l'axe du moteur et l'axe du réducteur, corrigés par les cales sous
     les pattes du moteur et les vis de poussée latérales ;
   - le temps des échauffements et de l'usure est accéléré (pédagogie).
   ===================================================================== */

/* ----------------------- Caractéristiques du banc ------------------- */
export const CARAC = {
  P_NOM: 1500,          // puissance nominale du moteur (W)
  N_NOM: 1450,          // vitesse nominale (tr/min)
  N_SYNC: 1500,         // vitesse de synchronisme à 50 Hz (4 pôles)
  I_NOM: 3.4,           // intensité nominale sous 400 V (A)
  I_VIDE: 1.6,          // intensité à vide (A)
  C_MAX_SUR_CN: 2.7,    // couple maximal / couple nominal
  J_MOTEUR: 0.0045,     // inertie rotor + moyeu (kg·m²)
  J_CHARGE: 2.0,        // inertie de la charge, côté sortie (kg·m²)
  RAPPORTS: [5, 10, 20, 40],
  ETAGES: { 5: 1, 10: 2, 20: 2, 40: 3 },
  ETA_ETAGE: 0.97,      // rendement d'un étage d'engrenages hélicoïdaux
  RAMPE: 25,            // rampe du variateur (Hz/s)
  // Alignement (mm) : distance entre le plan de l'accouplement et les pattes du moteur
  L_AVANT: 175,         // pattes avant (côté accouplement)
  L_ARRIERE: 400,       // pattes arrière
  D_MOYEU: 100,         // diamètre du moyeu palpé en lecture de face (mm)
  CALE_INITIALE: 1.5,   // épaisseur des cales en place sous chaque patte (mm)
  CALE_MAX: 3.0,
  TOL_DECALAGE: 0.10,   // tolérance de décalage à 1500 tr/min (mm)
  TOL_ANGLE: 0.08       // tolérance angulaire (mm / 100 mm)
};

const CN = CARAC.P_NOM / (CARAC.N_NOM * Math.PI / 30);            // ≈ 9,9 N·m
const C_MAX = CARAC.C_MAX_SUR_CN * CN;
const SN = (CARAC.N_SYNC - CARAC.N_NOM) / CARAC.N_SYNC;           // glissement nominal
// Glissement critique sk tel que C(sn) = Cn (formule de Kloss)
const K = CARAC.C_MAX_SUR_CN;
const SK = SN * (K + Math.sqrt(K * K - 1));
export const NOMINAL = { CN, C_MAX, SN, SK };

/* Rendement du réducteur selon le rapport (nombre d'étages) */
export function rendementReducteur(i) {
  return Math.pow(CARAC.ETA_ETAGE, CARAC.ETAGES[i] || 2);
}

/* Couple moteur (N·m) en fonction de la vitesse de synchronisme et de la vitesse réelle (tr/min) */
function coupleMoteur(ns, n) {
  const s = (ns - n) / CARAC.N_SYNC;      // glissement rapporté à 1500 tr/min (variateur U/f)
  const x = s / SK;
  return 2 * C_MAX * x / (1 + x * x);
}

function lisser(valeur, cible, tau, dt) {
  if (tau <= 0) return cible;
  return valeur + (cible - valeur) * (1 - Math.exp(-dt / tau));
}
const signe = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/* Zones de sévérité vibratoire (ISO 10816-3, petites machines sur socle rigide) */
export function zoneVibration(v) {
  if (v <= 1.4) return { zone: 'A', texte: 'Bon', classe: 'zone-a' };
  if (v <= 2.8) return { zone: 'B', texte: 'Acceptable', classe: 'zone-b' };
  if (v <= 4.5) return { zone: 'C', texte: 'À surveiller', classe: 'zone-c' };
  return { zone: 'D', texte: 'Dangereux', classe: 'zone-d' };
}

/* ---------------------------------------------------------------------
   Classe principale : instanciée une seule fois par l'application.
   --------------------------------------------------------------------- */
export class SimulationAccouplement {
  constructor() {
    this.cmd = {
      marche: false,      // ordre de marche du variateur
      sens: 1,            // +1 = sens avant, -1 = sens inverse
      frequence: 50,      // consigne du variateur (Hz)
      rapport: 10,        // rapport de réduction i
      charge: 50          // couple résistant en sortie (N·m)
    };
    this.pannes = {
      desalignement: false, elastomere: false, roulement: false,
      huile: false, piedBoiteux: false, clavette: false, bloquee: false
    };
    this.consigne = false;     // consignation (cadenas) : interdit la marche
    this.reinitialiser();
  }

  /* Remet le banc dans son état initial (aligné, froid, à l'arrêt) */
  reinitialiser() {
    this.cmd.marche = false;
    this.cmd.sens = 1;
    this.cmd.frequence = 50;
    this.cmd.rapport = 10;
    this.cmd.charge = 50;
    for (const k in this.pannes) this.pannes[k] = false;
    this.consigne = false;
    this.f = 0;                // fréquence réellement appliquée (rampe)
    this.n = 0;                // vitesse moteur (tr/min, signée)
    this.nSortie = 0;          // vitesse arbre de sortie (tr/min, signée)
    this.angleMoteur = 0;      // angle de l'arbre moteur (rad) pour la 3D
    this.angleSortie = 0;
    this.thermique = 0;        // état du relais thermique (1 = échauffement nominal)
    this.declenche = false;    // relais thermique déclenché
    this.tMoteur = 20; this.tReducteur = 20; this.tAccouplement = 20;
    this.usure = 0;            // usure de l'élastomère (0 à 1)
    this.temps = 0;
    this.choc = 0;             // intensité d'un choc (élastomère usé) pour la 3D
    // Alignement : erreur de montage + cales et vis de poussée
    this.align = {
      dv0: 0.02, av0: -0.01, dh0: -0.01, ah0: 0.01,     // erreurs « d'origine » (mm, mm/100 mm)
      caleAvant: CARAC.CALE_INITIALE, caleArriere: CARAC.CALE_INITIALE,
      latAvant: 0, latArriere: 0                        // déplacement latéral des pattes (mm)
    };
    this.mesure = null;        // dernière série de lectures au comparateur
    this.res = {
      ns: 0, couple: 0, coupleSortie: 0, intensite: 0, puissance: 0, puissanceSortie: 0,
      rendement: 0, vibration: 0, glissement: 0, cale: false,
      message: '', alerte: '', alerteVerte: false
    };
    this.calculer(0);
  }

  /* -------------------- Alignement (géométrie) -------------------- */
  /* Défauts actuels : décalages au plan de l'accouplement (mm) et angles (mm/100 mm).
     Convention : dv > 0 = moteur trop haut ; dh > 0 = moteur décalé vers l'opérateur ;
     av > 0 = l'arrière du moteur est plus haut que l'avant (même logique pour ah). */
  defauts() {
    const a = this.align, L1 = CARAC.L_AVANT, L2 = CARAC.L_ARRIERE;
    const cf = a.caleAvant - CARAC.CALE_INITIALE, cr = a.caleArriere - CARAC.CALE_INITIALE;
    const pente = (cr - cf) / (L2 - L1);           // mm / mm
    const penteH = (a.latArriere - a.latAvant) / (L2 - L1);
    let dv = a.dv0 + cf - pente * L1;
    let av = a.av0 + pente * 100;
    let dh = a.dh0 + a.latAvant - penteH * L1;
    let ah = a.ah0 + penteH * 100;
    // Le pied boiteux déforme la carcasse quand on serre : léger défaut supplémentaire
    if (this.pannes.piedBoiteux) { dv += 0.04; av += 0.03; }
    return { dv, av, dh, ah };
  }

  /* Sévérité globale du désalignement : 1 = à la limite de la tolérance */
  severiteAlignement() {
    const d = this.defauts();
    const dec = Math.hypot(d.dv, d.dh) / CARAC.TOL_DECALAGE;
    const ang = Math.hypot(d.av, d.ah) / CARAC.TOL_ANGLE;
    return Math.hypot(dec, ang) / Math.SQRT2;
  }

  /* Corrections à apporter (mm) : cales à ajouter (+) ou retirer (−) sous les pattes,
     déplacement latéral (+ vers l'opérateur) des pattes avant et arrière. */
  corrections() {
    const d = this.defauts(), L1 = CARAC.L_AVANT, L2 = CARAC.L_ARRIERE;
    return {
      caleAvant: -(d.dv + d.av / 100 * L1),
      caleArriere: -(d.dv + d.av / 100 * L2),
      latAvant: -(d.dh + d.ah / 100 * L1),
      latArriere: -(d.dh + d.ah / 100 * L2)
    };
  }

  /* Lectures au comparateur (mm) à l'angle θ (degrés, 0 = 12 h, 90 = côté opérateur).
     Comparateur fixé sur le moyeu du réducteur, palpeur sur le moyeu moteur,
     mis à zéro à 12 h. Radial : R(θ) = dv·cosθ + dh·sinθ − dv.
     Face (sur Ø 100 mm) : F(θ) = (D/2)·(av·cosθ + ah·sinθ − av)/100. */
  lecture(theta) {
    const d = this.defauts();
    const t = theta * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
    const r = d.dv * c + d.dh * s - d.dv;
    const f = (CARAC.D_MOYEU / 2) * (d.av * c + d.ah * s - d.av) / 100;
    return { radial: r, face: f };
  }

  /* Nouvel exercice : moteur déposé puis remonté, désalignement aléatoire */
  nouvelExercice(fort = false) {
    const h = (amp) => (Math.random() < 0.5 ? -1 : 1) * amp * (0.35 + 0.65 * Math.random());
    const k = fort ? 1.6 : 1;
    const a = this.align;
    a.dv0 = h(0.35 * k); a.av0 = h(0.12 * k);
    a.dh0 = h(0.30 * k); a.ah0 = h(0.10 * k);
    a.caleAvant = CARAC.CALE_INITIALE; a.caleArriere = CARAC.CALE_INITIALE;
    a.latAvant = 0; a.latArriere = 0;
    this.mesure = null;
  }

  /* Alignement parfait (bouton « Tout réparer ») */
  alignerParfaitement() {
    const a = this.align;
    a.dv0 = 0.02; a.av0 = -0.01; a.dh0 = -0.01; a.ah0 = 0.01;
    a.caleAvant = CARAC.CALE_INITIALE; a.caleArriere = CARAC.CALE_INITIALE;
    a.latAvant = 0; a.latArriere = 0;
    this.mesure = null;
  }

  /* Ajoute (+) ou retire (−) une épaisseur de cales sous les pattes avant ou arrière */
  ajusterCale(cote, epaisseur) {
    if (!this.consigne) return false;
    const k = cote === 'avant' ? 'caleAvant' : 'caleArriere';
    const v = Math.round((this.align[k] + epaisseur) * 100) / 100;
    if (v < 0 || v > CARAC.CALE_MAX) return false;
    this.align[k] = v;
    this.mesure = null;
    return true;
  }

  /* Vis de poussée : déplacement latéral (mm) des pattes avant ou arrière */
  ajusterLateral(cote, mm) {
    if (!this.consigne) return false;
    const k = cote === 'avant' ? 'latAvant' : 'latArriere';
    this.align[k] = Math.round((this.align[k] + mm) * 100) / 100;
    this.mesure = null;
    return true;
  }

  /* -------------------------------------------------------------------
     Calcul d'un pas de simulation (dt en secondes)
     ------------------------------------------------------------------- */
  calculer(dt) {
    const c = this.cmd, pn = this.pannes, r = this.res;
    dt = Math.min(dt, 0.1);
    this.temps += dt;

    if (this.consigne || this.declenche) c.marche = false;

    // 1) Variateur : la fréquence suit la consigne avec une rampe
    const fCible = c.marche ? c.frequence * c.sens : 0;
    const df = CARAC.RAMPE * dt;
    this.f += Math.max(-df, Math.min(df, fCible - this.f));
    if (!c.marche && Math.abs(this.f) < 0.5) this.f = 0;
    const alimente = c.marche || this.f !== 0;
    const ns = CARAC.N_SYNC * this.f / 50;

    // 2) Réducteur et charge
    const i = c.rapport;
    let eta = rendementReducteur(i);
    if (pn.huile) eta -= 0.12;                       // frottements sans lubrification
    if (pn.roulement) eta -= 0.02;
    const couplee = !pn.clavette;                    // la clavette transmet-elle le couple ?
    const cFrotMoteur = 0.12 + (pn.roulement ? 0.35 : 0);         // N·m côté moteur
    const cChargeSortie = pn.bloquee ? 2000 : c.charge;           // N·m côté sortie
    const cFrotRed = 0.25 + (pn.huile ? 0.6 : 0);                 // N·m ramené à l'entrée
    const J = couplee ? CARAC.J_MOTEUR + 0.002 + CARAC.J_CHARGE / (i * i) : CARAC.J_MOTEUR;

    // 3) Intégration de la vitesse (petits pas : le moteur réagit en quelques ms)
    const w2n = 30 / Math.PI;
    let n = this.n, cm = 0, cRes = 0;
    const nb = Math.max(1, Math.ceil(dt / 0.0005));
    const h = dt / nb;
    for (let k = 0; k < nb; k++) {
      cm = alimente ? coupleMoteur(ns, n) : 0;
      // Couple résistant ramené au moteur (s'oppose toujours au mouvement)
      cRes = cFrotMoteur + (couplee ? cChargeSortie / (i * Math.max(0.5, eta)) + cFrotRed : 0);
      const w = n / w2n;
      if (Math.abs(w) < 1e-3 && Math.abs(cm) <= cRes) { n = 0; continue; }   // adhérence : pas de démarrage
      const sens = Math.abs(w) < 1e-3 ? signe(cm) : signe(w);
      let wNouv = w + (cm - sens * cRes) / J * h;
      if (signe(wNouv) !== sens && Math.abs(w) > 0) wNouv = 0;            // arrêt (pas d'inversion par le frottement)
      n = wNouv * w2n;
    }
    this.n = n;

    // Côté sortie : entraîné par le moteur, ou ralenti par sa charge si la clavette est cisaillée
    if (couplee) this.nSortie = n / i;
    else {
      const dec = (c.charge + 5) / CARAC.J_CHARGE * dt * w2n;
      this.nSortie = Math.abs(this.nSortie) <= dec ? 0 : this.nSortie - signe(this.nSortie) * dec;
    }
    this.angleMoteur = (this.angleMoteur + n / w2n * dt) % (Math.PI * 2000);
    this.angleSortie = (this.angleSortie + this.nSortie / w2n * dt) % (Math.PI * 2000);

    // 4) Grandeurs électriques et mécaniques
    const nAbs = Math.abs(n), w = nAbs / w2n;
    const cmAbs = alimente ? Math.abs(cm) : 0;
    // Courant actif ∝ courant rotorique : I_r ≈ (s / sn) / √(1 + (s / sk)²) × I_actif nominal ;
    // le variateur limite le courant à 2,2 × In (au lieu de 5 à 7 × In en démarrage direct).
    const Ia = Math.sqrt(CARAC.I_NOM ** 2 - CARAC.I_VIDE ** 2);
    const s = (ns - n) / CARAC.N_SYNC;
    const iRotor = Math.abs(s) / SN / Math.sqrt(1 + (s / SK) ** 2) / Math.sqrt(1 + (SN / SK) ** 2);
    const I = alimente ? Math.min(2.2 * CARAC.I_NOM, Math.hypot(CARAC.I_VIDE * Math.min(1, Math.abs(this.f) / 50 + 0.2), Ia * iRotor)) : 0;
    const cSortie = couplee ? Math.max(0, (cmAbs - cFrotMoteur - cFrotRed) * i * eta) : 0;
    const P = cmAbs * w;                                  // puissance mécanique moteur (W)
    const Ps = couplee ? Math.abs(cChargeSortie * this.nSortie / w2n) : 0;
    r.ns = ns; r.couple = cmAbs; r.coupleSortie = cSortie;
    r.intensite = I; r.puissance = P; r.puissanceSortie = Math.min(Ps, P);
    r.rendement = P > 20 ? Math.min(1, r.puissanceSortie / P) : 0;
    r.glissement = Math.abs(ns) > 10 ? (Math.abs(ns) - nAbs) / Math.abs(ns) : 0;
    r.cale = alimente && Math.abs(this.f) > 5 && nAbs < 0.6 * Math.abs(ns);

    // 5) Relais thermique (constante de temps accélérée) : déclenche vers 1,15 × In
    const charge = (I / CARAC.I_NOM) ** 2;
    this.thermique = lisser(this.thermique, charge, 12, dt);
    if (this.thermique > 1.3 && !this.declenche) {
      this.declenche = true;
      c.marche = false;
      this.f = 0;
    }

    // 6) Températures (temps accéléré)
    const pertesRed = r.puissance * (1 - Math.max(0.5, eta)) + (nAbs > 1 ? 8 : 0);
    const rthRed = pn.huile ? 0.55 : 0.28;                        // °C par W perdu
    this.tReducteur = lisser(this.tReducteur, 20 + pertesRed * rthRed, 25, dt);
    this.tMoteur = lisser(this.tMoteur, 20 + 55 * this.thermique + (pn.roulement && nAbs > 50 ? 15 : 0), 30, dt);
    const sev = this.severiteAlignement();
    const vRel = nAbs / CARAC.N_NOM;
    this.tAccouplement = lisser(this.tAccouplement, 20 + vRel * (4 + 14 * sev * sev), 20, dt);

    // 7) Usure de l'élastomère : rapide si le désalignement dépasse la tolérance
    this.usure = Math.min(1, this.usure + 0.004 * Math.max(0, sev - 0.8) ** 2 * vRel * dt);
    const elastoHS = pn.elastomere || this.usure >= 1;

    // 8) Vibrations (mm/s efficaces) mesurées sur le palier avant du moteur
    let v = 0;
    if (nAbs > 5) {
      v = vRel * (0.55 + 1.5 * sev + (elastoHS ? 1.3 : 0) + (pn.piedBoiteux ? 1.6 : 0) + (pn.roulement ? 2.6 : 0))
        + (pn.huile ? 0.9 * vRel : 0) + 0.6 * this.usure * vRel;
    }
    // Choc à l'inversion de couple quand l'étoile est usée (jeu entre les crabots)
    const accel = (n - (this._nPrec ?? n)) / Math.max(dt, 1e-3);
    this._nPrec = n;
    if (elastoHS && Math.abs(accel) > 600) this.choc = 1;
    this.choc = Math.max(0, this.choc - dt * 3);
    r.vibration = lisser(r.vibration, v, 0.4, dt);
    r.elastoHS = elastoHS;
    r.severite = sev;

    this._messages(nAbs, ns, i, eta, elastoHS);
    return r;
  }

  _messages(nAbs, ns, i, eta, elastoHS) {
    const r = this.res, c = this.cmd, pn = this.pannes;
    let m = '', a = '', vert = false;
    const z = zoneVibration(r.vibration);
    if (this.declenche) {
      m = 'Le relais thermique a coupé le moteur : l\'intensité est restée trop longtemps au-dessus de In (' + CARAC.I_NOM + ' A). Cherchez la cause (surcharge, blocage), puis réarmez.';
      a = 'Relais thermique déclenché';
    } else if (this.consigne) {
      m = 'Machine consignée : alimentation coupée et cadenassée. Vous pouvez intervenir sur l\'accouplement (carter déposé), mesurer et caler.';
      a = '🔒 Consignée'; vert = true;
    } else if (!c.marche && nAbs < 1) {
      m = 'Moteur à l\'arrêt. Appuyez sur « Marche » : le variateur accélère le moteur selon sa rampe.';
    } else if (!c.marche) {
      m = 'Décélération selon la rampe du variateur…';
    } else if (r.cale) {
      m = 'Le couple demandé dépasse le couple maximal du moteur (' + C_MAX.toFixed(0) + ' N·m) : il décroche, l\'intensité est très élevée. Réduisez la charge ou choisissez un rapport plus grand.';
      a = 'Moteur calé : surintensité !';
    } else if (pn.clavette) {
      m = 'Le moteur et le moyeu tournent, mais l\'arbre du réducteur ne suit pas : intensité proche du courant à vide. La clavette est cisaillée.';
    } else if (Math.abs(this.f) < Math.abs(c.frequence) - 0.5) {
      m = 'Accélération : la fréquence monte de ' + CARAC.RAMPE + ' Hz/s jusqu\'à ' + c.frequence + ' Hz.';
    } else {
      m = 'Ns = Nm ÷ i = ' + Math.round(nAbs) + ' ÷ ' + i + ' = ' + Math.round(nAbs / i) + ' tr/min ; ' +
          'Cs = Cm × i × η = ' + r.couple.toFixed(1).replace('.', ',') + ' × ' + i + ' × ' + eta.toFixed(2).replace('.', ',') + ' ≈ ' + Math.round(r.coupleSortie) + ' N·m. ' +
          'Le réducteur divise la vitesse et multiplie le couple.';
    }
    if (!a && c.marche) {
      if (this.tReducteur > 80) a = 'Réducteur trop chaud (' + Math.round(this.tReducteur) + ' °C)';
      else if (z.zone === 'D') a = 'Vibrations dangereuses (' + r.vibration.toFixed(1).replace('.', ',') + ' mm/s)';
      else if (elastoHS && this.usure >= 1) a = 'Élastomère détruit : remplacez l\'étoile';
      else if (this.thermique > 1.05) a = 'Surcharge : I = ' + r.intensite.toFixed(1).replace('.', ',') + ' A > In';
    }
    r.message = m; r.alerte = a; r.alerteVerte = vert;
  }

  /* Réarmement du relais thermique (seulement une fois refroidi) */
  rearmer() {
    if (!this.declenche) return true;
    if (this.thermique > 0.95) return false;
    this.declenche = false;
    return true;
  }
}
