// Accouplement à ressort serpentin (grille) type T10 — simulation 3D réaliste
// Unité de la scène : 1 = 10 mm. Axe des arbres = X (moteur côté X négatif). Pesanteur = −Y.
import * as T from '../../hydraulique/vendor/three.min.js';
import { PIECES, MONTAGE, COURS_HTML, PANNES_HTML, QUIZ } from './donnees.js';

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
scene.fog = new T.Fog(0x1b2026, 220, 420);
const camera = new T.PerspectiveCamera(38, 1, 1, 900);

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
soleil.position.set(30, 70, 45); soleil.castShadow = true;
soleil.shadow.mapSize.set(2048, 2048);
Object.assign(soleil.shadow.camera, { left: -60, right: 60, top: 45, bottom: -45, near: 1, far: 200 });
soleil.shadow.bias = -0.0005; soleil.shadow.normalBias = 0.08;
scene.add(soleil);

// ---------- matériaux ----------
const BASE = {
  acier: { color: 0xc4c9cf, metalness: 0.95, roughness: 0.24 },
  acierBrut: { color: 0x8d949a, metalness: 0.85, roughness: 0.42 },
  ressort: { color: 0x3a434c, metalness: 0.85, roughness: 0.34 },      // acier à ressort grenaillé, bleui
  alu: { color: 0x6c7176, metalness: 0.45, roughness: 0.52 },          // aluminium moulé peint gris
  sombre: { color: 0x34383d, metalness: 0.8, roughness: 0.45 },
  zingue: { color: 0xa7adb2, metalness: 0.9, roughness: 0.38 },
  caoutchouc: { color: 0x151618, metalness: 0, roughness: 0.82 },
  papier: { color: 0x2a2b2d, metalness: 0, roughness: 0.9 },
  moteur: { color: 0x5f666c, metalness: 0.35, roughness: 0.6 },
  peint: { color: 0x3f6a82, metalness: 0.3, roughness: 0.62 },
  chassis: { color: 0x3a3f45, metalness: 0.5, roughness: 0.65 },
  laiton: { color: 0xb08a3c, metalness: 0.9, roughness: 0.35 },
  peintF: { color: 0x34576b, metalness: 0.3, roughness: 0.66 },
  caoutch: { color: 0x151618, metalness: 0, roughness: 0.82 },
  verre: { color: 0x9fb4c0, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.5 },
  inox: { color: 0xc7ccd0, metalness: 0.85, roughness: 0.35 }
};
const coupePlan = new T.Plane(new T.Vector3(0, 0, -1), 0);          // garde z <= 0
const matsPiece = {}, cache = {}, matsCoupe = [];
function M(id, cle, coupable = false) {
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
const matGraisse = new T.MeshStandardMaterial({ color: 0x7a5a24, emissive: 0x1c1204, transparent: true, opacity: 0.55, roughness: 0.35, metalness: 0, side: T.DoubleSide, depthWrite: false });
matsPiece.graisse = [matGraisse]; matsCoupe.push(matGraisse);

const TAU = Math.PI * 2;
// ---------- dimensions (1 = 10 mm) ----------
const N = 48, NSEG = 6, PAS = TAU / N;           // rainures, segments de grille
const RF = 13, RB = 11.0, RMOY = 8.5, LF = 4.5, LM = 13;   // rayon de denture, fond de rainure, moyeu, largeur denture, longueur moyeu
const RG = 12.0, HG = 1.6, TG = 0.55;            // grille : rayon moyen, hauteur radiale, épaisseur
const HW = (TG / 2 + 0.04) / RG;                  // demi-largeur angulaire d'une rainure (côté extérieur)
const G0 = 0.4;                                   // écartement nominal 4 mm
const XE = G0 / 2 + LF + 0.3, RHO = RG * PAS / 2; // bout des barreaux, rayon des boucles

// ---------- outils ----------
const groupes = [], cliquables = [];
function piece(id, parent, ex, ancre, o = {}) {
  const g = new T.Group(); g.userData.id = id; parent.add(g);
  if (o.pos) g.position.set(...o.pos);
  const G = { g, id, base: g.position.clone(), ex: new T.Vector3(...ex), ancre: new T.Vector3(...ancre), rep: o.rep !== false, mo: new T.Vector3(), moC: new T.Vector3() };
  groupes.push(G); g.userData.G = G;
  return g;
}
function maille(g, geo, mat, x = 0, y = 0, z = 0, ombre = true) {
  const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = ombre;
  g.add(m); cliquables.push(m); return m;
}
const boite = (g, mat, x0, x1, y0, y1, z0, z1) => maille(g, new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
function cylX(r, l, seg = 48, r2) { const g = new T.CylinderGeometry(r2 ?? r, r, l, seg); g.rotateZ(-Math.PI / 2); return g; }   // r en x-l/2, r2 en x+l/2
const hex = (r, h) => new T.CylinderGeometry(r, r, h, 6);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- denture d'un moyeu (rainures à flancs courbes, plus larges vers le jeu) ----------
function dentureGeo() {
  // contour : [angle, rayon, rainure ?] ; x local de 0 (face côté jeu) à LF (face extérieure)
  const pts = [];
  const prof = [[-1, RF], [-0.97, RF - 0.35], [-0.88, RB + 0.25], [-0.62, RB], [0.62, RB], [0.88, RB + 0.25], [0.97, RF - 0.35], [1, RF]];
  for (let k = 0; k < N; k++) {
    const c = k * PAS;
    prof.forEach(([f, r]) => pts.push([c, f, r]));
    pts.push([c + PAS / 2, null, RF + 0.02]);
  }
  const trou = []; const nIn = 64; for (let i = 0; i < nIn; i++) trou.push([-i / nIn * TAU, null, RMOY - 0.2]);
  const largeur = (t, r) => HW * RG / r * (1 + 1.25 * Math.pow(1 - t, 2));      // évasement vers le jeu (t = 0)
  const map = (P, t) => { const [c, f, r] = P; const a = f === null ? c : c + f * largeur(t, r); return [LF * t, r * Math.cos(a), r * Math.sin(a)]; };
  const pos = [], tri = (a, b, c) => pos.push(...a, ...b, ...c), NT = 8;
  const bande = ring => { for (let s = 0; s < NT; s++) for (let i = 0; i < ring.length; i++) { const A = ring[i], B = ring[(i + 1) % ring.length]; const t0 = s / NT, t1 = (s + 1) / NT; const a0 = map(A, t0), b0 = map(B, t0), a1 = map(A, t1), b1 = map(B, t1); tri(a0, b0, b1); tri(a0, b1, a1); } };
  bande(pts); bande(trou);
  for (const t of [0, 1]) {
    const v2 = pts.map(P => { const q = map(P, t); return new T.Vector2(q[1], q[2]); }), h2 = trou.map(P => { const q = map(P, t); return new T.Vector2(q[1], q[2]); });
    const tous = pts.concat(trou);
    T.ShapeUtils.triangulateShape(v2, [h2]).forEach(f => tri(...f.map(i => map(tous[i], t))));
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
const DENT = dentureGeo();
const racine = new T.Group(); scene.add(racine);

// ---------- moteur + arbre moteur ----------
const gMot = piece('moteur', racine, [-14, 0, 0], [-36, 15.5, 0]);
const spinArbreA = new T.Group(); racine.add(spinArbreA);
{
  const mm = M('moteur', 'moteur'), ms = M('moteur', 'sombre');
  maille(gMot, cylX(14, 32, 64), mm, -37, 0, 0);
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; if (Math.sin(a) < -0.75) continue; const f = maille(gMot, new T.BoxGeometry(30, 0.35, 1.3), mm, -37, Math.sin(a) * 14.4, Math.cos(a) * 14.4); f.rotation.x = -a; }
  maille(gMot, cylX(13.2, 1.6, 64), mm, -20.6, 0, 0);
  maille(gMot, cylX(4, 1.4, 32), ms, -19.4, 0, 0);
  maille(gMot, cylX(14.4, 6, 64), M('moteur', 'peint'), -56, 0, 0);
  boite(gMot, mm, -45, -31, 13.6, 20, -6, 6); boite(gMot, ms, -44.5, -31.5, 20, 20.6, -5.5, 5.5);
  boite(gMot, mm, -50, -24, -17, -13, -14, 14);
  const ma = M('arbres', 'acier');
  maille(spinArbreA, cylX(5.5, 19.6), ma, -10.0, 0, 0);
  boite(spinArbreA, M('arbres', 'sombre'), -19.5, -0.3, 5.0, 6.2, -1.4, 1.4);       // clavette
}
// ---------- alignement côté machine (défauts exagérés) ----------
const alignB = new T.Group(); racine.add(alignB);
const gMach = piece('machine', alignB, [14, 0, 0], [33, 11.5, 12.5]);
const spinArbreB = new T.Group(); alignB.add(spinArbreB);
const spinSortie = new T.Group(); spinSortie.position.set(48, 3, 0); gMach.add(spinSortie);
{
  // réducteur à renvoi d'angle : carter bleu à ailettes, plan de joint horizontal (y = 0), arbre de sortie perpendiculaire (axe Z)
  const mp = M('machine', 'peint'), ms = M('machine', 'sombre'), mf = M('machine', 'peintF');
  const corps = (x0, x1, y0, y1, zz) => {
    boite(gMach, mp, x0, x1, y0, y1, -zz, zz);
    for (let y = y0 + 1.4; y < y1 - 0.8; y += 1.8) if (Math.abs(y) > 1.2) {   // ailettes horizontales
      boite(gMach, mp, x0 + 0.6, x1 - 0.6, y - 0.22, y + 0.22, zz, zz + 1.0); boite(gMach, mp, x0 + 0.6, x1 - 0.6, y - 0.22, y + 0.22, -zz - 1.0, -zz);
    }
  };
  corps(21, 33, -17, 8.5, 9.5);          // côté entrée (couple conique)
  corps(33, 60, -17, 15, 12);            // côté grandes roues
  boite(gMach, mf, 20.4, 60.6, -0.6, 0.6, -13.3, 13.3);               // bride du plan de joint
  for (let x = 23; x < 60; x += 4) for (const z of [-12.9, 12.9]) if (x < 33 ? Math.abs(z) < 13 : true) maille(gMach, hex(0.55, 0.6), ms, x, 0.9, x < 33 ? Math.sign(z) * 10.4 : z, false);
  boite(gMach, mf, 18, 62, -21, -17, -15, 15);                       // pattes / semelle
  // palier d'entrée + couvercle boulonné
  maille(gMach, cylX(7.5, 3, 48), mp, 19.5, 0, 0);
  maille(gMach, cylX(6.8, 0.8, 48), mf, 17.8, 0, 0);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const b = maille(gMach, hex(0.5, 0.5), ms, 17.2, Math.cos(a) * 5.8, Math.sin(a) * 5.8, false); b.rotation.z = Math.PI / 2; }
  maille(gMach, cylX(5.9, 0.6, 40), M('machine', 'caoutch'), 17.1, 0, 0);
  // couvercles de paliers sur les faces avant / arrière, arbre de sortie côté -Z
  [[27, 3, 9.5, 4.5], [40, 3, 12, 5.5], [48, 3, 12, 7.5]].forEach(([x, y, z, r]) => {
    for (const sg of [1, -1]) {
      maille(gMach, new T.CylinderGeometry(r, r, 1.6, 48).rotateX(Math.PI / 2), mp, x, y, sg * (z + 1.8));
      maille(gMach, new T.CylinderGeometry(r * 0.9, r * 0.9, 0.5, 48).rotateX(Math.PI / 2), mf, x, y, sg * (z + 2.85));
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const b = maille(gMach, hex(0.45, 0.45), ms, x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, sg * (z + 3.2), false); b.rotation.x = Math.PI / 2; }
    }
  });
  // anneaux de levage, reniflard, voyant d'huile
  [[26, 8.5], [55, 15]].forEach(([x, y]) => maille(gMach, new T.TorusGeometry(1.4, 0.4, 10, 24), mf, x, y + 1.5, 0));
  maille(gMach, new T.CylinderGeometry(0.8, 0.6, 1.6, 16), ms, 44, 15.8, 4);
  boite(gMach, ms, 59.9, 60.6, -12, -6, -1, 1); boite(gMach, M('machine', 'verre'), 60.6, 60.8, -11.5, -6.5, -0.6, 0.6);
  // plaque signalétique
  boite(gMach, M('machine', 'inox'), 40, 47, 5, 9, 13.02, 13.12);
  // arbre de sortie (lent), clavette et petite flèche de rotation
  const mo = M('machine', 'acier');
  maille(spinSortie, new T.CylinderGeometry(4.2, 4.2, 12, 40).rotateX(Math.PI / 2), mo, 0, 0, -20);
  boite(spinSortie, M('machine', 'sombre'), -0.8, 0.8, 3.7, 4.6, -25.5, -16);
  const ma = M('arbres', 'acier');
  maille(spinArbreB, cylX(5.5, 19.6), ma, 10.0, 0, 0);
  boite(spinArbreB, M('arbres', 'sombre'), 0.3, 19.5, 5.0, 6.2, -1.4, 1.4);
}

// ---------- moyeux ----------
function moyeu(id, parent, sg) {
  const g = piece(id, parent, [sg * 9, 0, 0], [sg * 9, RMOY + 1.2, 4.0]);
  const s = new T.Group(); g.add(s);
  const md = M(id, 'acier'), mb = M(id, 'acierBrut');
  const d = maille(s, DENT, md, sg * G0 / 2, 0, 0); d.scale.x = sg;
  maille(s, cylX(RMOY, LM - LF), mb, sg * (G0 / 2 + LF + (LM - LF) / 2), 0, 0);
  maille(s, cylX(RB - 0.05, LF), mb, sg * (G0 / 2 + LF / 2), 0, 0);
  const cf = new T.RingGeometry(5.5, RMOY, 48); cf.rotateY(Math.PI / 2);                 // chanfrein / face côté arbre
  maille(s, cf, mb, sg * (G0 / 2 + LM + 0.01), 0, 0);
  return [g, s];
}
const [gMA, spinA] = moyeu('moyeuA', racine, -1);
const [gMB, spinB] = moyeu('moyeuB', alignB, 1);

// ---------- grille (ressort serpentin), maillage déformable ----------
const grilleDat = (function () {
  const bx = [], bt = [], br = [], bseg = [], idx = [];
  let nv = 0;
  const sect = [[-TG / 2, -HG / 2], [TG / 2, -HG / 2], [TG / 2, HG / 2], [-TG / 2, HG / 2]];
  for (let j = 0; j < NSEG; j++) {
    const K = N / NSEG, chemin = [];
    for (let k = 0; k < K; k++) {
      const s0 = RG * (j * K + k) * PAS, dir = k % 2 ? -1 : 1;
      for (let i = 0; i <= 16; i++) chemin.push([dir * (-XE + 2 * XE * i / 16), s0]);
      if (k < K - 1) for (let i = 1; i < 10; i++) { const a = Math.PI * i / 10; chemin.push([dir * (XE + RHO * Math.sin(a)), s0 + RHO - RHO * Math.cos(a)]); }
    }
    const base = nv;
    chemin.forEach((p, i) => {
      const q = chemin[Math.max(0, i - 1)], r = chemin[Math.min(chemin.length - 1, i + 1)];
      let tx = r[0] - q[0], ts = r[1] - q[1]; const l = Math.hypot(tx, ts); tx /= l; ts /= l;
      const nx = -ts, ns = tx;
      for (let f = 0; f < 4; f++) for (const c of [f, (f + 1) % 4]) {
        const [a, b] = sect[c]; bx.push(p[0] + nx * a); bt.push((p[1] + ns * a) / RG); br.push(RG + b); bseg.push(j); nv++;
      }
    });
    for (let i = 0; i < chemin.length - 1; i++) for (let f = 0; f < 4; f++) {
      const a = base + i * 8 + f * 2, b = a + 8;
      idx.push(a, a + 1, b + 1, a, b + 1, b);
    }
    for (const i of [0, chemin.length - 1]) {          // bouts des segments
      const o = base + i * 8; idx.push(o, o + 2, o + 4, o, o + 4, o + 6);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(nv * 3), 3));
  geo.setIndex(idx);
  return { geo, bx: Float32Array.from(bx), bt: Float32Array.from(bt), br: Float32Array.from(br), bseg: Uint8Array.from(bseg), nv };
})();
const gGrille = piece('grille', racine, [0, 0, 0], [0, RF + 1.3, 3.0]);
const meshGrille = maille(gGrille, grilleDat.geo, M('grille', 'ressort'), 0, 0, 0);
meshGrille.frustumCulled = false;
const segOff = new Float32Array(NSEG), segCible = new Float32Array(NSEG);
const segCasse = 2;                                   // segment qui casse en cas de surcharge
const mB = new T.Matrix4(), vA = new T.Vector3(), vB = new T.Vector3();
function majGrille(angA, angB, casse) {
  const p = grilleDat.geo.attributes.position.array, { bx, bt, br, bseg, nv } = grilleDat;
  alignB.updateMatrix(); mB.copy(alignB.matrix);
  const W = G0 / 2 + 2.8;
  for (let i = 0; i < nv; i++) {
    const x = bx[i], sg = bseg[i], r = br[i] + segOff[sg];
    let w = smooth(-W, W, x);
    if (casse) { if (sg === segCasse && Math.abs(x) < 1.0) { p[i * 3] = p[i * 3 + 1] = p[i * 3 + 2] = 0; continue; } w = x > 0 && sg !== segCasse ? w : 0; }
    const aA = bt[i] + angA;
    vA.set(x, r * Math.cos(aA), r * Math.sin(aA));
    if (w > 0) {
      const aB = bt[i] + angB;
      vB.set(x, r * Math.cos(aB), r * Math.sin(aB)).applyMatrix4(mB);
      vA.lerp(vB, w);
    }
    p[i * 3] = vA.x; p[i * 3 + 1] = vA.y; p[i * 3 + 2] = vA.z;
  }
  grilleDat.geo.attributes.position.needsUpdate = true;
  grilleDat.geo.computeVertexNormals();
}

// ---------- graisse ----------
const gGraisse = piece('graisse', racine, [0, 0, 0], [0, -RF - 1.2, 3.5]);
const spinG = new T.Group(); gGraisse.add(spinG);
const graisseRain = new T.Group(), graissePlein = new T.Group(); spinG.add(graisseRain, graissePlein);
{
  const tube = (r0, r1, x0, x1, par) => { const pts = [new T.Vector2(r0, x0), new T.Vector2(r1, x0), new T.Vector2(r1, x1), new T.Vector2(r0, x1), new T.Vector2(r0, x0)]; const g = new T.LatheGeometry(pts, 72); g.rotateZ(-Math.PI / 2); maille(par, g, matGraisse, 0, 0, 0, false).renderOrder = 4; };
  tube(RB + 0.02, RF - 0.05, G0 / 2 + 0.05, G0 / 2 + LF - 0.05, graisseRain); tube(RB + 0.02, RF - 0.05, -G0 / 2 - LF + 0.05, -G0 / 2 - 0.05, graisseRain);
  const prof = [[RB, -6.0], [15.2, -6.0], [15.2, 6.0], [RB, 6.0], [RB, -6.0]].map(([r, x]) => new T.Vector2(r, x));
  const g = new T.LatheGeometry(prof, 72); g.rotateZ(-Math.PI / 2); maille(graissePlein, g, matGraisse, 0, 0, 0, false).renderOrder = 4;
}

// ---------- carter en deux demi-coquilles ----------
const PROF_CARTER = [[10.4, -10.9], [11.0, -9.7], [15.2, -7.6], [16.0, -6.4], [16.0, 6.4], [15.2, 7.6], [11.0, 9.7], [10.4, 10.9],
  [9.9, 10.9], [10.4, 9.4], [14.6, 7.3], [15.4, 6.2], [15.4, -6.2], [14.6, -7.3], [10.4, -9.4], [9.9, -10.9], [10.4, -10.9]].map(([r, x]) => new T.Vector2(r, x));
function demiCarter(id, haut) {
  const g = piece(id, racine, haut ? [0, 18, 0] : [0, -4, 24], [haut ? -2 : 2, haut ? 17.2 : -17.2, 6]);
  const s = new T.Group(); g.add(s);
  const ma = M(id, 'alu', true);
  const lg = new T.LatheGeometry(PROF_CARTER, 96, haut ? Math.PI : 0, Math.PI); lg.rotateZ(-Math.PI / 2);
  maille(s, lg, ma);
  const y0 = haut ? 0.02 : -0.77, y1 = haut ? 0.77 : -0.02;
  for (const z of [1, -1]) {
    boite(s, ma, -6.3, 6.3, y0, y1, z > 0 ? 15.5 : -17.9, z > 0 ? 17.9 : -15.5);
    // nervures de renfort sous la bride
    [-3, 0, 3].forEach(x => boite(s, ma, x - 0.3, x + 0.3, haut ? 0.77 : -2.2, haut ? 2.2 : -0.77, z > 0 ? 15.6 : -16.8, z > 0 ? 16.8 : -15.6));
  }
  // joint plat
  const mj = M('jointPlat', 'papier', true);
  if (haut) for (const z of [1, -1]) boite(s, mj, -6.3, 6.3, -0.02, 0.02, z > 0 ? 15.5 : -17.9, z > 0 ? 17.9 : -15.5);
  // bouchon de graissage
  const gb = piece('bouchons', s, [0, 0, 0], [haut ? 3 : -3, haut ? 17.4 : -17.4, 0], { rep: haut });
  const bx = haut ? 3 : -3, by = haut ? 1 : -1;
  const b = maille(gb, hex(0.75, 0.7), M('bouchons', 'zingue', true), bx, by * 16.25, 0); if (!haut) b.rotation.z = Math.PI;
  maille(gb, new T.CylinderGeometry(1.0, 1.0, 0.25, 24), M('bouchons', 'zingue', true), bx, by * 15.95, 0);
  // repère de coulée et marquage
  boite(s, ma, -2.2, 2.2, haut ? 15.75 : -16.25, haut ? 16.25 : -15.75, -0.25, 0.25);
  return [g, s];
}
const [gCH, spinCH] = demiCarter('carterH', true);
const [gCB, spinCB] = demiCarter('carterB', false);
// boulons (montés avec le demi-carter haut)
const gVis = piece('vis', spinCH, [0, 0, 0], [4.5, 2.6, 17.2]);
{
  const mv = M('vis', 'sombre', true), mt = M('vis', 'zingue', true);
  for (const z of [16.7, -16.7]) for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    maille(gVis, new T.CylinderGeometry(0.42, 0.42, 4.6, 16), mt, x, 0.1, z, false);
    maille(gVis, hex(0.85, 0.7), mv, x, 1.12, z);
    maille(gVis, hex(0.85, 0.75), mv, x, -1.15, z);
  }
}
// joints à lèvres
function joint(sg) {
  const g = piece('joints', racine, [sg * 16, 0, 0], [sg * 11.3, 10.8, 3.0], { rep: sg < 0 });
  const s = new T.Group(); g.add(s);
  const pts = [[RMOY + 0.02, 0], [10.25, 0], [10.25, 1.0], [9.6, 1.0], [9.1, 0.55], [RMOY + 0.02, 0.4], [RMOY + 0.02, 0]].map(([r, x]) => new T.Vector2(r, x * sg));
  const lg = new T.LatheGeometry(pts, 72); lg.rotateZ(-Math.PI / 2);
  maille(s, lg, M('joints', 'caoutchouc', true), sg * 10.25, 0, 0);
  const rs = new T.TorusGeometry(9.0, 0.12, 6, 72); rs.rotateY(Math.PI / 2);
  maille(s, rs, M('joints', 'zingue', true), sg * 10.75, 0, 0, false);
  return [g, s];
}
const [gJA, spinJA] = joint(-1);
const [gJB, spinJB] = joint(1);

