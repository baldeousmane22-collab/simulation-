/* =====================================================================
   calculs.js — Formules des engrenages (normes ISO, angle de pression 20°)
   ---------------------------------------------------------------------
   Chaque type renvoie des lignes « grandeur / formule / application
   numérique / résultat » pour l'onglet Calculs, des alertes et les
   vitesses utilisées par l'animation 3D.
   ===================================================================== */

export const MODULES = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
export const ALPHA_DEG = 20;
const RAD = Math.PI / 180;
const TAN_A = Math.tan(ALPHA_DEG * RAD);

/* Paramètres réglables : libellé, bornes, pas, unité */
const P = {
  m:   { lab: 'Module m', unite: 'mm', module: true },
  Z1:  { lab: 'Dents du pignon menant Z1', min: 8, max: 60, pas: 1 },
  Z2:  { lab: 'Dents de la roue menée Z2', min: 8, max: 120, pas: 1 },
  n1:  { lab: 'Vitesse d\'entrée n1', min: 50, max: 3000, pas: 10, unite: 'tr/min' },
  P:   { lab: 'Puissance d\'entrée P', min: 0.1, max: 50, pas: 0.1, unite: 'kW' },
  eta: { lab: 'Rendement par engrènement η', min: 0.90, max: 0.99, pas: 0.01 }
};
const avec = (cle, sur) => ({ ...P[cle], ...sur });

export const TYPES = {
  droite: {
    nom: 'Cylindrique à denture droite', court: 'Denture droite', icone: '⚙️',
    params: { m: P.m, Z1: P.Z1, Z2: P.Z2, n1: P.n1, P: P.P, eta: P.eta },
    defauts: { m: 2, Z1: 20, Z2: 40, n1: 1450, P: 3, eta: 0.98 }
  },
  helicoidale: {
    nom: 'Cylindrique à denture hélicoïdale', court: 'Hélicoïdale', icone: '🌀',
    params: { m: avec('m', { lab: 'Module réel (normal) mn' }), Z1: P.Z1, Z2: P.Z2,
      beta: { lab: 'Angle d\'hélice β', min: 8, max: 30, pas: 1, unite: '°' }, n1: P.n1, P: P.P, eta: P.eta },
    defauts: { m: 2, Z1: 20, Z2: 45, beta: 20, n1: 1450, P: 3, eta: 0.98 }
  },
  interieur: {
    nom: 'Engrenage intérieur (couronne)', court: 'Intérieur', icone: '⭕',
    params: { m: P.m, Z1: P.Z1, Z2: avec('Z2', { lab: 'Dents de la couronne Z2', min: 30, max: 120 }), n1: P.n1, P: P.P, eta: P.eta },
    defauts: { m: 2, Z1: 18, Z2: 54, n1: 1450, P: 3, eta: 0.98 }
  },
  cremaillere: {
    nom: 'Pignon et crémaillère', court: 'Crémaillère', icone: '📏',
    params: { m: P.m, Z1: avec('Z1', { lab: 'Dents du pignon Z' }),
      n1: avec('n1', { lab: 'Vitesse du pignon n', min: 5, max: 600, pas: 5 }), P: P.P, eta: P.eta },
    defauts: { m: 2, Z1: 20, n1: 60, P: 1, eta: 0.97 }
  },
  conique: {
    nom: 'Engrenage conique (renvoi d\'angle 90°)', court: 'Conique', icone: '📐',
    params: { m: avec('m', { lab: 'Module (grand diamètre) m' }), Z1: P.Z1, Z2: P.Z2, n1: P.n1, P: P.P, eta: avec('eta', { min: 0.90, max: 0.98 }) },
    defauts: { m: 3, Z1: 18, Z2: 30, n1: 1450, P: 3, eta: 0.96 }
  },
  vis: {
    nom: 'Roue et vis sans fin', court: 'Vis sans fin', icone: '🔩',
    params: { m: avec('m', { lab: 'Module axial m' }),
      Zf: { lab: 'Nombre de filets de la vis Zf', min: 1, max: 4, pas: 1 },
      Z2: avec('Z2', { lab: 'Dents de la roue Z2', min: 20, max: 80 }),
      q: { lab: 'Coefficient diamétral q = d1/m', min: 6, max: 16, pas: 1 },
      f: { lab: 'Coefficient de frottement f', min: 0.02, max: 0.15, pas: 0.01 },
      n1: P.n1, P: P.P },
    defauts: { m: 3, Zf: 1, Z2: 30, q: 10, f: 0.05, n1: 1450, P: 1.5 }
  },
  train: {
    nom: 'Train d\'engrenages à 2 étages', court: 'Train simple', icone: '🔗',
    params: { m: P.m, Z1: avec('Z1', { lab: 'Z1 (menant, arbre d\'entrée)' }), Z2: avec('Z2', { lab: 'Z2 (mené, arbre intermédiaire)' }),
      Z3: avec('Z1', { lab: 'Z3 (menant, arbre intermédiaire)' }), Z4: avec('Z2', { lab: 'Z4 (mené, arbre de sortie)' }),
      n1: P.n1, P: P.P, eta: P.eta },
    defauts: { m: 2, Z1: 17, Z2: 40, Z3: 18, Z4: 45, n1: 1450, P: 3, eta: 0.98 }
  },
  epicycloidal: {
    nom: 'Train épicycloïdal (planétaire)', court: 'Épicycloïdal', icone: '🪐',
    params: { m: P.m, Zs: avec('Z1', { lab: 'Dents du planétaire (soleil) Zs', min: 12, max: 40 }),
      Zp: avec('Z1', { lab: 'Dents des satellites Zp', min: 12, max: 40 }), n1: P.n1, P: P.P, eta: avec('eta', { lab: 'Rendement global η', min: 0.90, max: 0.99 }) },
    defauts: { m: 2, Zs: 18, Zp: 18, n1: 1450, P: 3, eta: 0.97 }
  }
};

