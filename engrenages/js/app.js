/* =====================================================================
   app.js — Interface : choix du type, réglages, calculs, profil des
   dents (SVG zoomable), cours, exercices corrigés et quiz.
   ===================================================================== */

import { TYPES, MODULES, calculer, fmt } from './calculs.js';
import { FICHES, VOCABULAIRE, FORMULES_GENERALES, MODULES_TXT, EXERCICES, QUIZ } from './donnees.js';
import { Scene3D, contour } from './scene3d.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const etat = { type: 'droite', valeurs: {}, profil: 0 };
for (const t in TYPES) etat.valeurs[t] = { ...TYPES[t].defauts };
try { const t = localStorage.getItem('engrenages-type'); if (TYPES[t]) etat.type = t; } catch (e) { /* stockage indisponible */ }

const info = $('#info3d');
let minuterieInfo;
const scene = new Scene3D($('#canvas3d'), $('#etiquettes'), (i) => {
  clearTimeout(minuterieInfo);
  if (!i) { info.hidden = true; return; }
  info.innerHTML = `<b>${esc(i.titre)}</b>${esc(i.texte)}`;
  info.hidden = false;
  minuterieInfo = setTimeout(() => { info.hidden = true; }, 6000);
});

/* ---------- Types ---------- */
function barreTypes() {
  const nav = $('#types');
  nav.innerHTML = Object.entries(TYPES).map(([k, t]) => `<button type="button" data-type="${k}">${t.icone} ${esc(t.court)}</button>`).join('');
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-type]');
    if (b) choisirType(b.dataset.type);
  });
}
function choisirType(t) {
  etat.type = t; etat.profil = 0;
  try { localStorage.setItem('engrenages-type', t); } catch (e) { /* rien */ }
  document.querySelectorAll('#types button').forEach(b => b.classList.toggle('actif', b.dataset.type === t));
  document.querySelector(`#types button[data-type="${t}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  scene.vueDir = null;
  $('#nom-type').textContent = TYPES[t].nom;
  pageParams();
  toutMettreAJour(false);
  pageCours();
}

/* ---------- Réglages ---------- */
function pageParams() {
  const t = TYPES[etat.type], v = etat.valeurs[etat.type];
  $('#params').innerHTML = Object.entries(t.params).map(([k, p]) => {
    if (p.module) return `<div class="param"><label for="p-${k}"><span>${esc(p.lab)}</span><span id="v-${k}">${fmt(v[k])} mm</span></label>
      <div class="ligne"><input type="range" id="p-${k}" data-k="${k}" min="0" max="${MODULES.length - 1}" step="1" value="${Math.max(0, MODULES.indexOf(v[k]))}"></div></div>`;
    return `<div class="param"><label for="p-${k}"><span>${esc(p.lab)}</span><span id="v-${k}">${fmt(v[k], 2)} ${p.unite || ''}</span></label>
      <div class="ligne"><input type="range" id="p-${k}" data-k="${k}" min="${p.min}" max="${p.max}" step="${p.pas}" value="${v[k]}">
      <input type="number" data-k="${k}" data-num="1" min="${p.min}" max="${p.max}" step="${p.pas}" value="${v[k]}" aria-label="${esc(p.lab)}"></div></div>`;
  }).join('');
}
$('#params').addEventListener('input', (e) => {
  const k = e.target.dataset.k; if (!k) return;
  const p = TYPES[etat.type].params[k], v = etat.valeurs[etat.type];
  let x = parseFloat(e.target.value);
  if (!isFinite(x)) return;
  if (p.module) x = MODULES[Math.round(x)];
  else {
    if (e.target.dataset.num && (x < p.min || x > p.max)) return;   // saisie en cours
    x = Math.min(p.max, Math.max(p.min, x));
  }
  v[k] = x;
  const autre = document.querySelector(e.target.dataset.num ? `#p-${k}` : `.param input[data-num][data-k="${k}"]`);
  if (autre) autre.value = x;
  $('#v-' + k).textContent = p.module ? fmt(x) + ' mm' : `${fmt(x, 2)} ${p.unite || ''}`;
  toutMettreAJour(true);
});
$('#b-defaut').addEventListener('click', () => { etat.valeurs[etat.type] = { ...TYPES[etat.type].defauts }; pageParams(); toutMettreAJour(false); });

