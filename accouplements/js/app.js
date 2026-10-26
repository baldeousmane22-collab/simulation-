/* =====================================================================
   app.js — Interface : choix du type, défauts d'alignement, diagnostic
   (vibrations, échauffement, durée de vie), fiche, comparaison, quiz.
   ===================================================================== */
import { Scene3D } from './scene3d.js';
import { TYPES, DEFAUTS, QUIZ } from './donnees.js';
import { CHAPITRES } from '../cours/cours.js';

const $ = (id) => document.getElementById(id);
const fmt = (v, n = 2) => v.toFixed(n).replace('.', ',');
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GRAISSE = ['denture', 'chaine', 'grille', 'cardan'];
const ORDRE_DEMO = ['aligne', 'radial', 'angulaire', 'combine', 'axial'];

const etat = {
  type: TYPES[2], marche: true, rpm: 1500, theta: 0,
  cible: { r: 0, a: 0, x: 0 }, val: { r: 0, a: 0, x: 0 },
  exag: 'auto', eclate: false, ecl: 0, transparent: true, axes: true,
  defaut: 'aligne', demo: false, tDemo: 0, res: null
};

// La 3D n'est créée qu'à la première ouverture de la simulation : l'accueil et
// le cours restent légers (tablettes modestes, WebView Android).
let scene = null, echec3D = false;
function creerScene() {
  if (scene || echec3D) return;
  try {
    scene = new Scene3D($('canvas3d'));
    scene.onPiece = (nom) => toast(nom);
    scene.choisirType(etat.type);
  } catch (err) {
    echec3D = true; scene = null;
    $('vue3d').insertAdjacentHTML('beforeend', '<p class="aide" style="position:absolute;inset:auto 0 40% 0;text-align:center;padding:20px">La 3D (WebGL) n\'est pas disponible sur cet appareil. Le cours, les fiches et le quiz restent utilisables.</p>');
    console.error(err);
  }
}

/* ------------------------------ Onglets ------------------------------ */
document.querySelectorAll('.onglets button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.onglets button').forEach(x => x.classList.toggle('actif', x === b));
  document.querySelectorAll('.onglet').forEach(o => o.classList.toggle('actif', o.id === b.dataset.onglet));
  if (b.dataset.onglet === 'o-defauts') dessinerGraphes();
}));

/* ------------------------------- Types ------------------------------- */
$('grille-types').innerHTML = TYPES.map((t, i) => `<button type="button" data-i="${i}"><span class="i">${t.ico}</span>${esc(t.nom)}</button>`).join('');
$('grille-types').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) choisirType(TYPES[+b.dataset.i]);
});

function choisirType(t) {
  etat.type = t;
  etat.val = { r: 0, a: 0, x: 0 };   // le nouveau montage part aligné puis le défaut s'installe
  document.querySelectorAll('#grille-types button').forEach(b => b.classList.toggle('actif', TYPES[+b.dataset.i] === t));
  if (scene) scene.choisirType(t);
  for (const k of ['r', 'a', 'x']) {
    const c = $('c-' + k), max = t.max[k];
    c.disabled = max === 0;
    c.max = max || 1;
    c.min = k === 'x' ? -(max || 1) : 0;
    c.step = max >= 10 ? 0.5 : max >= 2 ? 0.05 : 0.01;
    $('t-' + k).textContent = t.tol[k] ? `(tolérance ${k === 'x' ? '±' : ''}${fmt(t.tol[k], t.tol[k] < 0.1 ? 2 : 1)} ${k === 'a' ? '°' : 'mm'})` : '(non admis)';
  }
  $('note-type').textContent = t.id === 'cardan'
    ? "Cardan : seul l'angle est réglable (angle réel, sans exagération). Un décalage parallèle demande deux cardans et un arbre intermédiaire."
    : t.id.startsWith('plateaux') || t.id === 'manchon' ? "Accouplement rigide : la moindre erreur force les arbres et les roulements." : '';
  $('bloc-cardan').hidden = t.id !== 'cardan';
  appliquerDefaut(etat.defaut);
  remplirResume(); remplirFiche(); remplirComparer();
}