/* ---------- Mise en forme française ---------- */
export function fmt(x, dec = 2) {
  if (!isFinite(x)) return '—';
  const f = 10 ** dec;
  let s = (Math.round(x * f) / f).toString();
  if (s.includes('e')) s = x.toFixed(dec);
  const [e, d] = s.split('.');
  const ent = e.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return d ? ent + ',' + d : ent;
}
const T = (titre) => ({ titre });
const L = (g, f, an, r) => ({ g, f, an, r });

/* Puissance, couples et efforts communs à tous les types */
function energie(lignes, v, ne, ns, dMenant, eta, nomS = '2') {
  const w1 = Math.PI * ne / 30, w2 = Math.PI * ns / 30;
  const Pw = v.P * 1000, C1 = Pw / w1, P2 = Pw * eta, C2 = P2 / w2;
  lignes.push(T('Puissance, couples et efforts'),
    L('Vitesse angulaire d\'entrée', 'ω1 = π·n1 / 30', `π × ${fmt(ne, 1)} / 30`, fmt(w1) + ' rad/s'),
    L('Couple d\'entrée', 'C1 = P / ω1', `${fmt(Pw, 0)} / ${fmt(w1)}`, fmt(C1) + ' N·m'),
    L('Puissance de sortie', 'P' + nomS + ' = η·P', `${fmt(eta, 4)} × ${fmt(Pw, 0)}`, fmt(P2 / 1000, 3) + ' kW'),
    L('Couple de sortie', 'C' + nomS + ' = P' + nomS + ' / ω' + nomS, `${fmt(P2, 0)} / ${fmt(w2, 3)}`, fmt(C2) + ' N·m'));
  if (dMenant) {
    const Ft = 2000 * C1 / dMenant;
    lignes.push(L('Effort tangentiel sur la denture', 'Ft = 2·C1 / d1', `2 × ${fmt(C1)} / ${fmt(dMenant / 1000, 4)}`, fmt(Ft, 0) + ' N'));
    return { C1, C2, Ft, w1, w2 };
  }
  return { C1, C2, w1, w2 };
}