let minuterie3D;
function toutMettreAJour(garderVue) {
  const v = etat.valeurs[etat.type], c = calculer(etat.type, v);
  $('#alertes').innerHTML = c.alertes.map(a => `<div class="alerte">⚠️ ${esc(a)}</div>`).join('');
  pageCalculs(c);
  resume(c, v);
  pageProfil();
  clearTimeout(minuterie3D);
  minuterie3D = setTimeout(() => scene.construire(etat.type, v, c, garderVue), garderVue ? 120 : 0);
}

function resume(c, v) {
  const r = c.res, t = etat.type, cases = [];
  const C = (lab, val, court) => cases.push([lab, val, court || lab]);
  const sortie = { train: r.n4, epicycloidal: r.nps, cremaillere: null }[t] ?? r.n2;
  if (t === 'cremaillere') { C('Avance par tour', fmt(Math.PI * r.d) + ' mm'); C('Vitesse crémaillère', fmt(r.vit, 3) + ' m/s'); }
  else {
    const ratio = sortie / v.n1;
    C('Rapport r = n sortie / n entrée', fmt(ratio, 4), 'Rapport r');
    C('Réduction i = 1 / r', fmt(1 / ratio, 2), 'Réduction i');
    C('Vitesse de sortie', fmt(sortie, 1) + ' tr/min', 'n sortie');
  }
  const ent = { train: 'a12', vis: 'a', droite: 'a', helicoidale: 'a', interieur: 'a' }[t];
  if (ent) C('Entraxe', fmt(r[ent]) + ' mm');
  if (t === 'vis') C('Rendement', fmt(r.eta * 100, 1) + ' %');
  if (t === 'conique') C('Angle δ1 / δ2', `${fmt(r.delta1 * 180 / Math.PI, 1)}° / ${fmt(90 - r.delta1 * 180 / Math.PI, 1)}°`);
  if (t === 'epicycloidal') C('Couronne Zc', r.Zc + ' dents');
  const cs = c.lignes.find(l => l.g === 'Couple de sortie');
  if (cs) C('Couple de sortie', cs.r);
  $('#resume').innerHTML = cases.map(([a, b]) => `<div>${esc(a)}<b>${esc(b)}</b></div>`).join('');
  $('#hud').innerHTML = cases.slice(0, 3).map(([, b, a]) => `<div>${esc(a)} : <b>${esc(b)}</b></div>`).join('');
}

/* ---------- Calculs ---------- */
function pageCalculs(c) {
  let h = '<table class="tab-calc">';
  for (const l of c.lignes) {
    if (l.titre) { h += `<tr><th colspan="2">${esc(l.titre)}</th></tr>`; continue; }
    h += `<tr><td><div class="g">${esc(l.g)}</div><div class="f">${esc(l.f)}</div>${l.an ? `<div class="an">= ${esc(l.an)}</div>` : ''}</td><td class="r">${esc(l.r)}</td></tr>`;
  }
  $('#calculs').innerHTML = h + '</table>';
}

/* ---------- Profil des dents (SVG) ---------- */
function rouesDuType() {
  const v = etat.valeurs[etat.type], m = v.m, t = etat.type;
  const mt = t === 'helicoidale' ? m / Math.cos(v.beta * Math.PI / 180) : m;
  switch (t) {
    case 'droite': case 'conique': return [{ nom: `Pignon Z1 = ${v.Z1}`, Z: v.Z1, m }, { nom: `Roue Z2 = ${v.Z2}`, Z: v.Z2, m }];
    case 'helicoidale': return [{ nom: `Z1 = ${v.Z1} (section apparente)`, Z: v.Z1, m: mt }, { nom: `Z2 = ${v.Z2}`, Z: v.Z2, m: mt }];
    case 'interieur': return [{ nom: `Pignon Z1 = ${v.Z1}`, Z: v.Z1, m }, { nom: `Couronne Z2 = ${v.Z2}`, Z: v.Z2, m, interne: true }];
    case 'cremaillere': return [{ nom: `Pignon Z = ${v.Z1}`, Z: v.Z1, m }, { nom: 'Crémaillère', m, cremaillere: true }];
    case 'vis': return [{ nom: 'Vis (coupe axiale)', m, cremaillere: true }, { nom: `Roue Z2 = ${v.Z2}`, Z: v.Z2, m }];
    case 'train': return ['Z1', 'Z2', 'Z3', 'Z4'].map(k => ({ nom: `${k} = ${v[k]}`, Z: v[k], m }));
    case 'epicycloidal': return [{ nom: `Planétaire Zs = ${v.Zs}`, Z: v.Zs, m }, { nom: `Satellite Zp = ${v.Zp}`, Z: v.Zp, m },
      { nom: `Couronne Zc = ${v.Zs + 2 * v.Zp}`, Z: v.Zs + 2 * v.Zp, m, interne: true }];
  }
  return [];
}

