// Coupleur hydraulique Voith type T (remplissage constant) — remplissage et fonctionnement en 3D
// Unité de la scène : 1 = 100 mm. Axe des arbres = Z (moteur côté Z négatif). Pesanteur = −Y.
import * as T from '../../hydraulique/vendor/three.min.js';
import { PIECES, COURS_HTML, PANNES_HTML, QUIZ } from './donnees.js';

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
scene.fog = new T.Fog(0x1b2026, 70, 160);
const camera = new T.PerspectiveCamera(38, 1, 0.3, 400);

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
const soleil = new T.DirectionalLight(0xffffff, 1.6);
soleil.position.set(16, 26, 14); soleil.castShadow = true;
soleil.shadow.mapSize.set(2048, 2048);
Object.assign(soleil.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 });
soleil.shadow.bias = -0.0006; soleil.shadow.normalBias = 0.03;
scene.add(soleil);

// ---------- matériaux ----------
const BASE = {
  alu: { color: 0xb9bec3, metalness: 0.75, roughness: 0.42 },
  aluClair: { color: 0xcfd3d7, metalness: 0.7, roughness: 0.35 },
  acier: { color: 0xc3c8ce, metalness: 0.95, roughness: 0.25 },
  sombre: { color: 0x3c4046, metalness: 0.85, roughness: 0.45 },
  laiton: { color: 0xb08a3c, metalness: 0.9, roughness: 0.35 },
  caoutchouc: { color: 0x17181a, metalness: 0, roughness: 0.85 },
  peintMot: { color: 0x41566a, metalness: 0.25, roughness: 0.55 },
  peintRed: { color: 0x5b655d, metalness: 0.25, roughness: 0.6 },
  fonte: { color: 0x4a4e53, metalness: 0.5, roughness: 0.7 },
  chassis: { color: 0x3a3f45, metalness: 0.5, roughness: 0.65 },
  rougeF: { color: 0xa8282c, metalness: 0.2, roughness: 0.5 }
};
const coupePlan = new T.Plane(new T.Vector3(-1, 0, 0), 0);     // garde x <= 0
const huilePlan = new T.Plane(new T.Vector3(0, -1, 0), 0);     // garde y <= niveau (constante mise à jour)
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
const matHuile = new T.MeshStandardMaterial({ color: 0xd08e1c, emissive: 0x3a2200, transparent: true, opacity: 0.88, roughness: 0.12, metalness: 0, side: T.DoubleSide, depthWrite: false });
const matAnneau = matHuile.clone();
const matCap = matHuile.clone();
const matJet = new T.MeshStandardMaterial({ color: 0xd9971f, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.9 });
matsPiece.huile = [matHuile, matAnneau, matCap]; matsPiece.huile.forEach(m => m.userData.em = 0x3a2200);

// ---------- géométries ----------
const TAU = Math.PI * 2;
const R0 = 1.7, A = 0.7;              // tore de travail : rayon moyen 170 mm, rayon du profil 70 mm
const RH = 2.35;                      // rayon de l'orifice du bouchon (débouché dans le circuit)
const ZB = 0.28;                      // position axiale des bouchons (sur la roue extérieure)
const V_TOT = 2 * Math.PI * Math.PI * 0.17 * 0.07 * 0.07 * 1000;   // ≈ 16,4 L
const V_CONS = 11.2;                  // remplissage prescrit (exemple) ≈ 68 %
function cylZ(r, l, seg = 48) { const g = new T.CylinderGeometry(r, r, l, seg); g.rotateX(Math.PI / 2); return g; }
function anneauZ(ri, ro, ep, seg = 64) {
  const sh = new T.Shape(); sh.absarc(0, 0, ro, 0, TAU, false);
  const h = new T.Path(); h.absarc(0, 0, ri, 0, TAU, true); sh.holes.push(h);
  const g = new T.ExtrudeGeometry(sh, { depth: ep, bevelEnabled: false, curveSegments: seg }); g.translate(0, 0, -ep / 2); return g;
}
// profil (r, z) fermé → solide de révolution autour de Z
function tour(pts, seg = 96) {
  const g = new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg);
  g.rotateX(Math.PI / 2); return g;
}
function arc(cr, cz, rho, b0, b1, n, sz = 1) {
  const o = [];
  for (let i = 0; i <= n; i++) { const b = b0 + (b1 - b0) * i / n; o.push([cr + rho * Math.cos(b), cz + sz * rho * Math.sin(b)]); }
  return o;
}

// ---------- groupes ----------
const rotP = new T.Group(), rotT = new T.Group(), fixe = new T.Group();
scene.add(rotP, rotT, fixe);
const groupes = [], cliquables = [];
function piece(id, parent, ex, ancre, o = {}) {
  const g = new T.Group(); g.userData.id = id; parent.add(g);
  groupes.push({ g, id, ex: new T.Vector3(...ex), ancre: new T.Vector3(...ancre), suit: o.suit || null, rep: o.rep !== false });
  return g;
}
function maille(g, geo, mat, x = 0, y = 0, z = 0, ombre = true) {
  const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = ombre;
  g.add(m); cliquables.push(m); return m;
}