function dimsRoue(lignes, i, Z, m, d) {
  lignes.push(
    L(`Diamètre primitif d${i}`, `d${i} = m·Z${i}`, `${fmt(m)} × ${Z}`, fmt(d) + ' mm'),
    L(`Diamètre de tête da${i}`, `da${i} = d${i} + 2m`, `${fmt(d)} + 2 × ${fmt(m)}`, fmt(d + 2 * m) + ' mm'),
    L(`Diamètre de pied df${i}`, `df${i} = d${i} − 2,5m`, `${fmt(d)} − 2,5 × ${fmt(m)}`, fmt(d - 2.5 * m) + ' mm'));
}
function dimsCommunes(lignes, m) {
  const p = Math.PI * m;
  lignes.push(T('Denture (commune aux deux roues)'),
    L('Pas primitif', 'p = π·m', `π × ${fmt(m)}`, fmt(p) + ' mm'),
    L('Saillie', 'ha = m', '', fmt(m) + ' mm'),
    L('Creux', 'hf = 1,25·m', `1,25 × ${fmt(m)}`, fmt(1.25 * m) + ' mm'),
    L('Hauteur de dent', 'h = ha + hf = 2,25·m', `2,25 × ${fmt(m)}`, fmt(2.25 * m) + ' mm'),
    L('Épaisseur de dent = intervalle', 'e = s = p / 2', `${fmt(p)} / 2`, fmt(p / 2) + ' mm'),
    L('Largeur de denture conseillée', 'b ≈ k·m (k = 8 à 12)', `10 × ${fmt(m)}`, fmt(10 * m) + ' mm'));
}
function interference(alertes, Z, nom) {
  if (Z < 17) alertes.push(`${nom} = ${Z} < 17 dents : risque d'interférence de taillage (dents affaiblies à la base). Il faut Z ≥ 17 ou une denture déportée.`);
}
function sens(meme) { return meme ? 'même sens' : 'sens inverse'; }