const COT = { tete: '#dc2626', prim: '#2563eb', pied: '#16a34a', base: '#9333ea', cote: '#0f172a' };
function pageProfil() {
  const roues = rouesDuType();
  if (etat.profil >= roues.length) etat.profil = 0;
  $('#choix-profil').innerHTML = roues.map((r, i) => `<button type="button" data-i="${i}" class="${i === etat.profil ? 'actif' : ''}">${esc(r.nom)}</button>`).join('');
  const R = roues[etat.profil];
  const svg = R.cremaillere ? svgCremaillere(R.m) : svgRoue(R);
  $('#cadre-svg').innerHTML = svg.html;
  activerZoom($('#cadre-svg svg'), svg.vb);
  $('#legende-profil').innerHTML = svg.legende;
}
$('#choix-profil').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) { etat.profil = +b.dataset.i; pageProfil(); } });

const n2 = (x) => (Math.round(x * 100) / 100).toString();
function fleche(x1, y1, x2, y2, w) {
  return `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${COT.cote}" stroke-width="${w}" marker-start="url(#fl)" marker-end="url(#fl)"/>`;
}
function texte(x, y, t, taille, coul = COT.cote, ancre = 'middle') {
  return `<text x="${n2(x)}" y="${n2(y)}" font-size="${n2(taille)}" fill="${coul}" text-anchor="${ancre}" font-family="system-ui,sans-serif" font-weight="600" paint-order="stroke" stroke="#f8fafc" stroke-width="${n2(taille / 5)}">${esc(t)}</text>`;
}
function entete(vb) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(n2).join(' ')}"><defs><marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${6}" markerHeight="${6}" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="${COT.cote}"/></marker></defs>`;
}

function svgRoue(R) {
  const { Z, m, interne } = R;
  const r = m * Z / 2, p = Math.PI * m;
  const ra = interne ? r - m : r + m, rf = interne ? r + 1.25 * m : r - 1.25 * m, rb = r * Math.cos(20 * Math.PI / 180);
  const W = Math.min(6.5 * p, 2.5 * Math.max(ra, rf)), H = W * 0.92;
  const entier = W >= 2.3 * Math.max(ra, rf);
  const cy = entier ? 0 : (interne ? r - 0.05 * H : r - 0.12 * H);
  const vb = [-W / 2, -(cy + H / 2), W, H];
  const sw = W / 300, tx = W / 26;
  // contour tourné pour avoir une dent (ou un creux de couronne) en haut, en y vers le bas pour le SVG
  const rot = Math.PI / 2;
  const pts = contour(Z, m, interne, 10).map(q => {
    const a = Math.atan2(q.y, q.x) + rot, l = Math.hypot(q.x, q.y);
    return `${n2(l * Math.cos(a))},${n2(-l * Math.sin(a))}`;
  }).join(' ');
  let h = entete(vb);
  if (interne) {
    const Re = r + 4 * m;
    h += `<path d="M ${-Re} 0 A ${Re} ${Re} 0 1 0 ${Re} 0 A ${Re} ${Re} 0 1 0 ${-Re} 0 Z M ${pts.split(' ').join(' L ')} Z" fill="#cbd5e1" fill-rule="evenodd" stroke="#334155" stroke-width="${sw}"/>`;
  } else h += `<polygon points="${pts}" fill="#cbd5e1" stroke="#334155" stroke-width="${sw}"/>`;
  const cercleS = (rr, c, dash) => `<circle cx="0" cy="0" r="${n2(rr)}" fill="none" stroke="${c}" stroke-width="${sw * 1.3}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  h += cercleS(ra, COT.tete) + cercleS(r, COT.prim, `${n2(W / 40)} ${n2(W / 120)} ${n2(W / 300)} ${n2(W / 120)}`) + cercleS(rf, COT.pied) + cercleS(rb, COT.base, `${n2(W / 150)} ${n2(W / 150)}`);
  // axe de la dent du haut
  h += `<line x1="0" y1="${n2(-(Math.min(ra, rf) - m))}" x2="0" y2="${n2(-(Math.max(ra, rf) + 1.5 * m))}" stroke="#64748b" stroke-width="${sw * 0.7}" stroke-dasharray="${n2(W / 60)} ${n2(W / 150)}"/>`;
  // pas p sur le primitif, entre deux dents (ou deux creux pour la couronne)
  const a0 = Math.PI / 2, a1 = Math.PI / 2 - 2 * Math.PI / Z, rp = Math.max(ra, rf) + 1.6 * m;
  const P = (rr, a) => [rr * Math.cos(a), -rr * Math.sin(a)];
  [a0, a1].forEach(a => { const [x1, y1] = P(r, a), [x2, y2] = P(rp + 0.4 * m, a); h += `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${COT.cote}" stroke-width="${sw * 0.6}"/>`; });
  const [px0, py0] = P(rp, a0), [px1, py1] = P(rp, a1);
  h += `<path d="M ${n2(px0)} ${n2(py0)} A ${n2(rp)} ${n2(rp)} 0 0 1 ${n2(px1)} ${n2(py1)}" fill="none" stroke="${COT.cote}" stroke-width="${sw}" marker-start="url(#fl)" marker-end="url(#fl)"/>`;
  const [ptx, pty] = P(rp + 0.9 * m, (a0 + a1) / 2);
  h += texte(ptx, pty, `p = ${fmt(p)}`, tx);
  // épaisseur e et intervalle s sur le primitif (corde)
  const de = Math.PI / (2 * Z);
  const [ex0, ey0] = P(r, a0 + de), [ex1, ey1] = P(r, a0 - de);
  const [sx0, sy0] = P(r, a0 + de), [sx1, sy1] = P(r, a0 + 3 * de);
  h += texte((ex0 + ex1) / 2, ey0 + tx * (interne ? -0.5 : 1.3), interne ? 's' : 'e', tx * 0.9, COT.prim);
  h += texte((sx0 + sx1) / 2, sy0 + tx * (interne ? 1.3 : -0.5), interne ? 'e' : 's', tx * 0.9, COT.prim);
  // cotes radiales ha, hf et h à droite de la dent du haut
  const xd = -Math.min(W * 0.26, r * 0.6);
  const yC = (rr) => -Math.sqrt(Math.max(0, rr * rr - xd * xd));   // cotes mesurées sur la verticale x = xd
  const yA = yC(ra), yP = yC(r), yF = yC(rf);
  h += fleche(xd, yP, xd, yA, sw) + texte(xd - tx * 0.4, (yP + yA) / 2 + tx * 0.35, `ha = ${fmt(m)}`, tx * 0.85, COT.cote, 'end');
  h += fleche(xd, yP, xd, yF, sw) + texte(xd - tx * 0.4, (yP + yF) / 2 + tx * 0.35, `hf = ${fmt(1.25 * m)}`, tx * 0.85, COT.cote, 'end');
  const xh = xd + tx * 0.9;
  h += fleche(xh, yA, xh, yF, sw) + texte(xh + tx * 0.35, (yA + yF) / 2 + tx * 0.35, `h = ${fmt(2.25 * m)}`, tx * 0.85, COT.cote, 'start');
  [yA, yP, yF].forEach(y => { h += `<line x1="${n2(xd - tx * 0.3)}" y1="${n2(y)}" x2="${n2(xh + tx * 0.3)}" y2="${n2(y)}" stroke="${COT.cote}" stroke-width="${sw * 0.5}"/>`; });
  // noms des cercles à droite
  const xl = W * 0.36;
  const lab = (rr, t, c, dy = 0) => {
    const y = -Math.sqrt(Math.max(0, rr * rr - xl * xl));
    if (!isFinite(y) || rr < xl) return '';
    return texte(xl, y - tx * 0.35 + dy, t, tx * 0.8, c);
  };
  h += lab(Math.max(ra, rf), `${interne ? 'df' : 'da'} = ${fmt(2 * Math.max(ra, rf))}`, interne ? COT.pied : COT.tete);
  h += lab(r, `d = ${fmt(2 * r)}`, COT.prim);
  h += lab(Math.min(ra, rf), `${interne ? 'da' : 'df'} = ${fmt(2 * Math.min(ra, rf))}`, interne ? COT.tete : COT.pied, tx * 1.25);
  h += lab(rb, `db = ${fmt(2 * rb)}`, COT.base, tx * 1.25);
  if (entier) h += `<circle cx="0" cy="0" r="${n2(sw * 3)}" fill="#334155"/>`;
  h += '</svg>';
  const leg = `<div class="leg">
    <i style="border-color:${COT.tete}"></i><span>Cercle de tête da = ${interne ? 'd − 2m' : 'd + 2m'}</span><b>${fmt(2 * ra)} mm</b>
    <i style="border-color:${COT.prim};border-top-style:dashed"></i><span>Cercle primitif d = m·Z</span><b>${fmt(2 * r)} mm</b>
    <i style="border-color:${COT.pied}"></i><span>Cercle de pied df = ${interne ? 'd + 2,5m' : 'd − 2,5m'}</span><b>${fmt(2 * rf)} mm</b>
    <i style="border-color:${COT.base};border-top-style:dotted"></i><span>Cercle de base db = d·cos 20°</span><b>${fmt(2 * rb)} mm</b>
    <span></span><span>Pas p = π·m · épaisseur e = intervalle s = p/2</span><b>${fmt(p)} / ${fmt(p / 2)}</b></div>
    <p class="note">Le flanc de chaque dent est une <b>développante de cercle</b> tracée à partir du cercle de base. ${Z < 17 && !interne ? '⚠️ Moins de 17 dents : en réalité la base de la dent serait creusée (interférence de taillage).' : ''}</p>`;
  return { html: h, vb, legende: leg };
}