// ---------- outils de montage ----------
const gCale = new T.Group(); racine.add(gCale);
{
  const mc = new T.MeshStandardMaterial({ color: 0xb9bec3, metalness: 0.9, roughness: 0.3 });
  const l = new T.Mesh(new T.BoxGeometry(0.4, 9, 2.2), mc); l.position.set(0, RF + 2.0, 0); gCale.add(l);
  const m = new T.Mesh(new T.BoxGeometry(1.6, 3, 3), new T.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 0.6, roughness: 0.5 })); m.position.set(0, RF + 7.4, 0); gCale.add(m);
}
const gComp = new T.Group(); racine.add(gComp);
{
  const mn = new T.MeshStandardMaterial({ color: 0x2e3338, metalness: 0.6, roughness: 0.5 }), mc = new T.MeshStandardMaterial({ color: 0xc4c9cf, metalness: 0.9, roughness: 0.3 });
  const add = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; gComp.add(m); return m; };
  add(new T.BoxGeometry(3, 2, 3), mn, -9, RMOY + 1, 0);
  add(new T.CylinderGeometry(0.3, 0.3, 7, 12), mc, -9, RMOY + 5.5, 0);
  add(new T.BoxGeometry(9.5, 0.5, 0.5), mc, -4.5, RMOY + 8.8, 0);
  add(new T.CylinderGeometry(0.25, 0.25, 4.6, 12), mc, 1.2, RF + 1.95, 0.0);
  const cad = add(new T.CylinderGeometry(2.2, 2.2, 1, 40), mn, 1.2, RMOY + 9.8, 1.0); cad.rotation.x = Math.PI / 2;
  const fc = add(new T.CircleGeometry(1.95, 40), new T.MeshBasicMaterial({ color: 0xe9ecef }), 1.2, RMOY + 9.8, 1.52);
  const ai = add(new T.BoxGeometry(0.12, 1.6, 0.05), new T.MeshBasicMaterial({ color: 0xb33a2f }), 1.2, RMOY + 10.3, 1.56); ai.rotation.z = -0.5;
  void fc;
}

