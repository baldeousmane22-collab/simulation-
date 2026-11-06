// Touret à meuler — 3D model built from the user's section drawing (units = px of the 2x drawing / 100)
import * as THREE from 'three';
import { CLIP, lathe, label, ballBearing, TAU } from './geo.js';
import { wheelLabel, wheelLabelBlur, woodTex, concreteTex } from './realism.js';

const AX = 950;
const X = px => (px - AX) / 100;

// one vivid colour per part (readable on a projector) + name
export const PIECES = {
  1: ['Bâti (corps)', 0x6f86a3], 2: ['Arbre porte-meule', 0xf5c816], 3: ['Roulement à billes (gauche)', 0x2f9e44], 4: ['Roulement à billes (droit)', 0x15aabf],
  5: ['Entretoise', 0xfd7e14], 6: ['Rondelle frein', 0xe03131], 7: ['Écrou à encoches', 0x7048e8], 8: ['Bague (logement du roulement 4)', 0x0ca678], 9: ['Joint plat', 0x111111], 10: ['Couvercle droit', 0x1c7ed6],
  11: ['Carter de protection', 0x74c0fc], 12: ['Poulie à gorges', 0xd6336c], 13: ['Tôle de protection', 0x495057], 14: ['Couvercle gauche', 0x4263eb],
  15: ['Meule', 0x9a9285], 16: ["Joint d'étanchéité", 0x212529], 17: ['Flasques de serrage', 0xa0522d], 18: ['Écrou à encoches (côté poulie)', 0x9775fa], 19: ['Capuchon (cache-écrou)', 0x82c91e], 20: ['Vis de fixation', 0x868e96],
};
export const ROT = new Set([2, 3, 4, 5, 6, 7, 12, 15, 17, 18, 19]);

function sandTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#8c857a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(40,36,30,0.5)' : 'rgba(225,220,210,0.45)'; g.fillRect(Math.random() * 256, Math.random() * 256, 1.6, 1.6); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const hatchCache = {};
export function hatchTex(color, dir = 1) {
  const key = color + '_' + dir; if (hatchCache[key]) return hatchCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#' + new THREE.Color(color).getHexString(); g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(15,20,28,0.5)'; g.lineWidth = 3;
  for (let k = -64; k <= 128; k += 16) { g.beginPath(); if (dir > 0) { g.moveTo(k, 64); g.lineTo(k + 64, 0); } else { g.moveTo(k, 0); g.lineTo(k + 64, 64); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.2, 2.2); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  hatchCache[key] = t; return t;
}

const lineMat = new THREE.LineBasicMaterial({ color: 0x0b0f14 });
function capShapes(g, ptsList, mat) {
  for (const pts of ptsList) {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)), mat); m.position.z = 0.003; g.add(m);
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, 0.006))), lineMat));
  }
}
function capMaterial(color, dir, hatch) {
  return new THREE.MeshStandardMaterial({ color: hatch ? 0xffffff : color, map: hatch ? hatchTex(color, dir) : null, metalness: 0.05, roughness: 0.8, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
}
function bodyMat(color, metal = 0.35) {
  return new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: 0.45, clippingPlanes: CLIP, side: THREE.DoubleSide });
}