function remplirResume() {
  const t = etat.type;
  $('resume-type').innerHTML = `<h4>${t.ico} ${esc(t.nom)} <small class="famille">${esc(t.famille)}</small></h4><p>${esc(t.principe)}</p>
    <p><b>Défaut typique :</b> ${esc(t.defaut)}</p>`;
}

function remplirFiche() {
  const t = etat.type, li = (a) => a.map(x => `<li>${esc(x)}</li>`).join('');
  const tol = (v, u, pm) => v ? `${pm ? '± ' : ''}${fmt(v, v < 0.1 ? 2 : 1)} ${u}` : 'non admis';
  $('fiche').innerHTML = `<h2>${t.ico} ${esc(t.nom)}</h2><div class="famille">${esc(t.famille)}</div>
    <div class="tols"><div>Radial<b>${tol(t.tol.r, 'mm')}</b></div><div>Angulaire<b>${tol(t.tol.a, '°')}</b></div><div>Axial<b>${tol(t.tol.x, 'mm', 1)}</b></div></div>
    <div class="carte"><h4>Principe</h4><p>${esc(t.principe)}</p></div>
    <div class="carte"><h4>Constitution</h4><ul>${li(t.constitution)}</ul></div>
    <div class="carte"><h4>✅ Avantages</h4><ul>${li(t.avantages)}</ul></div>
    <div class="carte"><h4>⚠️ Inconvénients</h4><ul>${li(t.inconvenients)}</ul></div>
    <div class="carte"><h4>🏭 Applications</h4><p>${esc(t.applications)}</p></div>
    <div class="carte"><h4>🔧 Usure / entretien</h4><p>${esc(t.usure)}</p>${GRAISSE.includes(t.id) ? '<p>Graissage périodique obligatoire.</p>' : ''}</div>
    <div class="carte"><h4>📉 Effet du désalignement</h4><p>${esc(t.defaut)}</p></div>`;
}

function remplirComparer() {
  const v = (x, u) => x ? fmt(x, x < 0.1 ? 2 : 1) + u : '—';
  $('tab-comparer').innerHTML = `<thead><tr><th>Type</th><th>Famille</th><th>Radial</th><th>Angle</th><th>Axial ±</th><th>Amortit</th><th>Graisse</th></tr></thead><tbody>` +
    TYPES.map(t => `<tr class="${t === etat.type ? 'actif' : ''}"><td>${t.ico} ${esc(t.nom)}</td><td>${esc(t.famille)}</td><td>${v(t.tol.r, ' mm')}</td><td>${v(t.tol.a, '°')}</td><td>${v(t.tol.x, ' mm')}</td>
      <td>${t.famille === 'Élastique' || t.id === 'grille' ? 'oui' : 'non'}</td><td>${GRAISSE.includes(t.id) ? 'oui' : 'non'}</td></tr>`).join('') + '</tbody>';
}

/* ------------------------------ Défauts ------------------------------ */
$('grille-defauts').innerHTML = Object.entries(DEFAUTS).map(([k, d]) => `<button type="button" data-d="${k}">${d.ico}<br>${esc(d.nom)}</button>`).join('');
$('grille-defauts').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $('c-demo').checked = etat.demo = false;
  appliquerDefaut(b.dataset.d);
});
$('c-demo').addEventListener('change', (e) => { etat.demo = e.target.checked; etat.tDemo = 0; });

// réglage = multiple de la tolérance du type (1,4 → 40 % au-delà de la tolérance)
function appliquerDefaut(k) {
  const d = DEFAUTS[k], t = etat.type;
  etat.defaut = k;
  document.querySelectorAll('#grille-defauts button').forEach(b => b.classList.toggle('actif', b.dataset.d === k));
  for (const c of ['r', 'a', 'x']) etat.cible[c] = Math.min(t.max[c], d.reglage[c] * t.tol[c]);
  if (t.id === 'cardan' && (k === 'angulaire' || k === 'combine')) etat.cible.a = 20;
  $('explication').innerHTML = `<h4>${d.ico} ${esc(d.nom)}</h4><p>${esc(d.texte)}</p><b>Symptômes :</b><ul>${d.signes.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    <p class="correction">🔧 ${esc(d.correction)}</p>` + (t.id === 'oldham' && (k === 'radial' || k === 'combine') ? '<p>👉 Observez le cercle jaune : le centre du disque le parcourt 2 fois par tour.</p>' : '');
  majCurseurs();
}

