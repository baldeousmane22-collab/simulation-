/* =====================================================================
   simulation.js — Modèle physique du banc pneumatique
   « compresseur + cuve + FRL + distributeur 5/2 + vérin double effet »
   ---------------------------------------------------------------------
   Ce module ne dessine rien : il calcule les pressions, les débits d'air,
   la position et la vitesse du vérin à partir des commandes et des pannes
   actives. La scène 3D, le schéma et l'interface lisent ensuite l'état.

   Hypothèses du modèle (volontairement simples et pédagogiques) :
   - air parfait, transformations isothermes : la « quantité d'air » d'un
     volume est n = p_abs × V (bar·L), soit n / 1,013 litres normaux (NL) ;
   - chaque passage (distributeur, régleur, silencieux, filtre…) est un
     orifice caractérisé par sa conductance C (ISO 6358, rapport critique
     b = 0,3) ; plusieurs orifices en série se combinent en 1/C² ;
   - régleurs de débit unidirectionnels montés sur les orifices du vérin :
     passage libre vers le vérin (clapet), étranglement à l'échappement
     (réglage « au refoulement ») ;
   - vérin vertical Ø32 / tige Ø12, course 200 mm, qui soulève une charge :
     la pesanteur freine la sortie et entraîne la rentrée ;
   - distributeur 5/2 bistable (mémoire) à pilotage pneumatique 14 / 12,
     avec commandes manuelles ; cycle automatique par capteurs à galet
     1S1 (tige rentrée) et 1S2 (tige sortie) ;
   - amortissements pneumatiques de fin de course (15 mm) : en arrivant
     en butée, l'air de la chambre qui s'échappe ne sort plus que par la
     vis d'amortissement : le vérin ralentit avant le choc ;
   - circuit 2 : vérin simple effet Ø20 × 50 à rappel par ressort, commandé
     par un distributeur 3/2 NF à bouton poussoir (monostable) à travers
     une soupape d'échappement rapide ;
   - sélecteur 3/2 à accrochage 0V1 : il alimente les capteurs (cycle auto) ;
   - compresseur à piston commandé par un pressostat (6 → 8 bar),
     soupape de sûreté tarée à 10 bar.
   ===================================================================== */

/* ----------------------- Caractéristiques du banc ------------------- */
export const P_ATM = 1.013;            // pression atmosphérique (bar absolu)
const G = 9.81;

export const CARAC = {
  ALESAGE: 32,          // diamètre du piston (mm)
  TIGE: 12,             // diamètre de la tige (mm)
  COURSE: 200,          // course (mm)
  MASSE_MOBILE: 2,      // piston + tige + plateau (kg)
  FROTTEMENT: 30,       // frottement des joints (N)
  V_MORT: 0.025,        // volume mort de chaque chambre + tuyau (L)
  V_RESEAU: 0.25,       // volume du réseau après le FRL (L)
  V_CUVE: 24,           // cuve du compresseur (L)
  Q_COMPRESSEUR: 200,   // débit d'air aspiré du compresseur (NL/min)
  P_ENCLENCHE: 6,       // pressostat : remise en marche (bar)
  P_COUPURE: 8,         // pressostat : arrêt (bar)
  P_SOUPAPE: 10,        // soupape de sûreté (bar)
  P_PILOTAGE: 1.5,      // pression minimale de pilotage du distributeur (bar)
  P_REGLAGE_MAX: 8,     // réglage maximal du régulateur (bar)
  C_DIST: 0.5,          // conductance d'un passage du distributeur (L/(s·bar))
  C_LIBRE: 0.6,         // régleur : sens libre (clapet ouvert)
  C_ETRANGLE: 0.5,      // régleur : étrangleur grand ouvert
  C_SILENCIEUX: 1.0,
  C_FRL: 1.2,           // filtre + régulateur grand ouvert
  AMORTI: 0.015,        // longueur des amortissements de fin de course (m)
  C_AMORTI: 0.045,      // vis d'amortissement
  // Circuit 2 : vérin simple effet + bouton poussoir 3/2 + échappement rapide
  ALESAGE2: 20, COURSE2: 50, MASSE2: 0.4, FROTTEMENT2: 8,
  RESSORT0: 20, RESSORT_K: 400,     // ressort de rappel : F = 20 N + 400 N/m × x
  V_MORT2: 0.012,
  C_BOUTON: 0.12,       // passage du 3/2 à bouton (petit débit)
  C_BOUTON_ECHAP: 0.07, // échappement du 3/2 à bouton
  C_ECHAP_RAPIDE: 0.6   // échappement direct par la soupape d'échappement rapide
};
export const S_PISTON = Math.PI * CARAC.ALESAGE ** 2 / 4;                         // mm²
export const S_ANNULAIRE = Math.PI * (CARAC.ALESAGE ** 2 - CARAC.TIGE ** 2) / 4;  // mm²
export const S_PISTON2 = Math.PI * CARAC.ALESAGE2 ** 2 / 4;                       // mm²

