// Geometry & material helpers shared by all scenes
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

// the global section plane: keeps z <= constant. constant = 1e4 → no cut
export const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e4);
export const CLIP = [clipPlane];

const std = (o) => new THREE.MeshStandardMaterial(o);
export const M = {
  steel: (c) => std({ color: 0xc9cfd6, metalness: 0.95, roughness: 0.22, clippingPlanes: c ? CLIP : null, side: c ? THREE.DoubleSide : THREE.FrontSide }),
  steelDark: (c) => std({ color: 0x8d96a3, metalness: 0.9, roughness: 0.35, clippingPlanes: c ? CLIP : null, side: c ? THREE.DoubleSide : THREE.FrontSide }),
  ball: (c) => std({ color: 0xe8edf2, metalness: 1.0, roughness: 0.08, clippingPlanes: c ? CLIP : null }),
  cage: (c) => std({ color: 0xd4a017, metalness: 0.85, roughness: 0.35, clippingPlanes: c ? CLIP : null }),
  bronze: (c) => std({ color: 0xcd7f32, metalness: 0.85, roughness: 0.35, clippingPlanes: c ? CLIP : null, side: THREE.DoubleSide }),
  blue: (c) => std({ color: 0x2f7fd8, metalness: 0.35, roughness: 0.4, clippingPlanes: c ? CLIP : null, side: c ? THREE.DoubleSide : THREE.FrontSide }),
  lblue: (c) => std({ color: 0x4dabf7, metalness: 0.6, roughness: 0.3, clippingPlanes: c ? CLIP : null, side: c ? THREE.DoubleSide : THREE.FrontSide }),
  yellow: (c) => std({ color: 0xf2c12e, metalness: 0.3, roughness: 0.45, clippingPlanes: c ? CLIP : null, side: c ? THREE.DoubleSide : THREE.FrontSide }),
  orange: (c) => std({ color: 0xf08c00, metalness: 0.3, roughness: 0.45, clippingPlanes: c ? CLIP : null, side: c ? THREE.DoubleSide : THREE.FrontSide }),
  housing: (c) => std({ color: 0x9aa4b1, metalness: 0.55, roughness: 0.55, side: THREE.DoubleSide, clippingPlanes: c ? CLIP : null }),
  purple: (c) => std({ color: 0xa24bb8, metalness: 0.2, roughness: 0.5, side: THREE.DoubleSide, clippingPlanes: c ? CLIP : null }),
  red: () => std({ color: 0xe03131, metalness: 0.2, roughness: 0.4, emissive: 0x400000 }),
  redPart: (c) => std({ color: 0xe03131, metalness: 0.3, roughness: 0.45, side: THREE.DoubleSide, clippingPlanes: c ? CLIP : null }),
  cut: () => std({ color: 0xe8553d, metalness: 0.1, roughness: 0.7, side: THREE.DoubleSide }),
  wood: (c) => std({ color: 0xc8955a, metalness: 0.0, roughness: 0.85, side: c ? THREE.DoubleSide : THREE.FrontSide, clippingPlanes: c ? CLIP : null }),
  woodDark: (c) => std({ color: 0x9a6b3c, metalness: 0.0, roughness: 0.9, side: c ? THREE.DoubleSide : THREE.FrontSide, clippingPlanes: c ? CLIP : null }),
  rubber: (c) => std({ color: 0x2b2b2b, metalness: 0.1, roughness: 0.8, clippingPlanes: c ? CLIP : null }),
};

export function lathe(pts, mat, segs = 96, phi0 = 0, phiLen = TAU) {
  const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), segs, phi0, phiLen);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}

// section caps: closed profile (r, y) of a lathe part around the X axis (world), drawn in plane z = 0
export function capsFor(profile, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: color || 0xe8553d, metalness: 0.1, roughness: 0.7, side: THREE.DoubleSide });
  for (const s of [1, -1]) {
    const sh = new THREE.Shape(profile.map(p => new THREE.Vector2(p[1], s * p[0])));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat); m.position.z = 0.002; g.add(m);
  }
  g.userData.isCap = true;
  return g;
}

// lathe around world X axis (profile is (r, x))
export function latheX(pts, mat, segs = 96) {
  const m = lathe(pts, mat, segs); const g = new THREE.Group(); m.rotation.z = -Math.PI / 2; g.add(m); g.userData.mesh = m; return g;
}