function majCurseurs() {
  for (const k of ['r', 'a', 'x']) $('c-' + k).value = etat.cible[k];
}
for (const k of ['r', 'a', 'x']) $('c-' + k).addEventListener('input', (e) => {
  etat.cible[k] = +e.target.value;
  $('c-demo').checked = etat.demo = false;
  document.querySelectorAll('#grille-defauts button').forEach(b => b.classList.remove('actif'));
});
$('c-exag').addEventListener('change', (e) => { etat.exag = e.target.value; });
$('c-vitesse').addEventListener('input', (e) => { etat.rpm = +e.target.value; $('v-vitesse').textContent = etat.rpm + ' tr/min'; });

/* ------------------------- Barre d'outils 3D ------------------------- */
const bascule = (id, cle, apres) => $(id).addEventListener('click', () => {
  etat[cle] = !etat[cle];
  $(id).setAttribute('aria-pressed', etat[cle]);
  if (apres) apres();
});
$('b-marche').addEventListener('click', () => { etat.marche = !etat.marche; $('b-marche').textContent = etat.marche ? '⏸' : '▶'; });
bascule('b-eclate', 'eclate');
bascule('b-transp', 'transparent');
bascule('b-axes', 'axes', () => { $('legende-axes').hidden = !etat.axes; });
const VUES = ['face', 'dessus', 'axe', 'normale'];
let iVue = 0;
$('b-vue').addEventListener('click', () => { if (scene) scene.vue(VUES[iVue++ % VUES.length]); toast('Vue : ' + ['de face', 'de dessus', 'dans l\'axe', 'en perspective'][(iVue - 1) % 4]); });
$('b-centre').addEventListener('click', () => scene && scene.recentrer());

let tToast = 0;
function toast(txt) { const t = $('toast'); t.textContent = txt; t.hidden = false; tToast = 2.2; }
if (scene) scene.onPiece = (nom) => toast(nom);

/* ------------------------- Modèle de diagnostic ---------------------- */
// Ordres de grandeur pédagogiques (et non une norme) : vibrations en mm/s eff.
function calculer() {
  const t = etat.type, v = etat.val, f = etat.rpm / 1500, k = t.raideur;
  const rr = t.tol.r ? Math.abs(v.r) / t.tol.r : 0, ra = t.tol.a ? Math.abs(v.a) / t.tol.a : 0, rx = t.tol.x ? Math.abs(v.x) / t.tol.x : 0;
  const taux = Math.max(rr, ra, rx);
  const rad = [0.8 + 0.9 * rr * k, 0.15 + 1.8 * rr * k + 0.5 * ra * k, 0.08 + 0.5 * rr * k];
  const ax = [0.35 + 1.9 * ra * k + 0.3 * rx, 0.1 + 0.8 * ra * k + 0.3 * rr * k, 0.05 + 0.4 * ra * k];
  let irr = 0;
  if (t.id === 'cardan') {   // irrégularité de vitesse : vibration de torsion à 2×
    const c = Math.cos(v.a * Math.PI / 180);
    irr = 1 / c - c;
    rad[1] += 25 * irr; ax[0] = 0.35 + 0.2 * ra; ax[1] = 0.1; ax[2] = 0.05;
  }
  for (const a of [rad, ax]) for (let i = 0; i < 3; i++) a[i] *= f;
  const vib = Math.hypot(...rad, ...ax) / 1.25;
  const zone = vib <= 1.4 ? ['A – très bon', 'ok'] : vib <= 2.8 ? ['B – bon', 'ok'] : vib <= 4.5 ? ['C – à surveiller', 'alerte'] : ['D – dangereux', 'ko'];
  const statut = taux <= 0.5 ? ['Bon alignement', ''] : taux <= 1 ? ['Dans la tolérance', 'moyen'] : taux <= 1.6 ? ['Hors tolérance', 'alerte'] : ['Dangereux', 'ko'];
  return {
    rr, ra, rx, taux, rad, ax, vib, zone, statut, irr,
    temp: 30 + (8 + 32 * taux * taux) * f * (t.famille === 'Élastique' ? 1 : 0.6),
    vie: 100 / (1 + 1.5 * taux * taux), roul: Math.round(taux * 30 * k)
  };
}

