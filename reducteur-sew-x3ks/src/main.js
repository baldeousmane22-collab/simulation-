// Réducteur SEW-Eurodrive X3KS230 — renvoi d'angle 3 trains (couple conique + 2 trains hélicoïdaux), arbre de sortie plein.
// Unité de la scène : 1 = 100 mm. Arbres 2, 3, 4 parallèles à Z ; arbre d'entrée parallèle à X. Plan de joint : y = 0.
import * as T from '../../hydraulique/vendor/three.min.js';
import { PIECES, PLAQUE, COURS_HTML, PANNES_HTML, QUIZ, DENTS } from './donnees.js';

const $ = s => document.querySelector(s);
const canvas = $('#c3d'), vue = $('#vue');
const renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new T.Scene();
scene.background = new T.Color(0x1b2026);
scene.fog = new T.Fog(0x1b2026, 110, 230);
const camera = new T.PerspectiveCamera(38, 1, 0.5, 500);

// ---------- environnement (reflets du métal) ----------
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
const soleil = new T.DirectionalLight(0xffffff, 1.7);
soleil.position.set(14, 34, 22); soleil.castShadow = true;
soleil.shadow.mapSize.set(2048, 2048);
Object.assign(soleil.shadow.camera, { left: -30, right: 30, top: 26, bottom: -26, near: 1, far: 120 });
soleil.shadow.bias = -0.0006; soleil.shadow.normalBias = 0.05;
soleil.target.position.set(3, -3, 0);
scene.add(soleil, soleil.target);

// ---------- matériaux ----------
const BASE = {
  peint: { color: 0x3f6a82, metalness: 0.3, roughness: 0.62 },       // bleu SEW patiné
  peintSombre: { color: 0x34576b, metalness: 0.3, roughness: 0.66 },
  acier: { color: 0xc3c8ce, metalness: 0.95, roughness: 0.25 },
  denture: { color: 0xaeb4ba, metalness: 0.92, roughness: 0.3 },
  rectif: { color: 0x9aa1a8, metalness: 0.95, roughness: 0.22 },
  brut: { color: 0x6f757b, metalness: 0.75, roughness: 0.5 },
  sombre: { color: 0x3c4046, metalness: 0.85, roughness: 0.45 },
  bronze: { color: 0x8a6a3a, metalness: 0.9, roughness: 0.35 },
  roul: { color: 0x9da3a9, metalness: 0.95, roughness: 0.2 },
  caoutchouc: { color: 0x17181a, metalness: 0, roughness: 0.85 },
  moteur: { color: 0x5f666c, metalness: 0.35, roughness: 0.6 },
  chassis: { color: 0x3a3f45, metalness: 0.5, roughness: 0.65 },
  tole: { color: 0x47708a, metalness: 0.35, roughness: 0.55 },
  verre: { color: 0x9fb4c0, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.45 },
  inox: { color: 0xc7ccd0, metalness: 0.85, roughness: 0.35 }
};
const matsPiece = {}, cache = {}, matsCarter = [];
function M(id, cle) {
  const k = id + ':' + cle;
  if (!cache[k]) {
    const m = new T.MeshStandardMaterial(BASE[cle]);
    m.side = T.DoubleSide; m.userData.op = m.opacity; m.userData.tr = m.transparent;
    (matsPiece[id] = matsPiece[id] || []).push(m);
    if (['carterInf', 'carterSup', 'couvercles', 'visite'].includes(id)) matsCarter.push(m);
    cache[k] = m;
  }
  return cache[k];
}
const matHuile = new T.MeshStandardMaterial({ color: 0xb87a1c, emissive: 0x2a1600, transparent: true, opacity: 0.62, roughness: 0.1, metalness: 0, side: T.DoubleSide, depthWrite: false });
matsPiece.huile = [matHuile];

const TAU = Math.PI * 2;
const { z1, z2, z3, z4, z5, z6 } = DENTS;
const I_TOT = (z2 / z1) * (z4 / z3) * (z6 / z5);
// modules (scène) et rayons primitifs
const MB = 0.14, M2 = 0.14, M3 = 0.16;
const R1 = MB * z1 / 2, R2 = MB * z2 / 2, R3 = M2 * z3 / 2, R4 = M2 * z4 / 2, R5 = M3 * z5 / 2, R6 = M3 * z6 / 2;
const X2 = 0, X3 = R3 + R4, X4 = X3 + R5 + R6;           // entraxes
const ZA = 2.6;                                          // sommet des cônes = axe de l'arbre d'entrée
const XG = -3.25, XD = 19.4, XS = 6.6, ZAV = 4.15, ZAR = -2.85, YB = -7.0, YA = 3.9, YBB = 6.9, EP = 0.25;
const Y_HUILE = -4.9;

