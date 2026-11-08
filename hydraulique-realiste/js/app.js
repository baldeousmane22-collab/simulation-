/* =====================================================================
   app.js — Interface de la simulation hydraulique réaliste
   Boucle : physique (sous-pas de 40 µs) → scène 3D → mesures / courbes.
   ===================================================================== */
import { Circuit, PANNES, SA, SB, CARAC } from './physique.js';
import { SceneHydraulique } from './scene3d.js';
import { Sons } from './sons.js';

const $ = (id) => document.getElementById(id);
const fmt = (v, d = 0) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

const circuit = new Circuit();
const sons = new Sons();
let scene = null;

const FICHES = {
  reservoir: ['Réservoir 40 L', '<p>Stocke l\'huile, la laisse se décanter (air, impuretés) et évacue une partie de la chaleur. Une chicane sépare le retour de l\'aspiration.</p><ul><li>Volume ≈ 3 à 5 fois le débit de la pompe par minute.</li><li>Voyant de niveau sur la face avant : l\'écume signale de l\'air ou de la cavitation.</li><li>Huile ISO VG 46 : 46 cSt à 40 °C.</li></ul>'],
  moteur: ['Moteur électrique asynchrone', '<p>2,2 kW, 4 pôles, 1450 tr/min. Il entraîne la pompe par l\'accouplement élastique.</p><p>Puissance absorbée : <code>P = p × Q / (600 × η)</code> (P en kW, p en bar, Q en L/min).</p>'],
  accouplement: ['Accouplement élastique', '<p>Relie l\'arbre du moteur à celui de la pompe, à l\'intérieur de la lanterne. L\'étoile en élastomère (orange) absorbe les à-coups et les petits défauts d\'alignement.</p>'],
  pompe: ['Pompe à engrenages extérieurs', '<p>Pompe volumétrique à cylindrée fixe : <b>10 cm³/tr</b>. Débit théorique <code>Q = Cyl × N = 10 × 1450 = 14,5 L/min</code>.</p><p>Une pompe crée un <b>débit</b>, pas une pression : la pression naît de la résistance (charge, butée, limiteur).</p><p>Les fuites internes augmentent avec la pression et la température : c\'est le <b>rendement volumétrique</b>. En vue en coupe, on voit les deux pignons tourner.</p>'],
  limiteur: ['Limiteur de pression (soupape de sûreté)', '<p>Clapet maintenu par un ressort taré. Quand la pression dépasse le tarage, il s\'ouvre et renvoie le débit au réservoir : la pression est limitée.</p><p>Toute l\'énergie qui passe par le limiteur devient de la <b>chaleur</b> : <code>Pertes = p × Q / 600</code>. Bouton jaune = vis de tarage.</p>'],
  filtre: ['Filtre de retour', '<p>Filtre l\'huile qui revient au réservoir (10 µm). L\'indicateur de colmatage passe au rouge quand la contre-pression devient trop forte.</p>'],
  refroidisseur: ['Refroidisseur air/huile', '<p>Échangeur à ailettes avec ventilateur. Il évacue la chaleur produite par les pertes (limiteur, fuites, frottements). Sans lui, l\'huile chauffe, sa viscosité chute et les fuites augmentent.</p>'],
  distributeur: ['Distributeur 4/3 à électroaimants', '<p>4 orifices (P, T, A, B), 3 positions. <b>Y1</b> : P→A et B→T (montée). <b>Y2</b> : P→B et A→T (descente). Au repos, les ressorts ramènent le tiroir au centre.</p><p>Centre <b>fermé</b> : tout est bloqué, la pompe débite par le limiteur (échauffement). Centre <b>tandem</b> : P→T, la pompe est déchargée à basse pression, A et B restent bloqués.</p><p>Le tiroir met ≈ 35 ms à commuter ; le recouvrement évite les fuites au neutre.</p>'],
  reducteur: ['Réducteur de débit unidirectionnel', '<p>Un étrangleur réglable en parallèle avec un clapet anti-retour, sur la ligne A.</p><ul><li>Montée : l\'huile passe librement par le clapet.</li><li>Descente : le clapet se ferme, l\'huile sortant de la chambre A est freinée → la charge ne peut pas « tomber » (réglage <b>au retour</b>).</li></ul>'],
  verin: ['Vérin double effet à tirants', '<p>Alésage Ø50 mm, tige Ø28 mm, course 500 mm. Sections : <code>SA = 19,6 cm²</code>, <code>SB = 13,5 cm²</code>.</p><p>Effort : <code>F = p × S</code> (F en daN, p en bar, S en cm²). Vitesse : <code>v = Q / S</code>. Des amortisseurs freinent le piston sur les 18 derniers mm.</p><p>En vue en coupe : piston, joints (rouge) et huile de chaque chambre colorée selon sa pression.</p>'],
  charge: ['Charge guidée', '<p>Plateau guidé par deux colonnes, chargé de plaques d\'acier de 100 kg. Poids : <code>P = m × g</code>.</p><p>Pour soulever, il faut <code>pA × SA − pB × SB > m × g + frottements</code>.</p>'],
  manometres: ['Manomètres A et B', '<p>Manomètres à bain de glycérine (aiguille amortie), branchés sur les prises de mesure des chambres du vérin par des flexibles capillaires. Ils permettent de diagnostiquer : fuite interne, charge trop lourde, réglage du limiteur…</p>']
};