// 3 — roue intérieure = roue pompe (côté moteur, z < 0)
const gPompe = piece('pompe', rotP, [0, 0, -2.0], [0, -2.0, -0.6]);
{
  const pts = [...arc(R0, 0, A, Math.PI, 0, 40, -1), [2.42, 0], [2.42, -0.06], ...arc(R0, 0, A + 0.1, 0.08, Math.PI / 2, 24, -1), [0.6, -0.8], [0.6, -0.25], [0.85, -0.2], [R0 - A, 0]];
  maille(gPompe, tour(pts), M('pompe', 'alu'));
  const sh = new T.Shape(), pa = arc(R0, -0.03, A - 0.01, 0, Math.PI, 24, -1);
  sh.moveTo(pa[0][0], pa[0][1]); pa.slice(1).forEach(p => sh.lineTo(p[0], p[1])); sh.closePath();
  const geo = new T.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false }); geo.translate(0, 0, -0.0175); geo.rotateX(Math.PI / 2);
  const mat = M('pompe', 'aluClair');
  for (let i = 0; i < 24; i++) { const m = maille(gPompe, geo, mat); m.rotation.z = (i + 0.25) / 24 * TAU; }
}
// 2 — arbre creux + bout d'arbre moteur
const gArbre = piece('arbreCreux', rotP, [0, 0, -5.5], [0, 0.6, -1.8]);
{
  const g = anneauZ(0.45, 0.6, 2.95); g.translate(0, 0, -0.17);
  maille(gArbre, g, M('arbreCreux', 'acier'));
  maille(gArbre, new T.BoxGeometry(0.16, 0.08, 1.4), M('arbreCreux', 'sombre'), 0, 0.62, -1.0);
}
// 4 — roue extérieure = roue turbine (côté réducteur, z > 0)
const gTurb = piece('turbine', rotT, [0, 0, 0], [0, 2.75, 0.4]);
{
  const pts = [...arc(R0, 0, A, Math.PI, 0, 40, 1), [2.72, 0], [2.72, 0.5], ...arc(R0, 0, A + 0.1, 0.885, Math.PI / 2, 20, 1).map((p, i) => i ? p : [2.205, 0.62]),
    [0.9, 0.8], [0.9, 1.25], [0.76, 1.25], [0.76, 0.5], [0.95, 0.32], [R0 - A, 0]];
  maille(gTurb, tour(pts), M('turbine', 'alu'));
  const sh = new T.Shape(), pa = arc(R0, 0.03, A - 0.01, 0, Math.PI, 24, 1);
  sh.moveTo(pa[0][0], pa[0][1]); pa.slice(1).forEach(p => sh.lineTo(p[0], p[1])); sh.closePath();
  const geo = new T.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false }); geo.translate(0, 0, -0.0175); geo.rotateX(Math.PI / 2);
  const mat = M('turbine', 'aluClair');
  for (let i = 0; i < 23; i++) { const m = maille(gTurb, geo, mat); m.rotation.z = (i + 0.5) / 23 * TAU; }
  // bossages des bouchons sur la jante
  [0, 120, 240].forEach(d => { const m = maille(gTurb, new T.CylinderGeometry(0.24, 0.26, 0.12, 24), M('turbine', 'alu')); const a = d * Math.PI / 180; m.position.set(-Math.sin(a) * 2.74, Math.cos(a) * 2.74, ZB); m.rotation.z = a; });
}
// 5 — coquille
const gCoq = piece('coquille', rotT, [0, 0, -3.6], [0, -2.2, -0.8]);
maille(gCoq, tour([[2.72, 0], [2.72, -0.35], [2.62, -0.42], ...arc(R0, 0, 1.0, 0.43, Math.PI / 2, 24, -1), [0.9, -1.0], [0.9, -1.35], [0.76, -1.35], [0.76, -0.9], ...arc(R0, 0, 0.9, Math.PI / 2, 0, 24, -1), [2.72, 0]]), M('coquille', 'alu'));
for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, m = maille(gCoq, new T.BoxGeometry(0.06, 0.4, 0.3), M('coquille', 'alu')); m.position.set(Math.cos(a) * 2.5, Math.sin(a) * 2.5, -0.75); m.rotation.z = a - Math.PI / 2; }
// 12 — vis d'assemblage (côté roue extérieure)
const gVis = piece('vis', rotT, [0, 0, 1.4], [1.9, 1.9, 0.6]);
{
  const geo = new T.CylinderGeometry(0.075, 0.075, 0.1, 6); geo.rotateX(Math.PI / 2);
  const tige = cylZ(0.045, 0.6, 12);
  for (let i = 0; i < 16; i++) { const a = (i + 0.5) / 16 * TAU, x = Math.cos(a) * 2.6, y = Math.sin(a) * 2.6; maille(gVis, geo, M('vis', 'sombre'), x, y, 0.55); maille(gVis, tige, M('vis', 'sombre'), x, y, 0.2, false); }
}
// 8 — roulements et joints
const gJoint = piece('joints', rotT, [0, 0, 2.2], [0, -0.75, 1.3]);
{
  const bague = anneauZ(0.6, 0.76, 0.2), joint = anneauZ(0.6, 0.76, 0.14);
  maille(gJoint, bague, M('joints', 'sombre'), 0, 0, 0.72); maille(gJoint, bague, M('joints', 'sombre'), 0, 0, 1.12);
  maille(gJoint, bague, M('joints', 'sombre'), 0, 0, -1.0); maille(gJoint, joint, M('joints', 'caoutchouc'), 0, 0, -1.25);
}
// 6 et 7 — bouchons (sur la jante de la roue extérieure, orientés radialement)
function bouchon(id, angDeg, fusible) {
  const c = new T.Group(); c.rotation.z = angDeg * Math.PI / 180; rotT.add(c);
  const g = new T.Group(); g.userData.id = id; c.add(g);
  const hex = new T.CylinderGeometry(0.15, 0.15, 0.13, 6);
  maille(g, hex, M(id, fusible ? 'laiton' : 'acier', false), 0, 2.865, ZB);
  maille(g, new T.CylinderGeometry(0.18, 0.18, 0.025, 24), M(id, 'caoutchouc', false), 0, 2.79, ZB);
  maille(g, new T.CylinderGeometry(0.09, 0.09, 0.42, 16), M(id, fusible ? 'laiton' : 'acier', false), 0, 2.6, ZB, false);
  let ame = null;
  if (fusible) ame = maille(g, new T.CylinderGeometry(0.055, 0.055, 0.14, 16), M(id, 'rougeF', false), 0, 2.875, ZB);
  return { c, g, ame, ang: angDeg * Math.PI / 180 };
}
const B = bouchon('bouchon', 0, false);
const F1 = bouchon('fusibles', 120, true), F2 = bouchon('fusibles', 240, true);
groupes.push({ g: B.g, id: 'bouchon', ex: new T.Vector3(0, 1.4, 0), radial: true, ancre: new T.Vector3(0, 3.0, ZB), suit: B.g.children[0] });
groupes.push({ g: F1.g, id: 'fusibles', ex: new T.Vector3(0, 1.4, 0), radial: true, ancre: new T.Vector3(0, 3.0, ZB), suit: F1.g.children[0] });
groupes.push({ g: F2.g, id: 'fusibles', ex: new T.Vector3(0, 1.4, 0), radial: true, ancre: new T.Vector3(0, 3.0, ZB), rep: false });
// 9 — accouplement élastique (plateau menant sur la roue extérieure, plateau mené sur le réducteur)
const gElas = piece('elastique', rotT, [0, 0, 3.4], [0, 1.55, 1.4]);
{
  maille(gElas, anneauZ(0.92, 1.45, 0.24), M('elastique', 'fonte'), 0, 0, 0.94);
  maille(gElas, anneauZ(0.5, 1.42, 0.22), M('elastique', 'fonte'), 0, 0, 1.62);
  maille(gElas, anneauZ(0.5, 0.8, 0.8), M('elastique', 'fonte'), 0, 0, 2.12);
  const axe = cylZ(0.08, 0.6, 12), tampon = cylZ(0.15, 0.3, 20);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, x = Math.cos(a) * 1.15, y = Math.sin(a) * 1.15; maille(gElas, axe, M('elastique', 'acier'), x, y, 1.3, false); maille(gElas, tampon, M('elastique', 'caoutchouc'), x, y, 1.36); }
}
// arbre d'entrée du réducteur (tourne avec la sortie, appartient au réducteur)
const gArbreRed = piece('reducteur', rotT, [0, 0, 6.8], [0, 0, 0], { rep: false });
maille(gArbreRed, cylZ(0.5, 1.5, 32), M('reducteur', 'acier', false), 0, 0, 2.3);
// arbre moteur (tourne avec la pompe, appartient au moteur)
const gArbreMot = piece('moteur', rotP, [0, 0, -9], [0, 0, 0], { rep: false });
maille(gArbreMot, cylZ(0.45, 2.6, 32), M('moteur', 'acier', false), 0, 0, -2.9);