/* Débit à travers un orifice (ISO 6358 simplifiée), de pAmont vers pAval (bar abs).
   Résultat en bar·L/s, positif si l'air va de l'amont vers l'aval. */
export function debitOrifice(pAmont, pAval, C) {
  if (C <= 0) return 0;
  if (pAmont < pAval) return -debitOrifice(pAval, pAmont, C);
  const r = pAval / pAmont, b = 0.3;
  if (r <= b) return C * pAmont;                       // écoulement sonique (bloqué)
  const k = (r - b) / (1 - b);
  return C * pAmont * Math.sqrt(Math.max(0, 1 - k * k));
}
/* Orifices en série */
const serie = (...c) => (c.some(x => x <= 0) ? 0 : 1 / Math.sqrt(c.reduce((s, x) => s + 1 / (x * x), 0)));
/* Conductance d'un régleur de débit selon son ouverture (0 à 100 %) */
export function conductanceRegleur(ouverture) {
  const u = Math.max(0, Math.min(1, ouverture / 100));
  return CARAC.C_ETRANGLE * (0.03 + 0.97 * Math.pow(u, 1.6));
}
const lisser = (ancien, cible, tau, dt) => ancien + (cible - ancien) * Math.min(1, dt / tau);
const bar = (p) => p - P_ATM;    // absolu → relatif

/* ---------------------------------------------------------------------
   Classe SimulationPneumatique
   --------------------------------------------------------------------- */
export class SimulationPneumatique {
  constructor() {
    this.reinitialiser();
  }

  reinitialiser() {
    // Commandes de l'opérateur
    this.cmd = {
      compresseur: true,     // interrupteur du compresseur (marche automatique sur pressostat)
      vanne: true,           // vanne d'arrivée 3/2 (fermée = circuit mis à l'échappement)
      reglage: 6,            // consigne du régulateur (bar)
      regleurSortie: 50,     // ouverture du régleur côté tige (règle la vitesse de SORTIE) (%)
      regleurRentree: 50,    // ouverture du régleur côté fond (règle la vitesse de RENTRÉE) (%)
      charge: 10,            // masse posée sur le plateau (kg)
      auto: false,           // sélecteur 0V1 : cycle automatique (va-et-vient)
      bouton: false          // bouton poussoir 2V1 maintenu enfoncé
    };
    this.pannes = {
      fuite: false, joint: false, filtre: false, silencieux: false,
      eau: false, pressostat: false, capteur: false,
      ressort: false, echapRapide: false
    };
    // État pneumatique : quantités d'air n = p_abs × V (bar·L)
    this.pCuve = P_ATM + 7;
    this.pReseau = P_ATM + 6;
    this.x = 0;                    // sortie de tige (m)
    this.v = 0;                    // vitesse de tige (m/s, + = sortie)
    this.nA = (P_ATM) * this._volA();
    this.nB = (P_ATM + 6) * this._volB();
    this.x2 = 0;                   // vérin simple effet : sortie de tige (m)
    this.v2 = 0;
    this.n2 = P_ATM * CARAC.V_MORT2;
    this.dist = -1;                // distributeur : +1 = case 14 (1→4, sortie), −1 = case 12 (1→2, rentrée)
    this.commutation = null;       // commutation retardée (eau dans le distributeur) { vers, t }
    this.impulsion = { 14: 0, 12: 0 };   // commandes manuelles (durée restante, s)
    this.compresseurTourne = false;
    this.pressostatOuvert = false; // contact du pressostat ouvert (cuve pleine)
    this.soupapeOuverte = false;
    this.tauxMarche = 0;           // part du temps où le compresseur tourne (moyenne glissante)
    this.temps = 0;
    this.eau = 0.15;               // niveau d'eau dans la cuve du filtre (0 à 1)
    this.cycles = 0;
    this.dureeCycle = 0;           // durée du dernier cycle complet (s)
    this.conso = 0;                // consommation du dernier cycle (NL)
    this._cycle = { t: 0, n: 0, sortiFait: false };
    this.res = {
      lignes: {}, qCompresseur: 0, qReseau: 0, qFuite: 0, qEchap3: 0, qEchap5: 0, qSoupape: 0, qVanne: 0, qA: 0, qB: 0,
      fDispo: 0, fCharge: 0, capteur1: true, capteur2: false, pilote14: false, pilote12: false,
      q2: 0, qEchapRapide: 0, qBoutonEchap: 0, choc1: 0, choc2: 0, commute: false,
      cale: false, message: '', alerte: '', alerteVerte: false
    };
    this.calculer(0);
  }