function majTextes(res) {
  const t = etat.type, v = etat.val;
  $('hud-titre').textContent = `${t.ico} ${t.nom}`;
  const b = $('hud-statut');
  b.textContent = res.statut[0]; b.className = 'badge ' + res.statut[1];
  $('hud-valeurs').textContent = `Radial ${fmt(v.r)} mm · Angle ${fmt(v.a, t.id === 'cardan' ? 1 : 2)}° · Axial ${v.x >= 0 ? '+' : ''}${fmt(v.x)} mm`;
  $('hud-vib').textContent = etat.marche && etat.rpm > 0 ? `Vibrations ${fmt(res.vib, 1)} mm/s (zone ${res.zone[0][0]}) · ${etat.rpm} tr/min` : 'À l\'arrêt';
  $('v-r').textContent = fmt(v.r) + ' mm';
  $('v-a').textContent = fmt(v.a, t.id === 'cardan' ? 1 : 2) + ' °';
  $('v-x').textContent = (v.x >= 0 ? '+' : '') + fmt(v.x) + ' mm';
  const E = exagEff();
  $('hud-exag').textContent = E === 'auto' ? '· défauts exagérés (échelle auto)' : E > 1 ? `· défauts exagérés ×${E}` : '· échelle réelle';
  const cl = (r) => r <= 0.5 ? 'ok' : r <= 1 ? 'moyen' : r <= 1.6 ? 'alerte' : 'ko';
  const pc = (r) => Math.round(r * 100) + ' % de la tolérance';
  const arret = !(etat.marche && etat.rpm > 0);
  $('diag').innerHTML = `
    <div class="${cl(res.rr)}">Radial<b>${t.tol.r ? pc(res.rr) : 'non admis'}</b></div>
    <div class="${cl(res.ra)}">Angulaire<b>${pc(res.ra)}</b></div>
    <div class="${cl(res.rx)}">Axial<b>${t.tol.x ? pc(res.rx) : 'fixe'}</b></div>
    <div class="${arret ? '' : res.zone[1]}">Vibrations (ISO 10816)<b>${arret ? '—' : fmt(res.vib, 1) + ' mm/s · ' + res.zone[0]}</b></div>
    <div class="${res.temp > 80 ? 'ko' : res.temp > 60 ? 'alerte' : 'ok'}">Température de l'accouplement<b>${arret ? '—' : Math.round(res.temp) + ' °C'}</b></div>
    <div class="${cl(res.taux)}">Durée de vie estimée<b>${Math.round(res.vie)} %</b></div>
    <div class="${cl(res.taux)}">Efforts en plus sur roulements<b>+${res.roul} %</b></div>
    <div class="${cl(res.taux)}">Dominante<b>${dominante(res)}</b></div>`;
  if (t.id === 'cardan') {
    const c = Math.cos(v.a * Math.PI / 180);
    $('txt-cardan').textContent = `Angle β = ${fmt(v.a, 1)}° : la vitesse de sortie varie de ${fmt(c * 100, 1)} % à ${fmt(100 / c, 1)} % de la vitesse d'entrée, 2 fois par tour (écart ${fmt(res.irr * 100, 1)} %). Avec 2 cardans en phase et des angles égaux, les irrégularités s'annulent.`;
  }
}
function dominante(res) {
  if (res.taux < 0.15) return '1× (balourd résiduel)';
  if (etat.type.id === 'cardan') return 'torsion à 2×';
  if (res.ra > res.rr * 1.2) return 'axiale à 1×';
  if (res.rr > res.ra * 1.2) return 'radiale à 2×';
  return 'radiale + axiale (1× et 2×)';
}