/* ---------- Calcul principal ---------- */
export function calculer(type, v) {
  const l = [], al = [];
  const m = v.m;
  let res = {};
  if (type === 'droite' || type === 'helicoidale' || type === 'interieur') {
    const { Z1, Z2 } = v;
    const heli = type === 'helicoidale', inter = type === 'interieur';
    let mt = m, beta = 0;
    if (heli) {
      beta = v.beta * RAD; mt = m / Math.cos(beta);
      l.push(T('Hélice'),
        L('Module apparent (transversal)', 'mt = mn / cos β', `${fmt(m)} / cos ${v.beta}°`, fmt(mt, 3) + ' mm'),
        L('Pas réel (normal)', 'pn = π·mn', `π × ${fmt(m)}`, fmt(Math.PI * m) + ' mm'),
        L('Pas apparent', 'pt = π·mt', `π × ${fmt(mt, 3)}`, fmt(Math.PI * mt) + ' mm'),
        L('Pas de l\'hélice de la roue 1', 'pz1 = π·d1 / tan β', `π × ${fmt(mt * Z1)} / tan ${v.beta}°`, fmt(Math.PI * mt * Z1 / Math.tan(beta), 1) + ' mm'),
        L('Nombre de dents fictif', 'Zv = Z / cos³β', `${Z1} / cos³${v.beta}°`, fmt(Z1 / Math.cos(beta) ** 3, 1) + ' dents'));
    }
    const d1 = mt * Z1, d2 = mt * Z2;
    l.push(T('Roue 1 (pignon menant)'));
    if (heli) {
      l.push(L('Diamètre primitif d1', 'd1 = mt·Z1', `${fmt(mt, 3)} × ${Z1}`, fmt(d1) + ' mm'),
        L('Diamètre de tête da1', 'da1 = d1 + 2mn', `${fmt(d1)} + 2 × ${fmt(m)}`, fmt(d1 + 2 * m) + ' mm'),
        L('Diamètre de pied df1', 'df1 = d1 − 2,5mn', `${fmt(d1)} − 2,5 × ${fmt(m)}`, fmt(d1 - 2.5 * m) + ' mm'));
    } else dimsRoue(l, 1, Z1, m, d1);
    l.push(L('Diamètre de base db1', 'db1 = d1·cos α', `${fmt(d1)} × cos 20°`, fmt(d1 * Math.cos(20 * RAD)) + ' mm'));
    l.push(T(inter ? 'Roue 2 (couronne à denture intérieure)' : 'Roue 2 (roue menée)'));
    if (inter) {
      l.push(L('Diamètre primitif d2', 'd2 = m·Z2', `${fmt(m)} × ${Z2}`, fmt(d2) + ' mm'),
        L('Diamètre de tête da2 (intérieur)', 'da2 = d2 − 2m', `${fmt(d2)} − 2 × ${fmt(m)}`, fmt(d2 - 2 * m) + ' mm'),
        L('Diamètre de pied df2 (extérieur)', 'df2 = d2 + 2,5m', `${fmt(d2)} + 2,5 × ${fmt(m)}`, fmt(d2 + 2.5 * m) + ' mm'));
    } else if (heli) {
      l.push(L('Diamètre primitif d2', 'd2 = mt·Z2', `${fmt(mt, 3)} × ${Z2}`, fmt(d2) + ' mm'),
        L('Diamètre de tête da2', 'da2 = d2 + 2mn', `${fmt(d2)} + 2 × ${fmt(m)}`, fmt(d2 + 2 * m) + ' mm'),
        L('Diamètre de pied df2', 'df2 = d2 − 2,5mn', `${fmt(d2)} − 2,5 × ${fmt(m)}`, fmt(d2 - 2.5 * m) + ' mm'));
    } else dimsRoue(l, 2, Z2, m, d2);
    dimsCommunes(l, m);
    const a = inter ? (d2 - d1) / 2 : (d1 + d2) / 2;
    const n2 = v.n1 * Z1 / Z2;
    l.push(T('Entraxe et rapport'),
      inter ? L('Entraxe', 'a = m·(Z2 − Z1) / 2', `${fmt(mt, 3)} × (${Z2} − ${Z1}) / 2`, fmt(a) + ' mm')
            : L('Entraxe', heli ? 'a = mn·(Z1 + Z2) / (2·cos β)' : 'a = m·(Z1 + Z2) / 2',
                heli ? `${fmt(m)} × (${Z1} + ${Z2}) / (2 × cos ${v.beta}°)` : `${fmt(m)} × (${Z1} + ${Z2}) / 2`, fmt(a) + ' mm'),
      L('Rapport de transmission', 'r = n2 / n1 = Z1 / Z2', `${Z1} / ${Z2}`, fmt(Z1 / Z2, 4)),
      L('Rapport de réduction', 'i = Z2 / Z1', `${Z2} / ${Z1}`, fmt(Z2 / Z1, 3)),
      L('Vitesse de sortie', 'n2 = n1·Z1 / Z2', `${fmt(v.n1, 0)} × ${Z1} / ${Z2}`, fmt(n2, 1) + ' tr/min'),
      L('Sens de rotation', inter ? 'contact intérieur' : 'contact extérieur', '', sens(inter)),
      L('Vitesse linéaire au primitif', 'v = π·d1·n1 / 60 000', `π × ${fmt(d1)} × ${fmt(v.n1, 0)} / 60 000`, fmt(Math.PI * d1 * v.n1 / 60000) + ' m/s'));
    const e = energie(l, v, v.n1, n2, d1, v.eta);
    l.push(L('Effort radial', heli ? 'Fr = Ft·tan α / cos β' : 'Fr = Ft·tan α', heli ? `${fmt(e.Ft, 0)} × tan 20° / cos ${v.beta}°` : `${fmt(e.Ft, 0)} × tan 20°`,
      fmt(e.Ft * TAN_A / Math.cos(beta), 0) + ' N'));
    if (heli) l.push(L('Effort axial (poussée)', 'Fa = Ft·tan β', `${fmt(e.Ft, 0)} × tan ${v.beta}°`, fmt(e.Ft * Math.tan(beta), 0) + ' N'),
      L('Sens des hélices', 'roues extérieures', '', 'hélices de sens contraires'));
    interference(al, Z1, 'Z1');
    if (inter && Z2 - Z1 < 10) al.push(`Z2 − Z1 = ${Z2 - Z1} < 10 : risque d'interférence entre le pignon et la couronne.`);
    if (!inter && Z2 / Z1 > 7) al.push(`Rapport i = ${fmt(Z2 / Z1)} > 7 : préférer un train à deux étages.`);
    res = { a, d1, d2, n2, mt, betaRad: beta, ratio: Z1 / Z2, sensInverse: !inter };
  }
  else if (type === 'cremaillere') {
    const Z = v.Z1, d = m * Z, p = Math.PI * m, Lt = Math.PI * d;
    const vit = Lt * v.n1 / 60000;
    l.push(T('Pignon'));
    dimsRoue(l, '', Z, m, d);
    l.push(T('Crémaillère'),
      L('Pas de la crémaillère', 'p = π·m', `π × ${fmt(m)}`, fmt(p) + ' mm'),
      L('Saillie / creux', 'ha = m ; hf = 1,25·m', '', `${fmt(m)} / ${fmt(1.25 * m)} mm`),
      L('Angle des flancs', 'flancs droits inclinés de α', '', '20°'),
      T('Mouvement'),
      L('Déplacement par tour de pignon', 'L = π·d = p·Z', `π × ${fmt(d)}`, fmt(Lt) + ' mm'),
      L('Vitesse de la crémaillère', 'V = π·d·n / 60 000', `π × ${fmt(d)} × ${fmt(v.n1, 0)} / 60 000`, fmt(vit, 3) + ' m/s'),
      L('Tours pour 1 mètre de course', 'N = 1000 / L', `1000 / ${fmt(Lt)}`, fmt(1000 / Lt) + ' tr'));
    const w = Math.PI * v.n1 / 30, C = v.P * 1000 / w, F = 2000 * C / d;
    l.push(T('Puissance et effort'),
      L('Vitesse angulaire du pignon', 'ω = π·n / 30', `π × ${fmt(v.n1, 0)} / 30`, fmt(w, 3) + ' rad/s'),
      L('Couple sur le pignon', 'C = P / ω', `${fmt(v.P * 1000, 0)} / ${fmt(w, 3)}`, fmt(C) + ' N·m'),
      L('Effort de poussée', 'F = 2·C / d', `2 × ${fmt(C)} / ${fmt(d / 1000, 4)}`, fmt(F, 0) + ' N'),
      L('Contrôle par la puissance', 'F = η·P / V', `${fmt(v.eta)} × ${fmt(v.P * 1000, 0)} / ${fmt(vit, 3)}`, fmt(v.eta * v.P * 1000 / vit, 0) + ' N utile'));
    interference(al, Z, 'Z');
    res = { d, p, vit };
  }
  else if (type === 'conique') {
    const { Z1, Z2 } = v, d1 = m * Z1, d2 = m * Z2;
    const delta1 = Math.atan(Z1 / Z2), delta2 = Math.PI / 2 - delta1;
    const Lc = d1 / (2 * Math.sin(delta1));
    const n2 = v.n1 * Z1 / Z2;
    l.push(T('Cônes primitifs (axes à 90°)'),
      L('Demi-angle du cône du pignon', 'tan δ1 = Z1 / Z2', `tan δ1 = ${Z1} / ${Z2}`, fmt(delta1 / RAD, 2) + '°'),
      L('Demi-angle du cône de la roue', 'δ2 = 90° − δ1', `90 − ${fmt(delta1 / RAD, 2)}`, fmt(delta2 / RAD, 2) + '°'),
      L('Diamètre primitif d1', 'd1 = m·Z1', `${fmt(m)} × ${Z1}`, fmt(d1) + ' mm'),
      L('Diamètre primitif d2', 'd2 = m·Z2', `${fmt(m)} × ${Z2}`, fmt(d2) + ' mm'),
      L('Diamètre de tête da1', 'da1 = d1 + 2m·cos δ1', `${fmt(d1)} + 2 × ${fmt(m)} × cos ${fmt(delta1 / RAD, 1)}°`, fmt(d1 + 2 * m * Math.cos(delta1)) + ' mm'),
      L('Diamètre de tête da2', 'da2 = d2 + 2m·cos δ2', `${fmt(d2)} + 2 × ${fmt(m)} × cos ${fmt(delta2 / RAD, 1)}°`, fmt(d2 + 2 * m * Math.cos(delta2)) + ' mm'),
      L('Génératrice primitive', 'L = d1 / (2·sin δ1)', `${fmt(d1)} / (2 × sin ${fmt(delta1 / RAD, 1)}°)`, fmt(Lc) + ' mm'),
      L('Largeur de denture maxi', 'b ≤ L / 3', `${fmt(Lc)} / 3`, fmt(Lc / 3) + ' mm'));
    dimsCommunes(l, m);
    l.splice(l.length - 1, 1);
    l.push(T('Rapport'),
      L('Rapport de transmission', 'r = n2 / n1 = Z1 / Z2', `${Z1} / ${Z2}`, fmt(Z1 / Z2, 4)),
      L('Vitesse de sortie', 'n2 = n1·Z1 / Z2', `${fmt(v.n1, 0)} × ${Z1} / ${Z2}`, fmt(n2, 1) + ' tr/min'),
      L('Renvoi d\'angle', 'Σ = δ1 + δ2', '', '90°'));
    const e = energie(l, v, v.n1, n2, d1 - b0(Lc) * Math.sin(delta1), v.eta);
    l[l.length - 1].f = 'Ft = 2·C1 / dm1 (dm1 au milieu de la dent)';
    l[l.length - 1].an = `2 × ${fmt(e.C1)} / ${fmt((d1 - b0(Lc) * Math.sin(delta1)) / 1000, 4)}`;
    l.push(L('Effort radial sur le pignon', 'Fr1 = Ft·tan α·cos δ1', `${fmt(e.Ft, 0)} × tan 20° × cos ${fmt(delta1 / RAD, 1)}°`, fmt(e.Ft * TAN_A * Math.cos(delta1), 0) + ' N'),
      L('Effort axial sur le pignon', 'Fa1 = Ft·tan α·sin δ1', `${fmt(e.Ft, 0)} × tan 20° × sin ${fmt(delta1 / RAD, 1)}°`, fmt(e.Ft * TAN_A * Math.sin(delta1), 0) + ' N'));
    interference(al, Z1, 'Z1');
    res = { d1, d2, delta1, n2, ratio: Z1 / Z2 };
  }
  else if (type === 'vis') {
    const { Zf, Z2, q } = v;
    const px = Math.PI * m, pz = px * Zf, d1 = q * m, d2 = m * Z2, a = (d1 + d2) / 2;
    const gam = Math.atan(Zf / q), phi = Math.atan(v.f);
    const eta = Math.tan(gam) / Math.tan(gam + phi);
    const n2 = v.n1 * Zf / Z2;
    l.push(T('Vis (menante)'),
      L('Pas axial', 'px = π·m', `π × ${fmt(m)}`, fmt(px) + ' mm'),
      L('Pas de l\'hélice (avance par tour)', 'pz = px·Zf', `${fmt(px)} × ${Zf}`, fmt(pz) + ' mm'),
      L('Diamètre primitif de la vis', 'd1 = q·m', `${q} × ${fmt(m)}`, fmt(d1) + ' mm'),
      L('Diamètre extérieur de la vis', 'da1 = d1 + 2m', `${fmt(d1)} + 2 × ${fmt(m)}`, fmt(d1 + 2 * m) + ' mm'),
      L('Diamètre de pied de la vis', 'df1 = d1 − 2,5m', `${fmt(d1)} − 2,5 × ${fmt(m)}`, fmt(d1 - 2.5 * m) + ' mm'),
      L('Angle d\'hélice (inclinaison du filet)', 'tan γ = pz / (π·d1) = Zf / q', `${Zf} / ${q}`, fmt(gam / RAD, 2) + '°'),
      T('Roue (menée)'),
      L('Diamètre primitif de la roue', 'd2 = m·Z2', `${fmt(m)} × ${Z2}`, fmt(d2) + ' mm'),
      L('Diamètre de tête (au col)', 'da2 = d2 + 2m', `${fmt(d2)} + 2 × ${fmt(m)}`, fmt(d2 + 2 * m) + ' mm'),
      L('Entraxe', 'a = (d1 + d2) / 2', `(${fmt(d1)} + ${fmt(d2)}) / 2`, fmt(a) + ' mm'),
      T('Rapport et rendement'),
      L('Rapport de transmission', 'r = n2 / n1 = Zf / Z2', `${Zf} / ${Z2}`, fmt(Zf / Z2, 4)),
      L('Vitesse de la roue', 'n2 = n1·Zf / Z2', `${fmt(v.n1, 0)} × ${Zf} / ${Z2}`, fmt(n2, 1) + ' tr/min'),
      L('Angle de frottement', 'tan φ = f', `tan φ = ${fmt(v.f)}`, fmt(phi / RAD, 2) + '°'),
      L('Rendement (vis menante)', 'η = tan γ / tan(γ + φ)', `tan ${fmt(gam / RAD, 1)}° / tan ${fmt((gam + phi) / RAD, 1)}°`, fmt(eta * 100, 1) + ' %'),
      L('Réversibilité', gam > phi ? 'γ > φ' : 'γ ≤ φ', `${fmt(gam / RAD, 1)}° ${gam > phi ? '>' : '≤'} ${fmt(phi / RAD, 1)}°`,
        gam > phi ? 'réversible' : 'irréversible (la roue ne peut pas entraîner la vis)'));
    energie(l, { ...v }, v.n1, n2, d1, eta);
    l.push(L('Effort axial sur la vis', 'Fa1 = Ft2 = 2·C2 / d2', '', '(= effort tangentiel sur la roue)'));
    const C2 = v.P * 1000 * eta / (Math.PI * n2 / 30);
    l[l.length - 1].an = `2 × ${fmt(C2)} / ${fmt(d2 / 1000, 4)}`;
    l[l.length - 1].r = fmt(2000 * C2 / d2, 0) + ' N';
    if (gam > phi && gam < 2 * phi) al.push('Rendement faible : la vis chauffe. Lubrification abondante obligatoire.');
    if (gam <= phi) al.push('Système irréversible : utile pour un treuil ou un levage (la charge ne redescend pas seule), mais rendement < 50 %.');
    res = { d1, d2, a, gam, n2, eta, pz, px };
  }
  else if (type === 'train') {
    const { Z1, Z2, Z3, Z4 } = v;
    const r = (Z1 * Z3) / (Z2 * Z4), n2 = v.n1 * Z1 / Z2, n4 = v.n1 * r;
    const a12 = m * (Z1 + Z2) / 2, a34 = m * (Z3 + Z4) / 2;
    l.push(T('Diamètres primitifs'),
      L('d1', 'd1 = m·Z1', `${fmt(m)} × ${Z1}`, fmt(m * Z1) + ' mm'),
      L('d2', 'd2 = m·Z2', `${fmt(m)} × ${Z2}`, fmt(m * Z2) + ' mm'),
      L('d3', 'd3 = m·Z3', `${fmt(m)} × ${Z3}`, fmt(m * Z3) + ' mm'),
      L('d4', 'd4 = m·Z4', `${fmt(m)} × ${Z4}`, fmt(m * Z4) + ' mm'),
      L('Entraxe étage 1', 'a12 = m·(Z1 + Z2) / 2', `${fmt(m)} × (${Z1} + ${Z2}) / 2`, fmt(a12) + ' mm'),
      L('Entraxe étage 2', 'a34 = m·(Z3 + Z4) / 2', `${fmt(m)} × (${Z3} + ${Z4}) / 2`, fmt(a34) + ' mm'),
      T('Rapport global'),
      L('Rapport étage 1', 'r1 = Z1 / Z2', `${Z1} / ${Z2}`, fmt(Z1 / Z2, 4)),
      L('Rapport étage 2', 'r2 = Z3 / Z4', `${Z3} / ${Z4}`, fmt(Z3 / Z4, 4)),
      L('Rapport global', 'r = r1·r2 = (Z1·Z3) / (Z2·Z4)', `(${Z1} × ${Z3}) / (${Z2} × ${Z4})`, fmt(r, 4)),
      L('Règle', 'r = (−1)ⁿ · Π Z menantes / Π Z menées', 'n = 2 contacts extérieurs', 'r > 0 : même sens'),
      L('Vitesse arbre intermédiaire', 'n2 = n3 = n1·Z1 / Z2', `${fmt(v.n1, 0)} × ${Z1} / ${Z2}`, fmt(n2, 1) + ' tr/min'),
      L('Vitesse de sortie', 'n4 = n1·r', `${fmt(v.n1, 0)} × ${fmt(r, 4)}`, fmt(n4, 1) + ' tr/min'),
      L('Rendement global', 'ηg = η1·η2 = η²', `${fmt(v.eta)}²`, fmt(v.eta ** 2, 4)));
    energie(l, v, v.n1, n4, m * Z1, v.eta ** 2, '4');
    interference(al, Z1, 'Z1'); interference(al, Z3, 'Z3');
    res = { a12, a34, n2, n4, r };
  }
  else if (type === 'epicycloidal') {
    const { Zs, Zp } = v, Zc = Zs + 2 * Zp;
    const r = Zs / (Zs + Zc), nps = v.n1 * r;
    const npRel = -(v.n1 - nps) * Zs / Zp, npAbs = nps + npRel;
    l.push(T('Géométrie'),
      L('Dents de la couronne', 'Zc = Zs + 2·Zp', `${Zs} + 2 × ${Zp}`, Zc + ' dents'),
      L('Diamètre du planétaire', 'ds = m·Zs', `${fmt(m)} × ${Zs}`, fmt(m * Zs) + ' mm'),
      L('Diamètre des satellites', 'dp = m·Zp', `${fmt(m)} × ${Zp}`, fmt(m * Zp) + ' mm'),
      L('Diamètre primitif de la couronne', 'dc = m·Zc', `${fmt(m)} × ${Zc}`, fmt(m * Zc) + ' mm'),
      L('Entraxe planétaire – satellite', 'a = m·(Zs + Zp) / 2', `${fmt(m)} × (${Zs} + ${Zp}) / 2`, fmt(m * (Zs + Zp) / 2) + ' mm'),
      L('Condition de montage (3 satellites)', '(Zs + Zc) / 3 entier', `(${Zs} + ${Zc}) / 3`, fmt((Zs + Zc) / 3, 2) + ((Zs + Zc) % 3 ? ' ✗' : ' ✓')),
      T('Vitesses (couronne fixe, entrée planétaire, sortie porte-satellites)'),
      L('Formule de Willis', '(ns − nPS) / (nc − nPS) = −Zc / Zs', 'avec nc = 0', ''),
      L('Rapport de transmission', 'r = nPS / ns = Zs / (Zs + Zc)', `${Zs} / (${Zs} + ${Zc})`, fmt(r, 4)),
      L('Rapport de réduction', 'i = 1 + Zc / Zs', `1 + ${Zc} / ${Zs}`, fmt(1 / r, 3)),
      L('Vitesse du porte-satellites', 'nPS = ns·Zs / (Zs + Zc)', `${fmt(v.n1, 0)} × ${fmt(r, 4)}`, fmt(nps, 1) + ' tr/min'),
      L('Rotation des satellites (absolue)', 'np = nPS − (ns − nPS)·Zs / Zp', `${fmt(nps, 1)} − ${fmt(v.n1 - nps, 1)} × ${Zs} / ${Zp}`, fmt(npAbs, 1) + ' tr/min'),
      L('Sens de sortie', 'r > 0', '', 'même sens que l\'entrée'));
    energie(l, v, v.n1, nps, null, v.eta, 'PS');
    l.push(L('Couple de réaction sur la couronne', 'Cc = CPS − Cs', '', ''));
    const Cs = v.P * 1000 / (Math.PI * v.n1 / 30), Cps = v.P * 1000 * v.eta / (Math.PI * nps / 30);
    l[l.length - 1].an = `${fmt(Cps)} − ${fmt(Cs)}`; l[l.length - 1].r = fmt(Cps - Cs) + ' N·m';
    if ((Zs + Zc) % 3) al.push(`(Zs + Zc) / 3 = ${fmt((Zs + Zc) / 3)} n'est pas entier : les 3 satellites ne peuvent pas être montés à 120°. Changez Zs ou Zp.`);
    interference(al, Zs, 'Zs'); interference(al, Zp, 'Zp');
    res = { Zc, r, nps, npAbs, montage: (Zs + Zc) % 3 === 0 };
  }
  return { lignes: l, alertes: al, res };
}
function b0(Lc) { return Lc / 3.5; }