export function label(text, opts = {}) {
  const fs = opts.fs || 44, pad = 18;
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const font = `bold ${fs}px "Segoe UI", Roboto, "DejaVu Sans", Arial, sans-serif`;
  g.font = font;
  const lines = text.split('\n'); const tw = Math.max(...lines.map(l => g.measureText(l).width));
  c.width = Math.ceil(tw + pad * 2); c.height = Math.ceil(lines.length * fs * 1.25 + pad * 1.6);
  g.font = font;
  g.fillStyle = opts.bg || 'rgba(255,255,255,0.94)'; g.beginPath(); g.roundRect(2, 2, c.width - 4, c.height - 4, 16); g.fill();
  g.lineWidth = 4; g.strokeStyle = opts.border || '#f2a900'; g.stroke();
  g.fillStyle = opts.color || '#0f2741'; g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, pad, pad * 0.8 + i * fs * 1.25));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  const k = (opts.scale || 1) * 0.0042 * 1.45; s.scale.set(c.width * k, c.height * k, 1); s.renderOrder = 999;
  s.userData.isLabel = true;
  return s;
}

export function arrow(color, len = 1.6, rad = 0.07) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 });
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 24), mat); sh.position.y = len / 2 + 0.3;
  const hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, 0.36, 32), mat); hd.position.y = 0.18; hd.rotation.x = Math.PI;
  g.add(sh, hd); g.traverse(o => o.castShadow = true);
  return g; // tip at origin, pointing −Y
}

export function thickLine(p1, p2, color, r = 0.035) {
  const v = new THREE.Vector3().subVectors(p2, p1); const len = v.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true }));
  m.position.copy(p1).add(p2).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); m.renderOrder = 998; return m;
}

// ------------------------------------------------------------------ deep groove ball bearing (axis = local Y)
export function ballBearing(o = {}) {
  const d = o.d || 1.0, D = o.D || 2.0, B = o.B || 0.6, c = !!o.cut;
  const Dp = (d + D) / 2, Db = o.Db || Dp * 0.25, n = o.n || 9;
  const grp = new THREE.Group();
  const ro = [], ri = [];
  {
    const rI = Dp / 2 + Db * 0.36, rO = D / 2, h = B / 2, ch = 0.03, gr = Db * 0.5, depth = Db * 0.14;
    const p = [[rI + ch, -h], [rO - ch, -h], [rO, -h + ch], [rO, h - ch], [rO - ch, h], [rI + ch, h], [rI, h - ch], [rI, gr * 0.95]];
    for (let i = 0; i <= 18; i++) { const a = Math.PI / 2 - Math.PI * i / 18; p.push([rI + Math.cos(a) * depth, gr * 0.95 * Math.sin(a)]); }
    p.push([rI, -gr * 0.95], [rI, -h + ch], [rI + ch, -h]);
    ro.push(...p);
  }
  {
    const rI = d / 2, rO = Dp / 2 - Db * 0.36, h = B / 2, ch = 0.03, gr = Db * 0.5, depth = Db * 0.14;
    const p = [[rI + ch, -h], [rO - ch, -h], [rO, -h + ch], [rO, -gr * 0.95]];
    for (let i = 0; i <= 18; i++) { const a = -Math.PI / 2 + Math.PI * i / 18; p.push([rO - Math.cos(a) * depth, gr * 0.95 * Math.sin(a)]); }
    p.push([rO, gr * 0.95], [rO, h - ch], [rO - ch, h], [rI + ch, h], [rI, h - ch], [rI, -h + ch], [rI + ch, -h]);
    ri.push(...p);
  }
  const outer = lathe(ro, o.outerMat || M.steel(c), 128);
  const inner = lathe(ri, o.innerMat || M.steel(c), 128);
  const cage = new THREE.Group(); const balls = [];
  const bm = o.ballMat || M.ball(c);
  for (let i = 0; i < n; i++) {
    const holder = new THREE.Group(); holder.rotation.y = i / n * TAU;
    const b = new THREE.Mesh(new THREE.SphereGeometry(Db / 2, 40, 28), bm);
    b.position.x = Dp / 2; b.castShadow = true; holder.add(b); cage.add(holder); balls.push(b);
    if (o.stripe) b.add(new THREE.Mesh(new THREE.TorusGeometry(Db / 2 * 1.002, Db * 0.04, 8, 40), new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.4, clippingPlanes: c ? CLIP : null })));
  }
  const cm = o.cageMat || M.cage(c);
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(Dp / 2, Db * 0.07, 10, 128), cm);
    ring.rotation.x = Math.PI / 2; ring.position.y = s * Db * 0.42; ring.castShadow = true; cage.add(ring);
  }
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n * TAU;
    const rv = new THREE.Mesh(new THREE.CylinderGeometry(Db * 0.07, Db * 0.07, Db * 0.84, 12), cm);
    rv.position.set(Math.cos(a) * Dp / 2, 0, -Math.sin(a) * Dp / 2); cage.add(rv);
  }
  grp.add(outer, inner, cage);
  return { grp, outer, inner, cage, balls, Dp, Db, d, D, B, profOuter: ro, profInner: ri,
    set(thI, thO) {
      inner.rotation.y = thI; outer.rotation.y = thO;
      const thC = (thI * (Dp - Db) + thO * (Dp + Db)) / (2 * Dp);
      cage.rotation.y = thC;
      const spin = (thC - thO) * (Dp + Db) / Db;
      balls.forEach(b => { b.rotation.z = -spin; });
    } };
}