// ---------- châssis et sol ----------
{
  const mc = M('chassis', 'chassis');
  boite(racine, mc, -62, 62, -24, -21, -24, 24);
  boite(racine, mc, -50, -24, -21, -17, -15, 15);
  const sol = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshStandardMaterial({ color: 0x2c3035, roughness: 0.92, metalness: 0.05 }));
  sol.rotation.x = -Math.PI / 2; sol.position.y = -24; sol.receiveShadow = true; scene.add(sol);
}

// ---------- caméra (1 doigt : tourner ; 2 doigts : zoom + déplacement) ----------
const cam = { az: 0, el: 0, d: 80, c: new T.Vector3() }, cible = { az: 0, el: 0, d: 80, c: new T.Vector3() };
const VUES = {
  normale: { az: 0.38, el: 0.28, d: 135, c: [2, -3, 0] },
  coupe: { az: 0.42, el: 0.28, d: 62, c: [0, -1, 0] },
  sanscarter: { az: 0.45, el: 0.36, d: 58, c: [0, 0, 0] },
  eclatee: { az: 0.3, el: 0.3, d: 135, c: [2, 1, 0] },
  montage: { az: 0.45, el: 0.32, d: 80, c: [0, 2, 0] }
};
function cadrer(nom) {
  const v = VUES[nom], asp = vue.clientWidth / Math.max(1, vue.clientHeight);
  cible.az = v.az; cible.el = v.el; cible.d = v.d * Math.max(1, 1.35 / asp); cible.c.set(...v.c);
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
    else { cible.az -= dx * 0.008; cible.el = Math.max(-0.5, Math.min(1.45, cible.el + dy * 0.008)); }
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (geste) { cible.d = Math.max(8, Math.min(300, cible.d * geste.d / Math.max(1, d))); deplacer(mx - geste.mx, my - geste.my); }
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
canvas.addEventListener('wheel', e => { e.preventDefault(); cible.d = Math.max(8, Math.min(300, cible.d * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
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
    if (etat.vue === 'coupe' && matsCoupe.includes(mat) && h.point.z > 0.001) continue;
    let o = h.object; while (o && !o.userData.id) o = o.parent;
    if (o && o.userData.id !== 'chassis') { choisir(o.userData.id); return; }
  }
  choisir(null);
}
const INTERNES = ['grille', 'graisse', 'moyeuA', 'moyeuB'];
function choisir(id, depuisListe) {
  if (choisie && matsPiece[choisie]) matsPiece[choisie].forEach(m => m.emissive.setHex(m === matGraisse ? 0x1c1204 : 0));
  choisie = id;
  document.querySelectorAll('#tPieces tr.lig').forEach(t => t.classList.toggle('sel', t.dataset.id === id));
  const f = $('#fiche');
  if (!id) { f.style.display = 'none'; return; }
  if (depuisListe && INTERNES.includes(id) && etat.vue === 'normale') majVue('coupe');
  (matsPiece[id] || []).forEach(m => m.emissive.setHex(0x6a4200));
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
    let vis = repOn && visibleVrai(G.g) && !(G.id === 'graisse' && !graissePlein.visible && !graisseRain.visible);
    if (vis) {
      // ancre en coordonnées « monde » (pièce montée), décalée comme la pièce (éclaté, montage)
      let H = G; for (let o = G.g.parent; o && o !== racine && o !== alignB; o = o.parent) if (o.userData.G) H = o.userData.G;
      vTmp.copy(G.ancre).add(H.g.position).sub(H.base);
      if (H.g.parent === alignB) vTmp.applyMatrix4(alignB.matrix);
      vTmp.project(camera);
      vis = vTmp.z < 1 && Math.abs(vTmp.x) < 1 && Math.abs(vTmp.y) < 1;
      if (vis) { G.el.style.left = ((vTmp.x + 1) / 2 * w) + 'px'; G.el.style.top = ((1 - vTmp.y) / 2 * h) + 'px'; }
    }
    G.el.style.display = vis ? 'flex' : 'none';
    G.el.classList.toggle('sel', G.id === choisie);
    const tx = w > 600 ? G.p.n + ' ' + G.p.court : '' + G.p.n; if (G.el.textContent !== tx) G.el.textContent = tx;
  });
}

// ---------- physique : deux inerties reliées par la grille (raideur progressive) ----------
const WS = TAU * 1500 / 60, WN = TAU * 1485 / 60, C_MOT = 9550 * 315 / 1485;   // moteur 315 kW
const CN = 4000, PHI_N = 0.4 * Math.PI / 180;                                     // accouplement : 4 000 N·m pour 0,4° de torsion
const J_M = 6, J_L = 25, AMORT = 250;
const etat = {
  vue: 'coupe', ecl: 0, eclCible: 0, pause: false, lent: false,
  marche: false, cmF: 0, wm: 0, wl: 0, phi: 0, cc: 0, pic: 0, charge: 0.8, choc: 0, bloc: false, casse: false, declenche: '',
  ang: 0.03, par: 0.05, gap: 4, graisse: true, usure: 0, temp: 30, tCale: 0,
  angA: 0, angB: 0, etape: MONTAGE.length - 1, tEtape: 0
};
const coupleGrille = phi => { const u = phi / PHI_N; return CN * (0.55 * u + 0.45 * u * u * u); };
const hist = new Float32Array(500); let hIdx = 0, hAcc = 0;
function simuler(dtSim) {
  const DT = 2e-4, n = Math.max(1, Math.round(dtSim / DT)), dt = dtSim / n;
  for (let i = 0; i < n; i++) {
    let cm = 0;
    if (etat.marche) cm = Math.max(-2.4 * C_MOT, Math.min(2.4 * C_MOT, C_MOT * (WS - etat.wm) / (WS - WN)));
    etat.cmF += (cm - etat.cmF) * dt / 0.08; cm = etat.cmF;            // établissement du couple électromagnétique
    const cc = etat.casse ? 0 : coupleGrille(etat.phi) + AMORT * (etat.wm - etat.wl);
    const cr = (etat.charge * C_MOT + etat.choc + (etat.bloc ? 60000 : 0)) * Math.max(-1, Math.min(1, etat.wl / 4)) + 30 * Math.sign(etat.wl);
    etat.wm += (cm - cc - 0.4 * etat.wm) / J_M * dt;
    etat.wl += (cc - cr) / J_L * dt;
    if (etat.bloc && !etat.casse && Math.abs(etat.wl) < 0.5 && Math.abs(cc) < 60000) etat.wl = 0;   // réducteur / convoyeur coincé
    if (!etat.marche && etat.wm < 0.05 && etat.wm > -0.05) etat.wm = 0;
    if (Math.abs(etat.wl) < 0.02 && Math.abs(cc) < 40) etat.wl = 0;
    if (!etat.casse) etat.phi += (etat.wm - etat.wl) * dt;
    etat.cc = cc; if (Math.abs(cc) > etat.pic) etat.pic = Math.abs(cc);
    const cg = Math.abs(coupleGrille(etat.phi));
    if (!etat.casse && cg > 2.5 * CN) { etat.casse = true; etat.pic = Math.max(etat.pic, cg); etat.phi = 0; etat.declenche = 'casse'; dire('RUPTURE DE LA GRILLE : le couple dans la grille (' + fmt(cg) + ' N·m) a dépassé la résistance de la grille. Le réducteur n\'est plus entraîné.'); }
    hAcc += dt; if (hAcc >= 1e-3) { hAcc = 0; hist[hIdx] = cc / CN; hIdx = (hIdx + 1) % hist.length; }
  }
  if (etat.choc > 0) { etat.tChoc -= dtSim; if (etat.tChoc <= 0) etat.choc = 0; }
  // protection moteur : rotor bloqué
  if (etat.marche && etat.wm < 0.3 * WS) { etat.tBloc = (etat.tBloc || 0) + dtSim; if (etat.tBloc > 3) { etat.marche = false; etat.declenche = 'moteur'; dire('Le relais thermique a coupé le moteur (rotor freiné trop longtemps).'); } } else etat.tBloc = 0;
  // usure et échauffement (temps accéléré)
  const fv = Math.abs(etat.wm) / WN, eg = Math.abs(etat.gap - 4) / 1.5;
  const sev = (etat.ang / 0.25) ** 2 + (etat.par / 0.5) ** 2 + eg * eg + (etat.graisse ? 0 : 2.2) + Math.max(0, Math.abs(etat.cc) / CN - 1) * 2;
  if (!etat.casse) etat.usure = Math.min(100, etat.usure + fv * (0.004 + 0.35 * sev) * dtSim);
  const tc = 30 + fv * (6 + 16 * sev);
  etat.temp += (tc - etat.temp) * (1 - Math.exp(-dtSim / 10));
  if (etat.usure >= 100 && !etat.casse) { etat.casse = true; etat.declenche = 'casse'; dire('RUPTURE DE LA GRILLE PAR USURE : barreaux amincis jusqu\'à la cassure. Cause : ' + (etat.graisse ? 'désalignement / écartement hors tolérance.' : 'manque de graisse.')); }
  if (etat.gap < 1.6 && etat.marche) { etat.marche = false; etat.declenche = 'gap'; dire('Écartement trop faible : les faces des moyeux se touchent (frottement, échauffement). Arrêt d\'urgence !'); }
}

// ---------- application à la scène ----------
const EXA_PHI = 5, EXA_ANG = 14, EXA_PAR = 9;
function appliquer(dtR, dtSim) {
  // vitesses visuelles ralenties (kVis) ; torsion visible exagérée
  const kVis = 0.016;
  etat.angA += etat.wm * kVis * dtSim;
  if (etat.casse) etat.angB += etat.wl * kVis * dtSim; else etat.angB = etat.angA - etat.phi * EXA_PHI;
  // défauts d'alignement (machine déplacée)
  alignB.rotation.z = etat.ang * Math.PI / 180 * EXA_ANG;
  alignB.position.set((etat.gap - 4) / 10, -etat.par / 10 * EXA_PAR, 0);
  spinA.rotation.x = spinArbreA.rotation.x = spinCH.rotation.x = spinCB.rotation.x = spinJA.rotation.x = spinJB.rotation.x = spinG.rotation.x = etat.angA;
  spinB.rotation.x = spinArbreB.rotation.x = etat.angB;
  spinSortie.rotation.z = -etat.angB / 20;          // arbre de sortie du réducteur (rapport ≈ 20)
  // vue éclatée + montage
  const k = dtR ? 1 - Math.exp(-dtR * 4) : 1;
  etat.ecl += (etat.eclCible - etat.ecl) * k; if (Math.abs(etat.ecl - etat.eclCible) < 1e-3) etat.ecl = etat.eclCible;
  const e = etat.etape;
  const MO = {
    moyeuA: e < 2 ? [-3, 14, 0] : [0, 0, 0], moyeuB: e < 2 ? [3, 14, 0] : [0, 0, 0],
    joints: e < 8 ? 1 : 0, carterH: e < 8 ? [0, 22, 10] : [0, 0, 0], carterB: e < 8 ? [0, -14, 26] : [0, 0, 0]
  };
  groupes.forEach(G => {
    let mo = [0, 0, 0];
    if (MO[G.id] !== undefined) mo = G.id === 'joints' ? [MO.joints * Math.sign(G.ancre.x) * 5.5, 0, 0] : MO[G.id];
    G.mo.set(...mo); G.moC.lerp(G.mo, k);
    G.g.position.copy(G.base).addScaledVector(G.ex, etat.ecl).add(G.moC);
  });
  // segments de grille : posés un par un à l'étape 6
  for (let j = 0; j < NSEG; j++) {
    const cibleR = e < 6 ? 9 : e === 6 ? (etat.tEtape > 0.35 + j * 0.45 ? 0 : 9) : 0;
    segCible[j] = cibleR; segOff[j] += (cibleR - segOff[j]) * (dtR ? 1 - Math.exp(-dtR * 6) : 1);
  }
  // visibilités
  const fini = e === MONTAGE.length - 1, v = etat.vue;
  gCH.visible = gCB.visible = fini ? v !== 'sanscarter' : e >= 8;
  gJA.visible = gJB.visible = e >= 1 && !(fini && v === 'sanscarter');
  gGrille.visible = e >= 6;
  graisseRain.visible = !fini && e >= 5 && e < 7;
  graissePlein.visible = fini ? v === 'coupe' && etat.graisse && etat.ecl < 0.05 : e >= 7;
  gCale.visible = e === 3; gComp.visible = e === 4;
  if (gGrille.visible) majGrille(etat.angA, etat.angB, etat.casse);
}

// ---------- vues ----------
function majVue(nom) {
  etat.vue = nom;
  document.querySelectorAll('#vues .btn').forEach(b => b.classList.toggle('on', b.dataset.v === nom));
  const cp = nom === 'coupe' ? [coupePlan] : [];
  matsCoupe.forEach(m => { m.clippingPlanes = cp; m.needsUpdate = true; });
  etat.eclCible = nom === 'eclatee' ? 1 : 0;
  cadrer(nom);
}
function basculerRep() { repOn = !repOn; $('#bRep').classList.toggle('on', repOn); }

// ---------- montage ----------
function majMontage() {
  const e = etat.etape, m = MONTAGE[e];
  $('#moT').textContent = m.t; $('#moD').textContent = m.d;
  $('#moListe').innerHTML = MONTAGE.map((x, i) => `<li class="${i < e ? 'fait' : i === e ? 'cour' : ''}">${x.t}</li>`).join('');
  $('#bPrec').disabled = e === 0; $('#bSuiv').disabled = e === MONTAGE.length - 1;
  etat.tEtape = 0;
}
function allerEtape(e) {
  if (etat.marche || etat.wm > 0.5) { $('#moD').textContent = 'Arrêtez et consignez d\'abord le moteur (onglet Marche).'; return; }
  etat.etape = Math.max(0, Math.min(MONTAGE.length - 1, e));
  if (etat.etape === 6 || etat.etape < 6) { etat.casse = false; etat.angB = etat.angA; etat.phi = 0; }
  if (etat.etape < 6) { etat.usure = 0; etat.declenche = ''; }
  if (etat.etape < 4) { etat.ang = 0.03; etat.par = 0.05; etat.gap = 4; majCurseurs(); }
  majMontage();
  if (etat.vue === 'eclatee' || etat.vue === 'normale') majVue('coupe');
  cadrer(etat.etape < MONTAGE.length - 1 ? 'montage' : etat.vue);
}

// ---------- affichage ----------
const fmt = (x, d = 0) => x.toFixed(d).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const gc = $('#graph').getContext('2d');
function courbe() {
  const w = 600, h = 240; gc.clearRect(0, 0, w, h);
  const y = v => h - 6 - Math.max(0, Math.min(2.5, v)) / 2.5 * (h - 12);
  gc.strokeStyle = '#343a41'; gc.lineWidth = 1;
  for (let i = 1; i < 5; i++) { gc.beginPath(); gc.moveTo(0, y(i * 0.5)); gc.lineTo(w, y(i * 0.5)); gc.stroke(); }
  gc.strokeStyle = '#5f6b75'; gc.lineWidth = 2; gc.setLineDash([8, 6]); gc.beginPath(); gc.moveTo(0, y(1)); gc.lineTo(w, y(1)); gc.stroke(); gc.setLineDash([]);
  gc.strokeStyle = '#d9a441'; gc.lineWidth = 3; gc.beginPath();
  for (let i = 0; i < hist.length; i++) { const v = Math.abs(hist[(hIdx + i) % hist.length]), X = i / (hist.length - 1) * w; i ? gc.lineTo(X, y(v)) : gc.moveTo(X, y(v)); }
  gc.stroke();
  gc.fillStyle = '#9aa4ad'; gc.font = '20px sans-serif'; gc.fillText('2,5 × Cn', 6, 22); gc.fillText('1 × Cn', 6, y(1) - 6);
}
let direT = 0;
function dire(t) { const m = $('#msg'); m.textContent = t; m.className = 'msg a'; direT = performance.now(); }
function afficher() {
  const nm = etat.wm * 60 / TAU, nl = etat.wl * 60 / TAU;
  $('#mNm').textContent = fmt(nm) + ' tr/min'; $('#mNl').textContent = fmt(Math.abs(nl)) + ' tr/min';
  $('#mC').textContent = fmt(Math.abs(etat.cc)) + ' N·m'; $('#mU').textContent = fmt(Math.abs(etat.cc) / CN * 100) + ' %';
  $('#mPhi').textContent = fmt(Math.abs(etat.phi) * 180 / Math.PI, 2) + '°';
  $('#mPic').textContent = fmt(etat.pic) + ' N·m';
  $('#mUs').textContent = fmt(etat.usure) + ' %'; $('#mT').textContent = fmt(etat.temp) + ' °C';
  const u = Math.abs(etat.cc) / CN, bar = $('#bar');
  bar.style.width = Math.min(100, u / 2.5 * 100) + '%'; bar.style.background = u > 1.5 ? 'var(--ko)' : u > 1 ? 'var(--acc)' : 'var(--ok)';
  const es = $('#etat');
  if (etat.casse) { es.textContent = 'GRILLE CASSÉE'; es.className = 'alarme'; }
  else if (etat.declenche && !etat.marche) { es.textContent = 'DÉCLENCHÉ'; es.className = 'alarme'; }
  else if (etat.etape < MONTAGE.length - 1) { es.textContent = 'MONTAGE ' + etat.etape + '/9'; es.className = 'bloque'; }
  else if (etat.marche) { es.textContent = 'MARCHE'; es.className = 'marche'; }
  else if (etat.wm > 0.5) { es.textContent = 'ARRÊT…'; es.className = 'bloque'; }
  else { es.textContent = 'ARRÊT'; es.className = 'arret'; }
  if (performance.now() - direT > 7000) {
    const m = $('#msg'); let t, c = 'msg';
    const hors = etat.ang > 0.25 || etat.par > 0.5 || Math.abs(etat.gap - 4) > 0.8, monte = etat.ang > 0.1 || etat.par > 0.2;
    if (etat.etape < MONTAGE.length - 1) { t = 'Montage en cours (onglet Montage) : terminez-le avant de démarrer.'; c = 'msg w'; }
    else if (etat.casse) { t = 'Grille cassée : consigner, ouvrir le carter, chercher la cause, puis « Grille neuve + réaligner ».'; c = 'msg a'; }
    else if (!etat.marche && etat.wm < 0.5) t = 'À l\'arrêt. Appuyez sur « Démarrer ». Essayez ensuite un à-coup, un désalignement ou un manque de graisse.';
    else if (u > 1.2) { t = 'Couple au-dessus du nominal : la grille fléchit beaucoup et le contact se rapproche du jeu (raideur progressive).'; c = 'msg w'; }
    else if (!etat.graisse) { t = 'Manque de graisse : contact métal sur métal, l\'usure et la température montent vite.'; c = 'msg a'; }
    else if (hors) { t = 'Hors tolérances de service : la grille glisse et fléchit à chaque tour → usure rapide, vibration. Réaligner !'; c = 'msg a'; }
    else if (monte) { t = 'Dans les tolérances de service mais pas de montage : la grille durera moins longtemps. Améliorer l\'alignement.'; c = 'msg w'; }
    else t = 'Fonctionnement normal : la grille transmet ' + fmt(Math.abs(etat.cc)) + ' N·m en se tordant de ' + fmt(Math.abs(etat.phi) * 180 / Math.PI, 2) + '° (exagéré ×' + EXA_PHI + ' à l\'écran).';
    m.textContent = t; m.className = c;
  }
  $('#bMarche').classList.toggle('on', etat.marche); $('#bArret').classList.toggle('on', !etat.marche);
  $('#bLent').classList.toggle('on', etat.lent); $('#bPause').classList.toggle('on', etat.pause);
  $('#bGr').classList.toggle('on', !etat.graisse); $('#bBloc').classList.toggle('on', etat.bloc);
}

// ---------- commandes ----------
document.querySelectorAll('#onglets button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#onglets button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === b.dataset.p));
});
document.querySelectorAll('#vues .btn').forEach(b => b.onclick = () => majVue(b.dataset.v));
$('#bRep').onclick = basculerRep;
$('#bCentre').onclick = () => cadrer(etat.etape < MONTAGE.length - 1 ? 'montage' : etat.vue);
$('#bPlein').onclick = () => { $('#app').classList.toggle('plein'); $('#bPlein').classList.toggle('on'); setTimeout(() => { taille(); cadrer(etat.vue); }, 30); };
$('#bMarche').onclick = () => {
  if (etat.etape < MONTAGE.length - 1) { dire('Le montage n\'est pas terminé (onglet Montage).'); return; }
  if (etat.casse) { dire('La grille est cassée : la remplacer d\'abord.'); return; }
  if (etat.gap < 1.6) { dire('Impossible : les moyeux se touchent. Régler l\'écartement.'); return; }
  etat.marche = true; etat.declenche = ''; etat.pause = false; etat.pic = 0;
};
$('#bArret').onclick = () => { etat.marche = false; etat.bloc = false; };
$('#bLent').onclick = () => { etat.lent = !etat.lent; };
$('#bPause').onclick = () => { etat.pause = !etat.pause; };
$('#sCh').oninput = e => { etat.charge = +e.target.value / 100; $('#vCh').textContent = e.target.value + ' %'; };
$('#bChoc').onclick = () => { if (!etat.marche) { dire('Démarrez d\'abord.'); return; } etat.choc = 2.2 * C_MOT; etat.tChoc = 0.25; etat.pic = 0; dire('À-coup : bourrage de 0,25 s (couple résistant + 2,2 × nominal moteur). Regardez la courbe : la grille amortit le choc.'); };
$('#bBloc').onclick = () => { if (!etat.marche) { dire('Démarrez d\'abord.'); return; } etat.bloc = true; etat.pic = 0; dire('Blocage net (convoyeur coincé derrière le réducteur) : toute l\'énergie de rotation du moteur se décharge dans la grille…'); };
function majCurseurs() {
  $('#sAng').value = etat.ang; $('#vAng').textContent = fmt(etat.ang, 2) + '°';
  $('#sPar').value = etat.par; $('#vPar').textContent = fmt(etat.par, 2) + ' mm';
  $('#sGap').value = etat.gap; $('#vGap').textContent = fmt(etat.gap, 1) + ' mm';
}
$('#sAng').oninput = e => { etat.ang = +e.target.value; majCurseurs(); };
$('#sPar').oninput = e => { etat.par = +e.target.value; majCurseurs(); };
$('#sGap').oninput = e => { etat.gap = +e.target.value; majCurseurs(); };
$('#bGr').onclick = () => { etat.graisse = !etat.graisse; dire(etat.graisse ? 'Graisse complétée par les bouchons.' : 'Fuite de graisse (joint usé) : l\'accouplement tourne presque à sec.'); };
$('#bNeuf').onclick = () => {
  if (etat.marche || etat.wm > 0.5) { dire('Arrêter et consigner le moteur avant d\'ouvrir le carter.'); return; }
  Object.assign(etat, { casse: false, usure: 0, phi: 0, wl: 0, ang: 0.03, par: 0.05, gap: 4, graisse: true, declenche: '', bloc: false, pic: 0, temp: 30 });
  etat.angB = etat.angA; majCurseurs(); dire('Grille neuve (6 segments), joints neufs, graisse, alignement refait : 0,05 mm / 0,03° / 4 mm.');
};
$('#bPrec').onclick = () => allerEtape(etat.etape - 1);
$('#bSuiv').onclick = () => allerEtape(etat.etape + 1);
$('#bDebut').onclick = () => allerEtape(0);