/* ------------------------------ Mesures ----------------------------- */
const LIGNES = [
  ['pP', 'Pression pompe P', (m) => fmt(m.pP, 1) + ' bar'], ['pA', 'Pression chambre A', (m) => fmt(m.pA, 1) + ' bar'],
  ['pB', 'Pression chambre B', (m) => fmt(m.pB, 1) + ' bar'], ['x', 'Course de la tige', (m) => fmt(m.x) + ' mm'],
  ['v', 'Vitesse de la tige', (m) => fmt(m.v) + ' mm/s'], ['q', 'Débit pompe', (m) => fmt(m.qPompe, 1) + ' L/min'],
  ['ql', 'Débit au limiteur', (m) => fmt(m.qLim, 1) + ' L/min'], ['f', 'Effort hydraulique', (m) => fmt(m.force / 10) + ' daN'],
  ['pu', 'Puissance absorbée', (m) => fmt(m.puissance, 2) + ' kW'], ['pe', 'Pertes (chaleur)', (m) => fmt(m.pertes, 2) + ' kW'],
  ['t', 'Température huile', (m) => fmt(m.temp, 1) + ' °C'], ['nu', 'Viscosité', (m) => fmt(m.nu, 1) + ' cSt'],
  ['asp', 'Aspiration (absolue)', (m) => fmt(m.pAsp, 2) + ' bar'], ['rv', 'Rendement volumétrique', (m) => fmt(m.rendVol * 100) + ' %']
];
const elMes = {};
for (const [id, lib] of LIGNES) {
  const d = document.createElement('div');
  d.innerHTML = `<small>${lib}</small><b>—</b>`;
  $('mesures').appendChild(d);
  elMes[id] = d;
}

/* ------------------------------ Commandes --------------------------- */
const R = circuit.reglages;
function majMoteur() {
  const b = $('b-moteur');
  b.setAttribute('aria-pressed', String(R.moteur));
  b.querySelector('small').textContent = R.moteur ? 'MARCHE' : 'ARRÊT';
}
$('b-moteur').addEventListener('click', () => { R.moteur = !R.moteur; majMoteur(); sons.reveiller(); });

