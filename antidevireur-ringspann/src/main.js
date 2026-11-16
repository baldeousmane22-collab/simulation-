// Antidévireur RINGSPANN FRHD 1200 — vue éclatée et simulation 3D
// Unité de la scène : 1 = 100 mm. Axe de l'arbre = Z. Sens libre (marche avant) = rotation +Z.
import * as T from '../../hydraulique/vendor/three.min.js';
import { PIECES, PLAQUE_HTML, COURS_HTML, PANNES_HTML, QUIZ, MONTAGE } from './donnees.js';

const $ = s => document.querySelector(s);
const canvas = $('#c3d'), vue = $('#vue');
const renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new T.Scene();
scene.background = new T.Color(0x1b2026);
scene.fog = new T.Fog(0x1b2026, 70, 150);
const camera = new T.PerspectiveCamera(38, 1, 0.5, 400);

// ---------- environnement (reflets de l'acier) ----------
(function () {
  const s = new T.Scene();
  const g = new T.SphereGeometry(60, 32, 16), col = [], p = g.attributes.position;
  const a = new T.Color(0xe9eef4), b = new T.Color(0x2b3036), c = new T.Color();
  for (let i = 0; i < p.count; i++) { c.copy(b).lerp(a, Math.min(1, Math.max(0, p.getY(i) / 60 * 0.5 + 0.5))); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  s.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
  const blanc = new T.MeshBasicMaterial({ color: 0xffffff });
  [[20, 30, 20, 26, 2, 26], [-35, 12, 10, 2, 22, 30], [10, 8, -40, 40, 16, 2]].forEach(v => {
    const m = new T.Mesh(new T.BoxGeometry(v[3], v[4], v[5]), blanc); m.position.set(v[0], v[1], v[2]); s.add(m);
  });
  const pm = new T.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(s, 0.03).texture;
  pm.dispose();
})();
scene.add(new T.HemisphereLight(0xdfe8f2, 0x30343a, 0.55));
const soleil = new T.DirectionalLight(0xffffff, 1.6);
soleil.position.set(14, 26, 22); soleil.castShadow = true;
soleil.shadow.mapSize.set(2048, 2048);
Object.assign(soleil.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
soleil.shadow.bias = -0.0006; soleil.shadow.normalBias = 0.03;
scene.add(soleil);

// ---------- matériaux ----------
const BASE = {
  peinture: { color: 0x2f5f92, metalness: 0.2, roughness: 0.55 },
  acier: { color: 0xc3c8ce, metalness: 0.95, roughness: 0.25 },
  acierDur: { color: 0x878d94, metalness: 0.95, roughness: 0.2 },
  sombre: { color: 0x3c4046, metalness: 0.85, roughness: 0.45 },
  laiton: { color: 0xb08a3c, metalness: 0.9, roughness: 0.35 },
  caoutchouc: { color: 0x17181a, metalness: 0, roughness: 0.85 },
  chassis: { color: 0x5b6067, metalness: 0.5, roughness: 0.65 },
  alu: { color: 0xd9dcdf, metalness: 0.6, roughness: 0.45 },
  rougeP: { color: 0xb3262b, metalness: 0.1, roughness: 0.6 }
};
const coupePlan = new T.Plane(new T.Vector3(-1, 0, 0), 0);      // garde x <= 0
const huilePlan = new T.Plane(new T.Vector3(0, -1, 0), -1.25);  // garde y <= -1,25 (niveau)
const matsCoupe = [], matsPiece = {}, cache = {};
function M(id, cle, coupable = true) {
  const k = id + ':' + cle;
  if (!cache[k]) {
    const m = new T.MeshStandardMaterial(BASE[cle]);
    m.side = T.DoubleSide;
    if (coupable) matsCoupe.push(m);
    (matsPiece[id] = matsPiece[id] || []).push(m);
    cache[k] = m;
  }
  return cache[k];
}

// ---------- géométries ----------
const TAU = Math.PI * 2;
function anneau(ri, ro, ep, o = {}) {
  const b = o.b === undefined ? 0.025 : o.b, sh = new T.Shape();
  sh.absarc(0, 0, ro - b, 0, TAU, false);
  const h = new T.Path(), r = ri + b;
  if (o.clav) {
    const w = o.clav.w, y0 = Math.sqrt(r * r - w * w), a = Math.asin(w / r);
    h.moveTo(w, y0); h.lineTo(w, ri + o.clav.h); h.lineTo(-w, ri + o.clav.h); h.lineTo(-w, y0);
    h.absarc(0, 0, r, Math.PI / 2 + a, Math.PI / 2 - a + TAU, false);
  } else h.absarc(0, 0, r, 0, TAU, true);
  sh.holes.push(h);
  if (o.trous) for (let i = 0; i < o.trous.n; i++) {
    const a = (i + 0.5) / o.trous.n * TAU, p = new T.Path();
    p.absarc(Math.cos(a) * o.trous.R, Math.sin(a) * o.trous.R, o.trous.r, 0, TAU, true); sh.holes.push(p);
  }
  return extr(sh, ep, b, o.seg || 72);
}
function extr(sh, ep, b, seg) {
  const d = ep - 2 * b;
  const g = new T.ExtrudeGeometry(sh, { depth: d, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: seg || 48 });
  g.translate(0, 0, -d / 2); return g;
}
function cylZ(r, l, seg = 48) { const g = new T.CylinderGeometry(r, r, l, seg); g.rotateX(Math.PI / 2); return g; }

// ---------- pièces ----------
const stator = new T.Group(), rotor = new T.Group(), contexte = new T.Group();
scene.add(stator, rotor, contexte);
const groupes = [], cliquables = [];
function piece(id, parent, ez, ancre, o = {}) {
  const g = new T.Group(); g.userData.id = id; parent.add(g);
  groupes.push({ g, id, ez, ey: o.ey || 0, ancre: new T.Vector3(...ancre), avant: !!o.avant, rep: o.rep !== false, fz: 0, fy: 0, tz: 0, ty: 0,
    cle: id + (ez > 0 && (id === 'roulement' || id === 'flasque' || id === 'joint') ? 'Av' : '') });
  return g;
}
function maille(g, geo, mat, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  g.add(m); cliquables.push(m); return m;
}
const NV = 12, RV = 3.1, trous = { n: NV, R: RV, r: 0.13 };

// 1 — bout d'arbre du tambour
const gArbre = piece('arbre', rotor, -12, [0, 1.15, -2.6]);
maille(gArbre, cylZ(1.15, 5.05, 64), M('arbre', 'acier', false), 0, 0, -1.075);
// 2 — clavette
const gClav = piece('clavette', rotor, -12, [0, 1.3, 0.6], { ey: 1.3 });
maille(gClav, new T.BoxGeometry(0.6, 0.3, 2.8), M('clavette', 'acierDur', false), 0, 1.15, 0);
// 3 — bague intérieure
const gBI = piece('bagueInt', rotor, 2.5, [0, 2.0, 1.2]);
maille(gBI, anneau(1.15, 2.0, 2.9, { clav: { w: 0.3, h: 0.16 }, b: 0.03 }), M('bagueInt', 'acierDur'));
// 12 — plaque d'arrêt en bout d'arbre
const gPlaq = piece('plaque', rotor, 13, [0, 1.7, 1.55], { avant: true });
maille(gPlaq, cylZ(1.7, 0.16, 48), M('plaque', 'sombre'), 0, 0, 1.53);
for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; maille(gPlaq, cylZ(0.2, 0.14, 6), M('plaque', 'acier'), Math.cos(a) * 0.65, Math.sin(a) * 0.65, 1.68); }

// 6 — bague extérieure
const gBE = piece('bagueExt', stator, 0, [2.4, 2.4, 0.65]);
maille(gBE, anneau(2.45, 3.4, 1.3, { trous, b: 0.03 }), M('bagueExt', 'peinture'));
maille(gBE, anneau(2.45, 2.6, 1.24, { b: 0 }), M('bagueExt', 'acierDur'));   // piste de roulement des cames
// 4 — cames ; 5 — cage et ressort
const NC = 40, RM = 2.225, LC = 0.472, WC = 0.24, D_LIBRE = 38 * Math.PI / 180, D_BLOQ = 25 * Math.PI / 180;
const gCames = piece('cames', stator, 5, [0.7, 2.25, 0.5]);
const gCage = piece('cage', stator, 5, [-1.6, -1.55, 0.6]);
const cames = [], cageAvant = [];
(function () {
  const c = (LC - WC) / 2, r = WC / 2, sh = new T.Shape();
  sh.absarc(c, 0, r, -Math.PI / 2, Math.PI / 2, false); sh.absarc(-c, 0, r, Math.PI / 2, Math.PI * 1.5, false); sh.closePath();
  const geo = extr(sh, 1.0, 0.015, 10), mat = M('cames', 'acier');
  for (let i = 0; i < NC; i++) {
    const a = (i + 0.5) / NC * TAU, m = maille(gCames, geo, mat, Math.cos(a) * RM, Math.sin(a) * RM, 0);
    m.userData.a = a; cames.push(m);
  }
  const ml = M('cage', 'laiton'), ms = M('cage', 'sombre');
  [-1, 1].forEach(s => {
    const c1 = maille(gCage, anneau(2.13, 2.32, 0.06, { b: 0 }), ml, 0, 0, s * 0.56);
    const c2 = maille(gCage, new T.TorusGeometry(RM, 0.03, 8, 96), ms, 0, 0, s * 0.63);
    if (s > 0) cageAvant.push(c1, c2);
  });
})();
// 7 — roulements, 8 — flasques, 9 — joints (avant et arrière)
const billes = [];
[1, -1].forEach(s => {
  const av = s > 0;
  const gR = piece('roulement', stator, s * (av ? 7.3 : 2.5), [-1.7, 1.7, s * 0.95], { avant: av });
  const mr = M('roulement', 'acier');
  maille(gR, anneau(2.6, 2.75, 0.45, { b: 0.02 }), mr, 0, 0, s * 0.925);
  maille(gR, anneau(2.0, 2.15, 0.45, { b: 0.02 }), mr, 0, 0, s * 0.925);
  const gb = new T.Group(); gb.position.z = s * 0.925; gR.add(gb); billes.push(gb);
  const sg = new T.SphereGeometry(0.215, 20, 14);
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, b = new T.Mesh(sg, M('roulement', 'acierDur')); b.position.set(Math.cos(a) * 2.375, Math.sin(a) * 2.375, 0); b.castShadow = true; gb.add(b); cliquables.push(b); }
  maille(gb, anneau(2.3, 2.45, 0.1, { b: 0 }), M('roulement', 'laiton'));

  const gF = piece('flasque', stator, s * (av ? 9.5 : 4.5), [-2.3, -2.3, s * 1.4], { avant: av });
  const mp = M('flasque', 'peinture');
  maille(gF, anneau(2.75, 3.4, 0.55, { trous, b: 0.02 }), mp, 0, 0, s * 0.925);
  maille(gF, anneau(2.2, 3.4, 0.2, { trous, b: 0.02 }), mp, 0, 0, s * 1.3);
  if (av) maille(gF, cylZ(0.15, 0.12, 6), M('flasque', 'laiton'), -2.4, -1.25, 1.44);   // bouchon de niveau

  const gJ = piece('joint', stator, s * (av ? 11.3 : 6.2), [1.5, -1.5, s * 1.4], { avant: av });
  maille(gJ, anneau(2.0, 2.2, 0.16, { b: 0.02 }), M('joint', 'caoutchouc'), 0, 0, s * 1.3);
});
// 10 — bras de réaction
const L_BRAS = 12;
const gBras = piece('bras', stator, -8, [-7, 0.9, -1.4]);
(function () {
  const sh = new T.Shape(), d = Math.PI / 180;
  sh.moveTo(-12.6, -0.5); sh.lineTo(3.4 * Math.cos(230 * d), 3.4 * Math.sin(230 * d));
  sh.absarc(0, 0, 3.4, 230 * d, 490 * d, false); sh.lineTo(-12.6, 0.5); sh.closePath();
  const h = new T.Path(); h.absarc(0, 0, 2.3, 0, TAU, true); sh.holes.push(h);
  for (let i = 0; i < NV; i++) { const a = (i + 0.5) / NV * TAU, p = new T.Path(); p.absarc(Math.cos(a) * RV, Math.sin(a) * RV, 0.13, 0, TAU, true); sh.holes.push(p); }
  maille(gBras, extr(sh, 0.3, 0.02, 64), M('bras', 'peinture'), 0, 0, -1.55);
  maille(gBras, new T.BoxGeometry(1.7, 0.7, 0.02), M('bras', 'alu'), -6, 0, -1.39);        // plaque signalétique
  maille(gBras, new T.BoxGeometry(1.7, 0.1, 0.022), M('bras', 'rougeP'), -6, -0.28, -1.39);
})();
// 11 — vis d'assemblage
const gVis = piece('vis', stator, 15, [2.2, -2.2, 1.6], { avant: true });
for (let i = 0; i < NV; i++) {
  const a = (i + 0.5) / NV * TAU, x = Math.cos(a) * RV, y = Math.sin(a) * RV, mv = M('vis', 'sombre');
  maille(gVis, cylZ(0.11, 3.25, 12), mv, x, y, -0.225);
  maille(gVis, cylZ(0.21, 0.2, 6), mv, x, y, 1.5);
  maille(gVis, cylZ(0.21, 0.16, 6), mv, x, y, -1.78);
}
// 13 — bouchons (remplissage + reniflard, vidange)
const gBou = piece('bouchons', stator, 0, [0, 3.85, 0], { ey: 2 });
maille(gBou, new T.CylinderGeometry(0.17, 0.17, 0.45, 16), M('bouchons', 'laiton'), 0, 3.58, 0);
maille(gBou, new T.CylinderGeometry(0.24, 0.24, 0.12, 6), M('bouchons', 'laiton'), 0, 3.82, 0);
maille(gBou, new T.CylinderGeometry(0.2, 0.2, 0.18, 6), M('bouchons', 'sombre'), 0, -3.46, 0);
// 15 — huile
const gHuile = piece('huile', stator, 0, [-1.0, -2.2, 0.62], { rep: false });
const matHuile = new T.MeshStandardMaterial({ color: 0xd49a1e, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0, side: T.DoubleSide, depthWrite: false, clippingPlanes: [huilePlan] });
matsPiece.huile = [matHuile];
maille(gHuile, anneau(2.0, 2.45, 1.2, { b: 0 }), matHuile).castShadow = false;