// ---------- géométrie des engrenages ----------
// Contour d'une denture : liste [angle, h] (h = hauteur par rapport au cercle primitif, en modules)
function contour(z) {
  const p = TAU / z, pts = [];
  const prof = [[-0.36, -1.25], [-0.31, -0.85], [-0.275, -0.4], [-0.25, 0], [-0.215, 0.45], [-0.17, 0.85], [-0.13, 1]];
  for (let k = 0; k < z; k++) {
    const c = k * p;
    prof.forEach(([a, h]) => pts.push([c + a * p, h]));
    for (let j = prof.length - 1; j >= 0; j--) pts.push([c - prof[j][0] * p, prof[j][1]]);
    pts.push([c + 0.5 * p, -1.25]);
  }
  return pts;
}
// Construit une roue dentée. map(θ, r, t) -> [x, y, z] ; t ∈ [0,1] le long de la largeur.
function roueGeo(z, m, rp, rIn, map, nT) {
  const pts = contour(z).map(([a, h]) => [a, rp + h * m]);
  const nIn = Math.max(24, Math.min(96, z * 2)), trou = [];
  for (let i = 0; i < nIn; i++) trou.push([-i / nIn * TAU, rIn]);
  const pos = [];
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  const quadStrip = (ring, closed) => {
    for (let s = 0; s < nT; s++) {
      const t0 = s / nT, t1 = (s + 1) / nT;
      for (let i = 0; i < ring.length; i++) {
        const A = ring[i], B = ring[(i + 1) % ring.length];
        const a0 = map(A[0], A[1], t0, closed), b0 = map(B[0], B[1], t0, closed), a1 = map(A[0], A[1], t1, closed), b1 = map(B[0], B[1], t1, closed);
        tri(a0, b0, b1); tri(a0, b1, a1);
      }
    }
  };
  quadStrip(pts, false); quadStrip(trou, true);
  // faces planes (triangulation du profil 2D avec le trou central)
  const v2 = pts.map(([a, r]) => new T.Vector2(r * Math.cos(a), r * Math.sin(a)));
  const h2 = trou.map(([a, r]) => new T.Vector2(r * Math.cos(a), r * Math.sin(a)));
  const faces = T.ShapeUtils.triangulateShape(v2, [h2]);
  const tous = pts.concat(trou);
  for (const t of [0, 1]) faces.forEach(f => tri(...f.map(i => map(tous[i][0], tous[i][1], t, i >= pts.length))));
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
// roue cylindrique hélicoïdale : largeur b, angle d'hélice beta (signé), centrée sur z = 0
function cylindrique(z, m, b, beta, rIn) {
  const rp = m * z / 2, tw = b * Math.tan(beta) / rp;
  return roueGeo(z, m, rp, rIn, (a, r, t) => { const aa = a + tw * (t - 0.5); return [r * Math.cos(aa), r * Math.sin(aa), b * (t - 0.5)]; }, 5);
}
// roue conique droite : grande extrémité (cercle primitif rp) en z = 0, sommet du cône en z = +aAx ; b = largeur de denture
function conique(z, m, aAx, b, rIn) {
  const rp = m * z / 2, L = Math.hypot(rp, aAx), k0 = 1 - b / L;
  return roueGeo(z, m, rp, rIn, (a, r, t, trou) => {
    const k = 1 - (1 - k0) * t, c = Math.cos(a), s = Math.sin(a);
    if (trou) return [rIn * c, rIn * s, aAx + k * (-aAx - 1.25 * m * rp / L)];
    const h = r - rp;
    return [k * (rp * c + h * aAx / L * c), k * (rp * s + h * aAx / L * s), aAx + k * (-aAx + h * rp / L)];
  }, 1);
}

// ---------- outils de construction ----------
const groupes = [], cliquables = [];
function piece(id, parent, ex, ancre, o = {}) {
  const g = new T.Group(); g.userData.id = id; parent.add(g);
  if (o.pos) g.position.set(...o.pos);
  groupes.push({ g, id, base: g.position.clone(), ex: new T.Vector3(...ex), ancre: new T.Vector3(...ancre), rep: o.rep !== false });
  return g;
}
function maille(g, geo, mat, x = 0, y = 0, z = 0, ombre = true) {
  const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = ombre;
  g.add(m); cliquables.push(m); return m;
}
const boite = (g, mat, x0, x1, y0, y1, z0, z1) => maille(g, new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
function cylZ(r, l, seg = 40, r2) { const g = new T.CylinderGeometry(r2 ?? r, r, l, seg); g.rotateX(Math.PI / 2); return g; }   // r en z-l/2, r2 en z+l/2
function cylX(r, l, seg = 40) { const g = new T.CylinderGeometry(r, r, l, seg); g.rotateZ(Math.PI / 2); return g; }
function vis(g, mat, n, rc, rv, x, y, z, axe, h = 0.12) {   // couronne de n têtes de vis hexagonales
  const geo = new T.CylinderGeometry(rv, rv, h, 6);
  if (axe === 'z') geo.rotateX(Math.PI / 2); else geo.rotateZ(Math.PI / 2);
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n * TAU;
    if (axe === 'z') maille(g, geo, mat, x + rc * Math.cos(a), y + rc * Math.sin(a), z, false);
    else maille(g, geo, mat, x, y + rc * Math.sin(a), z + rc * Math.cos(a), false);
  }
}
const racine = new T.Group(); scene.add(racine);

// ---------- arbre 1 : entrée (axe X, y = 0, z = ZA) ----------
// cadre « axe » : son z local = +X monde ; la rotation de l'arbre se fait autour de ce z local.
function cadreX(parent) { const a = new T.Group(); a.rotation.y = Math.PI / 2; parent.add(a); const s = new T.Group(); a.add(s); return s; }
const gA1 = piece('arbre1', racine, [-3.5, 0, 0], [-2.0, 1.4, ZA], { pos: [0, 0, ZA] });
const spin1 = cadreX(gA1);
{
  const pig = maille(spin1, conique(z1, MB, R2, 0.7, 0.42), M('arbre1', 'rectif'), 0, 0, -R2);
  maille(spin1, cylZ(0.45, 5.4), M('arbre1', 'acier'), 0, 0, -R2 - 2.7);
  maille(spin1, cylZ(0.62, 0.5), M('arbre1', 'acier'), 0, 0, -R2 - 0.25);
  const gR = piece('roulements', spin1, [0, 0, 0], [0, 0, 0], { rep: false });
  [-3.0, -3.9].forEach(z => { maille(gR, cylZ(0.95, 0.45), M('roulements', 'roul'), 0, 0, z); maille(gR, cylZ(0.7, 0.47), M('roulements', 'sombre'), 0, 0, z); });
  pig.userData.pignon = true;
}
// arbre d'entrée vers l'accouplement (prolongé)
maille(spin1, cylZ(0.42, 2.4), M('arbre1', 'acier'), 0, 0, -6.6);

// ---------- ventilateur + capot ----------
const gVent = piece('ventilateur', racine, [-4.5, 0, 0], [-4.8, 2.7, ZA], { pos: [0, 0, ZA] });
const spinV = cadreX(gVent);
{
  const mv = M('ventilateur', 'brut');
  maille(spinV, cylZ(0.65, 0.5), mv, 0, 0, -5.0);
  for (let i = 0; i < 8; i++) {
    const p = new T.BoxGeometry(1.55, 0.06, 0.42); p.translate(1.25, 0, 0); p.rotateX(0.5); p.rotateZ(i / 8 * TAU);
    maille(spinV, p, mv, 0, 0, -5.0);
  }
}
const gCapot = new T.Group(); gVent.add(gCapot);
{
  const mt = M('ventilateur', 'tole');
  const cyl = new T.CylinderGeometry(2.35, 2.35, 1.6, 48, 1, true); cyl.rotateZ(Math.PI / 2);
  maille(gCapot, cyl, mt, -4.8, 0, 0);
  const grille = M('ventilateur', 'sombre');
  for (let r = 0.9; r <= 2.3; r += 0.35) { const t = new T.TorusGeometry(r, 0.035, 6, 48); t.rotateY(Math.PI / 2); maille(gCapot, t, grille, -5.6, 0, 0, false); }
  for (let i = 0; i < 12; i++) { const b = new T.BoxGeometry(0.06, 1.55, 0.06); b.translate(0, 1.55, 0); b.rotateX(i / 12 * TAU); maille(gCapot, b, grille, -5.6, 0, 0, false); }
  // pattes du capot
  boite(gCapot, mt, -5.5, -4.1, -2.9, -2.2, -0.15, 0.15);
}

// ---------- accouplement d'entrée ----------
const gAccE = piece('accEntree', racine, [-6.5, 0, 0], [-6.6, 1.9, ZA], { pos: [0, 0, ZA] });
const spinAE = cadreX(gAccE);
{
  const m1 = M('accEntree', 'brut'), mc = M('accEntree', 'caoutchouc');
  maille(spinAE, cylZ(1.25, 0.55), m1, 0, 0, -6.25); maille(spinAE, cylZ(1.25, 0.55), m1, 0, 0, -7.0);
  maille(spinAE, cylZ(0.75, 0.9), m1, 0, 0, -5.8);  maille(spinAE, cylZ(0.75, 0.9), m1, 0, 0, -7.45);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; maille(spinAE, cylZ(0.17, 0.28), mc, Math.cos(a) * 0.95, Math.sin(a) * 0.95, -6.63, false); }
}