const appuis = { monter: false, descendre: false, clavierHaut: false, clavierBas: false };
function majCommande() {
  const haut = appuis.monter || appuis.clavierHaut, bas = appuis.descendre || appuis.clavierBas;
  if (haut || bas) { $('c-auto').checked = false; auto.actif = false; }
  if (!auto.actif) circuit.commande = haut && !bas ? 1 : bas && !haut ? -1 : 0;
  $('b-monter').classList.toggle('actif', circuit.commande > 0);
  $('b-descendre').classList.toggle('actif', circuit.commande < 0);
}
function boutonMaintenu(id, cle) {
  const b = $(id);
  const on = (e) => { e.preventDefault(); appuis[cle] = true; try { b.setPointerCapture(e.pointerId); } catch (err) { /* sans importance */ } majCommande(); sons.reveiller(); };
  const off = () => { appuis[cle] = false; majCommande(); };
  b.addEventListener('pointerdown', on);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, off);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
boutonMaintenu('b-monter', 'monter');
boutonMaintenu('b-descendre', 'descendre');
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'ArrowUp') { appuis.clavierHaut = true; majCommande(); e.preventDefault(); }
  if (e.key === 'ArrowDown') { appuis.clavierBas = true; majCommande(); e.preventDefault(); }
  if (e.key === 'm' || e.key === 'M') $('b-moteur').click();
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp') { appuis.clavierHaut = false; majCommande(); }
  if (e.key === 'ArrowDown') { appuis.clavierBas = false; majCommande(); }
});
window.addEventListener('blur', () => { for (const k of Object.keys(appuis)) appuis[k] = false; majCommande(); });

function curseur(id, cle, aff, sortie) {
  const r = $(id);
  const maj = () => { R[cle] = Number(r.value); $(sortie).textContent = aff(R[cle]); };
  r.addEventListener('input', maj); maj();
}
curseur('r-tarage', 'pTarage', (v) => v + ' bar', 'v-tarage');
curseur('r-charge', 'charge', (v) => v + ' kg', 'v-charge');
curseur('r-red', 'reducteur', (v) => v + ' %', 'v-red');
curseur('r-ouv', 'ouverture', (v) => v + ' %', 'v-ouv');
$('s-centre').addEventListener('change', (e) => { R.centre = e.target.value; });

const auto = { actif: false };
$('c-auto').addEventListener('change', (e) => {
  auto.actif = e.target.checked;
  if (auto.actif) { if (!R.moteur) { R.moteur = true; majMoteur(); } circuit.commande = 1; } else circuit.commande = 0;
  majCommande();
});
$('c-coupe').addEventListener('change', (e) => scene && scene.setCoupe(e.target.checked));
$('c-huile').addEventListener('change', (e) => { scene && scene.setHuile(e.target.checked); $('legende').hidden = !e.target.checked; });
$('c-etiq').addEventListener('change', (e) => scene && scene.setEtiquettes(e.target.checked));
$('b-reinit').addEventListener('click', () => {
  circuit.reinitialiser(); R.moteur = false; majMoteur();
  $('c-auto').checked = false; auto.actif = false; circuit.commande = 0; majCommande();
  historique.length = 0;
});
$('b-refroidir').addEventListener('click', () => { circuit.temp = 32; });

/* Onglets et panneau repliable */
document.querySelectorAll('[data-onglet]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-onglet]').forEach((x) => x.classList.toggle('actif', x === b));
  document.querySelectorAll('[data-contenu]').forEach((x) => x.classList.toggle('actif', x.dataset.contenu === b.dataset.onglet));
  $('panneau').classList.remove('replie'); $('b-replier').textContent = '▾';
  setTimeout(() => scene && scene.redimensionner(), 0);
}));
$('b-replier').addEventListener('click', () => {
  const p = $('panneau'); p.classList.toggle('replie');
  $('b-replier').textContent = p.classList.contains('replie') ? '▴' : '▾';
  setTimeout(() => scene && scene.redimensionner(), 0);
});
document.querySelectorAll('[data-vue]').forEach((b) => b.addEventListener('click', () => scene && scene.vue(b.dataset.vue)));
$('b-son').addEventListener('click', () => {
  const on = !sons.actif; sons.activer(on);
  $('b-son').setAttribute('aria-pressed', String(on)); $('b-son').textContent = on ? '🔊' : '🔇';
});
$('b-plein').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
});