  _volA() { return CARAC.V_MORT + S_PISTON * this.x * 1e-3; }                      // L (mm² × m × 1e-3)
  _volB() { return CARAC.V_MORT + S_ANNULAIRE * (CARAC.COURSE / 1000 - this.x) * 1e-3; }
  get pA() { return this.nA / this._volA(); }
  get pB() { return this.nB / this._volB(); }
  get position() { return this.x / (CARAC.COURSE / 1000); }   // 0 = rentrée, 1 = sortie
  _vol2() { return CARAC.V_MORT2 + S_PISTON2 * this.x2 * 1e-3; }
  get p2() { return this.n2 / this._vol2(); }
  get position2() { return this.x2 / (CARAC.COURSE2 / 1000); }

  /* Commande manuelle du distributeur (bouton poussoir sur le pilote 14 ou 12) */
  impulsionManuelle(cote) {
    if (cote === 14) { this.impulsion[14] = 0.35; this.impulsion[12] = 0; }
    else { this.impulsion[12] = 0.35; this.impulsion[14] = 0; }
  }

  /* Purge du filtre (et de la cuve du compresseur) */
  purger() { this.eau = 0; this.pannes.eau = false; }

  /* ----------------------- Calcul principal ------------------------ */
  calculer(dt) {
    const c = this.cmd, pn = this.pannes, K = CARAC;
    this.temps += dt;
    // Pas de calcul fin (0,5 ms) : les petites chambres se remplissent très vite
    const h = 0.0005;
    const n = Math.max(1, Math.ceil(dt / h));
    const pas = dt / n;
    const cumul = { comp: 0, reseau: 0, fuite: 0, e3: 0, e5: 0, soupape: 0, vanne: 0, A: 0, B: 0, q2: 0, er: 0, be: 0 };
    this._choc1 = 0; this._choc2 = 0; this._commute = false;
    this._tempsArret = this._tempsArret || 0;
    for (let k = 0; k < n && dt > 0; k++) this._pas(pas, cumul);
    const inv = dt > 0 ? 1 / dt : 0;
    const r = this.res;
    // Débits moyens sur l'image (NL/min)
    const nlmin = (x) => x * inv / P_ATM * 60;
    r.qCompresseur = nlmin(cumul.comp);
    r.qReseau = nlmin(cumul.reseau);
    r.qFuite = nlmin(cumul.fuite);
    r.qEchap3 = nlmin(cumul.e3);
    r.qEchap5 = nlmin(cumul.e5);
    r.qSoupape = nlmin(cumul.soupape);
    r.qVanne = nlmin(cumul.vanne);     // échappement de la vanne 3/2 ou du régulateur
    r.qA = nlmin(cumul.A);     // + = vers la chambre A
    r.qB = nlmin(cumul.B);
    r.q2 = nlmin(cumul.q2);               // + = vers le vérin simple effet
    r.qEchapRapide = nlmin(cumul.er);
    r.qBoutonEchap = nlmin(cumul.be);
    r.choc1 = this._choc1; r.choc2 = this._choc2; r.commute = this._commute;
    this.tauxMarche = lisser(this.tauxMarche, this.compresseurTourne ? 1 : 0, 30, dt);
    // L'eau s'accumule dans la cuve du filtre quand la purge est oubliée
    if (pn.eau) this.eau = Math.min(1, this.eau + dt * 0.05);

    // Forces (pour l'affichage et le calcul F = p × S)
    const pRes = Math.max(0, bar(this.pReseau));
    r.fDispo = pRes * 0.1 * S_PISTON;                  // N (bar × 0,1 = N/mm²)
    r.fDispoRentree = pRes * 0.1 * S_ANNULAIRE;
    r.fCharge = (c.charge + K.MASSE_MOBILE) * G;
    r.fPiston = bar(this.pA) * 0.1 * S_PISTON - bar(this.pB) * 0.1 * S_ANNULAIRE;
    // Vérin calé : distributeur en sortie, pression établie, tige immobile avant la fin de course
    r.cale = c.vanne && this.dist > 0 && this.position < 0.98 && Math.abs(this.v) < 0.002 && this._tempsArret > 1.2;

    this._lignes();
    this._suivreCycle(dt);
    this._messages();
    return r;
  }