// 14 — butée du bras (fixée au châssis) + décor
const gButee = piece('butee', contexte, 0, [-12, 1.2, -1.2]);
(function () {
  const mc = M('butee', 'chassis', false);
  maille(gButee, new T.BoxGeometry(0.9, 8.2, 0.9), mc, -12, -2.4, -2.6);
  [-1, 1].forEach(s => maille(gButee, new T.BoxGeometry(1.2, 0.4, 1.3), mc, -12, s * 0.85, -1.75));
})();
const decor = new T.Group(); contexte.add(decor);
const tourne = new T.Group(); decor.add(tourne);
(function () {
  const md = new T.MeshStandardMaterial(BASE.chassis), ma = new T.MeshStandardMaterial(BASE.acier), mt = new T.MeshStandardMaterial(BASE.caoutchouc);
  const add = (p, geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; p.add(m); return m; };
  add(tourne, cylZ(1.15, 8.2, 48), ma, 0, 0, -7.7);
  add(tourne, cylZ(3.7, 5, 64), mt, 0, 0, -9.3);                         // tambour de tête garni
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; add(tourne, new T.BoxGeometry(0.5, 0.12, 0.04), ma, Math.cos(a) * 3.2, Math.sin(a) * 3.2, -6.79).rotation.z = a + Math.PI / 2; }
  add(decor, cylZ(2.0, 1.2, 40), md, 0, 0, -5.2);                        // palier
  add(decor, new T.BoxGeometry(5.4, 0.5, 1.4), md, 0, -1.9, -5.2);
  add(decor, new T.BoxGeometry(3.4, 4.4, 1.2), md, 0, -4.3, -5.2);
  const sol = new T.Mesh(new T.PlaneGeometry(120, 120), new T.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.95, metalness: 0 }));
  sol.rotation.x = -Math.PI / 2; sol.position.y = -6.5; sol.receiveShadow = true; scene.add(sol);
})();