// ---------- moteur ----------
const gMot = piece('moteur', racine, [-9, 0, 0], [-10.8, 2.9, ZA]);
{
  const mm = M('moteur', 'moteur'), ms = M('moteur', 'sombre');
  maille(gMot, cylX(2.2, 6.2, 56), mm, -11.1, 0, ZA);
  for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; if (Math.abs(Math.sin(a) + 1) < 0.25) continue; maille(gMot, new T.BoxGeometry(6.0, 0.09, 0.32), mm, -11.1, Math.sin(a) * 2.3, ZA + Math.cos(a) * 2.3).rotation.x = -a; }
  maille(gMot, cylX(2.05, 0.45), mm, -7.85, 0, ZA);
  maille(gMot, cylX(0.6, 0.6), ms, -7.5, 0, ZA);
  maille(gMot, cylX(2.25, 1.0), M('moteur', 'tole'), -14.7, 0, ZA);
  boite(gMot, mm, -12.6, -10.4, 2.05, 3.05, ZA - 0.9, ZA + 0.9);             // boîte à bornes
  boite(gMot, ms, -12.4, -10.6, 3.05, 3.15, ZA - 0.75, ZA + 0.75);
  boite(gMot, mm, -13.6, -8.5, -2.5, -1.7, ZA - 2.0, ZA + 2.0);              // pattes
  maille(gMot, cylX(0.42, 0.35), M('moteur', 'acier'), -7.25, 0, ZA);
}

// ---------- arbres 2, 3, 4 (axes Z) ----------
function arbreZ(id, x, ex, ancre) { const g = piece(id, racine, ex, ancre, { pos: [x, 0, 0] }); const s = new T.Group(); g.add(s); return [g, s]; }
const [gA2, spin2] = arbreZ('arbre2', X2, [0, 7.5, 3.5], [X2, 2.6, 1.8]);
{
  const md = M('arbre2', 'denture'), ma = M('arbre2', 'acier');
  maille(spin2, conique(z2, MB, R1, 0.7, 1.45), md, 0, 0, ZA - R1).rotation.z = Math.PI + Math.PI / z2;
  maille(spin2, cylZ(1.75, 0.28, 64), M('arbre2', 'brut'), 0, 0, ZA - R1 - 0.12);
  maille(spin2, cylZ(0.95, 0.75, 40), M('arbre2', 'brut'), 0, 0, ZA - R1 - 0.4);
  maille(spin2, cylindrique(z3, M2, 1.1, 0.21, 0.3), md, 0, 0, 0.55);
  maille(spin2, cylZ(0.55, 7.3), ma, 0, 0, 0.6);
}
const [gA3, spin3] = arbreZ('arbre3', X3, [0, 10.5, 0.5], [X3, 3.5, 0.55]);
{
  const md = M('arbre3', 'denture'), ma = M('arbre3', 'acier');
  maille(spin3, cylindrique(z4, M2, 1.0, -0.21, 2.55), md, 0, 0, 0.55).rotation.z = Math.PI + Math.PI / z4;
  maille(spin3, cylZ(2.6, 0.35, 64), M('arbre3', 'brut'), 0, 0, 0.55);
  maille(spin3, cylZ(1.05, 1.0), M('arbre3', 'brut'), 0, 0, 0.55);
  maille(spin3, cylindrique(z5, M3, 1.6, -0.2, 0.3), md, 0, 0, -1.15);
  maille(spin3, cylZ(0.7, 7.3), ma, 0, 0, 0.6);
}
const [gA4, spin4] = arbreZ('arbre4', X4, [0, 9.0, -4.5], [3.5, 6.6, -1.1]);
{
  const md = M('arbre4', 'denture'), ma = M('arbre4', 'acier'), mb = M('arbre4', 'brut');
  maille(spin4, cylindrique(z6, M3, 1.55, 0.2, 5.4), md, 0, 0, -1.15).rotation.z = Math.PI + Math.PI / z6;
  maille(spin4, cylZ(5.45, 0.4, 96), mb, 0, 0, -1.15);
  maille(spin4, cylZ(1.75, 1.6, 48), mb, 0, 0, -1.15);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; maille(spin4, cylZ(0.75, 0.42, 32), M('arbre4', 'sombre'), Math.cos(a) * 3.6, Math.sin(a) * 3.6, -1.15, false); }
  maille(spin4, cylZ(1.1, 7.2), ma, 0, 0, 0.6);
  maille(spin4, cylZ(0.95, 3.6), ma, 0, 0, -4.8);
  boite(spin4, M('arbre4', 'sombre'), -0.12, 0.12, 0.88, 1.0, -6.4, -3.6);    // clavette
}
// roulements des arbres 2, 3, 4 (dans les parois)
[[spin2, 0.55], [spin3, 0.7], [spin4, 1.1]].forEach(([s, r]) => {
  const g = piece('roulements', s, [0, 0, 0], [0, 0, 0], { rep: false });
  [ZAR + 0.05, ZAV - 0.05].forEach(z => { maille(g, cylZ(r * 1.85, 0.5, 40), M('roulements', 'roul'), 0, 0, z); maille(g, cylZ(r * 1.35, 0.52, 40), M('roulements', 'sombre'), 0, 0, z); });
});

// ---------- accouplement de sortie ----------
const gAccS = piece('accSortie', racine, [0, 0, -5], [X4 + 2.6, 2.0, -5.0], { pos: [X4, 0, 0] });
const spinAS = new T.Group(); gAccS.add(spinAS);
{
  const m1 = M('accSortie', 'brut'), mv = M('accSortie', 'sombre');
  maille(spinAS, cylZ(1.55, 1.1, 48), m1, 0, 0, -4.35);
  maille(spinAS, cylZ(2.35, 0.4, 64), m1, 0, 0, -5.05);
  maille(spinAS, cylZ(2.35, 0.4, 64), m1, 0, 0, -5.5);
  maille(spinAS, cylZ(1.55, 1.1, 48), m1, 0, 0, -6.25);
  maille(spinAS, cylZ(1.0, 3.0), M('accSortie', 'acier'), 0, 0, -8.2);
  vis(spinAS, mv, 10, 1.95, 0.14, 0, 0, -4.78, 'z', 0.15);
  vis(spinAS, mv, 10, 1.95, 0.14, 0, 0, -5.77, 'z', 0.15);
}