  /* Un pas de calcul (h ≈ 0,5 ms) */
  _pas(h, cumul) {
    const c = this.cmd, pn = this.pannes, K = CARAC, r = this.res;
    // ---------- Compresseur, pressostat, soupape de sûreté ----------
    const pc = bar(this.pCuve);
    if (pc >= K.P_COUPURE) this.pressostatOuvert = true;
    else if (pc <= K.P_ENCLENCHE) this.pressostatOuvert = false;
    this.compresseurTourne = c.compresseur && (!this.pressostatOuvert || pn.pressostat);
    let qComp = 0;
    if (this.compresseurTourne) qComp = (K.Q_COMPRESSEUR / 60) * P_ATM * Math.max(0, 1 - 0.035 * pc);
    if (pc > K.P_SOUPAPE) this.soupapeOuverte = true;
    else if (pc < K.P_SOUPAPE - 0.4) this.soupapeOuverte = false;
    const qSoupape = this.soupapeOuverte ? debitOrifice(this.pCuve, P_ATM, 0.9) : 0;

    // ---------- Vanne d'arrivée + filtre + régulateur ----------
    const pr = bar(this.pReseau);
    let qAlim = 0, qVanne = 0;
    if (c.vanne) {
      const cFrl = pn.filtre ? 0.06 : K.C_FRL;
      const ouverture = Math.max(0, Math.min(1, (c.reglage - pr) / 0.25));
      qAlim = Math.max(0, debitOrifice(this.pCuve, this.pReseau, cFrl * ouverture));
      // Régulateur à décharge : évacue l'excès de pression (consigne baissée)
      const exces = Math.max(0, Math.min(1, (pr - c.reglage - 0.1) / 0.2));
      qVanne = debitOrifice(this.pReseau, P_ATM, 0.25 * exces);
    } else {
      // Vanne 3/2 fermée : l'arrivée est coupée et l'aval mis à l'échappement
      qVanne = debitOrifice(this.pReseau, P_ATM, 0.5);
    }
    const qFuite = pn.fuite ? debitOrifice(this.pReseau, P_ATM, 0.1) : 0;

    // ---------- Distributeur 5/2, régleurs, silencieux ----------
    const pA = this.pA, pB = this.pB;
    const cSil = pn.silencieux ? 0.05 : K.C_SILENCIEUX;
    const cRegA = conductanceRegleur(c.regleurRentree);   // étrangle l'échappement de A (rentrée)
    const cRegB = conductanceRegleur(c.regleurSortie);    // étrangle l'échappement de B (sortie)
    // Passage réseau ↔ chambre : sens libre vers le vérin, étranglé en retour
    const versChambre = (pCh, cReg) => {
      const sens = this.pReseau >= pCh;
      return debitOrifice(this.pReseau, pCh, serie(K.C_DIST, sens ? K.C_LIBRE : cReg));
    };
    // Passage chambre → atmosphère (échappement) : étranglé ; en dépression, entrée libre
    const versEchap = (pCh, cReg, amorti) => {
      const sens = pCh >= P_ATM;
      // Dans l'amortissement, l'air ne sort plus que par la vis d'amortissement
      const cSortie = amorti ? Math.min(cReg, K.C_AMORTI) : cReg;
      return debitOrifice(pCh, P_ATM, serie(sens ? cSortie : K.C_LIBRE, K.C_DIST, cSil));
    };
    const Lc = K.COURSE / 1000;
    let qA, qB, e3 = 0, e5 = 0;
    if (this.dist > 0) {          // 1→4 (fond A alimenté), 2→3 (tige B à l'échappement)
      qA = versChambre(pA, cRegA);
      e3 = versEchap(pB, cRegB, this.x > Lc - K.AMORTI);
      qB = -e3;
    } else {                      // 1→2 (tige B alimentée), 4→5 (fond A à l'échappement)
      qB = versChambre(pB, cRegB);
      e5 = versEchap(pA, cRegA, this.x < K.AMORTI);
      qA = -e5;
    }
    // Joint de piston usé : l'air passe d'une chambre à l'autre
    const qInterne = pn.joint ? debitOrifice(pA, pB, 0.05) : 0;
    // ---------- Circuit 2 : bouton 3/2 NF → échappement rapide → vérin simple effet ----------
    const p2 = this.p2;
    let q2 = 0, qER = 0, qBE = 0;
    if (c.bouton) {
      // 1 → 2 : l'air passe par la soupape d'échappement rapide (clapet ouvert vers le vérin)
      q2 = debitOrifice(this.pReseau, p2, serie(K.C_BOUTON, K.C_LIBRE));
    } else if (pn.echapRapide) {
      // Soupape bloquée : l'air revient par le tube et sort par le petit échappement du bouton
      qBE = debitOrifice(p2, P_ATM, serie(K.C_LIBRE, K.C_BOUTON_ECHAP));
      q2 = -qBE;
    } else {
      // La pression chute côté bouton : la soupape bascule et vide le vérin directement
      qER = debitOrifice(p2, P_ATM, K.C_ECHAP_RAPIDE);
      q2 = -qER;
    }
    const qConso2 = Math.max(0, q2);
    const qConsoReseau = (this.dist > 0 ? Math.max(0, qA) : Math.max(0, qB)) + qConso2;
    const qRetourReseau = (this.dist > 0 ? Math.min(0, qA) : Math.min(0, qB));   // retour d'air vers le réseau

    // ---------- Intégration des quantités d'air ----------
    this.pCuve += (qComp - qSoupape - qAlim) * h / K.V_CUVE;
    this.pCuve = Math.max(P_ATM, this.pCuve);
    const dReseau = (qAlim - qVanne - qFuite - qConsoReseau - qRetourReseau) * h / K.V_RESEAU;
    this.pReseau = Math.max(P_ATM, this.pReseau + dReseau);
    this.nA += (qA - qInterne) * h;
    this.nB += (qB + qInterne) * h;
    this.nA = Math.max(0.05 * this._volA(), this.nA);
    this.nB = Math.max(0.05 * this._volB(), this.nB);
    this.n2 = Math.max(0.05 * this._vol2(), this.n2 + q2 * h);

    // ---------- Mécanique du vérin vertical ----------
    const L = K.COURSE / 1000;
    const m = K.MASSE_MOBILE + c.charge;
    const fP = (this.pA - P_ATM) * 1e5 * S_PISTON * 1e-6 - (this.pB - P_ATM) * 1e5 * S_ANNULAIRE * 1e-6;
    const fNet = fP - m * G - 60 * this.v;             // + amortissement visqueux des joints
    if (Math.abs(this.v) < 1e-3 && Math.abs(fNet) <= K.FROTTEMENT) {
      this.v = 0;                                      // adhérence des joints : la tige ne bouge pas
    } else {
      const sens = Math.abs(this.v) >= 1e-3 ? Math.sign(this.v) : Math.sign(fNet);
      this.v += (fNet - K.FROTTEMENT * sens) / m * h;
    }
    this.x += this.v * h;
    if (this.x > 0.0005 && this.x < L - 0.0005) this._b1 = false;
    if (this.x <= 0) { this.x = 0; if (this.v < 0) { this._choc1 = Math.max(this._choc1, this._choc(-this.v, 'b1')); this.v = 0; } }
    if (this.x >= L) { this.x = L; if (this.v > 0) { this._choc1 = Math.max(this._choc1, this._choc(this.v, 'b1')); this.v = 0; } }

    // ---------- Mécanique du vérin simple effet (horizontal, rappel par ressort) ----------
    const L2 = K.COURSE2 / 1000;
    const fRessort = pn.ressort ? 0 : K.RESSORT0 + K.RESSORT_K * this.x2;
    const fNet2 = (this.p2 - P_ATM) * 0.1 * S_PISTON2 - fRessort - 20 * this.v2;
    if (Math.abs(this.v2) < 1e-3 && Math.abs(fNet2) <= K.FROTTEMENT2) this.v2 = 0;
    else {
      const sens2 = Math.abs(this.v2) >= 1e-3 ? Math.sign(this.v2) : Math.sign(fNet2);
      this.v2 += (fNet2 - K.FROTTEMENT2 * sens2) / K.MASSE2 * h;
    }
    this.x2 += this.v2 * h;
    if (this.x2 > 0.0005 && this.x2 < L2 - 0.0005) this._b2 = false;
    if (this.x2 <= 0) { this.x2 = 0; if (this.v2 < 0) { this._choc2 = Math.max(this._choc2, this._choc(-this.v2, 'b2')); this.v2 = 0; } }
    if (this.x2 >= L2) { this.x2 = L2; if (this.v2 > 0) { this._choc2 = Math.max(this._choc2, this._choc(this.v2, 'b2')); this.v2 = 0; } }
    // Le mouvement change les volumes : n est conservé, la pression varie en conséquence
    this._tempsArret = Math.abs(this.v) < 0.002 ? (this._tempsArret || 0) + h : 0;

    // ---------- Capteurs, pilotage du distributeur ----------
    const s1 = this.x < 0.003;
    const s2 = !pn.capteur && this.x > L - 0.003;
    const pilotage = bar(this.pReseau) >= K.P_PILOTAGE;
    const p14auto = c.auto && pilotage && s1;
    const p12auto = c.auto && pilotage && s2;
    this.impulsion[14] = Math.max(0, this.impulsion[14] - h);
    this.impulsion[12] = Math.max(0, this.impulsion[12] - h);
    const p14 = p14auto || this.impulsion[14] > 0;
    const p12 = p12auto || this.impulsion[12] > 0;
    r.capteur1 = s1; r.capteur2 = s2; r.pilote14 = p14; r.pilote12 = p12;
    r.signalBloquant = p14 && p12;
    let vers = this.dist;
    if (p14 && !p12) vers = 1;
    else if (p12 && !p14) vers = -1;
    if (vers !== this.dist) {
      // Eau dans le circuit : le tiroir colle, il commute avec retard
      const retard = pn.eau ? 1.4 : 0.02;
      if (!this.commutation || this.commutation.vers !== vers) this.commutation = { vers, t: retard };
    } else if (this.commutation && this.commutation.vers !== vers) this.commutation = null;
    if (this.commutation) {
      this.commutation.t -= h;
      if (this.commutation.t <= 0) { this.dist = this.commutation.vers; this.commutation = null; this._commute = true; }
    }

    cumul.comp += qComp * h; cumul.reseau += (qConsoReseau + qFuite) * h; cumul.fuite += qFuite * h;
    cumul.e3 += Math.max(0, e3) * h; cumul.e5 += Math.max(0, e5) * h; cumul.soupape += qSoupape * h; cumul.vanne += Math.max(0, qVanne) * h;
    cumul.A += qA * h; cumul.B += qB * h;
    cumul.q2 += q2 * h; cumul.er += qER * h; cumul.be += qBE * h;
    this._consoCycle = (this._consoCycle || 0) + qConsoReseau * h;
  }