/* ------------------------------ Graphes ------------------------------ */
function preparer(cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth || 300, h = +cv.getAttribute('height');
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px'; }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  g.font = '11px system-ui, sans-serif';
  return { g, w, h };
}
function dessinerGraphes() {
  const res = etat.res;
  if (!res || !$('o-defauts').classList.contains('actif')) return;
  const { g, w, h } = preparer($('c-vib'));
  const arret = !(etat.marche && etat.rpm > 0);
  const wt = w * 0.6, coul = ['#38bdf8', '#f59e0b'];
  // signal temporel (2 tours)
  g.fillStyle = '#94a3b8'; g.fillText('Signal sur 2 tours', 8, 14);
  g.fillStyle = coul[0]; g.fillText('radial', 8, 28); g.fillStyle = coul[1]; g.fillText('axial', 50, 28);
  const echelle = 9;
  [[res.rad, h * 0.38, [0, 1.1, 0.4]], [res.ax, h * 0.76, [0.3, 2.0, 0.9]]].forEach(([A, y0, ph], j) => {
    g.strokeStyle = '#1e293b'; g.beginPath(); g.moveTo(8, y0); g.lineTo(wt - 6, y0); g.stroke();
    g.strokeStyle = coul[j]; g.lineWidth = 1.6; g.beginPath();
    for (let i = 0; i <= 200; i++) {
      const th = i / 200 * 4 * Math.PI + etat.theta, x = 8 + i / 200 * (wt - 14);
      const s = arret ? 0 : A[0] * Math.sin(th + ph[0]) + A[1] * Math.sin(2 * th + ph[1]) + A[2] * Math.sin(3 * th + ph[2]);
      const y = y0 - Math.max(-h * 0.17, Math.min(h * 0.17, s * echelle));
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  });
  // spectre 1×, 2×, 3×
  const x0 = wt + 6, lb = (w - x0 - 8) / 3, yb = h - 22, hm = h - 52, max = 7;
  g.fillStyle = '#94a3b8'; g.fillText('Spectre (mm/s)', x0, 14);
  for (let i = 0; i < 3; i++) {
    [res.rad[i], res.ax[i]].forEach((v, j) => {
      const hh = arret ? 0 : Math.min(1, v / max) * hm;
      g.fillStyle = coul[j];
      g.fillRect(x0 + i * lb + 4 + j * (lb / 2 - 3), yb - hh, lb / 2 - 6, hh);
    });
    g.fillStyle = '#cbd5e1'; g.fillText((i + 1) + '×', x0 + i * lb + lb / 2 - 7, h - 8);
  }
  g.strokeStyle = '#475569'; g.beginPath(); g.moveTo(x0, yb + 0.5); g.lineTo(w - 4, yb + 0.5); g.stroke();
  if (etat.type.id === 'cardan') dessinerCardan();
}
function dessinerCardan() {
  const { g, w, h } = preparer($('c-cardan'));
  const b = etat.val.a * Math.PI / 180, c = Math.cos(b), s2 = Math.sin(b) ** 2;
  const y = (r) => h / 2 - (r - 1) * (h * 0.38) / 0.35;
  g.strokeStyle = '#475569'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(30, y(1)); g.lineTo(w - 6, y(1)); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#94a3b8'; g.fillText('ω sortie / ω entrée sur 1 tour', 34, 14); g.fillText('1,00', 2, y(1) + 4);
  g.strokeStyle = '#f59e0b'; g.lineWidth = 2; g.beginPath();
  for (let i = 0; i <= 200; i++) {
    const th = i / 200 * 2 * Math.PI, r = c / (1 - s2 * Math.cos(th) ** 2), x = 30 + i / 200 * (w - 36);
    i ? g.lineTo(x, y(r)) : g.moveTo(x, y(r));
  }
  g.stroke();
  const xm = 30 + ((etat.theta % (2 * Math.PI)) / (2 * Math.PI)) * (w - 36);
  g.strokeStyle = '#38bdf8'; g.beginPath(); g.moveTo(xm, 20); g.lineTo(xm, h - 6); g.stroke();
}

/* -------------------------------- Quiz ------------------------------- */
const quiz = { i: 0, score: 0, repondu: false };
function afficherQuiz() {
  if (quiz.i >= QUIZ.length) {
    $('quiz').innerHTML = `<div class="carte"><h4>Résultat : ${quiz.score} / ${QUIZ.length}</h4><p>${quiz.score >= QUIZ.length * 0.8 ? 'Excellent !' : quiz.score >= QUIZ.length / 2 ? 'Bien, revoyez les fiches.' : 'Revoyez les types et les défauts, puis recommencez.'}</p></div><button type="button" class="btn-principal" id="q-recommencer">Recommencer</button>`;
    $('q-recommencer').onclick = () => { Object.assign(quiz, { i: 0, score: 0, repondu: false }); afficherQuiz(); };
    return;
  }
  const q = QUIZ[quiz.i];
  quiz.repondu = false;
  $('quiz').innerHTML = `<div class="aide">Question ${quiz.i + 1} / ${QUIZ.length} · score ${quiz.score}</div><div class="q-question">${esc(q.q)}</div>
    <div class="q-reps">${q.r.map((r, i) => `<button type="button" data-i="${i}">${esc(r)}</button>`).join('')}</div><div id="q-suite"></div>`;
  $('quiz').querySelector('.q-reps').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b || quiz.repondu) return;
    quiz.repondu = true;
    const i = +b.dataset.i;
    if (i === q.b) quiz.score++;
    $('quiz').querySelectorAll('.q-reps button').forEach((x, j) => { if (j === q.b) x.classList.add('bon'); else if (j === i) x.classList.add('faux'); });
    $('q-suite').innerHTML = `<p class="aide">${esc(q.e)}</p><button type="button" class="btn-principal">Suivant</button>`;
    $('q-suite').querySelector('button').onclick = () => { quiz.i++; afficherQuiz(); };
  };
}