function svgCremaillere(m) {
  const p = Math.PI * m, ta = Math.tan(20 * Math.PI / 180), W = 4.2 * p, H = W * 0.92;
  const vb = [-W / 2, -H * 0.45, W, H], sw = W / 300, tx = W / 26;
  let h = entete(vb), d = `M ${n2(-W)} ${n2(4 * m)} `;
  for (let k = -4; k <= 4; k++) {
    const xc = k * p, wP = p / 4 + 1.25 * m * ta, wT = p / 4 - m * ta;
    d += `L ${n2(xc - wP)} ${n2(1.25 * m)} L ${n2(xc - wT)} ${n2(-m)} L ${n2(xc + wT)} ${n2(-m)} L ${n2(xc + wP)} ${n2(1.25 * m)} `;
  }
  d += `L ${n2(W)} ${n2(1.25 * m)} L ${n2(W)} ${n2(4 * m)} Z`;
  h += `<path d="${d}" fill="#cbd5e1" stroke="#334155" stroke-width="${sw}"/>`;
  const ligne = (y, c, dash) => `<line x1="${n2(-W)}" y1="${n2(y)}" x2="${n2(W)}" y2="${n2(y)}" stroke="${c}" stroke-width="${sw * 1.3}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  h += ligne(-m, COT.tete) + ligne(0, COT.prim, `${n2(W / 40)} ${n2(W / 120)}`) + ligne(1.25 * m, COT.pied);
  h += `<line x1="0" y1="${n2(-m * 2.6)}" x2="${n2(p)}" y2="${n2(-m * 2.6)}" stroke="${COT.cote}" stroke-width="${sw}" marker-start="url(#fl)" marker-end="url(#fl)"/>`;
  h += `<line x1="0" y1="0" x2="0" y2="${n2(-2.9 * m)}" stroke="${COT.cote}" stroke-width="${sw * 0.5}"/><line x1="${n2(p)}" y1="0" x2="${n2(p)}" y2="${n2(-2.9 * m)}" stroke="${COT.cote}" stroke-width="${sw * 0.5}"/>`;
  h += texte(p / 2, -2.9 * m, `p = π·m = ${fmt(p)}`, tx);
  const xd = -p * 1.5;
  h += fleche(xd, 0, xd, -m, sw) + texte(xd - tx * 0.3, -m / 2 + tx * 0.3, `ha = ${fmt(m)}`, tx * 0.85, COT.cote, 'end');
  h += fleche(xd, 0, xd, 1.25 * m, sw) + texte(xd - tx * 0.3, 0.62 * m + tx * 0.3, `hf = ${fmt(1.25 * m)}`, tx * 0.85, COT.cote, 'end');
  // angle de 20° sur le flanc de droite de la dent centrale
  const wP = p / 4 + 1.25 * m * ta, wT = p / 4 - m * ta;
  h += `<line x1="${n2(wT)}" y1="${n2(-m)}" x2="${n2(wT)}" y2="${n2(1.25 * m)}" stroke="${COT.base}" stroke-width="${sw}" stroke-dasharray="${n2(W / 150)}"/>`;
  h += texte(wT + (wP - wT) / 2 + tx * 0.6, 0.85 * m + tx * 0.1, 'α = 20°', tx * 0.8, COT.base, 'start');
  h += texte(W * 0.48, -tx * 0.3, 'ligne primitive', tx * 0.7, COT.prim, 'end');
  h += texte(0, 3.4 * m, 'e = s = p / 2 = ' + fmt(p / 2), tx * 0.85);
  h += '</svg>';
  const leg = `<div class="leg"><i style="border-color:${COT.tete}"></i><span>Ligne de tête (saillie ha = m)</span><b>${fmt(m)} mm</b>
    <i style="border-color:${COT.prim};border-top-style:dashed"></i><span>Ligne primitive : pas p = π·m</span><b>${fmt(p)} mm</b>
    <i style="border-color:${COT.pied}"></i><span>Ligne de pied (creux hf = 1,25·m)</span><b>${fmt(1.25 * m)} mm</b></div>
    <p class="note">La crémaillère est une roue de rayon infini : ses flancs sont des <b>droites</b> inclinées de l'angle de pression α = 20°. C'est aussi la forme de l'outil qui taille les roues.</p>`;
  return { html: h, vb, legende: leg };
}