  /* Vitesse d'impact en butée (m/s) ; une tige déjà en appui sur sa butée ne « choque » pas */
  _choc(v, cle) {
    const deja = this['_' + cle];
    this['_' + cle] = true;
    return !deja && v > 0.03 ? v : 0;
  }

  /* Durée et consommation d'un cycle complet (sortie puis rentrée) */
  _suivreCycle(dt) {
    const cy = this._cycle;
    cy.t += dt;
    if (this.position > 0.985) cy.sortiFait = true;
    if (cy.sortiFait && this.position < 0.015) {
      this.cycles++;
      this.dureeCycle = cy.t;
      this.conso = (this._consoCycle || 0) / P_ATM;
      cy.t = 0; cy.sortiFait = false; this._consoCycle = 0;
    } else if (!cy.sortiFait && this.position < 0.015) {
      cy.t = 0; this._consoCycle = 0;
    }
  }

  /* État de chaque conduite (couleur et débit) pour la 3D et le schéma.
     type : 'pression' (air comprimé), 'echap' (air qui s'échappe), 'repos' (à l'atmosphère) */
  _lignes() {
    const r = this.res, L = r.lignes;
    const etat = (p, q, echap = false) => {
      if (echap && q < -2) return { type: 'echap', debit: q };
      if (bar(p) > 0.25) return { type: 'pression', debit: q };
      return { type: Math.abs(q) > 2 ? 'echap' : 'repos', debit: q };
    };
    L.cuve = { type: this.compresseurTourne ? 'pression' : (bar(this.pCuve) > 0.25 ? 'pression' : 'repos'), debit: r.qCompresseur };
    L.alim = etat(this.cmd.vanne ? this.pCuve : P_ATM, this.cmd.vanne ? r.qReseau : 0);
    L.reseau = etat(this.pReseau, r.qReseau);
    L.ligneA = etat(this.pA, r.qA, true);
    L.ligneB = etat(this.pB, r.qB, true);
    L.pilote14 = { type: r.capteur1 && this.cmd.auto && bar(this.pReseau) > 0.25 ? 'pression' : 'repos', debit: 0 };
    L.pilote12 = { type: r.capteur2 && this.cmd.auto && bar(this.pReseau) > 0.25 ? 'pression' : 'repos', debit: 0 };
    const alimAuto = this.cmd.auto && bar(this.pReseau) > 0.25 ? 'pression' : 'repos';
    L.alimSel = { type: bar(this.pReseau) > 0.25 ? 'pression' : 'repos', debit: 0 };
    L.alimCapteurs = { type: alimAuto, debit: 0 };
    L.alim2 = etat(this.pReseau, Math.max(0, r.q2));
    // Tube bouton → vérin : sous pression quand on appuie ; à l'échappement rapide, il se vide à peine
    L.ligne2 = this.cmd.bouton ? etat(this.p2, r.q2) : etat(this.pannes.echapRapide ? this.p2 : P_ATM, this.pannes.echapRapide ? r.q2 : 0, true);
  }