export function buildTouret(root) {
  const parts = {};
  const capsList = [];
  const BASE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 3.25);      // semelle plate du bâti (y ≥ −3,25)
  const CLIPB = [CLIP[0], BASE];

  function add(num, prof, opt = {}) {
    const col = PIECES[num] ? PIECES[num][1] : (opt.color || 0x9aa4b1);
    const mat = opt.mat || bodyMat(col, opt.metal);
    if (opt.base) mat.clippingPlanes = CLIPB;
    const pts = prof.map(([xp, r]) => [r, X(xp)]);
    const m = lathe(pts, mat, opt.segs || 96);
    const spin = new THREE.Group(); m.rotation.z = -Math.PI / 2; spin.add(m);
    const holder = new THREE.Group(); holder.add(spin);
    const hatch = opt.hatch !== false;
    const cm = capMaterial(col, opt.dir || 1, hatch);
    if (opt.base) cm.clippingPlanes = [BASE];
    const cap = new THREE.Group(); cap.userData.isCap = true;
    capShapes(cap, [1, -1].map(s => prof.map(([xp, r]) => new THREE.Vector2(X(xp), s * r))), cm);
    holder.add(cap); capsList.push(cap);
    root.add(holder);
    const key = opt.key || num;
    parts[key] = { col: opt.color, g: holder, spin, rot: opt.rot !== undefined ? opt.rot : ROT.has(num), dx: opt.dx || 0, dy: opt.dy || 0, num: PIECES[num] ? num : null, mats: [mat], capMats: [cm], hatch, dir: opt.dir || 1, extras: [] };
    return parts[key];
  }
  const smallMat = (col, metal = 0.5) => new THREE.MeshStandardMaterial({ color: col, metalness: metal, roughness: 0.4, clippingPlanes: CLIP, side: THREE.DoubleSide });

  // ---------------------------------------------------------------- 2 — arbre porte-meule (cotes relevées sur le dessin)
  const shaft = add(2, [[80, 0], [80, 0.70], [350, 0.70], [350, 1.10], [493, 1.10], [493, 1.28], [533, 1.28], [533, 1.13], [727, 1.13], [742, 0.88],
    [1028, 0.88], [1043, 1.08], [1203, 1.08], [1203, 0.86], [1300, 0.86], [1300, 0.68], [1507, 0.68], [1507, 0.58], [1785, 0.58], [1785, 0]], { hatch: false });
  // filetage visible sous l'écrou 7 (côté libre)
  for (let k = 0; k < 5; k++) {
    const tr = new THREE.Mesh(new THREE.TorusGeometry(0.862, 0.012, 6, 64), smallMat(0x8a6d00, 0.3)); tr.rotation.y = Math.PI / 2; tr.position.x = X(1262 + k * 6); shaft.spin.add(tr);
  }
  // clavette de la poulie (sans repère) : logée dans la rainure de l'arbre
  { const km = smallMat(0x5c940d); const key = new THREE.Mesh(new THREE.BoxGeometry(X(1687) - X(1533), 0.42, 0.3), km);
    key.position.set((X(1533) + X(1687)) / 2, 0.64, 0); shaft.spin.add(key); shaft.mats.push(km);
    const kc = new THREE.Group(); kc.userData.isCap = true; capShapes(kc, [[new THREE.Vector2(X(1533), 0.43), new THREE.Vector2(X(1687), 0.43), new THREE.Vector2(X(1687), 0.85), new THREE.Vector2(X(1533), 0.85)]], capMaterial(0x6c7076, 1, false)); shaft.g.add(kc); capsList.push(kc); }

  // ---------------------------------------------------------------- 5 — entretoise
  add(5, [[653, 1.13], [653, 1.35], [1097, 1.35], [1097, 1.13], [653, 1.13]], { dir: -1 });

  // ---------------------------------------------------------------- écrou à encoches (type KM) + rondelle frein (type MB)
  // Utilisé aux 3 endroits du dessin : 6/7 (roulement 4), côté poulie (18) et côté meule (sans repère).
  // x0w..x1w : rondelle ; x1w..x2 : écrou si side=+1 (rondelle avant l'écrou) — si side=-1 l'écrou est à gauche de la rondelle.
  function lockSet({ nutKey, nutNum, washKey, washNum, nutCol, washCol, xa, xb, xw, ri, R, Rw, side, dxN, dxW, lugR }) {
    // xa..xb : écrou ; xw : face libre de la rondelle (la rondelle va de xw à la face de l'écrou)
    const nd = R * 0.16, nw = R * 0.11;
    const sh = new THREE.Shape(); const steps = 192; const ang = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
    for (let i = 0; i <= steps; i++) {
      const a = i / steps * TAU; let rr = R;
      for (const c of ang) { const da = Math.atan2(Math.sin(a - c), Math.cos(a - c)); if (Math.abs(da) * R < nw) rr = R - nd; }
      if (i === 0) sh.moveTo(rr, 0); else sh.lineTo(rr * Math.cos(a), rr * Math.sin(a));
    }
    const hole = new THREE.Path(); hole.absarc(0, 0, ri, 0, TAU, true); sh.holes.push(hole);
    const w = X(xb) - X(xa);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: w - 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 64 });
    const mN = bodyMat(nutCol, 0.6);
    const mesh = new THREE.Mesh(geo, mN); mesh.castShadow = true;
    mesh.rotation.y = Math.PI / 2; mesh.position.x = X(xa) + 0.02;
    // chanfreins de la face d'appui (petit anneau sombre = filetage visible dans l'alésage)
    const spin = new THREE.Group(); spin.add(mesh);
    for (let k = 0; k < Math.max(3, Math.round(w / 0.08)); k++) {
      const tr = new THREE.Mesh(new THREE.TorusGeometry(ri + 0.005, 0.012, 6, 64), smallMat(0x2b2b3a, 0.4)); tr.rotation.y = Math.PI / 2; tr.position.x = X(xa) + 0.04 + k * 0.08; if (tr.position.x < X(xb) - 0.02) spin.add(tr);
    }
    const holder = new THREE.Group(); holder.add(spin); root.add(holder);
    const cmN = capMaterial(nutCol, -1, true); const capN = new THREE.Group(); capN.userData.isCap = true;
    capShapes(capN, [[new THREE.Vector2(X(xa), ri), new THREE.Vector2(X(xb), ri), new THREE.Vector2(X(xb), R - nd), new THREE.Vector2(X(xa), R - nd)],
                     [new THREE.Vector2(X(xa), -ri), new THREE.Vector2(X(xb), -ri), new THREE.Vector2(X(xb), -R), new THREE.Vector2(X(xa), -R)]], cmN);
    holder.add(capN); capsList.push(capN);
    parts[nutKey] = { col: nutCol, g: holder, spin, rot: true, dx: dxN, dy: 0, num: nutNum || null, mats: [mN], capMats: [cmN], hatch: true, dir: -1, extras: [] };

    // rondelle frein
    const xf = side > 0 ? xa : xb;                 // face de l'écrou contre la rondelle
    const w0 = Math.min(xw, xf), w1 = Math.max(xw, xf);
    const t = X(w1) - X(w0);
    const mW = bodyMat(washCol, 0.5);
    const ring = lathe([[ri, X(w0)], [Rw, X(w0)], [Rw, X(w1)], [ri, X(w1)], [ri, X(w0)]], mW, 96); ring.rotation.z = -Math.PI / 2;
    const sp = new THREE.Group(); sp.add(ring);
    // languette intérieure : engagée dans la rainure de l'arbre (en bas)
    const tabIn = new THREE.Mesh(new THREE.BoxGeometry(t, 0.14, Math.max(0.14, ri * 0.22)), mW); tabIn.position.set((X(w0) + X(w1)) / 2, -(ri - 0.06), 0); sp.add(tabIn);
    // languette rabattue dans l'encoche du haut de l'écrou
    const xe = side > 0 ? xa + (xb - xa) * 0.85 : xb - (xb - xa) * 0.85;
    const bx0 = Math.min(X(w0), X(xe)), bx1 = Math.max(X(w1), X(xe));
    const bent = new THREE.Mesh(new THREE.BoxGeometry(bx1 - bx0, t, nw * 1.6), mW); bent.position.set((bx0 + bx1) / 2, R - nd + t / 2 + 0.01, 0); sp.add(bent);
    // languettes extérieures non rabattues
    if (lugR) for (const a of [Math.PI / 3, 2 * Math.PI / 3, Math.PI, 4 * Math.PI / 3, 5 * Math.PI / 3, 0]) {
      const lug = new THREE.Mesh(new THREE.BoxGeometry(t, lugR - Rw + 0.1, 0.24), mW); const h = new THREE.Group(); h.rotation.x = a; lug.position.set((X(w0) + X(w1)) / 2, (lugR + Rw) / 2 - 0.05, 0); h.add(lug); sp.add(h);
    }
    const hW = new THREE.Group(); hW.add(sp); root.add(hW);
    const cmW = capMaterial(washCol, 1, false); const capW = new THREE.Group(); capW.userData.isCap = true;
    const T = R - nd + t + 0.01, H = Math.max(Rw, T); const xn = side > 0 ? w1 : w0, xo = side > 0 ? w0 : w1;
    const top = [new THREE.Vector2(X(xo), ri), new THREE.Vector2(X(xn), ri), new THREE.Vector2(X(xn), R - nd), new THREE.Vector2(X(xe), R - nd), new THREE.Vector2(X(xe), T), new THREE.Vector2(X(xn), T), new THREE.Vector2(X(xn), H), new THREE.Vector2(X(xo), H)];
    capShapes(capW, [top, [new THREE.Vector2(X(w0), -ri + 0.12), new THREE.Vector2(X(w1), -ri + 0.12), new THREE.Vector2(X(w1), -Rw), new THREE.Vector2(X(w0), -Rw)]], cmW);
    hW.add(capW); capsList.push(capW);
    parts[washKey] = { col: washCol, g: hW, spin: sp, rot: true, dx: dxW, dy: 0, num: washNum || null, mats: [mW], capMats: [cmW], hatch: false, dir: 1, extras: [] };
  }
  // 6 + 7 : contre le roulement 4 (rondelle 1203–1212, écrou 1212–1257)
  lockSet({ nutKey: 7, nutNum: 7, washKey: 6, washNum: 6, nutCol: PIECES[7][1], washCol: PIECES[6][1], xa: 1212, xb: 1257, xw: 1203, ri: 0.86, R: 1.40, Rw: 1.42, side: 1, dxN: 1.5, dxW: 1.2, lugR: 1.62 });

  // ---------------------------------------------------------------- 3 & 4 — roulements à billes
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xf1f3f5, metalness: 1.0, roughness: 0.12 });
  const cageMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.85, roughness: 0.35, clippingPlanes: CLIP });
  const mkBearing = (num, d, D, B, xpx) => {
    const col = PIECES[num][1];
    const om = bodyMat(col, 0.55), im = bodyMat(col, 0.55);
    const b = ballBearing({ d, D, B, n: 9, cut: true, ballMat, cageMat, outerMat: om, innerMat: im });
    const g = new THREE.Group(); b.grp.rotation.z = Math.PI / 2; g.add(b.grp); g.position.x = X(xpx); root.add(g);
    const cm = capMaterial(col, num === 3 ? 1 : -1, true);
    const cap = new THREE.Group(); cap.userData.isCap = true;
    const lists = [];
    for (const prof of [b.profOuter, b.profInner]) for (const s of [1, -1]) lists.push(prof.map(([r, y]) => new THREE.Vector2(-y, s * r)));
    capShapes(cap, lists, cm); g.add(cap); capsList.push(cap);
    parts[num] = { g, bearing: b, rot: true, dx: 0, dy: 0, num, mats: [om, im], capMats: [cm], hatch: true, dir: num === 3 ? 1 : -1, extras: [] };
  };
  mkBearing(3, 2.26, 5.30, 1.20, 593);
  mkBearing(4, 2.16, 4.70, 1.06, 1150);

  // ---------------------------------------------------------------- 1 — bâti (semelle plate en bas)
  add(1, [[463, 2.65], [463, 4.02], [700, 4.02], [800, 3.25], [975, 3.25], [1065, 4.02], [1283, 4.02], [1283, 2.62], [1057, 2.62], [1045, 2.82],
          [740, 2.82], [715, 2.65], [463, 2.65]], { metal: 0.45, base: true });
  const bodyM = parts[1].mats[0];
  { // semelle + patins
    const footM = bodyMat(PIECES[1][1], 0.45);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(X(1393) - X(430), 0.7, 4.8), footM); foot.position.set((X(1393) + X(430)) / 2, -2.9, 0); foot.castShadow = true; foot.receiveShadow = true;
    parts[1].g.add(foot); parts[1].mats.push(footM);
    for (const [a, b2] of [[440, 687], [1027, 1385]]) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(X(b2) - X(a), 0.33, 4.8), footM); pad.position.set((X(a) + X(b2)) / 2, -3.415, 0); pad.castShadow = true; parts[1].g.add(pad);
    }
    const cf = new THREE.Group(); cf.userData.isCap = true;
    capShapes(cf, [[new THREE.Vector2(X(430), -3.25), new THREE.Vector2(X(1393), -3.25), new THREE.Vector2(X(1393), -2.55), new THREE.Vector2(X(430), -2.55)],
                   [new THREE.Vector2(X(440), -3.58), new THREE.Vector2(X(687), -3.58), new THREE.Vector2(X(687), -3.25), new THREE.Vector2(X(440), -3.25)],
                   [new THREE.Vector2(X(1027), -3.58), new THREE.Vector2(X(1385), -3.58), new THREE.Vector2(X(1385), -3.25), new THREE.Vector2(X(1027), -3.25)]], parts[1].capMats[0]);
    parts[1].g.add(cf); capsList.push(cf);
    // vis de fixation sur l'établi (sans repère)
    for (const xp of [560, 1210]) for (const z of [1.7, -1.7]) {
      const bm = smallMat(0x495057, 0.8);
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.3, 16), bm); bolt.position.set(X(xp), -3.2, z);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 6), bm); head.position.set(X(xp), -2.46, z);
      parts[1].g.add(bolt, head);
    }
  }
  // établi (support, sans repère)
  const bench = new THREE.Mesh(new THREE.BoxGeometry(X(1420) - X(400), 1.87, 6.4), new THREE.MeshStandardMaterial({ color: 0x3d4247, metalness: 0.5, roughness: 0.55 }));
  bench.position.set((X(1420) + X(400)) / 2, -4.515, 0); bench.receiveShadow = true; bench.castShadow = true; root.add(bench);
  // décor d'atelier (masqué en réalité augmentée) : établi en bois sur pieds acier, sol en béton
  const decor = new THREE.Group(); root.add(decor);
  { const top = new THREE.Mesh(new THREE.BoxGeometry(72, 2.4, 34), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75, metalness: 0 }));
    woodTex.repeat.set(1.5, 1); top.position.set(0.6, -5.45 - 1.2, -6); top.receiveShadow = true; decor.add(top);
    const steel = new THREE.MeshStandardMaterial({ color: 0x3b4046, metalness: 0.6, roughness: 0.5 });
    for (const x of [-33, 34]) for (const z of [-21, 9]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 46, 2.2), steel); leg.position.set(x + 0.6, -5.45 - 2.4 - 23, z); decor.add(leg); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(70, 2.2, 1.6), steel); rail.position.set(0.6, -5.45 - 3.6, 9.6); decor.add(rail);
    concreteTex.repeat.set(10, 10);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -5.45 - 48.4; floor.receiveShadow = true; decor.add(floor); }


  // ---------------------------------------------------------------- 8 — bague (logement du roulement 4, épaulement C)
  add(8, [[1057, 2.05], [1057, 2.62], [1283, 2.62], [1283, 2.35], [1097, 2.35], [1097, 2.05], [1057, 2.05]], { dir: -1 });

  // ---------------------------------------------------------------- 13 — tôle de protection (serrée entre 14 et le bâti)
  add(13, [[447, 2.65], [447, 4.02], [463, 4.02], [463, 2.65], [447, 2.65]], { hatch: false, metal: 0.3, base: true, dy: 0 });
  { const m = parts[13].mats[0]; const tab = new THREE.Mesh(new THREE.BoxGeometry(X(463) - X(447), 1.15, 1.8), smallMat(PIECES[13][1], 0.3)); tab.position.set((X(447) + X(463)) / 2, 4.58, 0); tab.castShadow = true;
    parts[13].g.add(tab); parts[13].dy = 0.9; }

  // ---------------------------------------------------------------- 14 — couvercle gauche, 16 — joint
  add(14, [[377, 1.12], [377, 4.0], [447, 4.0], [447, 2.62], [507, 2.62], [507, 2.2], [460, 2.2], [460, 1.58], [407, 1.58], [407, 1.12], [377, 1.12]], { dx: -2.2, dir: -1, base: true });
  add(16, [[407, 1.10], [407, 1.58], [450, 1.58], [450, 1.10], [407, 1.10]], { dx: -3.0, hatch: false, metal: 0.05 });
  { // marquage "X" du joint (comme sur le dessin)
    const jx = new THREE.Group(); jx.userData.isCap = true;
    const pts = [[407, 1.10, 450, 1.58], [407, 1.58, 450, 1.10]].flatMap(([a, b, c, dd]) => [new THREE.Vector3(X(a), b, 0.01), new THREE.Vector3(X(c), dd, 0.01), new THREE.Vector3(X(a), -b, 0.01), new THREE.Vector3(X(c), -dd, 0.01)]);
    jx.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff }))); parts[16].g.add(jx); capsList.push(jx);
  }

  // ---------------------------------------------------------------- 9 — joint plat, 10 — couvercle droit (+ 2e joint)
  add(9, [[1283, 2.32], [1283, 4.02], [1290, 4.02], [1290, 2.32], [1283, 2.32]], { dx: 2.3, hatch: false, metal: 0.05, base: true });
  add(10, [[1203, 1.55], [1203, 2.32], [1290, 2.32], [1290, 4.0], [1393, 4.0], [1393, 0.72], [1363, 0.72], [1363, 1.22], [1317, 1.22], [1317, 1.55], [1203, 1.55]], { dx: 2.6, dir: -1, base: true });
  add(16, [[1317, 0.70], [1317, 1.22], [1363, 1.22], [1363, 0.70], [1317, 0.70]], { key: '16b', dx: 3.2, hatch: false, metal: 0.05 });
  parts['16b'].num = 16;

  // ---------------------------------------------------------------- vis : gauche (sans repère, même vis que 20) et 20 (droite)
  const screw = (xp, rr, dirx, key, dx, len) => {
    const m = smallMat(PIECES[20][1], 0.9); const s = new THREE.Group();
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 24), m); head.rotation.z = Math.PI / 2;
    const hexm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 6), smallMat(0x212529, 0.5)); hexm.rotation.z = Math.PI / 2; hexm.position.x = -dirx * 0.01;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, len, 16), m); body.rotation.z = Math.PI / 2; body.position.x = dirx * (len / 2 + 0.2);
    s.add(head, hexm, body); s.position.set(X(xp), rr, 0); root.add(s);
    parts[key] = { g: s, rot: false, dx, dy: 0, num: 20, mats: [m], capMats: [], extras: [] };
  };
  screw(1373, 3.6, -1, 20, 2.6, 3.1);
  screw(387, 3.28, 1, 'vg', -2.2, 2.5);

  // ---------------------------------------------------------------- 12 — poulie à 2 gorges
  add(12, [[1420, 0.58], [1420, 2.58], [1447, 2.58], [1493, 1.85], [1543, 2.58], [1573, 2.58], [1620, 1.85], [1667, 2.58], [1700, 2.58], [1700, 0.58], [1420, 0.58]], { dx: 3.4, segs: 128, dir: -1 });
  // côté poulie : rondelle frein (sans repère) + 18 écrou à encoches + 19 capuchon
  lockSet({ nutKey: 18, nutNum: 18, washKey: 'rp', washNum: 0, nutCol: PIECES[18][1], washCol: 0xe03131, xa: 1707, xb: 1760, xw: 1700, ri: 0.58, R: 0.95, Rw: 0.97, side: 1, dxN: 4.4, dxW: 4.0 });
  add(19, [[1700, 1.05], [1700, 1.12], [1788, 1.12], [1800, 1.0], [1803, 0.0], [1796, 0.0], [1793, 0.98], [1783, 1.05], [1700, 1.05]], { dx: 5.0, hatch: false });

  // ---------------------------------------------------------------- 11 — carter (tôle, moitié haute + flasque d'extrémité)
  { const cm = new THREE.MeshStandardMaterial({ color: PIECES[11][1], metalness: 0.2, roughness: 0.4, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: CLIP });
    const len = X(1827) - X(1353);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, len, 64, 1, true, 0, Math.PI), cm); shell.rotation.z = Math.PI / 2;
    const endc = new THREE.Mesh(new THREE.CircleGeometry(3.05, 48, -0.17, Math.PI + 0.34), cm); endc.rotation.y = Math.PI / 2; endc.position.x = len / 2;
    const g = new THREE.Group(); g.add(shell, endc); g.position.set((X(1353) + X(1827)) / 2, 0, 0); root.add(g);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(3.05, 3.05, len, 32, 1, true, 0, Math.PI), 30), new THREE.LineBasicMaterial({ color: 0x1971c2 }));
    edge.rotation.z = Math.PI / 2; g.add(edge);
    const capc = new THREE.Group(); capc.userData.isCap = true;
    capShapes(capc, [[new THREE.Vector2(X(1353), 3.0), new THREE.Vector2(X(1820), 3.0), new THREE.Vector2(X(1820), -0.5), new THREE.Vector2(X(1827), -0.5), new THREE.Vector2(X(1827), 3.06), new THREE.Vector2(X(1353), 3.06)]], capMaterial(0x1971c2, 1, false));
    g.add(capc); capc.position.x = -(X(1353) + X(1827)) / 2; capsList.push(capc);
    parts[11] = { g, rot: false, dx: 0, dy: 2.5, num: 11, mats: [cm], capMats: [], extras: [] }; }

  // ---------------------------------------------------------------- 15 — meule, 17 — flasques, bague de centrage
  const sand = new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 0.95, metalness: 0.0, clippingPlanes: CLIP, side: THREE.DoubleSide });
  sand.bumpMap = sand.map; sand.bumpScale = 1.2;
  add(15, [[223, 0.78], [223, 5.4], [293, 5.4], [293, 0.78], [223, 0.78]], { mat: sand, dx: -4.2, segs: 128, hatch: false });
  { const mk = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0, clippingPlanes: CLIP, side: THREE.DoubleSide, transparent: true, depthWrite: false });
    const lm = mk(wheelLabel(2.5, 3.7)), lb = mk(wheelLabelBlur(2.5, 3.7)); lb.opacity = 0;
    for (const [xp, sgn] of [[223, -1], [293, 1]]) for (const [m, off] of [[lm, 0.006], [lb, 0.009]]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.5, 3.7, 96, 1), m); ring.rotation.y = sgn * Math.PI / 2; ring.position.x = X(xp) + sgn * off; parts[15].spin.add(ring); }
    parts[15].labelMats = [lm, lb]; }
  add(0, [[213, 0.70], [213, 0.78], [303, 0.78], [303, 0.70], [213, 0.70]], { key: 'bc', dx: -4.2, color: 0xf8f9fa, hatch: false, rot: true });
  add(17, [[173, 0.70], [173, 1.75], [200, 2.48], [223, 2.48], [223, 0.95], [213, 0.95], [213, 0.70], [173, 0.70]], { dx: -5.0, dir: -1 });
  add(17, [[293, 0.95], [293, 2.48], [316, 2.48], [350, 1.75], [350, 0.70], [303, 0.70], [303, 0.95], [293, 0.95]], { key: '17b', dx: -3.4, dir: -1 });
  parts['17b'].num = 17;
  // côté meule (sans repère) : rondelle frein + écrou à encoches (même montage qu'à l'autre bout) + capuchon
  lockSet({ nutKey: 'em', nutNum: 0, washKey: 'rm', washNum: 0, nutCol: 0x7048e8, washCol: 0xe03131, xa: 103, xb: 163, xw: 173, ri: 0.70, R: 1.16, Rw: 1.15, side: -1, dxN: -5.8, dxW: -5.4 });
  add(0, [[63, 0.0], [63, 1.0], [75, 1.25], [167, 1.28], [167, 1.21], [80, 1.18], [70, 0.95], [70, 0.0], [63, 0.0]], { key: 'cm', dx: -6.4, color: 0x82c91e, hatch: false, rot: true });

  // ---------------------------------------------------------------- repères
  const labs = new THREE.Group(); root.add(labs);
  const LP = {
    1: [-0.5, 4.6], 2: [0.6, 0.0, 1.4], 3: [X(593), 3.25, 1.2], 4: [X(1150), 1.75, 1.2], 5: [-0.9, 1.75, 1.2], 6: [2.55, -2.0, 1.2], 7: [2.85, 1.3, 1.3], 8: [1.35, 3.05, 1.2],
    9: [X(1287), 4.6], 10: [4.35, -2.85, 1.0], 11: [6.6, 3.65], 12: [6.9, -3.0, 1.0], 13: [X(455), 5.6], 14: [-5.6, -2.9, 1.0], 15: [-6.9, 6.1],
    16: [-4.85, -1.55, 1.4], 17: [-7.7, -3.0, 1.0], 18: [8.2, -1.55, 1.0], 19: [9.15, 1.75, 0.8], 20: [X(1373) + 0.3, 4.45],
  };
  const labelObjs = {};
  for (const [k, v] of Object.entries(LP)) {
    const col = '#' + new THREE.Color(PIECES[k][1]).getHexString();
    const dark = [2, 15, 19, 11, 20].includes(+k);
    const l = label(String(k), { fs: 64, scale: window.LABEL_SCALE || 1.3, bg: col, color: dark ? '#0f2741' : '#ffffff', border: '#ffffff' });
    l.position.set(v[0], v[1], v[2] || 0.3); l.userData.num = +k; labs.add(l); labelObjs[k] = l;
  }
  return { parts, capsList, labs, labelObjs, BASE, decor };
}
