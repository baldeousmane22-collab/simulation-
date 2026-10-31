/* =====================================================================
   app.js — Interface : choix de l'opération, conditions de coupe
   (calcul détaillé), fiche de l'opération, cours, astuces et quiz.
   ===================================================================== */

import { MATIERES, OUTILS_MAT, OPERATIONS, COURS, ASTUCES, QUIZ } from './donnees.js';
import { Fraisage } from './scene3d.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (v, d = 0) => Number(v).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

/* Profondeur de passe maximale (mm) utilisée pour le débit et la puissance */
const AP = { surfacage: 3, roulant: 2, epaulement: 6, rainure: 5, poche: 4, contournage: 5, chanfrein: 4, disque: 6, rainureT: 8, aronde: 10, percage: 20, taraudage: 18 };
const P_MACHINE = 7.5;  // puissance de la broche (kW)
const N_MAX = 6000;    // fréquence de rotation maximale (tr/min)

const etat = { op: 'surfacage', matiere: 'acier', outil: 'carbure', kVc: 1, kFz: 1, dir: 1, trajet: null };
try {
  const s = JSON.parse(localStorage.getItem('fraisage-etat') || '{}');
  if (OPERATIONS[s.op]) etat.op = s.op;
  if (MATIERES[s.matiere]) etat.matiere = s.matiere;
} catch (e) { /* stockage indisponible */ }
const sauver = () => { try { localStorage.setItem('fraisage-etat', JSON.stringify({ op: etat.op, matiere: etat.matiere })); } catch (e) { /* rien */ } };

const info = $('#info3d');
let minuterieInfo;
const scene = new Fraisage($('#canvas3d'), $('#etiquettes'), (i) => {
  clearTimeout(minuterieInfo);
  if (!i) { info.hidden = true; return; }
  info.innerHTML = `<b>${esc(i.titre)}</b>${esc(i.texte)}`;
  info.hidden = false;
  minuterieInfo = setTimeout(() => { info.hidden = true; }, 6000);
});
let modeActuel = '';
scene.surPhase = (s, i, mode) => {
  const el = $('#phase-txt');
  el.textContent = s.lab;
  el.className = s.type === 'fin' ? 'fin' : s.type === 'change' ? 'change' : (s.passe != null || s.coupe) ? 'coupe' : '';
  modeActuel = mode; hud();
};
setInterval(() => {
  if (!scene.duree) return;
  $('#progres').style.width = Math.min(100, scene.t / scene.duree * 100).toFixed(1) + '%';
}, 150);