/* ------------------------------- Boucle ------------------------------ */
function exagEff() {
  if (etat.exag !== 'auto') return +etat.exag;
  return etat.type.id === 'cardan' ? 1 : 'auto';
}
// Valeurs affichées en 3D (unités de 100 mm, radians). En « auto », une tolérance
// donne toujours le même écart visible (10 mm, 4°, 6 mm) quel que soit le type.
function affichage(v) {
  const E = exagEff(), t = etat.type, lim = (x, m) => Math.max(-m, Math.min(m, x));
  if (E === 'auto') return {
    r: lim(t.tol.r ? v.r / t.tol.r * 0.1 : 0, 0.35),
    a: lim(t.tol.a ? v.a / t.tol.a * 4 : 0, 15) * Math.PI / 180,
    x: lim(t.tol.x ? v.x / t.tol.x * 0.06 : 0, 0.3)
  };
  return { r: lim(v.r * E / 100, 0.6), a: lim(v.a * E, 40) * Math.PI / 180, x: lim(v.x * E / 100, 0.6) };
}
let tPrec = performance.now(), tGraphe = 0, tTexte = 0;
function boucle(t) {
  const dt = Math.min(0.05, (t - tPrec) / 1000);
  tPrec = t;
  if (etat.demo) {
    etat.tDemo += dt;
    if (etat.tDemo > 6) {
      etat.tDemo = 0;
      appliquerDefaut(ORDRE_DEMO[(ORDRE_DEMO.indexOf(etat.defaut) + 1) % ORDRE_DEMO.length]);
    }
  }
  const k = 1 - Math.exp(-dt * 3);
  for (const c of ['r', 'a', 'x']) etat.val[c] += (etat.cible[c] - etat.val[c]) * k;
  etat.ecl += ((etat.eclate ? 1 : 0) - etat.ecl) * (1 - Math.exp(-dt * 5));
  if (etat.marche) etat.theta += dt * (etat.rpm / 1500) * 2 * Math.PI * 0.45;
  const res = etat.res = calculer();
  if ((tTexte -= dt) <= 0) { majTextes(res); tTexte = 0.15; }
  if ((tGraphe -= dt) <= 0) { dessinerGraphes(); tGraphe = 0.08; }
  if (tToast > 0 && (tToast -= dt) <= 0) $('toast').hidden = true;
  if (scene && ecran === 'sim') {
    const d = affichage(etat.val);
    const tourne = etat.marche && etat.rpm > 0;
    scene.maj({
      theta: etat.theta,
      r: d.r, a: d.a, x: d.x, planHorizontal: etat.type.id === 'cardan',
      eclate: etat.ecl, transparent: etat.transparent, axes: etat.axes, taux: res.taux,
      secousse: tourne && res.vib > 2.8 ? Math.min(0.04, (res.vib - 2.8) * 0.006) : 0
    }, dt);
  }
  requestAnimationFrame(boucle);
}