/* Zoom au pincement / à la molette et déplacement sur un SVG */
function activerZoom(svg, vb0) {
  if (!svg) return;
  let vb = [...vb0];
  const pts = new Map();
  let dep = null;
  const appliquer = () => svg.setAttribute('viewBox', vb.map(n2).join(' '));
  const versSVG = (cx, cy) => { const r = svg.getBoundingClientRect(); return [vb[0] + (cx - r.left) / r.width * vb[2], vb[1] + (cy - r.top) / r.height * vb[3]]; };
  const zoom = (k, cx, cy) => {
    const nw = Math.min(vb0[2] * 3, Math.max(vb0[2] / 12, vb[2] / k)), f = nw / vb[2];
    const [x, y] = versSVG(cx, cy);
    vb = [x - (x - vb[0]) * f, y - (y - vb[1]) * f, vb[2] * f, vb[3] * f];
    appliquer();
  };
  svg.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
  svg.addEventListener('pointerdown', (e) => { svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); dep = null; });
  svg.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const avant = [...pts.values()];
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const apres = [...pts.values()];
    const r = svg.getBoundingClientRect();
    if (apres.length === 1) {
      vb[0] -= (apres[0][0] - avant[0][0]) / r.width * vb[2];
      vb[1] -= (apres[0][1] - avant[0][1]) / r.height * vb[3];
      appliquer();
    } else if (apres.length === 2) {
      const d0 = Math.hypot(avant[0][0] - avant[1][0], avant[0][1] - avant[1][1]);
      const d1 = Math.hypot(apres[0][0] - apres[1][0], apres[0][1] - apres[1][1]);
      if (d0 > 0) zoom(d1 / d0, (apres[0][0] + apres[1][0]) / 2, (apres[0][1] + apres[1][1]) / 2);
    }
  });
  const fin = (e) => pts.delete(e.pointerId);
  svg.addEventListener('pointerup', fin); svg.addEventListener('pointercancel', fin);
  svg.addEventListener('dblclick', () => { vb = [...vb0]; appliquer(); });
}