/* Fiches */
function ouvrirFiche(id) {
  const f = FICHES[id]; if (!f) return;
  $('fiche-titre').textContent = f[0];
  $('fiche-texte').innerHTML = f[1];
  $('fiche').hidden = false;
  $('fiche-fermer').focus();
}
$('fiche-fermer').addEventListener('click', () => { $('fiche').hidden = true; });
$('fiche').addEventListener('click', (e) => { if (e.target.id === 'fiche') $('fiche').hidden = true; });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('fiche').hidden = true; });

/* ------------------------------- Pannes ----------------------------- */
const elPannes = {};
for (const [cle, p] of Object.entries(PANNES)) {
  const d = document.createElement('div'); d.className = 'panne';
  d.innerHTML = `<label><input type="checkbox"> <span></span></label><p></p>`;
  d.querySelector('span').textContent = p.nom;
  d.querySelector('p').textContent = 'Symptômes : ' + p.symptome;
  const cb = d.querySelector('input');
  cb.addEventListener('change', () => { circuit.pannes[cle] = cb.checked; d.classList.toggle('active', cb.checked); });
  $('liste-pannes').appendChild(d);
  elPannes[cle] = { d, cb };
}
function toutesPannesOff() {
  for (const [cle, e] of Object.entries(elPannes)) { circuit.pannes[cle] = false; e.cb.checked = false; e.d.classList.remove('active'); }
}
let mystere = null;
$('b-mystere').addEventListener('click', () => {
  toutesPannesOff();
  const cles = Object.keys(PANNES);
  mystere = cles[Math.floor(Math.random() * cles.length)];
  circuit.pannes[mystere] = true;
  if (!R.moteur) { R.moteur = true; majMoteur(); }
  const choix = $('mystere-choix'); choix.innerHTML = ''; choix.hidden = false;
  $('mystere-res').hidden = true;
  for (const c of cles.sort(() => Math.random() - 0.5)) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = PANNES[c].nom;
    b.addEventListener('click', () => {
      const ok = c === mystere, p = PANNES[mystere];
      const r = $('mystere-res'); r.hidden = false;
      r.innerHTML = `<b style="color:${ok ? 'var(--vert)' : 'var(--rouge)'}">${ok ? '✅ Bon diagnostic !' : '❌ Ce n\'est pas ça.'}</b><br>`
        + `La panne était : <b class="n"></b><br>Cause : <span class="c"></span><br>Remède : <span class="r"></span>`;
      r.querySelector('.n').textContent = p.nom;
      r.querySelector('.c').textContent = p.cause; r.querySelector('.r').textContent = p.remede;
      choix.hidden = true; circuit.pannes[mystere] = false; mystere = null;
    });
    choix.appendChild(b);
  }
});