// ---------- flèches (sens libre / sens bloqué / réaction) ----------
function flecheArc(R, a0, a1, couleur, horaire) {
  const g = new T.Group(), m = new T.MeshBasicMaterial({ color: couleur });
  const t = new T.Mesh(new T.TorusGeometry(R, 0.09, 8, 40, a1 - a0), m); t.rotation.z = a0; g.add(t);
  const c = new T.Mesh(new T.ConeGeometry(0.28, 0.7, 16), m), a = horaire ? a0 : a1;
  c.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); c.rotation.z = horaire ? a + Math.PI : a; g.add(c);
  g.position.z = 1.9; return g;
}
const flLibre = flecheArc(4.1, 0.25, 1.45, 0x3fbf6f, false), flBloq = flecheArc(4.1, 0.25, 1.45, 0xe5484d, true);
const flReac = new T.Group();
(function () {
  const m = new T.MeshBasicMaterial({ color: 0xe5484d });
  const c = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 1.6, 10), m); c.position.y = 1.3; flReac.add(c);
  const p = new T.Mesh(new T.ConeGeometry(0.28, 0.6, 16), m); p.rotation.z = Math.PI; p.position.y = 0.3; flReac.add(p);
  flReac.position.set(-12, 1.1, -1.0);
})();
contexte.add(flLibre, flBloq, flReac);