// ---------- carter ----------
const gInf = piece('carterInf', racine, [0, -1.2, 0], [13.5, -3.2, ZAV + 0.6]);
const gSup = piece('carterSup', racine, [0, 15, 0], [14.5, 5.8, ZAV + 0.5]);
const BOSS = [[X2, 1.45], [X3, 1.6], [X4, 2.2]];         // bossages de paliers (x, rayon)
function parois(g, mat, y0, y1, profil, ext) {
  // profil : liste de tronçons [x0, x1, yHaut] (ou yBas pour le carter inférieur)
  profil.forEach(([x0, x1, yh]) => {
    const ya = Math.min(y0, yh), yb = Math.max(y1, yh);
    boite(g, mat, x0, x1, ya, yb, ZAR - EP, ZAR);               // paroi arrière
    boite(g, mat, x0, x1, ya, yb, ZAV, ZAV + EP);               // paroi avant
    const yf = yh === ya ? ya : yb;                             // fond / dessus
    boite(g, mat, x0, x1, yf - (yh === ya ? 0 : EP), yf + (yh === ya ? EP : 0), ZAR - EP, ZAV + EP);
    // ailettes horizontales, interrompues par les bossages
    for (let y = Math.min(ya, yb) + 0.45; y < Math.max(ya, yb) - 0.3; y += 0.5) {
      const coupes = BOSS.filter(([bx, br]) => Math.abs(y) < br + 0.15).map(([bx, br]) => [bx - br - 0.15, bx + br + 0.15]).sort((a, b) => a[0] - b[0]);
      let xa = x0 + 0.15;
      const segs = [];
      coupes.forEach(([ca, cb]) => { if (cb > xa && ca < x1) { if (ca > xa) segs.push([xa, Math.min(ca, x1 - 0.15)]); xa = Math.max(xa, cb); } });
      if (xa < x1 - 0.15) segs.push([xa, x1 - 0.15]);
      segs.forEach(([a, b]) => { if (b - a > 0.3) { boite(g, mat, a, b, y - 0.05, y + 0.05, ZAR - EP - 0.32, ZAR - EP); boite(g, mat, a, b, y - 0.05, y + 0.05, ZAV + EP, ZAV + EP + 0.32); } });
    }
  });
  // parois d'extrémité
  const hG = profil[0][2], hD = profil[profil.length - 1][2];
  boite(g, mat, XG, XG + EP, Math.min(y0, hG), Math.max(y1, hG), ZAR - EP, ZAV + EP);
  boite(g, mat, XD - EP, XD, Math.min(y0, hD), Math.max(y1, hD), ZAR - EP, ZAV + EP);
  // bride du plan de joint (surépaisseur extérieure)
  const yj0 = y0 === 0 ? 0 : -0.4, yj1 = y0 === 0 ? 0.4 : 0;
  boite(g, mat, XG - 0.3, XD + 0.3, yj0, yj1, ZAR - EP - 0.45, ZAR - EP);
  boite(g, mat, XG - 0.3, XD + 0.3, yj0, yj1, ZAV + EP, ZAV + EP + 0.45);
  boite(g, mat, XG - 0.3, XG, yj0, yj1, ZAR - EP - 0.45, ZAV + EP + 0.45);
  boite(g, mat, XD, XD + 0.3, yj0, yj1, ZAR - EP - 0.45, ZAV + EP + 0.45);
  // demi-bossages de paliers
  BOSS.forEach(([bx, br]) => {
    [[ZAR - EP - 0.25, 0.5], [ZAV + EP + 0.25, 0.5]].forEach(([z, l]) => {
      const c = new T.CylinderGeometry(br, br, l, 48, 1, false, y0 === 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI); c.rotateX(Math.PI / 2);
      maille(g, c, mat, bx, 0, z);
    });
  });
}
{
  const mi = M('carterInf', 'peint');
  parois(gInf, mi, -0.001, 0, [[XG, XS, YB], [XS, XD, YB]]);
  // pattes de fixation
  const mp = M('carterInf', 'peintSombre');
  [[-2.8, 1.2], [5.0, 8.0], [15.8, 19.0]].forEach(([a, b]) => {
    boite(gInf, mp, a, b, YB, YB + 0.7, ZAR - EP - 1.1, ZAR - EP);
    boite(gInf, mp, a, b, YB, YB + 0.7, ZAV + EP, ZAV + EP + 1.1);
    [[ZAR - EP - 0.55], [ZAV + EP + 0.55]].forEach(([z]) => { maille(gInf, new T.CylinderGeometry(0.28, 0.28, 0.3, 6), M('carterInf', 'sombre'), (a + b) / 2, YB + 0.85, z); maille(gInf, new T.CylinderGeometry(0.16, 0.16, 0.45, 12), M('carterInf', 'acier'), (a + b) / 2, YB + 1.05, z); });
  });
  // vis du plan de joint
  const mv = M('carterInf', 'sombre');
  for (let x = XG + 0.5; x < XD; x += 1.55) {
    if (BOSS.some(([bx, br]) => Math.abs(x - bx) < br + 0.25)) continue;
    [ZAR - EP - 0.22, ZAV + EP + 0.22].forEach(z => maille(gInf, new T.CylinderGeometry(0.15, 0.15, 0.25, 6), mv, x, 0.52, z, false));
  }
  // bossage de l'arbre d'entrée (paroi gauche)
  maille(gInf, cylX(1.35, 1.2, 48), mi, XG - 0.6, 0, ZA);
}
{
  const ms = M('carterSup', 'peint');
  parois(gSup, ms, 0, 0.001, [[XG, XS, YA], [XS, XD, YBB]]);
  boite(gSup, ms, XS - EP / 2, XS + EP / 2, YA - EP, YBB, ZAR - EP, ZAV + EP);    // marche entre les deux hauteurs
  // anneaux de levage
  const mo = M('carterSup', 'peintSombre');
  [[XG + 1.2, YA], [XD - 1.5, YBB]].forEach(([x, y]) => { const t = new T.TorusGeometry(0.55, 0.16, 10, 24); maille(gSup, t, mo, x, y + 0.6, (ZAR + ZAV) / 2); });
}
// trappe de visite + reniflard
const gVis = piece('visite', racine, [0, 18.5, 0], [12.3, YBB + 0.9, 0.3]);
{
  const mt = M('visite', 'tole'), ms = M('visite', 'sombre');
  boite(gVis, mt, 9.6, 15.2, YBB, YBB + 0.18, -1.6, 2.9);
  for (let i = 0; i < 12; i++) { const t = i / 12, x = t < 0.5 ? 9.9 + t * 2 * 5.0 : 9.9 + (t - 0.5) * 2 * 5.0; maille(gVis, new T.CylinderGeometry(0.13, 0.13, 0.12, 6), ms, x, YBB + 0.24, t < 0.5 ? -1.35 : 2.65, false); }
  maille(gVis, new T.CylinderGeometry(0.22, 0.22, 0.5, 16), M('visite', 'acier'), 13.8, YBB + 0.43, 0.6);
  maille(gVis, new T.CylinderGeometry(0.45, 0.32, 0.55, 16), ms, 13.8, YBB + 0.95, 0.6);
}
// couvercles de paliers (deux faces)
const COUV = [[X2, 1.25, 10], [X3, 1.4, 10], [X4, 1.95, 12]];
[[ZAV, 1, [0, 0, 3.2]], [ZAR, -1, [0, 0, -3.2]]].forEach(([zp, sg, ex]) => {
  const g = piece('couvercles', racine, ex, sg > 0 ? [X3, 1.6, ZAV + 1.3] : [X2, 1.6, ZAR - 1.3], { rep: sg > 0 });
  const mc = M('couvercles', 'peint'), mv = M('couvercles', 'sombre');
  COUV.forEach(([x, r, n]) => {
    const z0 = zp + sg * (EP + 0.5);
    maille(g, cylZ(r, 0.22, 48), mc, x, 0, z0 + sg * 0.11);
    if (sg < 0 && x === X4) { maille(g, cylZ(1.15, 0.35, 40), mv, x, 0, z0 - 0.35); }      // joint de l'arbre de sortie
    else maille(g, cylZ(r * 0.62, 0.28, 40), mc, x, 0, z0 + sg * 0.3);
    vis(g, mv, n, r * 0.82, 0.13, x, 0, z0 + sg * 0.27, 'z', 0.13);
  });
});
// couvercle de l'arbre d'entrée (paroi gauche)
{
  const g = piece('couvercles', racine, [-2.2, 0, 0], [XG - 1.4, 1.4, ZA], { rep: false });
  maille(g, cylX(1.15, 0.2, 40), M('couvercles', 'peint'), XG - 1.3, 0, ZA);
  vis(g, M('couvercles', 'sombre'), 8, 0.95, 0.12, XG - 1.43, 0, ZA, 'x', 0.12);
}
// voyant de niveau, vidange, plaque (paroi droite x = XD)
const gNiv = piece('niveau', racine, [2.5, 0, 0], [XD + 0.5, -3.1, 2.9]);
{
  boite(gNiv, M('niveau', 'sombre'), XD, XD + 0.25, -6.3, -2.6, 2.55, 3.25);
  boite(gNiv, M('niveau', 'verre'), XD + 0.25, XD + 0.32, -6.05, -2.85, 2.7, 3.1);
  boite(gNiv, matHuile, XD + 0.2, XD + 0.27, -6.05, Y_HUILE, 2.72, 3.08);
  boite(gNiv, M('niveau', 'sombre'), XD + 0.25, XD + 0.33, Y_HUILE - 0.02, Y_HUILE + 0.02, 2.6, 3.2);   // repère
}
const gVid = piece('vidange', racine, [2.5, 0, 0], [XD + 0.9, -6.4, -1.5]);
{
  maille(gVid, cylX(0.32, 0.6, 20), M('vidange', 'acier'), XD + 0.3, -6.35, -1.5);
  maille(gVid, cylX(0.38, 0.25, 6), M('vidange', 'sombre'), XD + 0.7, -6.35, -1.5);
  maille(gVid, new T.BoxGeometry(0.1, 0.9, 0.12), M('vidange', 'sombre'), XD + 0.65, -5.95, -1.5);
}
const gPlq = piece('plaque', racine, [2.5, 0, 0], [XD + 0.3, -2.1, 0.4]);
{
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 560;
  const c = cv.getContext('2d');
  const gr = c.createLinearGradient(0, 0, 1024, 560); gr.addColorStop(0, '#d3d7da'); gr.addColorStop(1, '#a6acb1');
  c.fillStyle = gr; c.fillRect(0, 0, 1024, 560);
  c.strokeStyle = '#6d7378'; c.lineWidth = 6; c.strokeRect(8, 8, 1008, 544);
  c.fillStyle = '#2a2e32'; c.font = 'bold 64px Arial'; c.fillText('SEW-EURODRIVE', 40, 86);
  c.font = '28px Arial'; c.fillText('Bruchsal / Germany', 680, 80);
  const L = [['Type', 'X3KS230/HT/…'], ['i', '20,08'], ['PK1 kW', '472'], ['MK2 Nm', '59 278'], ['n1 r/min', '1475'], ['n2 r/min', '73'], ['Fs', '1,82'], ['PM kW', '520'], ['Ta °C', '0…35'], ['Huile', 'Synth. 320']];
  c.font = '34px Arial';
  L.forEach(([a, b], i) => { const x = i % 2 ? 540 : 40, y = 160 + Math.floor(i / 2) * 78; c.fillStyle = '#4a5055'; c.fillText(a, x, y); c.fillStyle = '#16191c'; c.font = 'bold 36px Arial'; c.fillText(b, x + 190, y); c.font = '34px Arial'; });
  const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 4;
  const pl = new T.PlaneGeometry(3.0, 1.64); pl.rotateY(Math.PI / 2);
  maille(gPlq, pl, new T.MeshStandardMaterial({ map: tx, metalness: 0.4, roughness: 0.45 }), XD + 0.03, -2.1, 0.4);
  matsPiece.plaque = [gPlq.children[0].material];
}