/* ---------- Cours ---------- */
function pageCours() {
  const t = TYPES[etat.type], f = FICHES[etat.type];
  const li = (a) => a.map(x => `<li>${esc(x)}</li>`).join('');
  $('#p-cours').innerHTML = `<div class="fiche">
    <h3>${t.icone} ${esc(t.nom)}</h3><p>${esc(f.def)}</p>
    <b>Utilisations</b><ul>${li(f.usages)}</ul>
    <div class="colonnes"><div><b class="ok">✔ Avantages</b><ul>${li(f.plus)}</ul></div><div><b class="ko">✘ Inconvénients</b><ul>${li(f.moins)}</ul></div></div>
    <div class="encadre">💡 ${esc(f.retenir)}</div>
    <p class="note">Les formules complètes de ce type, avec les valeurs, sont dans l'onglet 🧮 Calculs.</p>
    <h3>Formules générales (denture droite normale)</h3>
    <table class="voc">${FORMULES_GENERALES.map(([a, b]) => `<tr><td>${esc(a)}</td><td class="f">${esc(b)}</td></tr>`).join('')}</table>
    <p class="note">${esc(MODULES_TXT)}</p>
    <h3>Vocabulaire</h3>
    <table class="voc">${VOCABULAIRE.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>
    <h3>Classification</h3>
    <table class="voc">
      <tr><td>Axes parallèles</td><td>cylindriques droits, hélicoïdaux, à chevrons, intérieurs</td></tr>
      <tr><td>Axes concourants</td><td>coniques (droits, hélicoïdaux, spiraux)</td></tr>
      <tr><td>Axes non concourants</td><td>roue et vis sans fin, engrenages gauches</td></tr>
      <tr><td>Rotation ↔ translation</td><td>pignon et crémaillère</td></tr></table>
  </div>`;
}