// ------------------------------------------------------------------ tapered roller bearing (axis = local Y)
export function taperBearing(o = {}) {
  const s = o.s || 1, beta = o.beta || THREE.MathUtils.degToRad(16), c = !!o.cut;
  const d = o.d || 1.0, D = o.D || 2.1, B = o.B || 0.7, Rp = (d / 2 + D / 2) / 2, n = o.n || 14;
  const L = B * 0.78, rb = B * 0.2, rs = B * 0.14;
  const grp = new THREE.Group();
  const ur = -s * Math.sin(beta), uy = s * Math.cos(beta);
  const off = rb;
  const cupIn = (y) => Rp + off + y * ur / uy;
  const coneOut = (y) => Rp - off + y * ur / uy;
  const h = B / 2;
  const cupP = [[cupIn(-h), -h], [D / 2, -h], [D / 2, h], [cupIn(h), h], [cupIn(-h), -h]];
  const cup = lathe(cupP, o.outerMat || M.steel(c), 128);
  const yBig = -s * h, rib = B * 0.12;
  const coneP = [[d / 2, -h], [coneOut(-h), -h], [coneOut(h), h], [d / 2, h], [d / 2, -h]];
  const ribP = [[d / 2, yBig], [coneOut(yBig) + rb * 0.9, yBig], [coneOut(yBig) + rb * 0.9, yBig + s * rib], [d / 2, yBig + s * rib], [d / 2, yBig]];
  const cone = new THREE.Group();
  const im = o.innerMat || M.steel(c);
  cone.add(lathe(coneP, im, 128)); cone.add(lathe(ribP, im, 128));
  const cage = new THREE.Group(); const rollers = [];
  const rm = o.rollerMat || M.ball(c);
  for (let i = 0; i < n; i++) {
    const holder = new THREE.Group(); holder.rotation.y = i / n * TAU;
    const r = new THREE.Mesh(new THREE.CylinderGeometry(rs, rb, L, 28), rm); r.castShadow = true;
    const piv = new THREE.Group(); piv.position.set(Rp, 0, 0); piv.rotation.z = Math.atan2(-ur, uy);
    piv.add(r); holder.add(piv); cage.add(holder); rollers.push(r);
  }
  grp.add(cup, cone, cage);
  return { grp, cup, cone, cage, rollers, Rp, s, beta, B, D, d, cupP, coneP,
    set(thI, thO) { cone.rotation.y = thI; cup.rotation.y = thO; cage.rotation.y = thI * 0.45 + thO * 0.55; rollers.forEach(r => r.rotation.y = -(thI - thO) * 3.0); } };
}