// ---------- caméra (1 doigt : tourner ; 2 doigts : zoom + déplacement) ----------
const cam = { az: 0.75, el: 0.3, d: 34, c: new T.Vector3(-3.5, -0.8, -1) }, cible = { az: 0.75, el: 0.3, d: 34, c: new T.Vector3(-3.5, -0.8, -1) };
const VUES = {
  normale: { az: 0.75, el: 0.3, d: 34, c: [-3.5, -0.8, -1], large: 1 },
  montage: { az: 1.3, el: 0.2, d: 31, c: [0, -0.3, 0.5], large: 1 },
  eclatee: { az: 1.3, el: 0.2, d: 31, c: [0, -0.3, 0.5], large: 1 },
  coupe: { az: 1.0, el: 0.22, d: 17, c: [0, 0, 0] },
  cames: { az: 0.1, el: 0.04, d: 6.2, c: [1.75, 1.75, 0.5] }
};
function cadrer(nom) {
  const v = VUES[nom], asp = vue.clientWidth / Math.max(1, vue.clientHeight);
  cible.az = v.az; cible.el = v.el; cible.d = v.d * (v.large ? Math.max(1, 1.35 / asp) : Math.max(1, 0.8 / asp)); cible.c.set(...v.c);
}
function majCam(dt) {
  const k = 1 - Math.exp(-dt * 6);
  cam.az += (cible.az - cam.az) * k; cam.el += (cible.el - cam.el) * k; cam.d += (cible.d - cam.d) * k; cam.c.lerp(cible.c, k);
  const ce = Math.cos(cam.el);
  camera.position.set(cam.c.x + cam.d * ce * Math.sin(cam.az), cam.c.y + cam.d * Math.sin(cam.el), cam.c.z + cam.d * ce * Math.cos(cam.az));
  camera.lookAt(cam.c);
}
const ptrs = new Map(); let geste = null, tap = null;
function deplacer(dx, dy) {
  const e = camera.matrixWorld.elements, f = cible.d * 0.0016;
  cible.c.x += (-dx * e[0] + dy * e[4]) * f; cible.c.y += (-dx * e[1] + dy * e[5]) * f; cible.c.z += (-dx * e[2] + dy * e[6]) * f;
}
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button });
  tap = ptrs.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; geste = null;
});
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) {
    if (p.b === 2 || e.shiftKey) deplacer(dx, dy);
    else { cible.az -= dx * 0.008; cible.el = Math.max(-1.3, Math.min(1.45, cible.el + dy * 0.008)); }
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (geste) { cible.d = Math.max(3, Math.min(120, cible.d * geste.d / Math.max(1, d))); deplacer(mx - geste.mx, my - geste.my); }
    geste = { d, mx, my };
  }
});
function finPtr(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId); geste = null;
  if (tap && e.type === 'pointerup' && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 8 && performance.now() - tap.t < 500) toucher(e.clientX, e.clientY);
  tap = null;
}
canvas.addEventListener('pointerup', finPtr); canvas.addEventListener('pointercancel', finPtr);
canvas.addEventListener('wheel', e => { e.preventDefault(); cible.d = Math.max(3, Math.min(120, cible.d * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---------- sélection d'une pièce ----------
const rayon = new T.Raycaster(), v2 = new T.Vector2();
let choisie = null;
function visibleVrai(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
function toucher(x, y) {
  const r = canvas.getBoundingClientRect();
  v2.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1);
  rayon.setFromCamera(v2, camera);
  for (const h of rayon.intersectObjects(cliquables, false)) {
    if (!visibleVrai(h.object)) continue;
    const coupable = matsCoupe.includes(h.object.material) || h.object.material === matHuile;
    if (etat.vue === 'coupe' && coupable && h.point.x > 0.001) continue;
    if (h.object.material === matHuile && h.point.y > -1.25) continue;
    let o = h.object; while (o && !o.userData.id) o = o.parent;
    if (o) { choisir(o.userData.id); return; }
  }
  choisir(null);
}
function choisir(id) {
  if (choisie && matsPiece[choisie]) matsPiece[choisie].forEach(m => m.emissive.setHex(surl.includes(choisie) ? 0x1f5a2c : 0));
  choisie = id;
  document.querySelectorAll('#tPieces tr.lig').forEach(t => t.classList.toggle('sel', t.dataset.id === id));
  const f = $('#fiche');
  if (!id) { f.style.display = 'none'; return; }
  matsPiece[id].forEach(m => m.emissive.setHex(0x7a4a00));
  const p = PIECES.find(q => q.id === id);
  $('#ficheT').innerHTML = `<b>${p.n} — ${p.nom}</b><br><i>${p.mat}</i><br>${p.role}`;
  f.style.display = 'block';
}
$('#ficheX').onclick = () => choisir(null);

// ---------- repères ----------
const boiteRep = $('#labels'); let repOn = false;
groupes.forEach(G => {
  if (!G.rep) return;
  const p = PIECES.find(q => q.id === G.id), d = document.createElement('div');
  d.className = 'rep'; d.textContent = p.n; d.title = p.nom; d.onclick = () => choisir(G.id);
  boiteRep.appendChild(d); G.el = d;
});
const vTmp = new T.Vector3();
groupes.filter(G => G.el).sort((a, b) => a.ez - b.ez).forEach((G, i) => { G.ancreE = new T.Vector3(0, G.id === 'bras' ? 3.9 : (i % 2 ? -3.9 : 3.9), G.ancre.z); G.p = PIECES.find(q => q.id === G.id); });
function majReperes() {
  const w = vue.clientWidth, h = vue.clientHeight;
  groupes.forEach(G => {
    if (!G.el) return;
    let vis = repOn && visibleVrai(G.g);
    if (vis) {
      vTmp.copy((etat.vue === 'montage' ? G.fz > 0.5 || G.fy > 0.5 : etat.ecl > 0.6) ? G.ancreE : G.ancre); G.g.localToWorld(vTmp); vTmp.project(camera);
      vis = vTmp.z < 1 && Math.abs(vTmp.x) < 1 && Math.abs(vTmp.y) < 1;
      if (vis) { G.el.style.left = ((vTmp.x + 1) / 2 * w) + 'px'; G.el.style.top = ((1 - vTmp.y) / 2 * h) + 'px'; }
    }
    G.el.style.display = vis ? 'flex' : 'none';
    G.el.classList.toggle('sel', G.id === choisie);
    const tx = etat.ecl > 0.6 && etat.vue !== 'montage' && w > 600 ? G.p.n + ' ' + G.p.court : '' + G.p.n; if (G.el.textContent !== tx) G.el.textContent = tx;
  });
}

// ---------- état de la simulation ----------
const C_NOM = 393, N_NOM = 60;   // kN·m (290 000 lb-ft) ; tr/min (vitesse d'exemple du tambour)
const TH_JEU = 0.15 / 12.2;      // jeu du bras dans la butée → petit angle du stator
const etat = { vue: 'normale', ecl: 0, eclCible: 0, marche: true, lent: false, pause: false, usure: false, pas: 0, demont: false, C: 200, w: 0, phi: 0, k: 0, recul: 0, th: TH_JEU, bloque: false, devire: false };
function majVue(nom) {
  etat.vue = nom; etat.eclCible = nom === 'eclatee' ? $('#sEcl').value / 100 : 0;
  document.querySelectorAll('#vues .btn').forEach(b => b.classList.toggle('on', b.dataset.v === nom));
  $('#zoneEcl').style.display = nom === 'eclatee' ? 'block' : 'none';
  const coupe = nom === 'coupe';
  matsCoupe.forEach(m => { m.clippingPlanes = coupe ? [coupePlan] : []; m.needsUpdate = true; });
  matHuile.clippingPlanes = coupe ? [huilePlan, coupePlan] : [huilePlan]; matHuile.needsUpdate = true;
  groupes.forEach(G => { if (G.avant) G.g.visible = nom !== 'cames'; });
  cageAvant.forEach(m => { m.visible = nom !== 'cames'; });
  if ((nom === 'eclatee' || nom === 'montage') && !repOn) basculerRep();
  if (nom !== 'montage') surligner([]);
  cadrer(nom);
}
function basculerRep() { repOn = !repOn; $('#bRep').classList.toggle('on', repOn); }
function majMarche(m) {
  etat.marche = m; $('#bMarche').classList.toggle('on', m); $('#bArret').classList.toggle('on', !m);
  if (m) { etat.recul = 0; etat.bloque = false; etat.devire = false; }
}

function simuler(dt) {
  const vit = etat.lent ? 0.25 : 1, wMax = TAU * 0.4;
  dt *= vit;
  if (etat.marche) {
    etat.w = Math.min(wMax, Math.max(etat.w, 0) + wMax * dt / 1.4);
    etat.k = Math.max(0, etat.k - dt * 5);
  } else if (etat.w > 0) {
    etat.w = Math.max(0, etat.w - wMax * dt / (etat.C > 0 ? 1.0 : 2.5));
  } else if (etat.C > 0) {
    // la charge tire la bande en arrière : l'arbre recule, les cames se redressent et se coincent
    if (etat.usure) {
      etat.k = Math.min(0.55, etat.k + dt * 3);
      etat.w = Math.max(-wMax * 0.6, etat.w - wMax * dt * 0.25); etat.devire = true; etat.bloque = false;
    } else if (etat.k < 1) {
      const dk = Math.min(1 - etat.k, dt / 0.45);
      etat.k += dk; etat.recul += dk * 2.2; etat.phi -= dk * 2.2 * Math.PI / 180;
      if (etat.k >= 1) etat.bloque = true;
    }
  }
  etat.phi += etat.w * dt;
  const thC = etat.bloque ? -TH_JEU : TH_JEU;
  etat.th += (thC - etat.th) * (1 - Math.exp(-dt * 14));
}

function appliquer() {
  const e = etat.ecl;
  groupes.forEach(G => { G.g.position.z = G.ez * 0.75 * G.fz; G.g.position.y = G.ey * G.fy; });
  rotor.rotation.z = etat.phi; tourne.rotation.z = etat.phi; stator.rotation.z = e > 0.02 ? 0 : etat.th;
  billes.forEach(b => { b.rotation.z = etat.phi * 0.42; });
  const d = D_LIBRE + (D_BLOQ - D_LIBRE) * etat.k;
  cames.forEach(m => { m.rotation.z = m.userData.a - d; });
  const assemble = e < 0.02 && (etat.vue !== 'montage' || etat.pas === NE);
  decor.visible = gButee.visible = assemble; gHuile.visible = assemble;
  const fl = assemble && etat.vue !== 'cames' && etat.vue !== 'coupe';
  flLibre.visible = fl && etat.w > 0.05; flBloq.visible = fl && !etat.marche && etat.w <= 0 && etat.C > 0;
  flReac.visible = assemble && etat.bloque && etat.vue !== 'cames';
}

function afficher() {
  const n = etat.w / (TAU * 0.4) * N_NOM, el = $('#etat'), msg = $('#msg');
  const retenu = etat.bloque ? etat.C : 0, F = retenu / (L_BRAS / 10), pc = etat.C / C_NOM * 100;
  $('#mN').textContent = (Math.abs(n) < 0.5 ? '0' : n.toFixed(0)) + ' tr/min' + (n < -0.5 ? ' (arrière)' : '');
  $('#mC').textContent = retenu ? retenu + ' kN·m' : '0 kN·m';
  $('#mF').textContent = retenu ? F.toFixed(0) + ' kN (≈ ' + (F / 9.81).toFixed(1) + ' t)' : '0 kN';
  $('#mP').textContent = pc.toFixed(0) + ' %';
  const bar = $('#bar'); bar.style.width = Math.min(100, pc / 1.22) + '%'; bar.style.background = pc > 100 ? 'var(--ko)' : pc > 80 ? 'var(--acc)' : 'var(--ok)';
  let cl = '', txt, m, mc = '';
  if (etat.devire) { cl = 'alarme'; txt = 'DÉVIRAGE !'; mc = 'a'; m = '<b>Cames usées : elles glissent au lieu de se coincer.</b> La bande chargée redescend, le tambour tourne à l\'envers et la matière s\'accumule au pied du convoyeur. Arrêt, consignation, bande vidée ou calée, puis remplacement de l\'antidévireur ou de sa cage à cames.'; }
  else if (etat.bloque) {
    cl = 'bloque'; txt = 'BLOQUÉ';
    if (pc > 100) { mc = 'a'; m = '<b>Surcharge : ' + pc.toFixed(0) + ' % du couple nominal.</b> Les cames et les pistes sont écrasées (empreintes), le bras et la butée sont surchargés. Risque de rupture : réduire la charge sur la bande.'; }
    else { mc = 'w'; m = 'L\'arbre a reculé de <b>' + etat.recul.toFixed(1) + '°</b> : les cames se sont redressées et coincées entre les deux bagues. Le couple passe par la bague extérieure, les flasques et le <b>bras de réaction</b>, qui vient s\'appuyer sur la butée haute (flèche rouge).'; }
  } else if (etat.marche) { txt = 'ROUE LIBRE'; m = 'Marche avant : la bague intérieure tourne avec l\'arbre, les cames sont <b>couchées</b> et glissent sur un film d\'huile. Aucun couple n\'est transmis, le bras repose sur la butée basse.'; }
  else if (etat.w > 0) { txt = 'RALENTIT'; m = 'Moteur coupé : la bande ralentit…'; }
  else if (etat.C > 0) { cl = 'bloque'; txt = 'RECUL…'; mc = 'w'; m = 'La charge tire la bande en arrière : l\'arbre recule de quelques degrés, les cames se redressent…'; }
  else { txt = 'ARRÊT'; m ='Bande vide (couple de retour nul) : rien ne tire l\'arbre en arrière, l\'antidévireur n\'est pas sollicité.'; }
  el.className = cl; el.textContent = txt; msg.className = 'msg ' + mc; msg.innerHTML = m;
}

// ---------- montage / démontage pas à pas ----------
const NE = MONTAGE.etapes.length;
const ETAPE_DE = { bagueExt: 0, bouchons: 0, flasque: 1, roulement: 1, joint: 1, bagueInt: 2, cames: 3, cage: 3, roulementAv: 4, flasqueAv: 5, jointAv: 5, bras: 6, vis: 6, clavette: 8, arbre: 8, plaque: 9 };
let surl = [];
function surligner(ids) {
  surl.forEach(id => { if (id !== choisie) matsPiece[id].forEach(m => m.emissive.setHex(0)); });
  surl = ids; surl.forEach(id => matsPiece[id].forEach(m => m.emissive.setHex(0x1f5a2c)));
}
function cibles() {
  const mo = etat.vue === 'montage';
  groupes.forEach(G => {
    if (!mo) { G.tz = G.ty = etat.eclCible; return; }
    const s = ETAPE_DE[G.cle];
    G.tz = s === undefined || s < etat.pas ? 0 : 1;
    G.ty = G.cle === 'clavette' ? (etat.pas > 7 ? 0 : 1) : G.tz;
  });
}
function lisser(k) {
  let mx = 0;
  groupes.forEach(G => {
    G.fz += (G.tz - G.fz) * k; G.fy += (G.ty - G.fy) * k;
    if (Math.abs(G.tz - G.fz) < 0.0005) G.fz = G.tz; if (Math.abs(G.ty - G.fy) < 0.0005) G.fy = G.ty;
    mx = Math.max(mx, G.fz, G.fy);
  });
  etat.ecl = mx;
}
function majMontage() {
  const d = etat.demont, i = d ? etat.pas : etat.pas - 1;        // étape qui vient d'être faite
  const debut = d ? etat.pas === NE : etat.pas === 0, fin = d ? etat.pas === 0 : etat.pas === NE;
  $('#bMont').classList.toggle('on', !d); $('#bDemont').classList.toggle('on', d);
  const e = MONTAGE.etapes[i], num = d ? NE - etat.pas : etat.pas;
  $('#moTitre').textContent = debut ? (d ? 'Démontage — avant de commencer' : 'Montage — préparation') : 'Étape ' + num + ' / ' + NE + ' — ' + e.t;
  $('#moTexte').innerHTML = debut ? (d ? MONTAGE.prepD : MONTAGE.prepM) : (d ? e.d : e.m) + (fin ? '<br><b>' + (d ? 'Démontage terminé : nettoyer, contrôler et ranger les pièces.' : 'Montage terminé : l\'antidévireur est prêt.') + '</b>' : '');
  $('#moPrec').disabled = debut; $('#moSuiv').disabled = fin;
  document.querySelectorAll('#moListe li').forEach((li, j) => { li.classList.toggle('fait', j < etat.pas); li.classList.toggle('cour', !debut && j === i); });
  const c = document.querySelector('#moListe li.cour'); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' });
  surligner(debut ? [] : [...new Set(groupes.filter(G => ETAPE_DE[G.cle] === i || (i === 7 && G.cle === 'clavette') || (i === 10 && (G.id === 'butee' || G.id === 'huile'))).map(G => G.id))]);
}
function sensMontage(d) { etat.demont = d; etat.pas = d ? NE : 0; majMontage(); }
$('#moListe').innerHTML = MONTAGE.etapes.map(e => '<li>' + e.t + '</li>').join('');
$('#bMont').onclick = () => sensMontage(false);
$('#bDemont').onclick = () => sensMontage(true);
$('#moSuiv').onclick = () => { etat.pas = Math.max(0, Math.min(NE, etat.pas + (etat.demont ? -1 : 1))); majMontage(); };
$('#moPrec').onclick = () => { etat.pas = Math.max(0, Math.min(NE, etat.pas + (etat.demont ? 1 : -1))); majMontage(); };
$('#moZero').onclick = () => sensMontage(etat.demont);

// ---------- interface ----------
document.querySelectorAll('#vues .btn').forEach(b => b.onclick = () => majVue(b.dataset.v));
$('#sEcl').oninput = e => { etat.eclCible = e.target.value / 100; $('#vEcl').textContent = e.target.value + ' %'; };
$('#bMarche').onclick = () => majMarche(true);
$('#bArret').onclick = () => majMarche(false);
$('#bLent').onclick = e => { etat.lent = !etat.lent; e.currentTarget.classList.toggle('on', etat.lent); };
$('#bPause').onclick = e => { etat.pause = !etat.pause; e.currentTarget.classList.toggle('on', etat.pause); e.currentTarget.textContent = etat.pause ? '▶ Reprendre' : '⏸ Pause'; };
$('#bUsure').onclick = e => { etat.usure = !etat.usure; e.currentTarget.classList.toggle('on', etat.usure); if (!etat.usure && etat.devire) { etat.devire = false; etat.w = 0; } if (etat.usure && etat.bloque) { etat.bloque = false; } };
$('#sC').oninput = e => { etat.C = +e.target.value; $('#vC').textContent = etat.C + ' kN·m'; if (etat.C === 0 && etat.bloque) { etat.bloque = false; etat.k = 0; etat.recul = 0; } };
$('#bRep').onclick = basculerRep;
$('#bCentre').onclick = () => cadrer(etat.vue);
document.querySelectorAll('#onglets button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#onglets button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === b.dataset.p));
  if (b.dataset.p === 'pMontage') { majVue('montage'); majMontage(); } else if (etat.vue === 'montage') majVue('normale');
});
$('#tPieces').innerHTML = '<tr><th>N°</th><th>Pièce</th><th>Rôle</th></tr>' + PIECES.map(p => `<tr class="lig" data-id="${p.id}"><td class="n">${p.n}</td><td><b>${p.nom}</b><br><span class="note">${p.mat}</span></td><td>${p.role}</td></tr>`).join('');
document.querySelectorAll('#tPieces tr.lig').forEach(t => t.onclick = () => choisir(t.dataset.id));
$('#pPlaque').innerHTML = PLAQUE_HTML; $('#pCours').innerHTML = COURS_HTML; $('#pPannes').innerHTML = PANNES_HTML;
(function () {
  const z = $('#pQuiz'); let bon = 0, fait = 0;
  z.innerHTML = '<p id="score" class="msg">Répondez aux ' + QUIZ.length + ' questions.</p>' + QUIZ.map((q, i) => `<div class="q" data-i="${i}"><p>${i + 1}. ${q.q}</p>${q.r.map((r, j) => `<button data-j="${j}">${r}</button>`).join('')}<div class="exp">${q.e}</div></div>`).join('');
  z.querySelectorAll('.q').forEach(d => d.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (d.dataset.fait) return; d.dataset.fait = 1; fait++;
    const q = QUIZ[+d.dataset.i], j = +b.dataset.j;
    if (j === q.ok) bon++; else b.classList.add('ko');
    d.querySelectorAll('button')[q.ok].classList.add('ok'); d.querySelector('.exp').style.display = 'block';
    $('#score').textContent = 'Score : ' + bon + ' / ' + fait + (fait === QUIZ.length ? ' — terminé' + (bon >= QUIZ.length * 0.8 ? ', très bien !' : ', revoyez le cours.') : '');
  }));
})();

// ---------- boucle ----------
function taille() {
  const w = vue.clientWidth, h = vue.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(taille).observe(vue); taille(); cadrer('normale');
Object.assign(cam, { az: cible.az, el: cible.el, d: cible.d }); cam.c.copy(cible.c);
let tPrec = performance.now(), tAff = 0;
function boucle(t) {
  const dt = Math.min(0.05, (t - tPrec) / 1000); tPrec = t;
  cibles(); lisser(1 - Math.exp(-dt * 5));
  if (!etat.pause && !(etat.vue === 'montage' && etat.pas < NE)) simuler(dt);
  appliquer(); majCam(dt); renderer.render(scene, camera); majReperes();
  if (t - tAff > 150) { afficher(); tAff = t; }
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);
window.__etat = etat;
window.__avance = n => { for (let i = 0; i < n; i++) { cibles(); lisser(0.1); simuler(0.02); majCam(0.02); } };