// ---------- pages ----------
(function () {
  const t = $('#tPieces');
  t.innerHTML = '<tr><th>N°</th><th>Pièce</th><th>Matière</th></tr>' + PIECES.map(p => `<tr class="lig" data-id="${p.id}"><td class="n">${p.n}</td><td>${p.nom}</td><td>${p.mat}</td></tr>`).join('');
  t.querySelectorAll('tr.lig').forEach(r => r.onclick = () => choisir(r.dataset.id, true));
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
new ResizeObserver(taille).observe(vue); taille(); majVue('coupe'); majMontage(); majCurseurs();
Object.assign(cam, { az: cible.az, el: cible.el, d: cible.d }); cam.c.copy(cible.c);
groupes.forEach(G => G.moC.set(0, 0, 0));
let tPrec = performance.now(), tAff = 0;
function pas(dt) {
  const dtSim = etat.pause ? 0 : dt * (etat.lent ? 0.1 : 1);
  if (dtSim > 0) simuler(dtSim);
  etat.tEtape += dt;
  appliquer(dt, dtSim);
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
window.__etape = allerEtape;
window.__setCam = v => { cible.az = cam.az = v.az; cible.el = cam.el = v.el; cible.d = cam.d = v.d; cible.c.set(...v.c); cam.c.set(...v.c); };