/* ---------- Exercices ---------- */
let exo = null;
function nouvelExo() {
  const alea = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const m = MODULES[alea(2, 9)], Z1 = alea(17, 30), Z2 = Math.round(Z1 * (1.5 + Math.random() * 2.5)), n1 = [750, 960, 1450, 2900][alea(0, 3)];
  const d1 = m * Z1, d2 = m * Z2;
  exo = { m, Z1, Z2, n1, rep: [['d1 (mm)', d1], ['da1 (mm)', d1 + 2 * m], ['df1 (mm)', d1 - 2.5 * m], ['d2 (mm)', d2], ['Entraxe a (mm)', (d1 + d2) / 2], ['n2 (tr/min)', n1 * Z1 / Z2]] };
}
function pageExercices() {
  if (!exo) nouvelExo();
  const e = exo;
  $('#p-exercices').innerHTML = `<div class="exo" id="exo-alea"><h4>🎲 Entraînement (valeurs au hasard)</h4>
    <p>Engrenage droit extérieur : module m = <b>${fmt(e.m)} mm</b>, pignon Z1 = <b>${e.Z1}</b> dents à n1 = <b>${e.n1} tr/min</b>, roue Z2 = <b>${e.Z2}</b> dents.</p>
    ${e.rep.map(([lab], i) => `<div class="saisie"><label for="rep-${i}">${esc(lab)}</label><input id="rep-${i}" inputmode="decimal" autocomplete="off"><span id="ok-${i}"></span></div>`).join('')}
    <button type="button" class="btn prim" id="b-verif">Vérifier</button><button type="button" class="btn" id="b-sol">Solution</button><button type="button" class="btn" id="b-nouv">Nouveau</button>
    <div class="corr" id="sol-alea"></div></div>
    <h3>Exercices corrigés</h3>
    ${EXERCICES.map((x, i) => `<div class="exo" data-i="${i}"><h4>${esc(x.titre)}</h4><p>${esc(x.enonce)}</p>
      <button type="button" class="btn" data-corr="${i}">Voir la correction</button><div class="corr"><ol>${x.corr.map(c => `<li>${c}</li>`).join('')}</ol></div></div>`).join('')}`;
}
$('#p-exercices').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.corr !== undefined) { const d = b.closest('.exo'); d.classList.toggle('ouvert'); b.textContent = d.classList.contains('ouvert') ? 'Masquer la correction' : 'Voir la correction'; }
  else if (b.id === 'b-nouv') { nouvelExo(); pageExercices(); }
  else if (b.id === 'b-verif') {
    exo.rep.forEach(([, val], i) => {
      const x = parseFloat(($('#rep-' + i).value || '').replace(',', '.').replace(/\s/g, ''));
      const ok = isFinite(x) && Math.abs(x - val) <= Math.max(0.01 * Math.abs(val), 0.05);
      const s = $('#ok-' + i); s.textContent = ok ? '✔' : '✘'; s.className = ok ? 'ok' : 'ko';
    });
  } else if (b.id === 'b-sol') {
    const e2 = exo, s = $('#sol-alea');
    s.innerHTML = `<ol><li>d1 = m·Z1 = ${fmt(e2.m)} × ${e2.Z1} = <b>${fmt(e2.rep[0][1])}</b></li><li>da1 = d1 + 2m = <b>${fmt(e2.rep[1][1])}</b></li>
      <li>df1 = d1 − 2,5m = <b>${fmt(e2.rep[2][1])}</b></li><li>d2 = m·Z2 = ${fmt(e2.m)} × ${e2.Z2} = <b>${fmt(e2.rep[3][1])}</b></li>
      <li>a = (d1 + d2)/2 = <b>${fmt(e2.rep[4][1])}</b></li><li>n2 = n1·Z1/Z2 = ${e2.n1} × ${e2.Z1}/${e2.Z2} = <b>${fmt(e2.rep[5][1], 1)}</b></li></ol>`;
    $('#exo-alea').classList.add('ouvert');
  }
});