/* ----------------------- Accueil et cours ---------------------------- */
let ecran = 'accueil', chapitre = -1, depuisCours = false;
function montrer(id, histo = true) {
  if (histo && id !== ecran) history.pushState({ ecran: id }, '');
  ecran = id;
  for (const e of ['accueil', 'cours']) $(e).classList.toggle('actif', e === id);
  if (id === 'sim') { creerScene(); if (scene) scene.redimensionner(); }
}
function ouvrirOnglet(id) {
  document.querySelector(`.onglets button[data-onglet="${id}"]`).click();
}
document.querySelectorAll('[data-aller]').forEach(b => b.addEventListener('click', () => {
  const a = b.dataset.aller;
  if (a === 'cours') { afficherChapitre(-1); montrer('cours'); return; }
  montrer('sim');
  depuisCours = false;
  ouvrirOnglet({ sim: 'o-types', defauts: 'o-defauts', comparer: 'o-comparer', quiz: 'o-quiz' }[a]);
}));
window.addEventListener('popstate', (e) => {
  const id = (e.state && e.state.ecran) || 'accueil';
  if (id === 'cours' && !e.state.ch && chapitre >= 0) afficherChapitre(-1);   // retour : chapitre → sommaire
  montrer(id, false);
});
$('b-accueil').addEventListener('click', () => { montrer(depuisCours ? 'cours' : 'accueil'); depuisCours = false; });
$('cours-accueil').addEventListener('click', () => montrer('accueil'));
$('cours-retour').addEventListener('click', () => chapitre < 0 ? montrer('accueil') : afficherChapitre(-1));
$('cours-prec').addEventListener('click', () => afficherChapitre(chapitre - 1));
$('cours-suiv').addEventListener('click', () => afficherChapitre(chapitre + 1));
$('cours-3d').addEventListener('click', () => {
  const v = CHAPITRES[chapitre].voir;
  choisirType(TYPES.find(t => t.id === v.type));
  appliquerDefaut(v.defaut);
  montrer('sim');
  depuisCours = true;
  ouvrirOnglet(v.defaut === 'aligne' ? 'o-types' : 'o-defauts');
  toast('🏠 = retour au chapitre');
});
// chapitre -1 = sommaire
function afficherChapitre(i) {
  const avant = chapitre;
  chapitre = Math.max(-1, Math.min(CHAPITRES.length - 1, i));
  if (avant < 0 && chapitre >= 0 && ecran === 'cours') history.pushState({ ecran: 'cours', ch: true }, '');
  const c = CHAPITRES[chapitre];
  $('cours-nav').hidden = chapitre < 0;
  if (chapitre < 0) {
    $('cours-titre').textContent = 'Cours : les accouplements';
    $('cours-corps').innerHTML = `<p class="aide">Brevet technique — 12 chapitres. Chaque chapitre se termine par « Voir en 3D » pour observer l'accouplement dans la simulation.</p>
      <ol class="sommaire">${CHAPITRES.map((x, j) => `<li><button type="button" data-ch="${j}"><span class="num">${j + 1}.</span><span>${x.ico}</span>${esc(x.titre)}</button></li>`).join('')}</ol>`;
    $('cours-corps').querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => afficherChapitre(+b.dataset.ch)));
  } else {
    $('cours-titre').textContent = `${chapitre + 1}. ${c.titre}`;
    $('cours-corps').innerHTML = `<h4 style="margin-top:0">${c.ico} Chapitre ${chapitre + 1} / ${CHAPITRES.length}</h4>` + c.html;   // texte du cours (fichier local, pas de saisie utilisateur)
    $('cours-prec').disabled = chapitre === 0;
    $('cours-suiv').disabled = chapitre === CHAPITRES.length - 1;
  }
  $('cours-corps').scrollTop = 0;
}

/* ---------------------------- Démarrage ------------------------------ */
history.replaceState({ ecran: 'accueil' }, '');
choisirType(etat.type);
afficherQuiz();
window.addEventListener('resize', () => scene && scene.redimensionner());
new ResizeObserver(() => scene && scene.redimensionner()).observe($('vue3d'));
requestAnimationFrame(boucle);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