// 1 — moteur
const gMot = piece('moteur', fixe, [0, 0, -9], [0, 2.9, -6.6]);
{
  const pm = M('moteur', 'peintMot', false);
  maille(gMot, cylZ(1.95, 4.6, 64), pm, 0, 0, -6.9);
  for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; if (Math.abs(Math.sin(a) + 1) < 0.08) continue; const m = maille(gMot, new T.BoxGeometry(0.07, 0.24, 4.4), pm); m.position.set(Math.cos(a) * 2.05, Math.sin(a) * 2.05, -6.9); m.rotation.z = a - Math.PI / 2; }
  maille(gMot, cylZ(1.8, 0.3, 48), pm, 0, 0, -4.45); maille(gMot, cylZ(0.8, 0.22, 32), pm, 0, 0, -4.2);
  maille(gMot, cylZ(1.8, 0.3, 48), pm, 0, 0, -9.35);
  maille(gMot, cylZ(1.9, 1.1, 48), M('moteur', 'sombre', false), 0, 0, -10.05);
  for (let i = 1; i < 5; i++) maille(gMot, new T.TorusGeometry(i * 0.35, 0.03, 6, 40), M('moteur', 'acier', false), 0, 0, -10.62);
  maille(gMot, new T.BoxGeometry(1.2, 0.8, 1.5), pm, 0, 2.3, -6.4);
  maille(gMot, new T.BoxGeometry(1.3, 0.12, 1.6), pm, 0, 2.74, -6.4);
  [[-1.45, -5.4], [1.45, -5.4], [-1.45, -8.4], [1.45, -8.4]].forEach(p => maille(gMot, new T.BoxGeometry(0.7, 1.65, 0.9), pm, p[0], -2.37, p[1]));
}
// 10 — réducteur
const gRed = piece('reducteur', fixe, [0, 0, 6.8], [0, 1.95, 4.6]);
{
  const pr = M('reducteur', 'peintRed', false);
  maille(gRed, new T.BoxGeometry(4.0, 4.6, 4.0), pr, 0, -0.9, 5.1);
  maille(gRed, new T.BoxGeometry(4.3, 0.2, 4.3), pr, 0, 1.45, 5.1);
  maille(gRed, new T.BoxGeometry(4.4, 0.25, 4.4), pr, 0, -3.08, 5.1);
  maille(gRed, cylZ(0.95, 0.3, 40), pr, 0, 0, 2.95);
  for (let i = -1; i <= 1; i++) maille(gRed, new T.BoxGeometry(0.1, 3.6, 0.1), pr, i * 1.3, -1.2, 3.07);
  const so = new T.CylinderGeometry(0.6, 0.6, 1.4, 32); so.rotateZ(Math.PI / 2);
  maille(gRed, so, M('reducteur', 'acier', false), -2.6, -1.2, 6.0);
  maille(gRed, new T.CylinderGeometry(0.16, 0.16, 0.4, 16), M('reducteur', 'sombre', false), 1.1, 1.75, 6.2);
  maille(gRed, new T.CylinderGeometry(0.25, 0.25, 0.08, 24).rotateX(Math.PI / 2), M('reducteur', 'laiton', false), 1.3, -1.8, 3.11);
}
// châssis et sol (décor)
const decor = new T.Group(); fixe.add(decor);
{
  const mc = new T.MeshStandardMaterial(BASE.chassis);
  [-1.6, 1.6].forEach(x => { const m = new T.Mesh(new T.BoxGeometry(0.5, 0.4, 18.6), mc); m.position.set(x, -3.4, -1.9); m.castShadow = m.receiveShadow = true; decor.add(m); });
  for (const z of [-10.6, -5.3, 0.0, 3.4, 6.9]) { const m = new T.Mesh(new T.BoxGeometry(3.8, 0.38, 0.4), mc); m.position.set(0, -3.4, z); m.receiveShadow = true; decor.add(m); }
  const sol = new T.Mesh(new T.PlaneGeometry(120, 120), new T.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.95, metalness: 0 }));
  sol.rotation.x = -Math.PI / 2; sol.position.y = -3.6; sol.receiveShadow = true; decor.add(sol);
}

// ---------- huile : tables de remplissage ----------
// F(h) : fraction du volume du tore située sous le plan horizontal y = h (coupleur à l'arrêt)
// G(ri) : fraction située au-delà du rayon ri (coupleur en rotation : anneau d'huile)
const NT = 240, HMAX = R0 + A, tabF = new Float32Array(NT + 1), tabG = new Float32Array(NT + 1);
(function () {
  const n = 90, pts = [];
  let tot = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const u = -A + (i + 0.5) / n * 2 * A, z = -A + (j + 0.5) / n * 2 * A;
    if (u * u + z * z <= A * A) { const r = R0 + u; pts.push(r); tot += r; }
  }
  for (let k = 0; k <= NT; k++) {
    const h = -HMAX + k / NT * 2 * HMAX, ri = R0 - A + k / NT * 2 * A;
    let sf = 0, sg = 0;
    for (const r of pts) {
      const c = h / r; sf += r * (c >= 1 ? 1 : c <= -1 ? 0 : 1 - Math.acos(c) / Math.PI);
      if (r > ri) sg += r;
    }
    tabF[k] = sf / tot; tabG[k] = sg / tot;
  }
})();
function fracSous(h) {   // F(h)
  const x = (h + HMAX) / (2 * HMAX) * NT; if (x <= 0) return 0; if (x >= NT) return 1;
  const i = Math.floor(x); return tabF[i] + (tabF[i + 1] - tabF[i]) * (x - i);
}
function niveau(f) {     // h tel que F(h) = f
  if (f <= 0) return -HMAX; if (f >= 1) return HMAX;
  let lo = -HMAX, hi = HMAX;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fracSous(m) < f) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
function rayonInt(f) {   // ri tel que G(ri) = f
  if (f <= 0) return R0 + A; if (f >= 1) return R0 - A;
  for (let k = 0; k < NT; k++) if (tabG[k + 1] <= f) { const t = (tabG[k] - f) / Math.max(1e-6, tabG[k] - tabG[k + 1]); return R0 - A + (k + t) / NT * 2 * A; }
  return R0 + A;
}
const ALPHA = Math.acos(niveau(V_CONS / V_TOT) / RH) * 180 / Math.PI;   // repère de contrôle (degrés depuis le haut)