/* ---------- Quiz ---------- */
let quiz = null;
function melanger(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function nouveauQuiz() {
  quiz = { qs: melanger(QUIZ).slice(0, 10).map(q => ({ q: q.q, r: melanger(q.r.map((t, i) => ({ t, bon: i === q.b }))), choix: -1 })), fini: false };
  pageQuiz();
}
function pageQuiz() {
  const nb = quiz.qs.filter(q => q.choix >= 0 && q.r[q.choix].bon).length, rep = quiz.qs.filter(q => q.choix >= 0).length;
  $('#p-quiz').innerHTML = `<div class="score">Score : ${nb} / ${quiz.qs.length}${rep === quiz.qs.length ? (nb >= 8 ? ' — Excellent ! 🎉' : nb >= 5 ? ' — Bien, revoyez le cours.' : ' — À retravailler.') : ''}</div>` +
    quiz.qs.map((q, i) => `<div class="question"><p>${i + 1}. ${esc(q.q)}</p>${q.r.map((r, j) => {
      let c = '';
      if (q.choix >= 0) { if (r.bon) c = 'bon'; else if (j === q.choix) c = 'faux'; }
      return `<button type="button" data-q="${i}" data-r="${j}" class="${c}" ${q.choix >= 0 ? 'disabled' : ''}>${esc(r.t)}</button>`;
    }).join('')}</div>`).join('') + '<button type="button" class="btn prim" id="b-quiz">🔄 Nouveau quiz</button>';
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
$('#b-etiq').addEventListener('click', (e) => { scene.montrerEtiq = !scene.montrerEtiq; e.currentTarget.setAttribute('aria-pressed', scene.montrerEtiq); });
$('#b-centre').addEventListener('click', () => scene.recentrer());
/* Plein écran : vraie API plein écran (écran entier, sans barres) + 3D seule ; repli sur la 3D seule si refusée */
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
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('plein') && !enPleinEcran()) modePlein(false); });
$('#vitesse').addEventListener('input', (e) => { scene.vitesse = parseFloat(e.target.value); });

if (location.search.includes('debug')) window.__scene = scene;
barreTypes();
pageExercices();
nouveauQuiz();
choisirType(etat.type);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