/* ------------------------------ Courbes ----------------------------- */
const historique = [];
let oscFige = false, tEchant = 0;
$('b-pause-osc').addEventListener('click', () => {
  oscFige = !oscFige; $('b-pause-osc').textContent = oscFige ? '▶ Reprendre' : '⏸ Figer les courbes';
});
function dessinerOscillo() {
  const c = $('oscillo'); if (!c.offsetParent) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const pMax = Math.max(160, R.pTarage * 1.25), mg = 30;
  g.strokeStyle = '#1f2a36'; g.fillStyle = '#6b7a8c'; g.font = '10px system-ui'; g.lineWidth = 1;
  for (let p = 0; p <= pMax; p += 40) {
    const y = h - 14 - (h - 24) * p / pMax;
    g.beginPath(); g.moveTo(mg, y); g.lineTo(w, y); g.stroke(); g.fillText(p + '', 4, y + 3);
  }
  for (let s = 0; s <= 15; s += 5) { const x = mg + (w - mg) * s / 15; g.beginPath(); g.moveTo(x, 6); g.lineTo(x, h - 14); g.stroke(); g.fillText(`-${15 - s} s`, x - 10, h - 2); }
  const n = historique.length; if (n < 2) return;
  const tr = (cle, coul, echelle) => {
    g.strokeStyle = coul; g.lineWidth = 1.8; g.beginPath();
    historique.forEach((e, i) => {
      const x = mg + (w - mg) * (1 - (n - 1 - i) / 300);
      const y = h - 14 - (h - 24) * Math.max(Math.min(e[cle] * echelle, pMax * 1.05), -2) / pMax;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    });
    g.stroke();
  };
  tr('x', '#22c55e', pMax / 500); tr('pB', '#38bdf8', 1); tr('pA', '#f59e0b', 1); tr('pP', '#ef4444', 1);
}

/* ------------------------------ Calculs ----------------------------- */
function calculs(m) {
  const SAc = SA * 1e4, SBc = SB * 1e4, Q = m.qTh || 14.5;
  const pLev = (R.charge + CARAC.masseMobile) * 9.81 / 10 / SAc;
  $('calculs').innerHTML = `
    <h3>1. Sections du vérin</h3>
    <p>Côté fond : <code>SA = π × D² / 4 = π × 5² / 4 = ${fmt(SAc, 2)} cm²</code></p>
    <p>Côté tige : <code>SB = π × (D² − d²) / 4 = ${fmt(SBc, 2)} cm²</code></p>
    <h3>2. Pression nécessaire pour soulever la charge</h3>
    <p><code>p = F / S = ${fmt((R.charge + CARAC.masseMobile) * 0.981, 0)} daN / ${fmt(SAc, 2)} cm² ≈ ${fmt(pLev, 1)} bar</code> (+ frottements des joints).</p>
    <p>Tarage du limiteur : <b>${R.pTarage} bar</b> → ${pLev < R.pTarage * 0.95 ? '✅ la charge peut monter.' : '⛔ pression insuffisante : la charge ne montera pas, le limiteur s\'ouvre.'}</p>
    <h3>3. Effort maximal</h3>
    <p>Poussée : <code>F = p × SA = ${R.pTarage} × ${fmt(SAc, 2)} = ${fmt(R.pTarage * SAc)} daN</code> (≈ ${fmt(R.pTarage * SAc / 98.1 * 10)} kg)</p>
    <p>Traction : <code>F = p × SB = ${fmt(R.pTarage * SBc)} daN</code></p>
    <h3>4. Vitesses théoriques</h3>
    <p>Débit pompe (moteur en marche) : <code>Q = 10 cm³/tr × 1450 tr/min = 14,5 L/min</code></p>
    <p>Sortie : <code>v = Q / SA = 14,5 × 1000 / (60 × ${fmt(SAc, 2)}) = ${fmt(14.5e3 / 60 / SAc * 10)} mm/s</code></p>
    <p>Rentrée : <code>v = Q / SB = ${fmt(14.5e3 / 60 / SBc * 10)} mm/s</code> (limitée par le réducteur en descente)</p>
    <p>Temps de course (500 mm) en sortie : <code>≈ ${fmt(500 / (14.5e3 / 60 / SAc * 10), 1)} s</code></p>
    <h3>5. Puissance et rendement</h3>
    <p>Puissance hydraulique maxi : <code>P = p × Q / 600 = ${R.pTarage} × 14,5 / 600 = ${fmt(R.pTarage * 14.5 / 600, 2)} kW</code></p>
    <p>En ce moment : absorbée <b>${fmt(m.puissance, 2)} kW</b>, transformée en chaleur <b>${fmt(m.pertes, 2)} kW</b>.</p>
    <p>Débit mesuré ${fmt(m.qPompe, 1)} L/min pour ${fmt(Q, 1)} L/min théoriques → rendement volumétrique <b>${fmt(m.rendVol * 100)} %</b>.</p>
    <h3>6. Huile</h3>
    <p>ISO VG 46 à ${fmt(m.temp, 1)} °C : viscosité <b>${fmt(m.nu, 1)} cSt</b>. Plus l'huile chauffe, plus elle est fluide et plus les fuites internes augmentent.</p>
    <p class="aide">L'échauffement est accéléré ×10 pour la démonstration.</p>`;
}