// ---------- huile : maillages ----------
const gHuile = piece('huile', fixe, [0, 0, 0], [0, -1.6, 0.0], { rep: false });
const ah = A * 0.985;
const meshTore = maille(gHuile, new T.TorusGeometry(R0, ah, 28, 120), matHuile, 0, 0, 0, false);
const meshCap = maille(gHuile, new T.BufferGeometry(), matCap, 0, 0, 0, false);
const meshAnneau = maille(gHuile, new T.BufferGeometry(), matAnneau, 0, 0, 0, false);
let hCap = 99, riAnn = 99;
function majCap(h) {
  if (Math.abs(h - hCap) < 0.004) return; hCap = h;
  meshCap.geometry.dispose();
  const ext = R0 + ah, int = R0 - ah;
  if (Math.abs(h) >= ext - 0.002) { meshCap.geometry = new T.BufferGeometry(); return; }
  const x2 = Math.sqrt(ext * ext - h * h), n = 48;
  const zDe = x => { const q = Math.sqrt(x * x + h * h) - R0; return Math.sqrt(Math.max(0, ah * ah - q * q)); };
  const lobe = (x1, x2b) => {
    const s = new T.Shape(), haut = [], bas = [];
    for (let i = 0; i <= n; i++) { const t = (1 - Math.cos(i / n * Math.PI)) / 2, x = x1 + (x2b - x1) * t; haut.push([x, zDe(x)]); bas.push([x, -zDe(x)]); }
    s.moveTo(haut[0][0], haut[0][1]); haut.slice(1).forEach(p => s.lineTo(p[0], p[1])); bas.reverse().forEach(p => s.lineTo(p[0], p[1])); s.closePath();
    return s;
  };
  let formes;
  if (Math.abs(h) < int) { const x1 = Math.sqrt(int * int - h * h); formes = [lobe(x1, x2), lobe(-x2, -x1)]; } else formes = [lobe(-x2, x2)];
  const g = new T.ShapeGeometry(formes, 1); g.rotateX(Math.PI / 2); g.translate(0, h, 0);
  meshCap.geometry = g;
}
function majAnneau(ri) {
  if (Math.abs(ri - riAnn) < 0.004) return; riAnn = ri;
  meshAnneau.geometry.dispose();
  if (ri >= R0 + ah - 0.005) { meshAnneau.geometry = new T.BufferGeometry(); return; }
  const c = (ri - R0) / ah, pts = [];
  if (c <= -1) { for (let i = 0; i <= 48; i++) { const b = -Math.PI / 2 + i / 48 * TAU; pts.push(new T.Vector2(R0 + ah * Math.cos(b), ah * Math.sin(b))); } }
  else {
    const b0 = Math.acos(c);
    for (let i = 0; i <= 36; i++) { const b = -b0 + i / 36 * 2 * b0; pts.push(new T.Vector2(R0 + ah * Math.cos(b), ah * Math.sin(b))); }
    pts.push(pts[0].clone());
  }
  const g = new T.LatheGeometry(pts, 96); g.rotateX(Math.PI / 2);
  meshAnneau.geometry = g;
}
// section de l'huile dans le plan de coupe (x = 0), sinon cachée par les aubes
const matSec = new T.MeshStandardMaterial({ color: 0xd08e1c, emissive: 0x4a2c00, roughness: 0.3, metalness: 0, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false });
matsPiece.huile.push(matSec); matSec.userData.em = 0x4a2c00;
const meshSec = maille(gHuile, new T.BufferGeometry(), matSec, 0, 0, 0, false);
let cleSec = '';
function majSection(tourne, val) {     // tourne : anneau (y >= ri en haut, y <= -ri en bas) ; sinon : y <= niveau
  const cle = (tourne ? 'r' : 's') + val.toFixed(3); if (cle === cleSec) return; cleSec = cle;
  meshSec.geometry.dispose();
  const formes = [];
  for (const yc of [R0, -R0]) {
    let lo = yc - ah, hi = yc + ah;
    if (tourne) { if (yc > 0) lo = Math.max(lo, val); else hi = Math.min(hi, -val); } else hi = Math.min(hi, val);
    if (hi - lo < 0.005) continue;
    const sh = new T.Shape(), n = 40, g = [], d = [];
    for (let i = 0; i <= n; i++) { const y = lo + (hi - lo) * (1 - Math.cos(i / n * Math.PI)) / 2, w = Math.sqrt(Math.max(0, ah * ah - (y - yc) * (y - yc))); g.push([-w, y]); d.push([w, y]); }
    sh.moveTo(g[0][0], g[0][1]); g.slice(1).forEach(p => sh.lineTo(p[0], p[1])); d.reverse().forEach(p => sh.lineTo(p[0], p[1])); sh.closePath();
    formes.push(sh);
  }
  if (!formes.length) { meshSec.geometry = new T.BufferGeometry(); return; }
  const geo = new T.ShapeGeometry(formes, 1); geo.rotateY(Math.PI / 2); geo.translate(-0.012, 0, 0);
  meshSec.geometry = geo;
}
// particules : tourbillon torique (pompe → vers l'extérieur, turbine → vers l'intérieur)
const NP = 280, matPart = new T.MeshStandardMaterial({ color: 0xffc35a, emissive: 0x8a4a00, roughness: 0.3, metalness: 0 });
matPart.depthTest = false;
const parts = new T.InstancedMesh(new T.SphereGeometry(0.04, 8, 6), matPart, NP); parts.frustumCulled = false; parts.renderOrder = 10; fixe.add(parts);
const pdat = []; for (let i = 0; i < NP; i++) pdat.push({ phi: Math.random() * TAU, psi: Math.random() * TAU, rho: A * (0.2 + 0.72 * Math.sqrt(Math.random())) });
// gouttes d'huile éjectées ou renversées
const NG = 220, gouttes = new T.InstancedMesh(new T.SphereGeometry(0.05, 8, 6), matJet, NG); gouttes.frustumCulled = false; fixe.add(gouttes);
const gdat = []; for (let i = 0; i < NG; i++) gdat.push({ vie: 0, p: new T.Vector3(), v: new T.Vector3() });
let gIdx = 0;
function emettre(p, v) { const d = gdat[gIdx]; gIdx = (gIdx + 1) % NG; d.vie = 1.6; d.p.copy(p); d.v.copy(v); }
// entonnoir et filet d'huile
const entonnoir = new T.Group(); fixe.add(entonnoir);
{
  const mm = new T.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.85, roughness: 0.35, side: T.DoubleSide });
  const cone = new T.Mesh(new T.CylinderGeometry(0.5, 0.07, 0.6, 32, 1, true), mm); cone.position.y = 1.15; entonnoir.add(cone);
  const bec = new T.Mesh(new T.CylinderGeometry(0.06, 0.05, 0.5, 16, 1, true), mm); bec.position.y = 0.6; entonnoir.add(bec);
  const tamis = new T.Mesh(new T.CircleGeometry(0.42, 32), new T.MeshStandardMaterial({ color: 0x777777, metalness: 0.6, roughness: 0.6, transparent: true, opacity: 0.6, side: T.DoubleSide })); tamis.rotation.x = -Math.PI / 2; tamis.position.y = 1.32; entonnoir.add(tamis);
}
const filet = new T.Mesh(new T.CylinderGeometry(0.035, 0.03, 1, 12), matJet); fixe.add(filet);
// repère de contrôle (position du bouchon où l'huile doit affleurer)
const repere = new T.Mesh(new T.TorusGeometry(0.3, 0.04, 8, 32), new T.MeshBasicMaterial({ color: 0x3fbf6f, transparent: true, opacity: 0.85 }));
fixe.add(repere);
// flèche du sens de rotation
const fleche = new T.Group(); fixe.add(fleche);
{
  const mf = new T.MeshBasicMaterial({ color: 0x3fbf6f });
  const t = new T.Mesh(new T.TorusGeometry(1.25, 0.05, 8, 48, 1.6), mf); fleche.add(t);
  const c = new T.Mesh(new T.ConeGeometry(0.15, 0.35, 16), mf); c.position.set(Math.cos(1.6) * 1.25, Math.sin(1.6) * 1.25, 0); c.rotation.z = 1.6; fleche.add(c);
  fleche.position.z = -2.2; fleche.rotation.z = 0.3;
}