// ------------------------------------------------------------------ cylindrical roller bearing (axis = local Y)
export function cylRollerBearing(o = {}) {
  const c = !!o.cut, d = o.d || 1.2, D = o.D || 2.6, B = o.B || 0.75, n = o.n || 16;
  const Dp = (d + D) / 2, Dr = (D - d) * 0.26, L = B * 0.62;
  const h = B / 2;
  const rOi = Dp / 2 + Dr / 2; // outer ring inner radius (raceway)
  const outerP = [[rOi, -h], [D / 2, -h], [D / 2, h], [rOi, h], [rOi, -h]];
  const rIo = Dp / 2 - Dr / 2;
  const innerP = [[d / 2, -h], [rIo + Dr * 0.35, -h], [rIo + Dr * 0.35, -L / 2 - 0.02], [rIo, -L / 2 - 0.02], [rIo, L / 2 + 0.02], [rIo + Dr * 0.35, L / 2 + 0.02], [rIo + Dr * 0.35, h], [d / 2, h], [d / 2, -h]];
  const outer = lathe(outerP, o.outerMat || M.steel(c), 128);
  const inner = lathe(innerP, o.innerMat || M.steel(c), 128);
  const cage = new THREE.Group(); const rollers = [];
  for (let i = 0; i < n; i++) {
    const holder = new THREE.Group(); holder.rotation.y = i / n * TAU;
    const r = new THREE.Mesh(new THREE.CylinderGeometry(Dr / 2, Dr / 2, L, 28), M.ball(c)); r.position.x = Dp / 2; r.castShadow = true;
    holder.add(r); cage.add(holder); rollers.push(r);
  }
  const grp = new THREE.Group(); grp.add(outer, inner, cage);
  return { grp, outer, inner, cage, rollers, outerP, innerP,
    set(thI, thO) { inner.rotation.y = thI; outer.rotation.y = thO; cage.rotation.y = (thI * (Dp - Dr) + thO * (Dp + Dr)) / (2 * Dp); rollers.forEach(r => r.rotation.y = -(cage.rotation.y - thO) * (Dp + Dr) / Dr); } };
}

// ------------------------------------------------------------------ self-aligning double row ball bearing
export function rotuleBearing(o = {}) {
  const c = !!o.cut, d = o.d || 1.2, D = o.D || 2.6, B = o.B || 0.85, n = o.n || 12;
  const Dp = (d + D) / 2, Db = Dp * 0.17, R = D / 2 * 0.86; // spherical outer raceway radius from bearing centre
  const h = B / 2;
  const outerP = [[D / 2, -h], [D / 2, h]];
  const yS = h; const rS = Math.sqrt(R * R - yS * yS);
  outerP.push([rS, h]);
  for (let i = 0; i <= 24; i++) { const y = h - (2 * h) * i / 24; outerP.push([Math.sqrt(R * R - y * y), y]); }
  outerP.push([D / 2, -h]);
  const outer = lathe(outerP, o.outerMat || M.steel(c), 128);
  const rIo = Dp / 2 - Db * 0.42;
  const innerP = [[d / 2, -h], [rIo, -h], [rIo, h], [d / 2, h], [d / 2, -h]];
  const inner = lathe(innerP, o.innerMat || M.steel(c), 128);
  const cage = new THREE.Group(); const balls = [];
  const yb = B * 0.24;
  for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
    const holder = new THREE.Group(); holder.rotation.y = (i + (s > 0 ? 0.5 : 0)) / n * TAU;
    const rr = Math.sqrt((R - Db / 2) ** 2 - yb * yb);
    const b = new THREE.Mesh(new THREE.SphereGeometry(Db / 2, 32, 24), M.ball(c)); b.position.set(rr, s * yb, 0); b.castShadow = true;
    holder.add(b); cage.add(holder); balls.push(b);
  }
  const grp = new THREE.Group(); grp.add(outer, inner, cage);
  return { grp, outer, inner, cage, balls, outerP, innerP,
    set(thI, thO) { inner.rotation.y = thI; outer.rotation.y = thO; cage.rotation.y = thI * 0.4 + thO * 0.6; balls.forEach(b => b.rotation.z = -(thI - thO) * 2.5); } };
}

// ------------------------------------------------------------------ angular contact ball bearing (one shoulder removed on outer ring)
export function obliqueBearing(o = {}) {
  const b = ballBearing({ ...o });
  const c = !!o.cut;
  const d = b.d, D = b.D, B = b.B, Dp = b.Dp, Db = b.Db;
  // rebuild outer ring: low shoulder on one side (−Y)
  const rI = Dp / 2 + Db * 0.36, rO = D / 2, h = B / 2, gr = Db * 0.5, depth = Db * 0.14;
  const p = [[Dp / 2 + Db * 0.5 + 0.005, -h], [rO, -h], [rO, h], [rI, h], [rI, gr * 0.95]];
  for (let i = 0; i <= 18; i++) { const a = Math.PI / 2 - Math.PI * 0.5 * i / 18; p.push([rI + Math.cos(a) * depth, gr * 0.95 * Math.sin(a)]); }
  p.push([Dp / 2 + Db * 0.5 + 0.005, 0], [Dp / 2 + Db * 0.5 + 0.005, -h]);
  b.outer.geometry.dispose();
  b.outer.geometry = new THREE.LatheGeometry(p.map(q => new THREE.Vector2(q[0], q[1])), 128); b.outer.geometry.computeVertexNormals();
  b.profOuter = p;
  return b;
}