/* ------------------------------- Boucle ----------------------------- */
let dernier = performance.now(), tCalc = 0, tMes = 0;
function alerte(m) {
  const a = $('h-alerte');
  let txt = '', info = false;
  if (m.cavitation && m.n > 100) txt = '⚠ Cavitation à l\'aspiration de la pompe !';
  else if (m.temp > 70) txt = '🌡 Huile trop chaude (> 70 °C)';
  else if (m.qLim > 0.5) { txt = '🔊 Limiteur ouvert : le débit retourne au réservoir et chauffe l\'huile'; info = true; }
  else if (R.moteur && circuit.bute && circuit.commande) { txt = 'Fin de course'; info = true; }
  a.hidden = !txt; a.textContent = txt; a.classList.toggle('info', info);
}
function boucle(t) {
  const dt = Math.min((t - dernier) / 1000, 0.05); dernier = t;
  // cycle automatique : inverse en fin de course
  if (auto.actif) {
    if (circuit.commande > 0 && circuit.x >= CARAC.course - 0.001) circuit.commande = -1;
    else if (circuit.commande < 0 && circuit.x <= 0.001) circuit.commande = 1;
    $('b-monter').classList.toggle('actif', circuit.commande > 0);
    $('b-descendre').classList.toggle('actif', circuit.commande < 0);
  }
  circuit.avancer(dt);
  const m = circuit.mesures();
  if (scene) scene.maj(m, { ...R, refroidOk: !circuit.pannes.refroid, ecume: circuit.pannes.air || m.cavitation }, dt);
  sons.maj(m, dt);
  $('h-p').textContent = fmt(m.pP); $('h-v').textContent = fmt(m.v); $('h-t').textContent = fmt(m.temp);
  tMes += dt;
  if (tMes > 0.1) {
    tMes = 0;
    for (const [id, , f] of LIGNES) elMes[id].lastChild.textContent = f(m);
    elMes.t.classList.toggle('alerte', m.temp > 70); elMes.asp.classList.toggle('alerte', m.pAsp < 0.75);
    elMes.ql.classList.toggle('alerte', m.qLim > 0.5);
    alerte(m);
  }
  tEchant += dt;
  if (tEchant >= 0.05 && !oscFige) {
    tEchant = 0;
    historique.push({ pP: m.pP, pA: m.pA, pB: m.pB, x: m.x });
    if (historique.length > 300) historique.shift();
  }
  dessinerOscillo();
  tCalc += dt;
  if (tCalc > 0.5 && $('calculs').offsetParent) { tCalc = 0; calculs(m); }
  requestAnimationFrame(boucle);
}

/* ------------------------------ Démarrage --------------------------- */
try {
  scene = new SceneHydraulique($('canvas3d'), $('etiquettes'));
  scene.surSelection = ouvrirFiche;
  new ResizeObserver(() => scene.redimensionner()).observe($('zone3d'));
} catch (err) {
  $('chargement').innerHTML = '<p style="max-width:300px;text-align:center">La 3D n\'a pas pu démarrer (WebGL indisponible sur cet appareil). Les mesures et les courbes restent utilisables.</p>';
  console.error(err);
}
if (scene) $('chargement').remove();
majMoteur();
calculs(circuit.mesures());
requestAnimationFrame(boucle);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