// ---------- caméra (1 doigt : tourner ; 2 doigts : zoom + déplacement) ----------
const cam = { az: 1.0, el: 0.3, d: 30, c: new T.Vector3() }, cible = { az: 1.0, el: 0.3, d: 30, c: new T.Vector3() };
const VUES = {
  normale: { az: 0.85, el: 0.3, d: 21, c: [0, -0.6, -1.6], large: 1 },
  coupe: { az: 1.22, el: 0.42, d: 12, c: [0, 0.1, -0.1] },
  eclatee: { az: 1.45, el: 0.3, d: 34, c: [0, -0.3, -1.2], large: 1 }
};
function cadrer(nom) {
  const v = VUES[nom], asp = vue.clientWidth / Math.max(1, vue.clientHeight);
  cible.az = v.az; cible.el = v.el; cible.d = v.d * (v.large ? Math.max(1, 1.35 / asp) : Math.max(1, 0.9 / asp)); cible.c.set(...v.c);
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
    if (geste) { cible.d = Math.max(2.5, Math.min(120, cible.d * geste.d / Math.max(1, d))); deplacer(mx - geste.mx, my - geste.my); }
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
canvas.addEventListener('wheel', e => { e.preventDefault(); cible.d = Math.max(2.5, Math.min(120, cible.d * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
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
    const mat = h.object.material, huile = mat === matHuile || mat === matCap || mat === matAnneau || mat === matSec;
    if (etat.vue === 'coupe' && (matsCoupe.includes(mat) || huile) && h.point.x > 0.001) continue;
    if (mat === matHuile && h.point.y > hCap + 0.01) continue;
    let o = h.object; while (o && !o.userData.id) o = o.parent;
    if (o) { choisir(o.userData.id); return; }
  }
  choisir(null);
}
function choisir(id) {
  if (choisie && matsPiece[choisie]) matsPiece[choisie].forEach(m => m.emissive.setHex(m.userData.em || 0));
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
const vTmp = new T.Vector3();
groupes.forEach(G => {
  if (!G.rep || G.el) return;
  const p = PIECES.find(q => q.id === G.id); if (!p) return;
  const d = document.createElement('div'); d.className = 'rep'; d.textContent = p.n; d.title = p.nom; d.onclick = () => choisir(G.id);
  boiteRep.appendChild(d); G.el = d; G.p = p;
});
{ const p = PIECES.find(q => q.id === 'huile'), d = document.createElement('div'); d.className = 'rep'; d.textContent = p.n; d.onclick = () => choisir('huile'); boiteRep.appendChild(d); groupes.find(G => G.id === 'huile').el = d; groupes.find(G => G.id === 'huile').p = p; }
function majReperes() {
  const w = vue.clientWidth, h = vue.clientHeight;
  groupes.forEach(G => {
    if (!G.el) return;
    let vis = repOn && visibleVrai(G.g);
    if (G.id === 'huile') vis = repOn && etat.V > 0.3 && etat.vue === 'coupe' && etat.ecl < 0.05;
    if (vis) {
      if (G.suit) { vTmp.set(0, 0.25, 0); G.suit.localToWorld(vTmp); }
      else vTmp.copy(G.ancre).addScaledVector(G.ex, etat.ecl);
      if (G.id === 'huile') vTmp.set(0, -R0 - 0.35, 0);
      vTmp.project(camera);
      vis = vTmp.z < 1 && Math.abs(vTmp.x) < 1 && Math.abs(vTmp.y) < 1;
      if (vis) { G.el.style.left = ((vTmp.x + 1) / 2 * w) + 'px'; G.el.style.top = ((1 - vTmp.y) / 2 * h) + 'px'; }
    }
    G.el.style.display = vis ? 'flex' : 'none';
    G.el.classList.toggle('sel', G.id === choisie);
    const tx = etat.ecl > 0.6 && w > 600 ? G.p.n + ' ' + G.p.court : '' + G.p.n; if (G.el.textContent !== tx) G.el.textContent = tx;
  });
}

// ---------- simulation ----------
const C_N = 9550 * 110 / 1480;                 // couple nominal moteur ≈ 710 N·m
const W_S = TAU * 1500 / 60, W_N = TAU * 1480 / 60;
const S0 = 0.0385, F_REF = 0.68, A_REF = 2.283; // glissement 3 % au couple nominal pour 68 % de remplissage
const J_P = 3, J_T = 45, C_TH = 78000, ACC_TH = 10, T_AMB = 30, T_FUS = 140;
const etat = {
  vue: 'coupe', ecl: 0, eclCible: 0, lent: false, pause: false,
  V: 0, consigne: false, ouvert: false, sortie: 0, angle: -40, angCible: null, verse: false,
  marche: false, wp: 0, wt: 0, aP: 0, aT: -40 * Math.PI / 180, th: T_AMB, ch: 0.8, bloque: false, fondu: false, disj: false, tSurch: 0,
  Cc: 0, P: 0, Tm: 0, accT: 0, etape: 0
};
const fRemp = () => etat.V / V_TOT;
function coupleCoupleur(wp, wt, f) {
  // vitesse de référence = la plus rapide des deux roues (la turbine peut entraîner la pompe en ralentissement)
  const wr = Math.max(wp, wt);
  if (wr < 0.05 || f <= 0.002) return 0;
  const s = (wp - wt) / wr, Af = A_REF * Math.pow(f / F_REF, 1.6);
  return C_N * Af * (s / (Math.abs(s) + S0)) * (wr / W_N) * (wr / W_N);
}
function trous() {    // orifices ouverts : bouchon de remplissage dévissé, bouchon fusible fondu
  const o = [];
  if (etat.sortie > 0.6) o.push(B.ang);
  if (etat.fondu) o.push(F1.ang);
  return o;
}
const pW = new T.Vector3(), vW = new T.Vector3();
function simuler(dt) {
  // physique moteur / coupleur / convoyeur (sous-pas pour la stabilité)
  const n = Math.ceil(dt / 0.002), h = dt / n, f = fRemp(), wt0 = etat.wt;
  for (let i = 0; i < n; i++) {
    const Tm = etat.marche ? C_N * Math.min(2.8, Math.max(0, (W_S - etat.wp) / (W_S - W_N))) : 0;
    const Cc = coupleCoupleur(etat.wp, etat.wt, f);
    const fr = 0.015 * C_N * Math.min(1, etat.wp / 5);
    etat.wp = Math.max(0, etat.wp + (Tm - Cc - fr) / J_P * h);
    if (etat.bloque) etat.wt = 0;
    else {
      const Cl = etat.ch * C_N + 0.02 * C_N * Math.min(1, etat.wt / 5);
      if (etat.wt <= 1e-4 && Cc <= Cl) etat.wt = 0;
      else etat.wt = Math.max(0, etat.wt + (Cc - Cl) / J_T * h);
    }
    etat.Cc = Cc; etat.Tm = Tm;
  }
  etat.P = etat.Cc * Math.max(0, etat.wp - etat.wt);
  // protection du moteur (surcharge prolongée)
  if (etat.marche && etat.Tm > 2.6 * C_N) { etat.tSurch += dt; if (etat.tSurch > 4) { etat.marche = false; etat.disj = true; } } else etat.tSurch = Math.max(0, etat.tSurch - dt);
  // échauffement (temps accéléré)
  // accéléré ×10 en régime établi ou à l'arrêt ; ×2 turbine bloquée ; temps réel pendant la mise en vitesse
  etat.accT += ((etat.wt - wt0) / dt - etat.accT) * Math.min(1, dt * 3);
  const fac = etat.accT > 1.5 ? 1 : etat.wp > 50 && etat.wt < 1 ? 2 : ACC_TH;
  const hth = 60 + 60 * etat.wt / W_N;
  etat.th += fac * (etat.P - hth * (etat.th - T_AMB)) / C_TH * dt;
  if (etat.th >= T_FUS && !etat.fondu) { etat.fondu = true; if (F1.ame) F1.ame.visible = false; }
  // fuites par les orifices ouverts
  const tourne = etat.wp > 30 || etat.wt > 30;
  for (const a0 of trous()) {
    const a = etat.aT + a0, yH = RH * Math.cos(a);
    let debit = 0;
    if (tourne) debit = etat.V > 0.02 ? Math.min(4, 0.6 + Math.max(etat.wp, etat.wt) * 0.02) : 0;   // éjection centrifuge
    else { const lv = niveau(fRemp()); if (yH < lv) debit = Math.min(4, 0.25 + 3 * (lv - yH)); if (debit) { const vMin = V_TOT * fracSous(yH); debit = Math.min(debit, (etat.V - vMin) / dt); } }
    if (debit > 0.001) {
      etat.V = Math.max(0, etat.V - debit * dt);
      if (Math.random() < Math.min(1, debit * 2.2) * 2) {
        pW.set(-Math.sin(a) * 2.95, Math.cos(a) * 2.95, ZB);
        const ws = tourne ? etat.wt * 0.03 + 1.5 : 0.6;
        vW.set(-Math.sin(a) * ws, Math.cos(a) * ws, (Math.random() - 0.5) * 0.4);
        if (tourne) vW.add(new T.Vector3(-Math.cos(a), -Math.sin(a), 0).multiplyScalar(etat.wt * 0.04));
        emettre(pW, vW);
      }
    }
  }
  // remplissage à l'entonnoir
  if (etat.verse && !peutVerser()) finVerse();
  if (etat.verse) etat.V = Math.min(V_TOT, etat.V + 1.2 * dt);
  // historique pour la courbe
  hist.t += dt; if (hist.t > 0.1) { hist.t = 0; hist.d.push([etat.wp, etat.wt, etat.th]); if (hist.d.length > 300) hist.d.shift(); }
}
const hist = { t: 0, d: [] };
function arreteTotal() { return !etat.marche && etat.wp < 0.3 && etat.wt < 0.3; }
function peutVerser() { return etat.sortie > 0.9 && Math.abs(angNorm(etat.angle)) <= 30 && arreteTotal(); }
const angNorm = d => ((d + 180) % 360 + 360) % 360 - 180;

// ---------- animation des pièces ----------
function appliquer(dtR, dtS) {
  // rotation visuelle (ralentie pour rester lisible)
  const kv = 0.04;
  etat.aP += etat.wp * kv * dtS;
  if (!arreteTotal() || etat.wt > 0.01) etat.aT += etat.wt * kv * dtS;
  else if (etat.angCible !== null) {
    const d = etat.angCible - etat.angle, pas = Math.sign(d) * Math.min(Math.abs(d), 90 * dtR);
    etat.angle += pas; etat.aT = etat.angle * Math.PI / 180;
    if (Math.abs(d) < 0.05) { etat.angle = etat.angCible; etat.angCible = null; }
  } else etat.aT = etat.angle * Math.PI / 180;
  if (!arreteTotal()) { etat.angle = angNorm(etat.aT * 180 / Math.PI); }
  rotP.rotation.z = etat.aP; rotT.rotation.z = etat.aT;
  // bouchon de remplissage : dévissage animé
  const cS = etat.ouvert ? 1 : 0; etat.sortie += Math.sign(cS - etat.sortie) * Math.min(Math.abs(cS - etat.sortie), dtR * 1.6);
  B.g.children.forEach(m => { m.rotation.y = etat.sortie * 6; });
  // vue éclatée
  etat.ecl += (etat.eclCible - etat.ecl) * (1 - Math.exp(-dtR * 4));
  groupes.forEach(G => {
    if (G.radial) G.g.position.set(0, G.ex.y * etat.ecl + (G.id === 'bouchon' ? etat.sortie * 0.9 : 0), 0);
    else if (G.g !== gHuile) G.g.position.copy(G.ex).multiplyScalar(etat.ecl);
  });
  // huile
  const f = fRemp(), lv = niveau(f), sig = Math.min(1, Math.max(0, (etat.wp * 60 / TAU - 60) / 350));
  huilePlan.constant = lv;
  majCap(lv); majAnneau(rayonInt(f));
  const montrer = etat.ecl < 0.05 && etat.V > 0.02;
  matHuile.opacity = matCap.opacity = 0.88 * (1 - sig); matAnneau.opacity = 0.88 * sig;
  meshTore.visible = meshCap.visible = montrer && sig < 0.98;
  meshAnneau.visible = montrer && sig > 0.02;
  meshSec.visible = montrer && etat.vue === 'coupe';
  if (meshSec.visible) majSection(sig > 0.5, sig > 0.5 ? rayonInt(f) : lv);
  // particules du tourbillon
  const ri = rayonInt(f), s = etat.wp > 1 ? Math.max(0, (etat.wp - etat.wt) / etat.wp) : 0;
  const wc = (0.4 + 6 * Math.min(1, s * 6)) * Math.min(1, etat.wp / 40);
  const wphi = (etat.wp + etat.wt) / 2 * kv;
  const mo = new T.Matrix4(), cache0 = new T.Vector3(0, -99, 0);
  const partsOn = montrer && etat.vue === 'coupe' && etat.wp > 3;
  parts.visible = partsOn;
  if (partsOn) {
    for (let i = 0; i < NP; i++) {
      const q = pdat[i]; q.psi += wc * dtS * (A / q.rho) * 0.5; q.phi += wphi * dtS;
      const r = R0 + q.rho * Math.cos(q.psi), z = q.rho * Math.sin(q.psi);
      if (r < ri) mo.makeTranslation(cache0.x, cache0.y, cache0.z);
      else { const ph = (i % 2 ? Math.PI / 2 : 3 * Math.PI / 2 - 0.5) + ((q.phi % 0.5) + 0.5) % 0.5; mo.makeTranslation(r * Math.cos(ph), r * Math.sin(ph), z); }
      parts.setMatrixAt(i, mo);
    }
    parts.instanceMatrix.needsUpdate = true;
  }
  // gouttes
  for (let i = 0; i < NG; i++) {
    const d = gdat[i];
    if (d.vie > 0) { d.vie -= dtR; d.v.y -= 9.8 * dtR * 0.6; d.p.addScaledVector(d.v, dtR); if (d.p.y < -3.55) { d.p.y = -3.55; d.v.set(0, 0, 0); } }
    if (d.vie > 0) mo.makeTranslation(d.p.x, d.p.y, d.p.z); else mo.makeTranslation(0, -99, 0);
    gouttes.setMatrixAt(i, mo);
  }
  gouttes.instanceMatrix.needsUpdate = true;
  // entonnoir et filet
  const aH = etat.aT, hx = -Math.sin(aH) * 2.95, hy = Math.cos(aH) * 2.95;
  entonnoir.visible = etat.sortie > 0.9 && Math.abs(angNorm(etat.angle)) <= 30 && arreteTotal() && etat.ecl < 0.05;
  entonnoir.position.set(hx, hy, ZB);
  const vers = entonnoir.visible && etat.verse;
  filet.visible = vers;
  if (vers) { filet.scale.y = 0.55; filet.position.set(hx, hy + 0.15, ZB); }
  // repère de contrôle
  const aC = ALPHA * Math.PI / 180;
  repere.visible = etat.etape === 4 && etat.ecl < 0.05;
  repere.position.set(Math.sin(aC) * 3.05, Math.cos(aC) * 3.05, ZB); repere.rotation.set(0, 0, -aC); repere.rotateX(Math.PI / 2);
  fleche.visible = etat.wp > 5 && etat.vue !== 'coupe';
}

// ---------- vues ----------
function majVue(nom) {
  etat.vue = nom;
  document.querySelectorAll('#vues .btn').forEach(b => b.classList.toggle('on', b.dataset.v === nom));
  const cp = nom === 'coupe' ? [coupePlan] : [];
  matsCoupe.forEach(m => { m.clippingPlanes = cp; m.needsUpdate = true; });
  matHuile.clippingPlanes = matCap.clippingPlanes = nom === 'coupe' ? [huilePlan, coupePlan] : [huilePlan];
  matCap.clippingPlanes = cp; matAnneau.clippingPlanes = cp; matPart.clippingPlanes = cp;
  [matHuile, matCap, matAnneau, matPart].forEach(m => m.needsUpdate = true);
  etat.eclCible = nom === 'eclatee' ? 1 : 0;
  cadrer(nom);
}
function basculerRep() { repOn = !repOn; $('#bRep').classList.toggle('on', repOn); }

// ---------- étapes du remplissage ----------
const ETAPES = [
  { t: 'Arrêter et consigner le moteur', ok: () => etat.consigne },
  { t: 'Amener le bouchon de remplissage en haut', ok: () => Math.abs(angNorm(etat.angle)) <= 5 && arreteTotal() },
  { t: 'Dévisser le bouchon de remplissage', ok: () => etat.sortie > 0.9 },
  { t: 'Verser l\'huile filtrée (≈ ' + V_CONS.toFixed(1).replace('.', ',') + ' L)', ok: () => etat.V >= V_CONS - 0.3 },
  { t: 'Contrôler le niveau au repère de contrôle', ok: () => Math.abs(Math.abs(angNorm(etat.angle)) - ALPHA) <= 3 && Math.abs(etat.V - V_CONS) <= 0.35 && etat.sortie > 0.9 },
  { t: 'Revisser le bouchon (joint neuf)', ok: () => !etat.ouvert && etat.sortie < 0.05 },
  { t: 'Déconsigner le moteur', ok: () => !etat.consigne },
  { t: 'Démarrer et contrôler la marche', ok: () => etat.marche && etat.wt > 0.92 * W_N }
];
const fmt = (x, d = 1) => x.toFixed(d).replace('.', ',');
function texteEtape() {
  const e = etat.etape, a = angNorm(etat.angle), lv = niveau(fRemp()), yH = RH * Math.cos(a * Math.PI / 180);
  switch (e) {
    case 0: return 'Avant toute intervention : arrêt du moteur, cadenas sur le sectionneur, essai de démarrage impossible. Touchez « Consigner le moteur ».';
    case 1: return 'Tournez le coupleur à la main (curseur) ou touchez « Bouchon en haut » pour amener le bouchon de remplissage à midi (0°).';
    case 2: return etat.th > 70 ? 'Huile encore chaude (' + fmt(etat.th, 0) + ' °C) : attendez le refroidissement, l\'huile chaude est sous pression.' : 'Dévissez le bouchon de remplissage. Gardez le joint de côté : il sera remplacé par un joint neuf.';
    case 3: return 'Maintenez « Verser » : huile HLP ISO VG 32 propre, par un entonnoir avec tamis. Regardez le niveau monter dans la coupe. Quantité prescrite ≈ ' + fmt(V_CONS) + ' L.';
    case 4: {
      let t = 'Tournez le coupleur jusqu\'au repère vert (α ≈ ' + fmt(ALPHA, 0) + '° depuis le haut) : à cet angle, l\'huile doit juste affleurer au bord du trou. ';
      if (Math.abs(Math.abs(a) - ALPHA) <= 3) {
        if (etat.V > V_CONS + 0.35) t += 'L\'huile en trop s\'écoule par le trou… laissez couler.';
        else if (etat.V < V_CONS - 0.35 && yH > lv) t += 'Pas d\'huile au trou : il en manque. Remettez le bouchon en haut et complétez.';
      }
      return t;
    }
    case 5: return 'Niveau correct. Revissez le bouchon avec un joint neuf, au couple prescrit.';
    case 6: return 'Retirez votre cadenas (consignation levée) : le moteur peut être remis en marche.';
    case 7: return 'Onglet « Marche » : démarrez le moteur et observez le démarrage progressif, le glissement et la température. Vérifiez l\'absence de fuite.';
    default: return '✔ Remplissage terminé et contrôlé : glissement ' + fmt(glissement() * 100) + ' %, huile ' + fmt(etat.th, 0) + ' °C. Comparez avec un remplissage trop faible ou trop fort (onglet Marche, réglage rapide).';
  }
}
const glissement = () => etat.wp > 1 ? Math.max(0, (etat.wp - etat.wt) / etat.wp) : 0;
$('#etapes').innerHTML = ETAPES.map((e, i) => `<li data-i="${i}">${e.t}</li>`).join('');
function majEtapes() {
  while (etat.etape < ETAPES.length && ETAPES[etat.etape].ok()) etat.etape++;
  document.querySelectorAll('#etapes li').forEach((li, i) => { li.className = i < etat.etape ? 'fait' : i === etat.etape ? 'cour' : ''; });
  $('#eTitre').textContent = etat.etape < ETAPES.length ? 'Étape ' + (etat.etape + 1) + ' / ' + ETAPES.length + ' — ' + ETAPES[etat.etape].t : 'Remplissage terminé';
  const tx = texteEtape(); if ($('#eTexte').textContent !== tx) $('#eTexte').textContent = tx;
  $('#eTexte').className = 'msg ' + (etat.etape >= ETAPES.length ? '' : 'w');
}

// ---------- affichage ----------
const gc = $('#graph').getContext('2d');
function courbe() {
  const W = 600, H = 240; gc.clearRect(0, 0, W, H);
  gc.strokeStyle = '#343a41'; gc.lineWidth = 1;
  for (let i = 1; i < 4; i++) { gc.beginPath(); gc.moveTo(0, H * i / 4); gc.lineTo(W, H * i / 4); gc.stroke(); }
  const tr = (k, c, sc) => { gc.strokeStyle = c; gc.lineWidth = 3; gc.beginPath(); hist.d.forEach((p, i) => { const x = W - (hist.d.length - 1 - i) * 2, y = H - 6 - Math.min(1, p[k] / sc) * (H - 12); i ? gc.lineTo(x, y) : gc.moveTo(x, y); }); gc.stroke(); };
  tr(0, '#5aa9e6', W_S); tr(1, '#3fbf6f', W_S); tr(2, '#e5484d', 160);
  gc.fillStyle = '#9aa4ad'; gc.font = '20px system-ui'; gc.fillText('30 s', 8, 24);
}
function afficher() {
  const f = fRemp(), a = angNorm(etat.angle), s = glissement();
  $('#rV').textContent = fmt(etat.V) + ' L';
  $('#rF').textContent = fmt(f * 100, 0) + ' %';
  $('#rA').textContent = fmt(a, 0) + '°';
  $('#rC').textContent = fmt(V_CONS) + ' L · α ' + fmt(ALPHA, 0) + '°';
  const rb = $('#rBar'); rb.style.width = Math.min(100, f * 100) + '%'; rb.style.background = f > 0.805 ? 'var(--ko)' : Math.abs(etat.V - V_CONS) <= 0.35 ? 'var(--ok)' : 'var(--acc)';
  if (!document.activeElement || document.activeElement.id !== 'sAng') { $('#sAng').value = Math.round(a); }
  $('#vAng').textContent = fmt(a, 0) + '°';
  $('#vF').textContent = fmt(f * 100, 0) + ' %'; if (document.activeElement?.id !== 'sF') $('#sF').value = Math.round(f * 100);
  $('#bConsigne').textContent = etat.consigne ? '🔓 Déconsigner le moteur' : '🔒 Consigner le moteur'; $('#bConsigne').classList.toggle('on', etat.consigne);
  $('#bBouchon').textContent = etat.ouvert ? '🔧 Revisser le bouchon' : '🔧 Dévisser le bouchon'; $('#bBouchon').classList.toggle('on', etat.ouvert);
  $('#bVerser').disabled = !peutVerser();
  $('#mNp').textContent = fmt(etat.wp * 60 / TAU, 0) + ' tr/min';
  $('#mNt').textContent = fmt(etat.wt * 60 / TAU, 0) + ' tr/min';
  $('#mS').textContent = etat.wp > 1 ? fmt(s * 100) + ' %' : '–';
  $('#mC').textContent = fmt(etat.Cc, 0) + ' N·m';
  $('#mP').textContent = fmt(etat.P / 1000) + ' kW';
  $('#mT').textContent = fmt(etat.th, 0) + ' °C';
  const b = $('#bar'); b.style.width = Math.min(100, (etat.th - T_AMB) / (T_FUS - T_AMB) * 100) + '%'; b.style.background = etat.th > 110 ? 'var(--ko)' : etat.th > 85 ? 'var(--acc)' : 'var(--ok)';
  $('#bMarche').classList.toggle('on', etat.marche); $('#bArret').classList.toggle('on', !etat.marche && etat.wp > 1);
  $('#bBloque').classList.toggle('on', etat.bloque);
  const e = $('#etat');
  let tx, cl;
  if (etat.fondu) { tx = 'FUSIBLE FONDU'; cl = 'alarme'; }
  else if (etat.disj) { tx = 'DISJONCTÉ'; cl = 'alarme'; }
  else if (etat.consigne) { tx = '🔒 CONSIGNÉ'; cl = 'bloque'; }
  else if (etat.bloque && etat.marche) { tx = 'BLOQUÉ'; cl = 'alarme'; }
  else if (etat.marche && etat.wt < 0.9 * etat.wp) { tx = 'DÉMARRAGE'; cl = 'bloque'; }
  else if (etat.marche) { tx = 'MARCHE'; cl = 'marche'; }
  else { tx = 'ARRÊT'; cl = 'arret'; }
  e.textContent = tx; e.className = cl;
  // diagnostic
  const m = $('#msg'); let t, c = '';
  if (etat.fondu) { t = '🔥 Bouchon fusible fondu (' + T_FUS + ' °C) : l\'huile est éjectée, le coupleur ne transmet plus de couple. Arrêter, consigner, chercher la cause (manque d\'huile, surcharge, blocage), monter un bouchon fusible neuf de même température et refaire le plein.'; c = 'a'; }
  else if (etat.disj) { t = '⚡ Le disjoncteur du moteur a déclenché : couple demandé trop fort trop longtemps. Cause probable : trop d\'huile dans le coupleur (couple de démarrage excessif). Corrigez le remplissage puis redémarrez.'; c = 'a'; }
  else if (etat.marche && etat.V < 0.3) { t = 'Coupleur vide : le moteur tourne mais rien n\'est transmis. Faites le plein (onglet Remplissage).'; c = 'w'; }
  else if (etat.bloque && etat.marche) { t = 'Convoyeur bloqué : la turbine est arrêtée, glissement 100 %. Le moteur et le réducteur sont protégés, mais toute la puissance (' + fmt(etat.P / 1000, 0) + ' kW) chauffe l\'huile : le bouchon fusible va fondre.'; c = 'a'; }
  else if (f > 0.805) { t = 'Trop d\'huile (' + fmt(f * 100, 0) + ' %) : couple de démarrage trop fort, pression interne élevée (pas assez d\'air pour la dilatation), risque de fuite et de surcharge du moteur.'; c = 'a'; }
  else if (etat.marche && etat.wt < 0.9 * etat.wp && etat.wp > 100) { t = 'Démarrage : le moteur a pris sa vitesse presque à vide ; le couple transmis augmente et la bande accélère progressivement.'; c = 'w'; }
  else if (etat.marche && s > 0.07) { t = 'Glissement élevé (' + fmt(s * 100) + ' %) : remplissage insuffisant ou surcharge. ' + fmt(etat.P / 1000) + ' kW sont perdus en chaleur.'; c = 'w'; }
  else if (etat.th > 110) { t = 'Température élevée : surveillez, le bouchon fusible fond à ' + T_FUS + ' °C.'; c = 'w'; }
  else if (etat.marche) t = 'Régime normal : glissement ' + fmt(s * 100) + ' %, le coupleur transmet ' + fmt(etat.Cc, 0) + ' N·m. Les deux roues tournent presque à la même vitesse.';
  else t = etat.consigne ? 'Moteur consigné : démarrage impossible.' : 'Moteur arrêté. Remplissage : ' + fmt(etat.V) + ' L (' + fmt(f * 100, 0) + ' %).';
  if (performance.now() - direT > 4000) { if (m.textContent !== t) m.textContent = t; m.className = 'msg ' + c; }
  courbe();
}
function info(t) { const m = $('#eTexte'); m.textContent = t; m.className = 'msg a'; infoT = performance.now(); }
let infoT = 0, direT = 0;
function dire(t) { const m = $('#msg'); m.textContent = t; m.className = 'msg a'; direT = performance.now(); }

// ---------- interface ----------
document.querySelectorAll('#vues .btn').forEach(b => b.onclick = () => majVue(b.dataset.v));
$('#bRep').onclick = basculerRep;
$('#bCentre').onclick = () => cadrer(etat.vue);
$('#bConsigne').onclick = () => {
  if (!etat.consigne && !arreteTotal()) { etat.marche = false; info('Arrêt du moteur demandé : attendez l\'arrêt complet du coupleur, puis consignez.'); return; }
  if (etat.consigne && etat.ouvert) { info('Revissez d\'abord le bouchon de remplissage avant de lever la consignation.'); return; }
  etat.consigne = !etat.consigne; if (etat.consigne) etat.disj = false;
};
function peutTourner() {
  if (!etat.consigne) { info('Consignez d\'abord le moteur : on ne met jamais les mains sur un coupleur qui peut démarrer.'); return false; }
  if (!arreteTotal()) { info('Attendez l\'arrêt complet du coupleur.'); return false; }
  return true;
}
$('#sAng').oninput = e => { if (!peutTourner()) { e.target.value = Math.round(angNorm(etat.angle)); return; } etat.angCible = null; etat.angle = +e.target.value; };
$('#bPos0').onclick = () => { if (peutTourner()) etat.angCible = 0; };
$('#bPosC').onclick = () => { if (peutTourner()) etat.angCible = -Math.round(ALPHA); };
$('#bBouchon').onclick = () => {
  if (!etat.ouvert) {
    if (!etat.consigne || !arreteTotal()) { info('Consignez le moteur et attendez l\'arrêt complet avant d\'ouvrir.'); return; }
    if (etat.th > 70) { info('Huile à ' + fmt(etat.th, 0) + ' °C : attendez qu\'elle refroidisse (risque de projection d\'huile chaude sous pression).'); return; }
  }
  etat.ouvert = !etat.ouvert;
};
const vb = $('#bVerser');
const finVerse = () => { etat.verse = false; vb.classList.remove('on'); };
vb.addEventListener('pointerdown', e => { e.preventDefault(); if (!peutVerser()) { info('Pour verser : moteur consigné, bouchon dévissé et placé en haut (±30°).'); return; } etat.verse = true; vb.classList.add('on'); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(t => vb.addEventListener(t, finVerse));
vb.addEventListener('contextmenu', e => e.preventDefault());
$('#bVidange').onclick = () => {
  if (!etat.ouvert || etat.sortie < 0.9) { info('Vidange : consignez, dévissez le bouchon de remplissage, puis tournez le bouchon en bas : l\'huile s\'écoule dans un bac.'); return; }
  if (peutTourner()) etat.angCible = 180;
};
function remiseZero() {
  Object.assign(etat, { V: 0, consigne: false, ouvert: false, angle: -40, angCible: null, verse: false, marche: false, wp: 0, wt: 0, th: T_AMB, bloque: false, fondu: false, disj: false, tSurch: 0, etape: 0 });
  etat.aT = -40 * Math.PI / 180; F1.ame.visible = true; hist.d.length = 0;
}
$('#bRemiseZero').onclick = remiseZero;
$('#bMarche').onclick = () => {
  if (etat.consigne) { dire('Moteur consigné : levez la consignation (onglet Remplissage).'); return; }
  if (etat.ouvert) { dire('Le bouchon de remplissage est ouvert : revissez-le avant de démarrer.'); return; }
  etat.disj = false; etat.marche = true; etat.tSurch = 0;
};
$('#bArret').onclick = () => { etat.marche = false; };
$('#bLent').onclick = e => { etat.lent = !etat.lent; e.currentTarget.classList.toggle('on', etat.lent); };
$('#bPause').onclick = e => { etat.pause = !etat.pause; e.currentTarget.classList.toggle('on', etat.pause); e.currentTarget.textContent = etat.pause ? '▶ Reprendre' : '⏸ Pause'; };
$('#sCh').oninput = e => { etat.ch = e.target.value / 100; $('#vCh').textContent = e.target.value + ' %'; };
$('#sF').oninput = e => { etat.V = Math.min(V_TOT, e.target.value / 100 * V_TOT); };
$('#bBloque').onclick = () => { etat.bloque = !etat.bloque; };
$('#bRepare').onclick = () => {
  if (!etat.fondu) { dire('Le bouchon fusible est en bon état.'); return; }
  if (!etat.consigne || !arreteTotal()) { dire('Pour changer le bouchon fusible : arrêtez et consignez le moteur (onglet Remplissage).'); return; }
  if (etat.th > 70) { dire('Huile / carter encore à ' + fmt(etat.th, 0) + ' °C : attendez le refroidissement avant de démonter le bouchon fusible.'); return; }
  etat.fondu = false; F1.ame.visible = true;
  dire('Bouchon fusible neuf (140 °C) monté. Refaites le plein à la quantité prescrite (onglet Remplissage).');
};
document.querySelectorAll('#onglets button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#onglets button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === b.dataset.p));
  const v = $('#vues'); (b.dataset.p === 'pCmd' ? $('#pCmd') : $('#pRemp')).prepend(v);
});
$('#tPieces').innerHTML = '<tr><th>N°</th><th>Pièce</th><th>Rôle</th></tr>' + PIECES.map(p => `<tr class="lig" data-id="${p.id}"><td class="n">${p.n}</td><td><b>${p.nom}</b><br><span class="note">${p.mat}</span></td><td>${p.role}</td></tr>`).join('');
document.querySelectorAll('#tPieces tr.lig').forEach(t => t.onclick = () => { if (t.dataset.id === 'huile' && etat.vue !== 'coupe') majVue('coupe'); choisir(t.dataset.id); });
$('#pCours').innerHTML = COURS_HTML; $('#pPannes').innerHTML = PANNES_HTML;
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
new ResizeObserver(taille).observe(vue); taille(); majVue('coupe');
Object.assign(cam, { az: cible.az, el: cible.el, d: cible.d }); cam.c.copy(cible.c);
let tPrec = performance.now(), tAff = 0;
function pas(dt) {
  const dtS = etat.pause ? 0 : dt * (etat.lent ? 0.3 : 1);
  if (dtS > 0) simuler(dtS);
  appliquer(etat.pause ? 0 : dt, dtS);
  if (performance.now() - infoT > 4000) majEtapes();
}
function boucle(t) {
  const dt = Math.min(0.05, (t - tPrec) / 1000); tPrec = t;
  pas(dt); majCam(dt); renderer.render(scene, camera); majReperes();
  if (t - tAff > 150) { afficher(); tAff = t; }
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);
window.__etat = etat;
window.__alpha = ALPHA;
window.__pique = (x, y) => { toucher(x, y); return choisie; };
window.__avance = n => { for (let i = 0; i < n; i++) { pas(0.02); majCam(0.02); } afficher(); };