// ---------- huile (bain) ----------
const gHuile = piece('huile', racine, [0, 0, 0], [7.0, Y_HUILE + 0.2, ZAV - 0.4], { rep: true });
const bain = maille(gHuile, new T.BoxGeometry(XD - XG - 2 * EP - 0.02, Y_HUILE - YB - EP, ZAV - ZAR - 0.02), matHuile, (XG + XD) / 2, (YB + EP + Y_HUILE) / 2, (ZAR + ZAV) / 2, false);
bain.renderOrder = 5;
// gouttelettes projetées par la grande roue (barbotage)
const NG = 160, matG = new T.MeshStandardMaterial({ color: 0xc98a26, emissive: 0x3a2200, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.9 });
const gouttes = new T.InstancedMesh(new T.SphereGeometry(0.07, 8, 6), matG, NG); gouttes.frustumCulled = false; racine.add(gouttes);
const gdat = []; for (let i = 0; i < NG; i++) gdat.push({ vie: 0, p: new T.Vector3(), v: new T.Vector3() });
let gIdx = 0;

// ---------- châssis et sol ----------
{
  const mc = M('chassis', 'chassis');
  boite(racine, mc, -15.2, XD + 1.0, YB - 0.7, YB, ZAR - 2.2, ZAV + 2.2);
  boite(racine, mc, -14.0, -8.0, -7.0, -2.5, ZA - 2.2, ZA + 2.2);          // socle du moteur
  const sol = new T.Mesh(new T.PlaneGeometry(140, 140), new T.MeshStandardMaterial({ color: 0x2c3035, roughness: 0.92, metalness: 0.05 }));
  sol.rotation.x = -Math.PI / 2; sol.position.y = YB - 0.7; sol.receiveShadow = true; scene.add(sol);
  for (let i = -6; i <= 6; i++) { const l = new T.Mesh(new T.BoxGeometry(0.06, 0.01, 60), new T.MeshBasicMaterial({ color: 0x3a3f45 })); l.position.set(i * 5 + 2, YB - 0.69, 0); scene.add(l); }
}

// ---------- flèches de sens de rotation ----------
const matFl = new T.MeshBasicMaterial({ color: 0xe0a040, transparent: true, opacity: 0.92, side: T.DoubleSide });
function fleche(r) {
  const g = new T.Group();
  g.add(new T.Mesh(new T.TorusGeometry(r, 0.09, 8, 48, Math.PI * 1.4), matFl));
  const c = new T.Mesh(new T.ConeGeometry(0.26, 0.6, 16), matFl);
  const a = Math.PI * 1.4; c.position.set(r * Math.cos(a), r * Math.sin(a), 0); c.rotation.z = a; g.add(c);
  return g;
}
const fleches = [];
function poserFleche(parentGroupe, r, x, y, z, axeX, arbre) {
  const f = fleche(r); const h = new T.Group(); h.position.set(x, y, z); if (axeX) h.rotation.y = Math.PI / 2; h.add(f); parentGroupe.add(h);
  fleches.push({ f, arbre }); return f;
}
poserFleche(gA1, 1.6, -5.8, 0, 0, true, 1);
poserFleche(gA2, 1.0, 0, 0, ZAV + 1.5, false, 2);
poserFleche(gA3, 1.1, 0, 0, ZAV + 1.5, false, 3);
poserFleche(gAccS, 1.5, 0, 0, -9.9, false, 4);