  _messages() {
    const r = this.res, c = this.cmd, pn = this.pannes;
    const f = (v, d = 1) => v.toFixed(d).replace('.', ',');
    const pRes = bar(this.pReseau), pCuve = bar(this.pCuve);
    let m = '', a = '', vert = false;
    const enMouvement = Math.abs(this.v) > 0.004;
    if (!c.vanne) {
      m = pRes > 0.3
        ? 'Vanne d\'arrivée fermée : le circuit se vide par l\'échappement de la vanne 3/2…'
        : 'Vanne d\'arrivée fermée : circuit coupé ET mis à l\'échappement (pression réseau à 0). C\'est la consignation pneumatique avant toute intervention. Attention : une charge suspendue peut descendre !';
      if (pRes < 0.3) { a = '🔒 Circuit à l\'échappement'; vert = true; }
    } else if (pCuve < 1 && !this.compresseurTourne) {
      m = 'La cuve est vide. Mettez le compresseur en marche : il gonfle la cuve jusqu\'à ' + CARAC.P_COUPURE + ' bar puis s\'arrête (pressostat).';
    } else if (r.signalBloquant) {
      m = 'Les deux pilotes 14 et 12 sont actionnés en même temps : le distributeur bistable ne peut pas basculer (signal bloquant). Relâchez la commande opposée.';
    } else if (this.commutation) {
      m = 'Le tiroir du distributeur colle : il bascule avec retard…';
    } else if (r.cale) {
      m = 'Le vérin cale : effort disponible F = p × S = ' + f(pRes) + ' bar × ' + Math.round(S_PISTON) + ' mm² ≈ ' + Math.round(r.fDispo) +
          ' N, inférieur au poids à soulever (' + Math.round(r.fCharge) + ' N) + frottements. Augmentez la pression ou réduisez la charge.';
      a = 'Vérin calé : effort insuffisant';
    } else if (enMouvement && this.v > 0) {
      m = 'Sortie de tige : la chambre A (fond) est alimentée par 1 → 4 ; la chambre B (tige) s\'échappe par son régleur de débit puis 2 → 3. La vitesse de sortie se règle sur le régleur côté tige (échappement).';
    } else if (enMouvement && this.v < 0) {
      m = 'Rentrée de tige : la chambre B est alimentée par 1 → 2 ; la chambre A s\'échappe par son régleur puis 4 → 5. La charge aide à descendre : c\'est l\'étranglement à l\'échappement qui la retient.';
    } else if (this.dist > 0 && this.position > 0.98) {
      m = 'Tige sortie : la chambre A reste à la pression du réseau (' + f(pRes) + ' bar) et maintient la charge. Distributeur bistable : il garde sa position sans commande (mémoire).';
    } else if (this.position < 0.02) {
      m = c.auto ? 'Cycle automatique : 1S1 (tige rentrée) pilote 14 → sortie ; 1S2 (tige sortie) pilote 12 → rentrée.'
                 : 'Tige rentrée. Commandez « Sortie » (pilote 14) ou lancez le cycle automatique. Les régleurs de débit règlent les vitesses.';
    } else {
      m = 'Pression réseau ' + f(pRes) + ' bar (consigne ' + f(c.reglage) + ' bar).';
    }
    if (c.bouton && c.vanne) {
      m = this.position2 > 0.98
        ? 'Bouton 2V1 maintenu : le vérin simple effet 2A reste sorti et comprime son ressort. Relâchez : la soupape d\'échappement rapide vide le vérin directement, le ressort le ramène vite.'
        : 'Bouton 2V1 enfoncé : 1 → 2, l\'air traverse la soupape d\'échappement rapide et pousse le piston contre le ressort.';
    } else if (!c.bouton && this.position2 > 0.02 && Math.abs(this.v2) > 0.004) {
      m = this.pannes.echapRapide
        ? 'Bouton relâché : l\'air du vérin 2A doit revenir par le tube et le petit échappement du bouton : le retour est lent.'
        : 'Bouton relâché : la soupape d\'échappement rapide bascule, l\'air du vérin 2A sort directement à l\'atmosphère : retour rapide par le ressort.';
    }
    if (!a && !c.bouton && this.position2 > 0.9 && bar(this.p2) < 0.3 && this.pannes.ressort) a = 'Vérin 2A resté sorti : ressort de rappel ?';
    if (!a) {
      if (this.soupapeOuverte) a = 'Soupape de sûreté ouverte : cuve à ' + f(pCuve) + ' bar !';
      if (!a && c.vanne && pRes < c.reglage - 1.2 && enMouvement) a = 'Chute de pression en mouvement (' + f(pRes) + ' bar)';
      if (!a && c.vanne && pCuve < CARAC.P_ENCLENCHE - 1 && this.compresseurTourne) a = 'Le compresseur ne suit pas (cuve ' + f(pCuve) + ' bar)';
      if (!a && this.tauxMarche > 0.8 && this.temps > 40) a = 'Compresseur en marche ' + Math.round(this.tauxMarche * 100) + ' % du temps';
    }
    r.message = m; r.alerte = a; r.alerteVerte = vert;
  }
}