/* ---------- Choix de l'opération ---------- */
function barreOps() {
  const nav = $('#types');
  nav.innerHTML = Object.entries(OPERATIONS).map(([k, o]) => `<button type="button" data-op="${k}">${o.icone} ${esc(o.court)}</button>`).join('');
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-op]');
    if (b) choisirOp(b.dataset.op);
  });
}
function choisirOp(k) {
  etat.op = k; etat.kVc = 1; etat.kFz = 1;
  etat.outil = OPERATIONS[k].outilDefaut;
  sauver();
  document.querySelectorAll('#types button').forEach(b => b.classList.toggle('actif', b.dataset.op === k));
  document.querySelector(`#types button[data-op="${k}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  $('#nom-type').textContent = OPERATIONS[k].nom;
  etat.trajet = scene.construire(k, etat.dir);
  pageParams();
  calculer();
  pageFiche();
}

/* ---------- Réglages ---------- */
function pageParams() {
  const o = OPERATIONS[etat.op], lineaire = o.piece === 'profil';
  $('#params').innerHTML = `
    <div class="param"><label for="p-mat"><span>Matériau de la pièce</span><span></span></label>
      <div class="ligne"><select id="p-mat">${Object.entries(MATIERES).map(([k, m]) => `<option value="${k}" ${k === etat.matiere ? 'selected' : ''}>${esc(m.nom)}</option>`).join('')}</select></div></div>
    <div class="param"><label><span>Matériau de l'outil</span><span></span></label>
      <div class="bascule" id="p-outil">${Object.entries(OUTILS_MAT).map(([k, t]) => `<button type="button" data-v="${k}" class="${k === etat.outil ? 'actif' : ''}">${esc(t)}</button>`).join('')}</div></div>
    <div class="param"><label for="p-vc"><span>Vitesse de coupe Vc</span><span id="v-vc"></span></label>
      <div class="ligne"><input type="range" id="p-vc" min="0.5" max="1.6" step="0.05" value="${etat.kVc}"></div></div>
    ${o.pas ? `<div class="param"><label><span>Avance du taraud</span><span id="v-fz"></span></label><p class="note">Imposée : le taraud avance d'un pas (${fmt(o.pas, 1)} mm) à chaque tour.</p></div>` : `<div class="param"><label for="p-fz"><span>${o.axial ? 'Avance par dent fz (f = fz × 2 lèvres)' : 'Avance par dent fz'}</span><span id="v-fz"></span></label>
      <div class="ligne"><input type="range" id="p-fz" min="0.4" max="2" step="0.05" value="${etat.kFz}"></div></div>`}
    ${lineaire ? `<div class="param"><label><span>Sens d'avance de la fraise sur la pièce</span><span id="v-mode"></span></label>
      <div class="bascule" id="p-dir"><button type="button" data-v="1" class="${etat.dir > 0 ? 'actif' : ''}">➡️ Vers la droite</button><button type="button" data-v="-1" class="${etat.dir < 0 ? 'actif' : ''}">⬅️ Vers la gauche</button></div></div>` : ''}
    <div class="param"><label><span>Arrosage (liquide de coupe)</span><span></span></label>
      <div class="bascule" id="p-arr"><button type="button" data-v="1" class="${scene.arrosage ? 'actif' : ''}">💧 Oui</button><button type="button" data-v="0" class="${scene.arrosage ? '' : 'actif'}">Non</button></div></div>`;
}
$('#params').addEventListener('input', (e) => {
  if (e.target.id === 'p-vc') etat.kVc = parseFloat(e.target.value);
  else if (e.target.id === 'p-fz') etat.kFz = parseFloat(e.target.value);
  else if (e.target.id === 'p-mat') { etat.matiere = e.target.value; etat.kVc = 1; etat.kFz = 1; sauver(); pageParams(); }
  calculer();
});
$('#params').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-v]'); if (!b) return;
  const groupe = b.parentElement.id;
  if (groupe === 'p-outil') { etat.outil = b.dataset.v; etat.kVc = 1; }
  else if (groupe === 'p-dir') { etat.dir = +b.dataset.v; etat.trajet = scene.construire(etat.op, etat.dir); }
  else if (groupe === 'p-arr') scene.arrosage = b.dataset.v === '1';
  pageParams();
  calculer();
});
$('#b-defaut').addEventListener('click', () => { etat.kVc = 1; etat.kFz = 1; etat.outil = OPERATIONS[etat.op].outilDefaut; pageParams(); calculer(); });

/* Longueur usinée (somme des trajets en avance travail) */
function longueurUsinee() {
  let l = 0;
  for (const s of etat.trajet?.segs || []) if (s.type === 'travail' || s.type === 'plonge') l += Math.hypot(s.vers.x - s.de.x, s.vers.y - s.de.y, s.vers.z - s.de.z);
  return l;
}

let res = {};
function calculer() {
  const o = OPERATIONS[etat.op], m = MATIERES[etat.matiere];
  const vc0 = m.vc[etat.outil] * (o.kVc || 1), Vc = vc0 * etat.kVc, fz0 = o.pas ? o.pas : o.fz * m.kfz, fz = o.pas ? o.pas : fz0 * etat.kFz;
  let n = 1000 * Vc / (Math.PI * o.D);
  const nCalc = n;
  n = Math.min(n, N_MAX);
  const Vf = fz * o.Z * n, ap = AP[etat.op], ae = o.ae, A = o.axial ? Math.PI / 4 * (o.D ** 2 - (o.d0 || 0) ** 2) : ap * ae, Q = A * Vf / 1000, Pc = Q * m.kc / 60000, Pm = Pc / 0.8;
  const Lu = longueurUsinee(), tc = Lu / Vf;
  res = { Vc, fz, n, Vf, Q, Pc, Pm, tc };
  $('#v-vc').textContent = `${fmt(Vc)} m/min`;
  $('#v-fz').textContent = o.pas ? `${fmt(fz, 2)} mm/tr` : o.axial ? `${fmt(fz, 3)} mm/dent → f = ${fmt(fz * o.Z, 2)} mm/tr` : `${fmt(fz, 3)} mm/dent`;
  const vm = $('#v-mode'); if (vm) vm.textContent = '';
  $('#resume').innerHTML = [
    ['Fréquence de rotation n', `${fmt(n)} tr/min`], ['Vitesse d\'avance Vf', `${fmt(Vf)} mm/min`],
    ['Débit de copeaux Q', `${fmt(Q, 1)} cm³/min`], ['Puissance moteur', `${fmt(Pm, 2)} kW`],
    ['Longueur usinée', `${fmt(Lu)} mm`], ['Temps de coupe', tc < 1 ? `${fmt(tc * 60)} s` : `${fmt(Math.floor(tc))} min ${fmt((tc % 1) * 60)} s`]
  ].map(([a, b]) => `<div>${a}<b>${b}</b></div>`).join('');
  const al = [];
  if (nCalc > N_MAX) al.push(`n calculée = ${fmt(nCalc)} tr/min : limitée à ${fmt(N_MAX)} tr/min (maximum de la machine).`);
  if (Pm > P_MACHINE) al.push(`Puissance nécessaire ${fmt(Pm, 2)} kW > ${P_MACHINE} kW de la machine : réduire ap, fz ou Vc.`);
  if (etat.kVc > 1.3) al.push('Vc trop élevée : l\'outil va s\'user très vite (copeaux bleus, arêtes brûlées).');
  if (etat.kVc < 0.65) al.push('Vc trop faible : risque d\'arête rapportée (matière collée sur l\'outil) et mauvais état de surface.');
  if (etat.kFz > 1.5 && !o.pas) al.push(o.axial ? 'Avance trop forte : le foret risque de casser ou de « visser » dans la matière.' : 'fz trop élevée : risque de casse de dent, vibrations.');
  if (etat.kFz < 0.6 && !o.pas) al.push('fz trop faible : la dent frotte au lieu de couper (écrouissage, usure).');
  if (etat.op === 'surfacage' && etat.outil === 'ars') al.push('Les fraises à surfacer à plaquettes sont en carbure : l\'ARS est donné ici pour comparaison.');
  $('#alertes').innerHTML = al.map(a => `<div class="alerte">⚠️ ${esc(a)}</div>`).join('');
  $('#calculs').innerHTML = `<table class="tab-calc"><tr><th>Grandeur</th><th>Calcul</th><th>Résultat</th></tr>
    <tr><td>Vc <span class="g">(conseillée ${fmt(vc0)})</span></td><td class="an">${esc(m.nom)}, outil ${etat.outil === 'ars' ? 'ARS' : 'carbure'}</td><td class="r">${fmt(Vc)} m/min</td></tr>
    <tr><td>n</td><td class="f">1000 × ${fmt(Vc)} / (π × ${o.D})</td><td class="r">${fmt(nCalc)} tr/min</td></tr>
    <tr><td>Vf</td><td class="f">${o.pas ? `pas × n = ${fmt(fz, 1)} × ${fmt(n)}` : `${fmt(fz, 3)} × ${o.Z} × ${fmt(n)}`}</td><td class="r">${fmt(Vf)} mm/min</td></tr>
    <tr><td>Q</td><td class="f">${o.axial ? (o.d0 ? `π/4 × (${o.D}² − ${fmt(o.d0, 1)}²)` : `π × ${o.D}² / 4`) + ` × ${fmt(Vf)} / 1000` : `${ap} × ${ae} × ${fmt(Vf)} / 1000`}</td><td class="r">${fmt(Q, 1)} cm³/min</td></tr>
    <tr><td>Pc</td><td class="f">${fmt(Q, 1)} × ${m.kc} / 60 000</td><td class="r">${fmt(Pc, 2)} kW</td></tr>
    <tr><td>Pm</td><td class="f">Pc / η = ${fmt(Pc, 2)} / 0,8</td><td class="r">${fmt(Pm, 2)} kW</td></tr>
    <tr><td>tc</td><td class="f">${fmt(Lu)} / ${fmt(Vf)}</td><td class="r">${fmt(tc, 2)} min</td></tr></table>
    <p class="note">${o.axial ? `Outil principal : ${esc(o.outilPrincipal)}, D = ${o.D} mm, profondeur ${ap} mm` : `D = ${o.D} mm, Z = ${o.Z} dents, ap = ${ap} mm (passe la plus forte), ae = ${ae} mm`}, kc = ${m.kc} N/mm², η = 0,8. L'animation est accélérée ; le temps réel est le temps de coupe calculé.</p>`;
  scene.toursParSec = Math.max(0.6, Math.min(3, n / 300));
  scene.couleurCopeaux(m.copeau);
  hud();
}

function hud() {
  const o = OPERATIONS[etat.op];
  if (!$('#hud')) return;
  $('#hud').innerHTML = `<div>${esc(scene.nomOutil() || o.outil)}</div><div>n = <b>${fmt(res.n || 0)}</b> tr/min · Vf = <b>${fmt(res.Vf || 0)}</b> mm/min</div>` +
    (modeActuel ? `<div>Fraisage <b>${esc(modeActuel)}</b></div>` : '');
}

/* ---------- Fiche de l'opération ---------- */
function pageFiche() {
  const o = OPERATIONS[etat.op];
  $('#p-fiche').innerHTML = `<div class="fiche"><h3>${o.icone} ${esc(o.nom)}</h3>
    <p><b>But :</b> ${esc(o.but)}</p>
    <p>${o.principe}</p>
    <div class="carte-op"><div>Machine<b>Fraiseuse ${o.machine}</b></div><div>Outil<b>${esc(o.outil)}</b></div>
      <div>${o.axial ? 'Profondeur' : 'Profondeur de passe ap'}<b>${esc(o.ap)}</b></div><div>${o.axial ? 'Diamètre' : 'Engagement ae'}<b>${o.axial ? esc(o.diam) : o.ae + ' mm'}</b></div></div>
    <h3>Gamme opératoire</h3><ol class="etapes">${o.etapes.map(e => `<li>${esc(e)}</li>`).join('')}</ol>
    <h3>💡 Astuces</h3><ul>${o.astuces.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
    <h3>⚠️ Erreurs fréquentes</h3><ul>${o.erreurs.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
}

/* ---------- Cours et astuces ---------- */
$('#p-cours').innerHTML = COURS.map((c, i) => `<details class="chap fiche" ${i === 0 ? 'open' : ''}><summary>${esc(c.titre)}</summary>${c.html}</details>`).join('') +
  '<h3>Les opérations de la simulation</h3><ul>' + Object.entries(OPERATIONS).map(([k, o]) => `<li><a href="#" data-op="${k}">${esc(o.nom)}</a> — ${esc(o.but)}</li>`).join('') + '</ul>';
$('#p-cours').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-op]'); if (!a) return;
  e.preventDefault(); choisirOp(a.dataset.op);
});
$('#p-astuces').innerHTML = ASTUCES.map(a => `<h3>${esc(a.theme)}</h3><ul>${a.liste.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`).join('') +
  '<h3>Astuces par opération</h3>' + Object.values(OPERATIONS).map(o => `<details class="chap"><summary>${o.icone} ${esc(o.nom)}</summary><ul>${o.astuces.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details>`).join('');

/* ---------- Quiz ---------- */
let quiz = null;
function melanger(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function nouveauQuiz() {
  quiz = { qs: melanger(QUIZ).slice(0, 10).map(q => ({ q: q.q, e: q.e, r: melanger(q.r.map((t, i) => ({ t, bon: i === q.b }))), choix: -1 })) };
  pageQuiz();
}
function pageQuiz() {
  const nb = quiz.qs.filter(q => q.choix >= 0 && q.r[q.choix].bon).length, rep = quiz.qs.filter(q => q.choix >= 0).length;
  $('#p-quiz').innerHTML = `<div class="score">Score : ${nb} / ${quiz.qs.length}${rep === quiz.qs.length ? (nb >= 8 ? ' — Excellent ! 🎉' : nb >= 5 ? ' — Bien, revoyez le cours.' : ' — À retravailler.') : ''}</div>` +
    quiz.qs.map((q, i) => `<div class="question"><p>${i + 1}. ${esc(q.q)}</p>${q.r.map((r, j) => {
      let c = '';
      if (q.choix >= 0) { if (r.bon) c = 'bon'; else if (j === q.choix) c = 'faux'; }
      return `<button type="button" data-q="${i}" data-r="${j}" class="${c}" ${q.choix >= 0 ? 'disabled' : ''}>${esc(r.t)}</button>`;
    }).join('')}${q.choix >= 0 ? `<div class="expl">${q.r[q.choix].bon ? '✅' : '❌'} ${esc(q.e)}</div>` : ''}</div>`).join('') +
    `<p class="note">${QUIZ.length} questions au total : chaque quiz en tire 10 au hasard.</p><button type="button" class="btn prim" id="b-quiz">🔄 Nouveau quiz</button>`;
}
$('#p-quiz').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'b-quiz') return nouveauQuiz();
  const q = quiz.qs[+b.dataset.q]; if (!q || q.choix >= 0) return;
  q.choix = +b.dataset.r;
  const y = $('#p-quiz').parentElement.scrollTop;
  pageQuiz();
  $('#p-quiz').parentElement.scrollTop = y;
});

/* ---------- Onglets et outils 3D ---------- */
document.querySelector('.onglets').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-onglet]'); if (!b) return;
  document.querySelectorAll('.onglets button').forEach(x => x.classList.toggle('actif', x === b));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('actif', p.id === 'p-' + b.dataset.onglet));
  document.querySelector('.contenu').scrollTop = 0;
});
$('#b-pause').addEventListener('click', (e) => { scene.pause = !scene.pause; e.currentTarget.textContent = scene.pause ? '▶' : '⏸'; });
$('#b-rejouer').addEventListener('click', () => { etat.trajet = scene.construire(etat.op, etat.dir); });
$('#b-etiq').addEventListener('click', (e) => { scene.montrerEtiq = !scene.montrerEtiq; e.currentTarget.setAttribute('aria-pressed', scene.montrerEtiq); });
$('#b-centre').addEventListener('click', () => scene.recentrer());
const enPleinEcran = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function modePlein(actif) {
  document.body.classList.toggle('plein', actif);
  const b = $('#b-plein');
  b.textContent = actif ? '✕' : '⛶';
  b.title = actif ? 'Quitter le plein écran' : 'Plein écran';
  b.setAttribute('aria-label', b.title);
  setTimeout(() => scene.recentrer(), 120);
}
$('#b-plein').addEventListener('click', async () => {
  const el = document.documentElement;
  if (document.body.classList.contains('plein')) {
    if (enPleinEcran()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    modePlein(false);
    return;
  }
  modePlein(true);
  try {
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req && !window.Capacitor?.isNativePlatform?.()) await req.call(el, { navigationUI: 'hide' });
  } catch (e) { /* plein écran refusé : la 3D occupe quand même toute la fenêtre */ }
});
const surChangement = () => { if (!enPleinEcran() && document.body.classList.contains('plein')) modePlein(false); };
document.addEventListener('fullscreenchange', surChangement);
document.addEventListener('webkitfullscreenchange', surChangement);
$('#vitesse').addEventListener('input', (e) => { scene.vitesse = parseFloat(e.target.value); });

if (location.search.includes('debug')) window.__scene = scene;
barreOps();
nouveauQuiz();
choisirOp(etat.op);
scene.recentrer();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