// ---------- caméra (1 doigt : tourner ; 2 doigts : zoom + déplacement) ----------
const cam = { az: 0, el: 0, d: 50, c: new T.Vector3() }, cible = { az: 0, el: 0, d: 50, c: new T.Vector3() };
const VUES = {
  normale: { az: -0.62, el: 0.32, d: 52, c: [2.5, -1.2, 1] },
  ouvert: { az: -0.35, el: 0.72, d: 40, c: [7.5, -2.5, 0.6] },
  transparent: { az: -0.5, el: 0.38, d: 44, c: [6, -1.5, 0.6] },
  eclatee: { az: -0.6, el: 0.3, d: 66, c: [3, 4, 0] }
};
function cadrer(nom) {
  const v = VUES[nom], asp = vue.clientWidth / Math.max(1, vue.clientHeight);
  cible.az = v.az; cible.el = v.el; cible.d = v.d * Math.max(1, 1.45 / asp); cible.c.set(...v.c);
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
    else { cible.az -= dx * 0.008; cible.el = Math.max(-0.6, Math.min(1.45, cible.el + dy * 0.008)); }
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (geste) { cible.d = Math.max(4, Math.min(160, cible.d * geste.d / Math.max(1, d))); deplacer(mx - geste.mx, my - geste.my); }
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
canvas.addEventListener('wheel', e => { e.preventDefault(); cible.d = Math.max(4, Math.min(160, cible.d * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
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
    const mat = h.object.material;
    if (etat.vue === 'transparent' && matsCarter.includes(mat)) continue;
    if (mat === matHuile && etat.vue === 'normale') continue;
    let o = h.object; while (o && !o.userData.id) o = o.parent;
    if (o && o.userData.id !== 'chassis') { choisir(o.userData.id); return; }
  }
  choisir(null);
}
const INTERNES = ['arbre2', 'arbre3', 'arbre4', 'roulements', 'huile'];
function choisir(id, depuisListe) {
  if (choisie && matsPiece[choisie]) matsPiece[choisie].forEach(m => m.emissive && m.emissive.setHex(m === matHuile || m === matG ? 0x2a1600 : 0));
  choisie = id;
  document.querySelectorAll('#tPieces tr.lig').forEach(t => t.classList.toggle('sel', t.dataset.id === id));
  const f = $('#fiche');
  if (!id) { f.style.display = 'none'; return; }
  if (depuisListe && INTERNES.includes(id) && etat.vue === 'normale') majVue('ouvert');
  (matsPiece[id] || []).forEach(m => m.emissive && m.emissive.setHex(0x6a4200));
  const p = PIECES.find(q => q.id === id);
  $('#ficheT').innerHTML = `<b>${p.n} — ${p.nom}</b><br><i>${p.mat}</i><br>${p.role}`;
  f.style.display = 'block';
}
$('#ficheX').onclick = () => choisir(null);

// ---------- repères ----------
const boiteRep = $('#labels'); let repOn = false;
const vTmp = new T.Vector3();
groupes.forEach(G => {
  if (!G.rep) return;
  const p = PIECES.find(q => q.id === G.id); if (!p) return;
  const d = document.createElement('div'); d.className = 'rep'; d.textContent = p.n; d.title = p.nom; d.onclick = () => choisir(G.id);
  boiteRep.appendChild(d); G.el = d; G.p = p;
});
function majReperes() {
  const w = vue.clientWidth, h = vue.clientHeight;
  groupes.forEach(G => {
    if (!G.el) return;
    let vis = repOn && visibleVrai(G.g);
    if (G.id === 'huile') vis = vis && etat.vue !== 'normale' && etat.ecl < 0.05;
    if (INTERNES.includes(G.id) && etat.vue === 'normale') vis = false;
    if (vis) {
      vTmp.copy(G.ancre); G.g.parent.localToWorld(vTmp.add(G.g.position).sub(G.base));
      vTmp.project(camera);
      vis = vTmp.z < 1 && Math.abs(vTmp.x) < 1 && Math.abs(vTmp.y) < 1;
      if (vis) { G.el.style.left = ((vTmp.x + 1) / 2 * w) + 'px'; G.el.style.top = ((1 - vTmp.y) / 2 * h) + 'px'; }
    }
    G.el.style.display = vis ? 'flex' : 'none';
    G.el.classList.toggle('sel', G.id === choisie);
    const tx = w > 600 ? G.p.n + ' ' + G.p.court : '' + G.p.n; if (G.el.textContent !== tx) G.el.textContent = tx;
  });
}

// ---------- simulation ----------
const N_SYN = 1500, N_NOM = 1475, P_NOM = 472, ETA = 0.96, FS = 1.82, T_AMB = 30;
const etat = {
  vue: 'ouvert', ecl: 0, eclCible: 0, transp: 0, transpCible: 0,
  marche: false, n1: 0, charge: 0.8, pause: false, lent: false,
  temp: T_AMB, ventOK: true, propre: true, niveauOK: true, declenche: false,
  ang: 0, sens: true
};
const vitesses = () => { const n1 = etat.n1, n2 = n1 * z1 / z2, n3 = n2 * z3 / z4; return [n1, n2, n3, n3 * z5 / z6]; };
function puissance() { return etat.n1 > 1 ? etat.charge * P_NOM * Math.min(1, etat.n1 / N_NOM) : 0; }
function pertes() {
  if (etat.n1 < 1) return 0;
  const f = etat.n1 / N_NOM;
  return puissance() * (1 - ETA) * (etat.niveauOK ? 1 : 1.35) + 3.5 * f;          // pertes dentures + barbotage
}
function simuler(dt) {
  const cible = etat.marche ? N_SYN - (N_SYN - N_NOM) * Math.min(2, etat.charge) : 0;
  const tau = etat.marche ? 1.6 + etat.charge * 1.2 : 4.5;
  etat.n1 += (cible - etat.n1) * (1 - Math.exp(-dt / tau));
  if (!etat.marche && etat.n1 < 2) etat.n1 = 0;
  // thermique (temps accéléré)
  const ref = etat.n1 / N_NOM, G = 0.45 * (etat.ventOK ? 0.45 + 0.55 * ref : 0.45) * (etat.propre ? 1 : 0.55) + 0.02;
  const C_TH = 12;                                                // kJ/K « équivalent accéléré »
  etat.temp += (pertes() - (etat.temp - T_AMB) * G) / C_TH * dt;
  if (etat.temp > 110 && etat.marche) { etat.marche = false; etat.declenche = true; dire('Déclenchement : température d\'huile > 110 °C. Le moteur est arrêté par la protection thermique.'); }
  if (etat.marche && puissance() > P_NOM * FS) { etat.marche = false; etat.declenche = true; dire('Surcharge > capacité du réducteur (Fs dépassé) : le disjoncteur moteur déclenche.'); }
}
function appliquer(dtR) {
  const [n1, n2, n3, n4] = vitesses();
  const kVis = 0.02 * (etat.lent ? 0.25 : 1);                    // ralenti de l'affichage
  etat.ang += TAU * n1 / 60 * kVis * dtR;
  const a1 = etat.ang, a2 = -a1 * z1 / z2, a3 = -a2 * z3 / z4, a4 = -a3 * z5 / z6;
  spin1.rotation.z = spinV.rotation.z = spinAE.rotation.z = a1;
  spin2.rotation.z = a2;
  spin3.rotation.z = a3; spin4.rotation.z = spinAS.rotation.z = a4;
  // vue éclatée / transparence
  const k = 1 - Math.exp(-dtR * 5) || 0;
  etat.ecl += (etat.eclCible - etat.ecl) * (dtR ? k : 1);
  if (Math.abs(etat.ecl - etat.eclCible) < 1e-3) etat.ecl = etat.eclCible;
  groupes.forEach(G => G.g.position.copy(G.base).addScaledVector(G.ex, etat.ecl));
  const tr = etat.transpCible;
  if (tr !== etat.transp) {
    etat.transp = tr;
    matsCarter.forEach(m => { m.transparent = tr ? true : m.userData.tr; m.opacity = tr ? 0.16 : m.userData.op; m.depthWrite = !tr; m.needsUpdate = true; });
  }
  gSup.visible = gVis.visible = !(etat.vue === 'ouvert');
  gHuile.visible = etat.vue !== 'normale';
  bain.visible = etat.ecl < 0.05;
  // flèches de sens
  const om = [n1, -n2, n3, -n4];
  fleches.forEach(F => { F.f.visible = etat.sens && etat.n1 > 20; F.f.scale.x = om[F.arbre - 1] >= 0 ? 1 : -1; });
  // gouttelettes de barbotage
  const voir = etat.n1 > 100 && etat.vue !== 'normale' && etat.ecl < 0.05 && dtR > 0;
  if (voir) {
    const nb = Math.random() < n1 / N_NOM * 0.9 ? 2 : 0;
    for (let i = 0; i < nb; i++) {
      // la grande roue tourne en sens inverse de l'arbre d'entrée (ω4 < 0) ; vitesse tangentielle = ω × r
      const w = -1, ry = Y_HUILE + 0.05, rx = w * Math.sqrt(Math.max(0, R6 * R6 - ry * ry));
      const d = gdat[gIdx]; gIdx = (gIdx + 1) % NG;
      d.p.set(X4 + rx, ry, -1.15 + (Math.random() - 0.5) * 1.4);
      d.v.set(-w * ry, w * rx, 0).normalize().multiplyScalar(5 + Math.random() * 3);
      d.v.z = (Math.random() - 0.5) * 2.5; d.vie = 0.9;
    }
  }
  const mt = new T.Matrix4(), cache0 = new T.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < NG; i++) {
    const d = gdat[i];
    if (d.vie > 0 && dtR > 0) { d.vie -= dtR; d.v.y -= 14 * dtR; d.p.addScaledVector(d.v, dtR); if (d.p.y < Y_HUILE || d.p.y > YBB - 0.4) d.vie = 0; }
    gouttes.setMatrixAt(i, d.vie > 0 && voir ? mt.makeTranslation(d.p.x, d.p.y, d.p.z) : cache0);
  }
  gouttes.instanceMatrix.needsUpdate = true;
}

// ---------- vues ----------
function majVue(nom) {
  etat.vue = nom;
  document.querySelectorAll('#vues .btn').forEach(b => b.classList.toggle('on', b.dataset.v === nom));
  etat.eclCible = nom === 'eclatee' ? 1 : 0;
  etat.transpCible = nom === 'transparent' ? 1 : 0;
  cadrer(nom);
}
function basculerRep() { repOn = !repOn; $('#bRep').classList.toggle('on', repOn); }

// ---------- affichage ----------
const fmt = (x, d = 0) => x.toFixed(d).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const gc = $('#graph').getContext('2d');
const hist = { t: 0, d: [] };
function courbe() {
  const w = 600, h = 240; gc.clearRect(0, 0, w, h);
  gc.strokeStyle = '#343a41'; gc.lineWidth = 1;
  for (let i = 1; i < 4; i++) { gc.beginPath(); gc.moveTo(0, h * i / 4); gc.lineTo(w, h * i / 4); gc.stroke(); }
  const trace = (f, col) => { gc.strokeStyle = col; gc.lineWidth = 3; gc.beginPath(); hist.d.forEach((p, i) => { const x = i / 199 * w, y = h - Math.max(0, Math.min(1, f(p))) * (h - 8) - 4; i ? gc.lineTo(x, y) : gc.moveTo(x, y); }); gc.stroke(); };
  trace(p => p[0] / 1500, '#5aa9e6'); trace(p => (p[1] - 20) / 100, '#e5484d'); trace(p => p[2] / 2, '#d9a441');
}
let direT = 0;
function dire(t) { const m = $('#msg'); m.textContent = t; m.className = 'msg a'; direT = performance.now(); }
function afficher() {
  const [n1, n2, n3, n4] = vitesses(), P = puissance(), pe = pertes();
  $('#n1').textContent = fmt(n1) + ' tr/min'; $('#n2').textContent = fmt(n2) + ' tr/min';
  $('#n3').textContent = fmt(n3) + ' tr/min'; $('#n4').textContent = fmt(n4, 1) + ' tr/min';
  $('#mP').textContent = fmt(P) + ' kW';
  const C1 = n1 > 1 ? 9550 * P / n1 : 0, C2 = C1 * I_TOT * ETA;
  $('#mC1').textContent = fmt(C1) + ' N·m'; $('#mC2').textContent = fmt(C2) + ' N·m';
  $('#mPe').textContent = fmt(pe, 1) + ' kW'; $('#mT').textContent = fmt(etat.temp) + ' °C';
  const u = P / (P_NOM * FS);
  $('#mU').textContent = fmt(u * 100) + ' %';
  const bar = $('#bar'); bar.style.width = Math.min(100, u * 100) + '%'; bar.style.background = u > 0.85 ? 'var(--ko)' : u > 0.55 ? 'var(--acc)' : 'var(--ok)';
  const e = $('#etat');
  if (etat.declenche && !etat.marche) { e.textContent = 'DÉCLENCHÉ'; e.className = 'alarme'; }
  else if (etat.marche && etat.temp > 90) { e.textContent = 'ALARME'; e.className = 'alarme'; }
  else if (etat.marche || etat.n1 > 1) { e.textContent = etat.marche ? 'MARCHE' : 'ARRÊT…'; e.className = etat.marche ? 'marche' : 'bloque'; }
  else { e.textContent = 'ARRÊT'; e.className = 'arret'; }
  if (performance.now() - direT > 6000) {
    const m = $('#msg'); let t, c = 'msg';
    if (!etat.marche && etat.n1 < 1) t = 'Réducteur à l\'arrêt. Appuyez sur « Démarrer ». (À l\'arrêt, on peut contrôler le niveau d\'huile au voyant.)';
    else if (etat.temp > 100) { t = 'Huile à ' + fmt(etat.temp) + ' °C : arrêter et chercher la cause (ventilateur, ailettes, niveau, surcharge).'; c = 'msg a'; }
    else if (etat.temp > 90) { t = 'Température élevée : l\'huile vieillit vite au-dessus de 90 °C. Vérifier le refroidissement.'; c = 'msg w'; }
    else if (u > 0.85) { t = 'Charge proche de la capacité du réducteur (Fs = 1,82) : risque pour les dentures et les roulements.'; c = 'msg w'; }
    else if (etat.charge > 1.02) { t = 'Surcharge par rapport à la puissance prévue (472 kW). Le réducteur l\'accepte grâce au facteur de service, mais il s\'use plus vite.'; c = 'msg w'; }
    else if (!etat.niveauOK) { t = 'Niveau d\'huile bas : les roues barbotent moins, les dentures et roulements sont mal lubrifiés → échauffement et usure.'; c = 'msg w'; }
    else t = 'Fonctionnement normal : ' + fmt(n1) + ' tr/min à l\'entrée, ' + fmt(n4, 1) + ' tr/min à la sortie (÷ ' + fmt(I_TOT, 2) + '). Le couple est multiplié par ≈ ' + fmt(I_TOT * ETA, 1) + '.';
    m.textContent = t; m.className = c;
  }
  $('#bMarche').classList.toggle('on', etat.marche); $('#bArret').classList.toggle('on', !etat.marche);
  $('#bVent').classList.toggle('on', !etat.ventOK); $('#bSale').classList.toggle('on', !etat.propre); $('#bBas').classList.toggle('on', !etat.niveauOK);
  $('#bLent').classList.toggle('on', etat.lent); $('#bPause').classList.toggle('on', etat.pause);
  $('#bSens').classList.toggle('on', etat.sens);
}

// ---------- commandes ----------
document.querySelectorAll('#onglets button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#onglets button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === b.dataset.p));
});
document.querySelectorAll('#vues .btn').forEach(b => b.onclick = () => majVue(b.dataset.v));
$('#bRep').onclick = basculerRep;
$('#bSens').onclick = () => { etat.sens = !etat.sens; };
$('#bCentre').onclick = () => cadrer(etat.vue);
$('#bPlein').onclick = () => { $('#app').classList.toggle('plein'); $('#bPlein').classList.toggle('on'); setTimeout(() => { taille(); cadrer(etat.vue); }, 30); };
$('#bMarche').onclick = () => {
  if (etat.temp > 95) { dire('Impossible de redémarrer : laisser refroidir l\'huile sous 95 °C et supprimer la cause.'); return; }
  if (!etat.niveauOK && etat.n1 < 1) dire('Attention : niveau d\'huile bas. Au travail, on complète AVANT de démarrer.');
  etat.marche = true; etat.declenche = false; etat.pause = false;
};
$('#bArret').onclick = () => { etat.marche = false; };
$('#bLent').onclick = () => { etat.lent = !etat.lent; };
$('#bPause').onclick = () => { etat.pause = !etat.pause; };
$('#sCh').oninput = e => { etat.charge = +e.target.value / 100; $('#vCh').textContent = e.target.value + ' %'; };
$('#bVent').onclick = () => { etat.ventOK = !etat.ventOK; dire(etat.ventOK ? 'Ventilateur réparé.' : 'Ventilateur cassé : l\'air ne circule plus sur les ailettes, la température monte.'); };
$('#bSale').onclick = () => { etat.propre = !etat.propre; dire(etat.propre ? 'Ailettes nettoyées.' : 'Ailettes couvertes de poussière : la chaleur s\'évacue mal.'); };
$('#bBas').onclick = () => { etat.niveauOK = !etat.niveauOK; dire(etat.niveauOK ? 'Niveau d\'huile complété au repère.' : 'Fuite : le niveau d\'huile a baissé sous le repère du voyant.'); };
$('#bRepare').onclick = () => { etat.ventOK = etat.propre = etat.niveauOK = true; etat.declenche = false; dire('Ventilateur, ailettes et niveau d\'huile remis en état.'); };

// ---------- pages ----------
(function () {
  const t = $('#tPieces');
  t.innerHTML = '<tr><th>N°</th><th>Pièce</th><th>Matière</th></tr>' + PIECES.map(p => `<tr class="lig" data-id="${p.id}"><td class="n">${p.n}</td><td>${p.nom}</td><td>${p.mat}</td></tr>`).join('');
  t.querySelectorAll('tr.lig').forEach(r => r.onclick = () => choisir(r.dataset.id, true));
  $('#pPlaque').innerHTML = `<div class="plaque"><b>SEW-EURODRIVE</b> · X3KS230 · i = 20,08 · PK1 = 472 kW · n1 = 1475 / n2 = 73 tr/min · MK2 = 59 278 N·m · Fs = 1,82</div>
  <table><tr><th>Repère</th><th>Valeur</th><th>Signification</th></tr>${PLAQUE.map(([a, b, c]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join('')}</table>
  <p class="note">Valeurs relevées sur la photo de la plaque ; certaines lignes sont partiellement lisibles. En cas de doute, la plaque réelle et la notice SEW font foi.</p>`;
  $('#pCours').innerHTML = COURS_HTML;
  $('#pPannes').innerHTML = PANNES_HTML;
  const q = $('#pQuiz'); let bon = 0, fait = 0;
  q.innerHTML = QUIZ.map((x, i) => `<div class="q" data-i="${i}"><p>${i + 1}. ${x.q}</p>${x.r.map((r, j) => `<button data-j="${j}">${r}</button>`).join('')}<div class="exp">${x.e}</div></div>`).join('') + '<p id="score" class="note"></p>';
  q.querySelectorAll('.q').forEach(d => d.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (d.dataset.ok) return;
    const x = QUIZ[+d.dataset.i], j = +b.dataset.j; d.dataset.ok = 1; fait++;
    if (j === x.b) { b.classList.add('ok'); bon++; } else { b.classList.add('ko'); d.querySelectorAll('button')[x.b].classList.add('ok'); }
    d.querySelector('.exp').style.display = 'block';
    $('#score').textContent = 'Score : ' + bon + ' / ' + fait + (fait === QUIZ.length ? ' — terminé' + (bon >= QUIZ.length * 0.8 ? ', très bien !' : ', revoyez le cours.') : '');
  }));
})();

// ---------- boucle ----------
function taille() {
  const w = vue.clientWidth, h = vue.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(taille).observe(vue); taille(); majVue('ouvert');
Object.assign(cam, { az: cible.az, el: cible.el, d: cible.d }); cam.c.copy(cible.c);
let tPrec = performance.now(), tAff = 0;
function pas(dt) {
  if (!etat.pause) { simuler(dt); hist.t += dt; if (hist.t > 0.25) { hist.t = 0; hist.d.push([etat.n1, etat.temp, puissance() / P_NOM]); if (hist.d.length > 200) hist.d.shift(); } }
  appliquer(etat.pause ? 0 : dt);
}
function boucle(t) {
  const dt = Math.min(0.05, (t - tPrec) / 1000); tPrec = t;
  pas(dt); majCam(dt); renderer.render(scene, camera); majReperes();
  if (t - tAff > 150) { afficher(); courbe(); tAff = t; }
  requestAnimationFrame(boucle);
}
afficher(); requestAnimationFrame(boucle);
window.__etat = etat;
window.__pique = (x, y) => { toucher(x, y); return choisie; };
window.__avance = n => { for (let i = 0; i < n; i++) { pas(0.05); majCam(0.05); } afficher(); };
window.__vue = majVue;
window.__setCam = v => { cible.az = cam.az = v.az; cible.el = cam.el = v.el; cible.d = cam.d = v.d; cible.c.set(...v.c); cam.c.set(...v.c); };
