import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/* =========================================================
   Groupe hydraulique (HPU) Advanced Actuators HLD4 — simulation
   Schéma de principe reconstitué d'après la plaque signalétique :
   260 L/min + 58 L/min — 30 kW / 400 V / 3 ph variateur — 24 VDC — IP65
   ========================================================= */

const $ = (id) => document.getElementById(id);
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.__lowdpr ? 1 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfd3d6);
scene.fog = new THREE.Fog(0xcfd3d6, 9, 22);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
const HOME_POS = new THREE.Vector3(4.6, 3.3, 6.6);
const HOME_TGT = new THREE.Vector3(0.85, 1.0, 0);
camera.position.copy(HOME_POS);
const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME_TGT);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.0;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.53;
controls.screenSpacePanning = true;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

// ---------- Lumières ----------
scene.add(new THREE.HemisphereLight(0xf2efe8, 0x6b5040, 0.55));
const sun = new THREE.DirectionalLight(0xfff4e2, 1.6);
sun.position.set(4, 7, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -4; sun.shadow.camera.right = 4;
sun.shadow.camera.top = 4; sun.shadow.camera.bottom = -4;
sun.shadow.bias = -0.0004;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xdfe8f0, 0.35);
fill.position.set(-5, 3, -3);
scene.add(fill);

// ---------- Textures procédurales ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function noise(ctx, w, h, base, amp, n) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * amp;
    ctx.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.6})`;
    const s = 1 + Math.random() * 3;
    ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}
// Peinture bleue avec poussière de bauxite (comme sur la photo)
const blueTex = canvasTex(512, 512, (g, w, h) => {
  noise(g, w, h, '#2f4597', 0.06, 9000);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 10 + Math.random() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(150,80,50,0.22)'); gr.addColorStop(1, 'rgba(150,80,50,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  const gr = g.createLinearGradient(0, h * 0.75, 0, h);
  gr.addColorStop(0, 'rgba(140,70,40,0)'); gr.addColorStop(1, 'rgba(140,70,40,0.45)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const groundTex = canvasTex(512, 512, (g, w, h) => {
  noise(g, w, h, '#8c5236', 0.18, 26000);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(${90 + Math.random() * 60},${45 + Math.random() * 30},${25 + Math.random() * 20},0.9)`;
    const s = 2 + Math.random() * 7;
    g.fillRect(Math.random() * w, Math.random() * h, s, s * 0.7);
  }
}, [8, 8]);
const concreteTex = canvasTex(512, 512, (g, w, h) => {
  noise(g, w, h, '#9b8676', 0.12, 20000);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(120,60,35,0.35)'); gr.addColorStop(1, 'rgba(120,60,35,0.05)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, [2, 1]);
const slotTex = canvasTex(256, 256, (g, w, h) => {
  g.drawImage(blueTex.image, 0, 0, w, h);
  g.fillStyle = '#121418';
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const x = 10 + c * 27, y = 14 + r * 27;
    g.beginPath(); g.roundRect(x, y, 8, 20, 4); g.fill();
  }
});
const finTex = canvasTex(64, 256, (g, w, h) => {
  g.fillStyle = '#56616c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 64; i++) { g.fillStyle = i % 2 ? '#3d454e' : '#6a7681'; g.fillRect(0, i * 4, w, 2); }
});
finTex.wrapS = finTex.wrapT = THREE.RepeatWrapping;

// ---------- Matériaux ----------
const M = {
  blue: new THREE.MeshStandardMaterial({ map: blueTex, metalness: 0.25, roughness: 0.62 }),
  slots: new THREE.MeshStandardMaterial({ map: slotTex, metalness: 0.25, roughness: 0.65 }),
  tank: new THREE.MeshStandardMaterial({ color: 0x55626c, metalness: 0.55, roughness: 0.48 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb4b9bd, metalness: 0.95, roughness: 0.28 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x5b6066, metalness: 0.85, roughness: 0.4 }),
  cast: new THREE.MeshStandardMaterial({ color: 0x5d6368, metalness: 0.45, roughness: 0.72 }),
  motor: new THREE.MeshStandardMaterial({ map: finTex, color: 0xffffff, metalness: 0.4, roughness: 0.55 }),
  motorBody: new THREE.MeshStandardMaterial({ color: 0x56616c, metalness: 0.4, roughness: 0.55 }),
  alu: new THREE.MeshStandardMaterial({ color: 0xc9ccce, metalness: 0.8, roughness: 0.35 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xb08d4a, metalness: 0.9, roughness: 0.3 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.0, roughness: 0.85 }),
  coil: new THREE.MeshStandardMaterial({ color: 0x24272a, metalness: 0.1, roughness: 0.5 }),
  white: new THREE.MeshStandardMaterial({ color: 0xd9d6cc, metalness: 0.1, roughness: 0.6 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xddeeff, metalness: 0, roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.25 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xe8ebee, metalness: 1.0, roughness: 0.12 }),
  ground: new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 }),
  concrete: new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.9 }),
  rail: new THREE.MeshStandardMaterial({ color: 0x6f6a66, metalness: 0.8, roughness: 0.45 }),
  wheel: new THREE.MeshStandardMaterial({ color: 0x3e3b39, metalness: 0.7, roughness: 0.5 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x3a4148, metalness: 0.5, roughness: 0.6 }),
  oilA: new THREE.MeshStandardMaterial({ color: 0x9a3a2a, emissive: 0x4a1208, metalness: 0.1, roughness: 0.3, transparent: true, opacity: 0.85 }),
  oilB: new THREE.MeshStandardMaterial({ color: 0x3b5f8a, emissive: 0x0d1e33, metalness: 0.1, roughness: 0.3, transparent: true, opacity: 0.85 }),
  oilTank: new THREE.MeshStandardMaterial({ color: 0x8a6a22, emissive: 0x2a1c04, metalness: 0.1, roughness: 0.2, transparent: true, opacity: 0.8 }),
  highlight: new THREE.MeshStandardMaterial({ color: 0xd8a640, emissive: 0x5a3c00, metalness: 0.3, roughness: 0.4 }),
};

// ---------- Helpers géométrie ----------
const root = new THREE.Group(); scene.add(root);
const parts = []; // {name, role, meshes:[]}
const partByMesh = new Map();
function reg(obj, name, role) {
  const p = { name, role, obj };
  parts.push(p);
  obj.traverse((m) => { if (m.isMesh) partByMesh.set(m, p); });
  return obj;
}
function shade(m) { m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; }
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent = root) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); parent.add(m); shade(m); return m;
}
function cyl(r1, r2, h, mat, seg = 32) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); shade(m); return m; }
function rounded(w, h, d, r, mat) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
  g.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(g, mat); shade(m); return m;
}
function pipe(points, r, mat, parent = root) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.12);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, r, 14, false), mat);
  shade(m); parent.add(m);
  return { mesh: m, curve };
}
function handle(x, y, z, rotY = 0, vertical = true) {
  const g = new THREE.Group();
  const bar = cyl(0.016, 0.016, 0.2, M.rubber, 12);
  if (!vertical) bar.rotation.z = Math.PI / 2;
  bar.position.z = 0.05; g.add(bar);
  for (const s of [-1, 1]) {
    const leg = cyl(0.014, 0.014, 0.06, M.rubber, 10);
    leg.rotation.x = Math.PI / 2;
    if (vertical) leg.position.set(0, s * 0.09, 0.025); else leg.position.set(s * 0.09, 0, 0.025);
    g.add(leg);
  }
  g.position.set(x, y, z); g.rotation.y = rotY; root.add(g); return g;
}

// ---------- Sol, socle béton, rail ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), M.ground);
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.3; ground.receiveShadow = true; root.add(ground);
const plinth = box(3.0, 0.3, 2.0, M.concrete, 0, -0.15, 0);
plinth.castShadow = false;
reg(plinth, 'Socle en béton', "Massif en béton qui porte le groupe. Le groupe est posé sur des plots anti-vibratiles pour ne pas transmettre les vibrations.");

// Châssis (skid)
const skid = new THREE.Group(); root.add(skid);
for (const z of [-0.66, 0.66]) box(2.55, 0.12, 0.1, M.blue, 0, 0.08, z, skid);
for (const x of [-1.22, -0.4, 0.5, 1.22]) box(0.1, 0.12, 1.32, M.blue, x, 0.08, 0, skid);
box(2.55, 0.012, 1.42, M.darkSteel, 0, 0.146, 0, skid); // bac de rétention
for (const x of [-0.75, 0.75]) { const fp = box(0.16, 0.07, 0.08, M.darkSteel, x, 0.08, 0.715, skid); fp.material = M.rubber; }
for (const [x, z] of [[-1.15, -0.6], [-1.15, 0.6], [1.15, -0.6], [1.15, 0.6]]) {
  const f = cyl(0.06, 0.07, 0.04, M.rubber, 20); f.position.set(x, 0.0, z); root.add(f);
}
reg(skid, 'Châssis + bac de rétention', "Châssis en profilés acier avec passages pour fourche et bac de rétention : il récupère les fuites d'huile pour protéger le sol.");

// ---------- Réservoir ----------
const tank = new THREE.Group(); root.add(tank);
const tankBody = rounded(0.72, 1.28, 1.3, 0.04, M.tank); tankBody.position.set(0.9, 0.8, 0); tank.add(tankBody);
box(0.76, 0.03, 1.34, M.tank, 0.9, 1.455, 0, tank); // couvercle
for (const [x, z] of [[0.6, -0.6], [1.2, -0.6], [0.6, 0.6], [1.2, 0.6]]) { const b = cyl(0.012, 0.012, 0.02, M.steel, 8); b.position.set(x, 1.48, z); tank.add(b); }
// Huile visible en coupe
const oil = box(0.66, 1.0, 1.24, M.oilTank, 0.9, 0.67, 0, tank);
oil.visible = false; oil.castShadow = false;
reg(tank, "Réservoir d'huile", "Contient l'huile hydraulique (ISO VG 46). Il refroidit l'huile par ses parois, laisse décanter les impuretés et sépare l'air. Une chicane sépare le retour de l'aspiration.");

// Niveau visuel + thermomètre
const sight = new THREE.Group(); root.add(sight);
box(0.07, 0.36, 0.03, M.alu, 1.12, 1.12, 0.665, sight);
const sightGlass = box(0.035, 0.3, 0.012, M.glass, 1.12, 1.12, 0.684, sight);
const sightOil = box(0.03, 0.2, 0.01, M.oilTank, 1.12, 1.02, 0.686, sight);
for (const y of [0.96, 1.28]) { const b = cyl(0.012, 0.012, 0.03, M.steel, 10); b.rotation.x = Math.PI / 2; b.position.set(1.12, y, 0.69); sight.add(b); }
reg(sight, 'Niveau visuel + thermomètre', "Indique le niveau et la température de l'huile. Niveau entre MIN et MAX ; température normale 40 à 55 °C.");

// Bouchon de remplissage / reniflard
const breather = new THREE.Group(); root.add(breather);
{ const b = cyl(0.06, 0.06, 0.08, M.cast, 24); b.position.set(1.08, 1.51, -0.4); breather.add(b);
  const c = cyl(0.07, 0.065, 0.03, M.rubber, 24); c.position.set(1.08, 1.565, -0.4); breather.add(c); }
reg(breather, 'Reniflard / bouchon de remplissage', "Laisse respirer le réservoir (l'air entre et sort quand le niveau varie) en filtrant la poussière. Remplissage d'huile par ici, à travers un tamis.");

// Filtre de retour
const retFilter = new THREE.Group(); root.add(retFilter);
{ const b = cyl(0.075, 0.075, 0.2, M.alu, 28); b.position.set(0.82, 1.57, 0.25); retFilter.add(b);
  const c = cyl(0.085, 0.085, 0.04, M.cast, 28); c.position.set(0.82, 1.69, 0.25); retFilter.add(c);
  const ind = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), new THREE.MeshStandardMaterial({ color: 0x3c8a4a, emissive: 0x0d2a12 }));
  ind.position.set(0.82, 1.72, 0.3); retFilter.add(ind); retFilter.userData.ind = ind; }
reg(retFilter, 'Filtre de retour (10 µm)', "Toute l'huile qui revient au réservoir passe par ce filtre. Son indicateur de colmatage passe au rouge quand la cartouche est encrassée.");

// ---------- Moteur électrique 30 kW ----------
const motor = new THREE.Group(); root.add(motor);
const AXY = 0.56; // hauteur d'axe
{
  const body = cyl(0.25, 0.25, 0.7, M.motor, 48); body.rotation.z = Math.PI / 2; body.position.set(-0.72, AXY, 0);
  body.material = M.motor.clone(); body.material.map = finTex.clone(); body.material.map.repeat.set(1, 1); motor.add(body);
  for (let i = 0; i < 16; i++) { // ailettes
    const a = (i / 16) * Math.PI * 2;
    const f = box(0.68, 0.035, 0.012, M.motorBody, -0.72, AXY + Math.sin(a) * 0.265, Math.cos(a) * 0.265, motor);
    f.rotation.x = -a;
  }
  const flangeD = cyl(0.28, 0.28, 0.05, M.motorBody, 48); flangeD.rotation.z = Math.PI / 2; flangeD.position.set(-0.36, AXY, 0); motor.add(flangeD);
  const endN = cyl(0.26, 0.26, 0.04, M.motorBody, 48); endN.rotation.z = Math.PI / 2; endN.position.set(-1.08, AXY, 0); motor.add(endN);
  const cover = cyl(0.255, 0.24, 0.16, M.motorBody, 48); cover.rotation.z = Math.PI / 2; cover.position.set(-1.18, AXY, 0); motor.add(cover);
  const tbox = box(0.22, 0.12, 0.22, M.motorBody, -0.62, AXY + 0.31, 0, motor);
  box(0.24, 0.02, 0.24, M.motorBody, -0.62, AXY + 0.375, 0, motor);
  const gland = cyl(0.025, 0.025, 0.06, M.brass, 12); gland.rotation.x = Math.PI / 2; gland.position.set(-0.62, AXY + 0.3, -0.14); motor.add(gland);
  for (const z of [-0.2, 0.2]) box(0.6, 0.06, 0.08, M.motorBody, -0.72, 0.2, z, motor); // pattes
  box(0.62, 0.05, 0.6, M.darkSteel, -0.72, 0.17, 0, motor);
}
reg(motor, 'Moteur électrique 30 kW', "Moteur asynchrone triphasé 400 V, 4 pôles (~1480 tr/min à 50 Hz). Il est alimenté par un variateur de fréquence : on règle sa vitesse donc le débit des pompes.");

// Ventilateur moteur (tourne)
const motorFan = new THREE.Group(); motorFan.position.set(-1.2, AXY, 0); root.add(motorFan);
for (let i = 0; i < 8; i++) { const bl = box(0.01, 0.2, 0.06, M.cast, 0, 0, 0, motorFan); bl.rotation.x = (i / 8) * Math.PI * 2; bl.position.set(0, Math.sin(bl.rotation.x) * 0.0, 0); bl.geometry.translate(0, 0.1, 0); }

// Lanterne + accouplement
const lantern = new THREE.Group(); root.add(lantern);
for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const rib = box(0.2, 0.05, 0.05, M.cast, -0.24, AXY + Math.sin(a) * 0.2, Math.cos(a) * 0.2, lantern);
}
{ const r1 = cyl(0.24, 0.24, 0.03, M.cast, 40); r1.rotation.z = Math.PI / 2; r1.position.set(-0.33, AXY, 0); lantern.add(r1);
  const r2 = cyl(0.2, 0.2, 0.03, M.cast, 40); r2.rotation.z = Math.PI / 2; r2.position.set(-0.15, AXY, 0); lantern.add(r2); }
reg(lantern, 'Lanterne', "Pièce en fonte qui relie le moteur aux pompes et garantit leur alignement. Elle a des ouvertures pour voir l'accouplement.");

const coupling = new THREE.Group(); coupling.position.set(-0.24, AXY, 0); root.add(coupling);
{ const h1 = cyl(0.075, 0.075, 0.06, M.steel, 28); h1.rotation.z = Math.PI / 2; h1.position.x = -0.045; coupling.add(h1);
  const h2 = cyl(0.075, 0.075, 0.06, M.steel, 28); h2.rotation.z = Math.PI / 2; h2.position.x = 0.045; coupling.add(h2);
  const sp = cyl(0.07, 0.07, 0.03, new THREE.MeshStandardMaterial({ color: 0x7a2e2a, roughness: 0.7 }), 6); sp.rotation.z = Math.PI / 2; coupling.add(sp);
  for (let i = 0; i < 3; i++) { const j = box(0.06, 0.03, 0.04, M.steel, 0, 0, 0, coupling); const a = (i / 3) * Math.PI * 2; j.position.set(0, Math.sin(a) * 0.05, Math.cos(a) * 0.05); j.rotation.x = -a; } }
reg(coupling, 'Accouplement élastique à crabots', "Transmet la rotation du moteur aux pompes. L'étoile élastique (élastomère) absorbe les chocs et un petit défaut d'alignement.");

// Pompe double (tandem) : P1 grand débit + P2 petit débit
const pump1 = new THREE.Group(); root.add(pump1);
{ const b = rounded(0.2, 0.26, 0.26, 0.03, M.cast); b.rotation.y = Math.PI / 2; b.position.set(-0.03, AXY, 0); pump1.add(b);
  const fl = box(0.04, 0.3, 0.3, M.cast, -0.13, AXY, 0, pump1);
  const inl = cyl(0.055, 0.055, 0.06, M.cast, 20); inl.rotation.x = Math.PI / 2; inl.position.set(-0.03, AXY, -0.16); pump1.add(inl);
  const out = cyl(0.04, 0.04, 0.06, M.cast, 20); out.position.set(-0.03, AXY + 0.16, 0); pump1.add(out); }
reg(pump1, 'Pompe P1 — grand débit 260 L/min', "Pompe de la grande cylindrée (à engrenages ou à palettes). Elle donne le grand débit pour l'approche RAPIDE des pinces, à basse pression. Au-delà d'environ 50 bar, la valve de décharge l'envoie au réservoir.");
const pump2 = new THREE.Group(); root.add(pump2);
{ const b = rounded(0.14, 0.18, 0.18, 0.025, M.cast); b.rotation.y = Math.PI / 2; b.position.set(0.15, AXY, 0); pump2.add(b);
  const inl = cyl(0.035, 0.035, 0.05, M.cast, 20); inl.rotation.x = Math.PI / 2; inl.position.set(0.15, AXY, -0.11); pump2.add(inl);
  const out = cyl(0.03, 0.03, 0.05, M.cast, 20); out.position.set(0.15, AXY + 0.115, 0); pump2.add(out);
  const cap = box(0.03, 0.14, 0.14, M.cast, 0.235, AXY, 0, pump2); }
reg(pump2, 'Pompe P2 — petit débit 58 L/min', "Petite pompe montée en tandem sur le même arbre. Elle donne la HAUTE pression de serrage (jusqu'à ~180 bar) avec peu de puissance.");

// ---------- Bloc foré (manifold) + valves ----------
const MFX = -0.05, MFY = 1.22, MFZ = 0.42;
const manifold = new THREE.Group(); root.add(manifold);
box(0.5, 0.16, 0.16, M.alu, MFX, MFY, MFZ, manifold);
for (let i = 0; i < 6; i++) { const p = cyl(0.008, 0.008, 0.005, M.steel, 8); p.rotation.x = Math.PI / 2; p.position.set(MFX - 0.2 + i * 0.08, MFY - 0.05, MFZ + 0.082); manifold.add(p); }
reg(manifold, 'Bloc foré (manifold)', "Bloc en acier/alu percé de canaux : il regroupe sans tuyaux les clapets, limiteurs et électrovannes. Moins de raccords donc moins de fuites.");

function cartridge(x, y, z, color, rot = 0) {
  const g = new THREE.Group();
  const hex = cyl(0.03, 0.03, 0.03, M.steel, 6); g.add(hex);
  const body = cyl(0.02, 0.02, 0.07, M.steel, 16); body.position.y = 0.05; g.add(body);
  const knob = cyl(0.028, 0.028, 0.03, new THREE.MeshStandardMaterial({ color, roughness: 0.5 }), 18); knob.position.y = 0.1; g.add(knob);
  g.position.set(x, y, z); g.rotation.z = rot; root.add(g); shade(g); return g;
}
const reliefV = cartridge(MFX + 0.2, MFY + 0.095, MFZ - 0.03, 0x3a3a3a);
reg(reliefV, 'Limiteur de pression (180 bar)', "Sécurité : il s'ouvre et renvoie l'huile au réservoir si la pression dépasse le réglage (ici ~180 bar). Il protège la pompe, les tuyaux et les vérins.");
const unloadV = cartridge(MFX + 0.12, MFY + 0.095, MFZ - 0.03, 0x4d4a3a);
reg(unloadV, 'Valve de décharge P1 (50 bar)', "Quand la pression dépasse ~50 bar (pinces en contact), elle envoie le débit de P1 au réservoir sans pression. Seule P2 continue à monter en pression : le moteur n'est pas surchargé.");
const checkV = cartridge(MFX - 0.22, MFY + 0.095, MFZ - 0.03, 0x555555);
reg(checkV, 'Clapets anti-retour', "Laissent passer l'huile dans un seul sens : empêchent la haute pression de P2 de repartir vers P1 quand P1 est déchargée.");

// Électrovannes (distributeurs 24 V)
function solenoidValve(x, y, z, twoCoils) {
  const g = new THREE.Group();
  const body = box(0.16, 0.07, 0.07, M.cast, 0, 0, 0, g);
  const coils = [];
  for (const s of twoCoils ? [-1, 1] : [1]) {
    const c = box(0.06, 0.065, 0.065, M.coil, s * 0.11, 0, 0, g);
    const cap = cyl(0.016, 0.016, 0.02, M.steel, 12); cap.rotation.z = Math.PI / 2; cap.position.set(s * 0.15, 0, 0); g.add(cap);
    const plug = box(0.035, 0.04, 0.03, M.coil, s * 0.11, 0.05, 0, g);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x000000 }));
    led.position.set(s * 0.11, 0.072, 0.012); g.add(led);
    coils.push(led);
  }
  g.position.set(x, y, z); root.add(g); g.userData.leds = coils; return g;
}
const ev1 = solenoidValve(MFX - 0.05, MFY + 0.115, MFZ, true);
reg(ev1, 'Électrodistributeur 4/3 (Y1 serrer / Y2 desserrer)', "Distributeur à 4 orifices (P, T, A, B) et 3 positions, bobines 24 V DC. Y1 : l'huile va en A, les pinces serrent. Y2 : l'huile va en B, les pinces s'ouvrent. Au repos : centre fermé.");
const ev0 = solenoidValve(MFX - 0.05, MFY - 0.06, MFZ + 0.12, false);
ev0.rotation.x = Math.PI / 2; ev0.position.set(MFX + 0.03, MFY - 0.03, MFZ + 0.115);
reg(ev0, 'Électrovanne de mise en pression (Y0)', "Au repos, elle met les pompes « à vide » (l'huile retourne au réservoir sans pression : pas d'échauffement). Excitée (24 V), elle met le circuit en pression.");
const pocv = cartridge(MFX - 0.14, MFY + 0.095, MFZ - 0.03, 0x606060);
reg(pocv, 'Clapet anti-retour piloté (maintien)', "Il bloque l'huile dans la chambre A du vérin : les pinces restent serrées même si les pompes sont à vide ou si le courant est coupé, pendant le retournement du wagon.");

// Manomètres (texture dynamique)
function gaugeTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; return t;
}
function drawGauge(tex, val, max, label) {
  const c = tex.userData.c, g = c.getContext('2d');
  g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, 256, 256);
  g.save(); g.translate(128, 128);
  g.strokeStyle = '#222'; g.lineWidth = 3;
  for (let i = 0; i <= 10; i++) {
    const a = (-225 + i * 27) * Math.PI / 180;
    g.beginPath(); g.moveTo(Math.cos(a) * 95, Math.sin(a) * 95); g.lineTo(Math.cos(a) * 112, Math.sin(a) * 112); g.stroke();
    g.fillStyle = '#222'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (i % 2 === 0) g.fillText(String(Math.round(max * i / 10)), Math.cos(a) * 75, Math.sin(a) * 75);
  }
  g.fillStyle = '#b02a20'; g.fillRect(-2, 0, 0, 0);
  g.font = '16px sans-serif'; g.fillStyle = '#333'; g.fillText('bar', 0, 38); g.fillText(label, 0, 60);
  const a = (-225 + Math.min(val / max, 1.02) * 270) * Math.PI / 180;
  g.strokeStyle = '#a3241b'; g.lineWidth = 5; g.beginPath(); g.moveTo(-Math.cos(a) * 14, -Math.sin(a) * 14); g.lineTo(Math.cos(a) * 100, Math.sin(a) * 100); g.stroke();
  g.fillStyle = '#222'; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill();
  g.restore();
  tex.needsUpdate = true;
}
const gauges = [];
function gauge(x, y, z, label, max) {
  const g = new THREE.Group();
  const rim = cyl(0.06, 0.06, 0.03, M.chrome, 40); rim.rotation.x = Math.PI / 2; g.add(rim);
  const tex = gaugeTex();
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.052, 40), new THREE.MeshBasicMaterial({ map: tex }));
  face.position.z = 0.016; g.add(face);
  const stem = cyl(0.01, 0.01, 0.08, M.brass, 10); stem.position.set(0, -0.07, -0.01); g.add(stem);
  g.position.set(x, y, z); root.add(g);
  const o = { g, tex, label, max, val: 0 }; gauges.push(o); drawGauge(tex, 0, max, label); return o;
}
const gP1 = gauge(-0.32, 1.38, 0.62, 'P1', 100);
const gSys = gauge(-0.17, 1.38, 0.62, 'SYSTÈME', 250);
const gA = gauge(-0.02, 1.38, 0.62, 'PINCES A', 250);
reg(gP1.g, 'Manomètre P1 (basse pression)', "Pression de la pompe grand débit. Pendant l'approche ~35 bar ; quand la valve de décharge s'ouvre, elle retombe vers 3–5 bar.");
reg(gSys.g, 'Manomètre système', "Pression à la sortie de P2 / du bloc. Elle monte jusqu'au réglage du limiteur (~180 bar) au serrage.");
reg(gA.g, 'Manomètre pinces (chambre A)', "Pression qui serre les pinces. Elle doit rester stable pendant le retournement : si elle baisse, il y a une fuite (joint de vérin ou clapet).");

// Filtre haute pression
const hpFilter = new THREE.Group(); root.add(hpFilter);
{ const b = cyl(0.055, 0.055, 0.26, M.steel, 28); b.position.set(0.33, 0.95, 0.3); hpFilter.add(b);
  const h = cyl(0.07, 0.07, 0.06, M.cast, 28); h.position.set(0.33, 1.1, 0.3); hpFilter.add(h); }
reg(hpFilter, 'Filtre haute pression', "Filtre la sortie de la pompe P2 avant les électrovannes, qui sont sensibles aux impuretés (poussière de bauxite).");

// ---------- Capot (panneaux) ----------
const hoodMat = M.blue.clone(); hoodMat.transparent = true;
const hoodSlots = M.slots.clone(); hoodSlots.transparent = true;
const hood = new THREE.Group(); root.add(hood);
const HX0 = -1.32, HX1 = 0.52, HZ = 0.72, HY0 = 0.15, HY1 = 1.82;
const hw = HX1 - HX0, hcx = (HX0 + HX1) / 2;
const t = 0.02;
// avant avec fenêtre
const winX0 = -0.42, winX1 = 0.06, winY0 = 1.18, winY1 = 1.55;
box(winX0 - HX0, HY1 - HY0, t, hoodMat, (HX0 + winX0) / 2, (HY0 + HY1) / 2, HZ, hood);
box(HX1 - winX1, HY1 - HY0, t, hoodMat, (winX1 + HX1) / 2, (HY0 + HY1) / 2, HZ, hood);
box(winX1 - winX0, winY0 - HY0, t, hoodMat, (winX0 + winX1) / 2, (HY0 + winY0) / 2, HZ, hood);
box(winX1 - winX0, HY1 - winY1, t, hoodMat, (winX0 + winX1) / 2, (winY1 + HY1) / 2, HZ, hood);
// arrière, dessus, côté gauche (grille)
box(hw, HY1 - HY0, t, hoodMat, hcx, (HY0 + HY1) / 2, -HZ, hood);
box(hw + 0.02, t, 2 * HZ + 0.02, hoodMat, hcx, HY1, 0, hood);
const sideL = box(t, HY1 - HY0, 2 * HZ, hoodMat, HX0, (HY0 + HY1) / 2, 0, hood);
const grilleL = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), hoodSlots); grilleL.rotation.y = -Math.PI / 2; grilleL.position.set(HX0 - 0.012, 0.6, 0); hood.add(grilleL);
const sideR = box(t, HY1 - HY0, 2 * HZ, hoodMat, HX1, (HY0 + HY1) / 2, 0, hood);
// fente verticale d'aération (comme la photo)
const ventStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.1), new THREE.MeshStandardMaterial({ map: canvasTex(32, 512, (g, w, h) => { g.fillStyle = '#2f4597'; g.fillRect(0, 0, w, h); g.fillStyle = '#121418'; for (let i = 0; i < 26; i++) { g.beginPath(); g.roundRect(8, 8 + i * 19.4, 16, 12, 5); g.fill(); } }), transparent: true }));
ventStrip.position.set(0.44, 0.95, HZ + 0.012); hood.add(ventStrip);
// poignées
handle(-0.85, 1.25, HZ + 0.01); handle(0.3, 1.25, HZ + 0.01);
handle(HX0 - 0.01, 1.35, 0.35, -Math.PI / 2); handle(HX0 - 0.01, 0.55, 0.35, -Math.PI / 2);
reg(hood, 'Capot insonorisant', "Capot en tôle peinte avec poignées, grilles et fenêtre de visite (pour lire les manomètres). Il protège de la poussière et réduit le bruit.");

// Coffret électrique (variateur + automate 24 V)
const cabinet = new THREE.Group(); root.add(cabinet);
{ const b = rounded(0.25, 0.35, 0.15, 0.015, M.white); b.position.set(-1.0, 1.25, HZ + 0.085); cabinet.add(b);
  const lock = cyl(0.014, 0.014, 0.02, M.coil, 16); lock.rotation.x = Math.PI / 2; lock.position.set(-0.9, 1.25, HZ + 0.17); cabinet.add(lock);
  const lbl = box(0.09, 0.04, 0.004, new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }), -1.06, 1.37, HZ + 0.163, cabinet);
  const disp = box(0.08, 0.045, 0.004, new THREE.MeshStandardMaterial({ color: 0x0b1a10, emissive: 0x0a3a1a }), -1.02, 1.29, HZ + 0.163, cabinet);
  cabinet.userData.disp = disp; }
reg(cabinet, 'Coffret électrique Eldon MAS0352515R5', "Armoire acier Eldon 350 × 250 × 150 mm, IP66, IK10 (résiste aux chocs), fabriquée en 2016. Elle contient le variateur de fréquence (vitesse du moteur), le disjoncteur et la commande 24 V DC (automate, relais, bobines, capteurs). IP66 : étanche à la poussière et aux jets d'eau puissants.");

// Plaque signalétique (texture)
const plateTex = canvasTex(512, 300, (g, w, h) => {
  g.fillStyle = '#d6d3cb'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#111'; g.font = 'bold 40px sans-serif'; g.fillText('ADVANCED', 120, 55); g.fillText('ACTUATORS', 110, 98);
  g.font = '20px monospace'; g.fillStyle = '#6a3a2a';
  g.fillText('HLD-000022-2  |  HPU', 30, 145); g.fillText('HLD4-ZZXC-XSXS', 30, 180);
  g.fillText('260LTR/MIN + 58LTR/MIN', 30, 212); g.fillText('30KW/400/3 VARIABLE Hz', 30, 242); g.fillText('24VDC - IP65', 30, 272);
});
const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.117), new THREE.MeshStandardMaterial({ map: plateTex, metalness: 0.5, roughness: 0.4 }));
plate.position.set(0.9, 0.4, 0.672); root.add(plate);
reg(plate, 'Plaque signalétique', 'HPU = Hydraulic Power Unit (groupe hydraulique). 260 + 58 L/min (2 pompes) ; 30 kW / 400 V / 3 phases, fréquence variable ; commande 24 V DC ; IP65.');

// ---------- Tuyauteries + flux ----------
const flowPaths = {};
function flow(key, pts, color, r = 0.022, mat = M.steel, n = 26) {
  const p = pipe(pts, r, mat);
  const geo = new THREE.SphereGeometry(r * 0.75, 10, 8);
  const pm = new THREE.MeshBasicMaterial({ color, depthTest: true });
  const inst = new THREE.InstancedMesh(geo, pm, n);
  inst.frustumCulled = false; root.add(inst);
  const len = p.curve.getLength();
  flowPaths[key] = { ...p, inst, n, len, off: Math.random(), speed: 0, active: false, color };
  return flowPaths[key];
}
const C_SUC = 0x8aa6b8, C_LOW = 0xd08a2a, C_HIGH = 0xc23a2a, C_RET = 0x3a74c2;
flow('suc1', [[0.54, 0.32, -0.3], [0.3, 0.32, -0.3], [-0.03, 0.32, -0.3], [-0.03, AXY, -0.22], [-0.03, AXY, -0.19]], C_SUC, 0.04);
flow('suc2', [[0.54, 0.3, -0.12], [0.35, 0.3, -0.16], [0.15, 0.3, -0.18], [0.15, AXY, -0.16], [0.15, AXY, -0.135]], C_SUC, 0.03);
flow('p1', [[-0.03, AXY + 0.19, 0], [-0.03, 0.95, 0.08], [-0.12, 1.08, 0.3], [-0.22, MFY - 0.08, MFZ - 0.05]], C_LOW, 0.03);
flow('p2', [[0.15, AXY + 0.14, 0], [0.18, 0.8, 0.15], [0.33, 0.82, 0.3], [0.33, 1.13, 0.3], [0.2, MFY - 0.08, MFZ - 0.06]], C_HIGH, 0.02);
flow('ret', [[0.12, MFY + 0.08, MFZ - 0.08], [0.12, 1.6, 0.25], [0.5, 1.7, 0.25], [0.82, 1.72, 0.25], [0.82, 1.62, 0.25]], C_RET, 0.03);
const hoseMat = M.rubber;
flow('A', [[-0.1, MFY + 0.08, MFZ - 0.08], [-0.1, 1.62, 0.2], [0.2, 1.9, 0.05], [1.4, 2.05, 0.05], [2.05, 2.28, 0.0], [2.18, 2.28, 0.0]], C_HIGH, 0.026, hoseMat, 34);
flow('B', [[-0.02, MFY + 0.08, MFZ - 0.08], [-0.02, 1.6, 0.05], [0.25, 1.86, -0.12], [1.4, 1.95, -0.12], [2.0, 1.7, -0.05], [2.18, 1.66, 0.0]], C_RET, 0.026, hoseMat, 34);

// ---------- Vérin + pince sur roue de wagon (exemple d'utilisation) ----------
const ext = new THREE.Group(); root.add(ext);
// Rail + traverse
for (const x of [2.2, 2.9]) {
  const r = box(0.07, 0.12, 4.0, M.rail, x, -0.24, 0, ext);
}
for (let z = -1.8; z <= 1.8; z += 0.6) box(1.3, 0.08, 0.2, M.concrete, 2.55, -0.3, z, ext);
// Roue de wagon (disque dans le plan YZ, axe X)
const wheel = new THREE.Group(); wheel.position.set(2.2, 0.25, 0); ext.add(wheel);
{ const w = cyl(0.45, 0.45, 0.13, M.wheel, 56); w.rotation.z = Math.PI / 2; wheel.add(w);
  const fl = cyl(0.49, 0.49, 0.03, M.wheel, 56); fl.rotation.z = Math.PI / 2; fl.position.x = 0.075; wheel.add(fl);
  const hub = cyl(0.12, 0.12, 0.25, M.darkSteel, 32); hub.rotation.z = Math.PI / 2; wheel.add(hub);
  const axle = cyl(0.07, 0.07, 0.8, M.darkSteel, 24); axle.rotation.z = Math.PI / 2; axle.position.x = 0.35; wheel.add(axle); }
reg(wheel, 'Roue de wagon (sur le rail)', "Exemple d'utilisation : dans un culbuteur, les pinces serrent les roues sur les rails pour que le wagon ne bouge pas pendant qu'on le retourne.");
// Portique
const portal = new THREE.Group(); ext.add(portal);
for (const z of [-0.35, 0.35]) box(0.12, 2.3, 0.12, M.frame, 2.2, 0.85, z, portal);
box(0.14, 0.12, 0.84, M.frame, 2.2, 2.0, 0, portal);
// Vérin (corps + tige + piston), axe vertical
const CYL_TOP = 2.42, CYL_BOT = 1.72; const STROKE = 0.24;
const cylG = new THREE.Group(); ext.add(cylG);
const barrelMat = M.steel.clone(); barrelMat.transparent = true; barrelMat.opacity = 1;
const barrel = cyl(0.085, 0.085, CYL_TOP - CYL_BOT, barrelMat, 36); barrel.position.set(2.2, (CYL_TOP + CYL_BOT) / 2, 0); cylG.add(barrel);
const capT = cyl(0.1, 0.1, 0.05, M.cast, 36); capT.position.set(2.2, CYL_TOP, 0); cylG.add(capT);
const capB = cyl(0.1, 0.1, 0.05, M.cast, 36); capB.position.set(2.2, CYL_BOT, 0); cylG.add(capB);
for (const [y, z] of [[2.28, 0], [1.66, 0]]) { const p = cyl(0.025, 0.025, 0.06, M.steel, 12); p.rotation.z = Math.PI / 2; p.position.set(2.15, y, z); cylG.add(p); }
const chamberA = cyl(0.078, 0.078, 1, M.oilA, 30); chamberA.position.x = 2.2; cylG.add(chamberA);
const chamberB = cyl(0.078, 0.078, 1, M.oilB, 30); chamberB.position.x = 2.2; cylG.add(chamberB);
chamberA.visible = chamberB.visible = false;
const piston = cyl(0.08, 0.08, 0.05, M.darkSteel, 30); piston.position.x = 2.2; cylG.add(piston);
const rod = cyl(0.035, 0.035, 1, M.chrome, 24); rod.position.x = 2.2; cylG.add(rod);
const shoe = new THREE.Group(); ext.add(shoe);
{ const s = box(0.24, 0.07, 0.3, M.darkSteel, 0, 0, 0, shoe); const pad = box(0.2, 0.03, 0.26, M.cast, 0, -0.05, 0, shoe); }
reg(cylG, 'Vérin de pince (double effet)', "Vérin double effet Ø125 / tige Ø70 (exemple). Chambre A (fond) : serrage. Chambre B (côté tige) : desserrage. À 180 bar : effort ≈ 22 tonnes.");
reg(shoe, 'Patin de pince', "Patin qui vient appuyer sur la roue. Il doit être contrôlé (usure, fissures, axes graissés).");

// ---------- Étiquettes de flux (légende HUD) ----------

// ---------- ÉTAT DE SIMULATION ----------
const S = {
  motorOn: false, hz: 50, rpm: 0, slow: false,
  mode: 'ARRET', // ARRET, VEILLE, APPROCHE, MONTEE, MAINTIEN, DESSERRAGE
  y0: false, y1: false, y2: false,
  pos: 0, // 0 ouvert .. 1 contact
  pA: 0, pB: 0, pSys: 0, pP1: 0,
  temp: 38, level: 0.8,
  auto: false, autoT: 0,
  fault: 'none', vfdTrip: false,
  power: 0, q1: 0, q2: 0, force: 0,
  unloadOpen: false, reliefOpen: false,
  msg: '',
};
const PLIM = 180, PDEC = 50, PAPP = 35, PRET = 25;
const ACAP = Math.PI * 0.0625 * 0.0625, AANN = ACAP - Math.PI * 0.035 * 0.035;

function setMode(m) { S.mode = m; }
function cmdStart() { if (S.vfdTrip) return; S.motorOn = true; if (S.mode === 'ARRET') setMode('VEILLE'); }
function cmdStop() { S.motorOn = false; S.auto = false; S.y0 = S.y1 = S.y2 = false; setMode('ARRET'); }
function cmdClamp() { if (!S.motorOn) { flash('Démarrez d\'abord le moteur.'); return; } S.y0 = true; S.y1 = true; S.y2 = false; setMode('APPROCHE'); }
function cmdUnclamp() { if (!S.motorOn) { flash('Démarrez d\'abord le moteur.'); return; } S.y0 = true; S.y2 = true; S.y1 = false; setMode('DESSERRAGE'); }
function cmdAuto() { if (S.vfdTrip) { flash('Réarmez d\'abord le défaut variateur.'); return; } cmdStart(); S.auto = true; S.autoT = 0; cmdClamp(); }
function cmdReset() { S.vfdTrip = false; flash('Défaut réarmé.'); }

const DT_MAX = 0.05;
function step(dt) {
  const k = S.slow ? 0.25 : 1; dt *= k;
  const f = S.fault;
  // moteur
  const targetRpm = S.motorOn && !S.vfdTrip ? 1480 * S.hz / 50 : 0;
  S.rpm += (targetRpm - S.rpm) * Math.min(1, dt * 2.5);
  const qf = S.rpm / 1480;
  let cav = 1;
  if (f === 'niveau') cav = 0.7 + Math.random() * 0.15;
  S.q1 = 260 * qf * cav; S.q2 = 58 * qf * cav;
  S.level += ((f === 'niveau' ? 0.22 : 0.8) - S.level) * dt * 0.8;

  const coilBurnt = f === 'bobine';
  const effY1 = S.y1 && !coilBurnt;
  let pTarget = 4 * qf; // à vide
  S.unloadOpen = false; S.reliefOpen = false;
  let rodV = 0;
  const qPump = (S.q1 + S.q2) / 60000; // m3/s
  const reliefSet = f === 'limiteur' ? 90 : PLIM;

  if (S.mode === 'APPROCHE' || S.mode === 'MONTEE') {
    if (!effY1) { pTarget = 4 * qf; }
    else if (S.pos < 1) {
      setMode('APPROCHE');
      const q = S.pA > PDEC && f !== 'decharge' ? S.q2 / 60000 : qPump;
      rodV = q / ACAP; pTarget = PAPP;
    } else {
      setMode('MONTEE');
      pTarget = reliefSet + 2;
    }
  } else if (S.mode === 'DESSERRAGE') {
    if (S.pos > 0) { rodV = -qPump / AANN; pTarget = PRET; }
    else { pTarget = reliefSet; }
  } else if (S.mode === 'MAINTIEN') {
    pTarget = 4 * qf;
  }
  // dynamique pression système
  const rate = S.mode === 'MONTEE' ? (S.pSys < PDEC || f === 'decharge' ? 260 : 90) * qf : 300;
  S.pSys += Math.sign(pTarget - S.pSys) * Math.min(Math.abs(pTarget - S.pSys), rate * dt * (S.mode === 'MONTEE' ? 1 : 3));
  if (S.pSys >= reliefSet - 1 && (S.mode === 'MONTEE' || (S.mode === 'DESSERRAGE' && S.pos <= 0))) S.reliefOpen = true;
  if (f === 'niveau' && S.motorOn) S.pSys += (Math.random() - 0.5) * 8 * qf;
  S.pSys = Math.max(0, S.pSys);

  // position tige
  S.pos += (rodV * dt) / STROKE;
  S.pos = Math.min(1, Math.max(0, S.pos));

  // pressions chambres
  if (S.mode === 'APPROCHE' || S.mode === 'MONTEE') { S.pA = S.pSys; S.pB = f === 'filtre' ? 6 : 2; }
  else if (S.mode === 'DESSERRAGE') { S.pB = S.pSys; S.pA = f === 'filtre' ? 6 : 2; }
  else if (S.mode === 'MAINTIEN') { // tenu par le clapet piloté
    if (f === 'fuite') S.pA = Math.max(40, S.pA - 18 * dt);
    S.pB = 0;
  } else if (S.mode === 'ARRET' && S.pos < 1) { S.pA = Math.max(0, S.pA - 50 * dt); S.pB = Math.max(0, S.pB - 50 * dt); }

  // P1 et puissance
  const pressMode = S.motorOn && (((S.mode === 'APPROCHE' || S.mode === 'MONTEE') && effY1) || (S.mode === 'DESSERRAGE' && S.y2));
  S.unloadOpen = pressMode && S.pSys > PDEC && f !== 'decharge';
  const p1Target = !S.motorOn ? 0 : S.unloadOpen ? 4 : pressMode ? Math.min(S.pSys, 100) : 4 * qf;
  S.pP1 += (p1Target - S.pP1) * Math.min(1, dt * 6);
  if (!S.motorOn) S.power = 0;
  else if (S.unloadOpen) S.power = (S.q1 * 4 + S.q2 * S.pSys) / 600 / 0.85 + 1.2 * qf;
  else if (pressMode) S.power = (S.q1 + S.q2) * S.pSys / 600 / 0.85 + 1.2 * qf;
  else S.power = (S.q1 + S.q2) * 4 / 600 / 0.85 + 1.2 * qf;
  if (S.power > 36 && !S.vfdTrip) { S.vfdTrip = true; S.motorOn = false; S.auto = false; S.y0 = S.y1 = S.y2 = false; setMode('ARRET'); alarm('Défaut variateur : SURINTENSITÉ. La valve de décharge ne s\'ouvre pas : les 2 pompes poussent à haute pression = plus de 30 kW.'); }

  // fin de serrage -> maintien
  if (S.mode === 'MONTEE' && S.pSys >= reliefSet - 1 && S.auto && S.autoT > 0.6 / k) { S.y0 = false; S.y1 = false; setMode('MAINTIEN'); S.autoT = 0; }
  if (S.mode === 'DESSERRAGE' && S.pos <= 0 && S.auto) { S.y0 = false; S.y2 = false; setMode('VEILLE'); S.autoT = 0; }
  if (S.mode === 'DESSERRAGE' && S.pos <= 0 && !S.auto && S.pSys > reliefSet - 2) { S.y0 = false; S.y2 = false; setMode('VEILLE'); }
  if (S.mode === 'MONTEE' && !S.auto && S.pSys >= reliefSet - 1) { S.y0 = false; S.y1 = false; setMode('MAINTIEN'); }

  // cycle auto
  if (S.auto) {
    S.autoT += dt / k;
    if (S.mode === 'MONTEE' || S.mode === 'APPROCHE') {
      if (coilBurnt && S.autoT > 4) { S.auto = false; alarm('Le vérin ne bouge pas : bobine Y1 hors service (pas de 24 V ou bobine grillée).'); }
    } else if (S.mode === 'MAINTIEN' && S.autoT > 6) { cmdUnclamp(); S.autoT = 0; }
    else if (S.mode === 'VEILLE' && S.autoT > 3) { cmdClamp(); S.autoT = 0; }
  }

  // température
  const heat = S.motorOn ? (S.reliefOpen ? 2.2 : 0.25) + (f === 'chaud' ? 3.5 : 0) + (f === 'filtre' ? 0.5 : 0) : 0;
  S.temp += (heat - (S.temp - 32) * 0.03) * dt;
  if (f !== 'chaud' && S.temp > 58) S.temp -= dt * 2;
  S.force = S.pA * 1e5 * ACAP / 9810; // tonnes
}

// ---------- Mise à jour visuelle ----------
const dummy = new THREE.Object3D();
function updateFlows(dt) {
  const on = S.motorOn && S.rpm > 30;
  const k = S.slow ? 0.25 : 1;
  const act = {
    suc1: on, suc2: on, p1: on, p2: on,
    ret: on,
    A: (S.mode === 'APPROCHE' || S.mode === 'MONTEE') && S.y1 && S.fault !== 'bobine' && S.pos < 1 || (S.mode === 'DESSERRAGE' && S.pos > 0),
    B: (S.mode === 'DESSERRAGE' && S.pos > 0) || ((S.mode === 'APPROCHE') && S.y1 && S.fault !== 'bobine' && S.pos < 1),
  };
  const qf = S.rpm / 1480;
  const spd = { suc1: 0.6 * qf, suc2: 0.35 * qf, p1: (S.unloadOpen ? 0.5 : 1.0) * qf, p2: 0.5 * qf, ret: 0.8 * qf, A: 1.2 * qf, B: 1.2 * qf };
  if (S.mode === 'DESSERRAGE') { spd.A = -1.2 * qf; spd.B = -1.2 * qf; }
  if (S.mode === 'APPROCHE') { spd.B = -1.2 * qf; }
  // couleurs selon pression
  flowPaths.p1.inst.material.color.setHex(S.unloadOpen ? 0x6d9a6a : C_LOW);
  flowPaths.p2.inst.material.color.setHex(S.pSys > PDEC ? C_HIGH : C_LOW);
  flowPaths.A.inst.material.color.setHex(S.mode === 'DESSERRAGE' ? C_RET : (S.pA > PDEC ? C_HIGH : C_LOW));
  flowPaths.B.inst.material.color.setHex(S.mode === 'DESSERRAGE' ? C_LOW : C_RET);
  for (const key in flowPaths) {
    const fp = flowPaths[key];
    fp.off = (fp.off + (spd[key] || 0) * k * dt / Math.max(fp.len, 0.3) * 1.2 + 1) % 1;
    const show = act[key] && showFlow;
    for (let i = 0; i < fp.n; i++) {
      if (!show) { dummy.scale.setScalar(0); }
      else { const u = (i / fp.n + fp.off) % 1; fp.curve.getPointAt(u, dummy.position); dummy.scale.setScalar(1); }
      dummy.updateMatrix(); fp.inst.setMatrixAt(i, dummy.matrix);
    }
    fp.inst.instanceMatrix.needsUpdate = true;
  }
}

let showFlow = true;
let hoodMode = 1; // 0 fermé, 1 transparent, 2 retiré
let cutaway = true;
function applyHood() {
  hood.visible = hoodMode !== 2;
  const op = hoodMode === 1 ? 0.18 : 1;
  for (const m of [hoodMat, hoodSlots, ventStrip.material]) { m.opacity = op; m.depthWrite = hoodMode !== 1; m.needsUpdate = true; }
  hood.traverse((o) => { if (o.isMesh) o.castShadow = hoodMode === 0; });
  $('bHood').textContent = ['Capot : fermé', 'Capot : transparent', 'Capot : retiré'][hoodMode];
}
function applyCut() {
  barrelMat.opacity = cutaway ? 0.28 : 1; barrelMat.depthWrite = !cutaway;
  chamberA.visible = chamberB.visible = cutaway;
  oil.visible = cutaway && hoodMode !== 0;
  tankBody.material = cutaway ? tankCutMat : M.tank;
  $('bCut').textContent = cutaway ? 'Coupe : oui' : 'Coupe : non';
}
const tankCutMat = M.tank.clone(); tankCutMat.transparent = true; tankCutMat.opacity = 0.35; tankCutMat.depthWrite = false;

function updateVisuals(dt) {
  const k = S.slow ? 0.25 : 1;
  const ang = (S.rpm / 60) * Math.PI * 2 * dt * k * 0.12; // rotation visible ralentie (stroboscope)
  motorFan.rotation.x += ang; coupling.rotation.x += ang;
  // vérin
  const yPist = CYL_TOP - 0.06 - S.pos * STROKE - 0.03;
  piston.position.y = yPist;
  const rb = yPist - 1.29;
  rod.scale.y = yPist - rb; rod.position.y = (yPist + rb) / 2;
  shoe.position.set(2.2, rb - 0.035, 0);
  const aTop = CYL_TOP - 0.03, aBot = yPist + 0.025;
  chamberA.scale.y = Math.max(0.001, aTop - aBot); chamberA.position.y = (aTop + aBot) / 2;
  const bTop = yPist - 0.025, bBot = CYL_BOT + 0.03;
  chamberB.scale.y = Math.max(0.001, bTop - bBot); chamberB.position.y = (bTop + bBot) / 2;
  M.oilA.emissive.setRGB(0.12 + S.pA / 250 * 0.45, 0.03, 0.02);
  // niveau
  oil.scale.y = S.level / 0.8; oil.position.y = 0.17 + 0.5 * S.level / 0.8;
  sightOil.scale.y = Math.min(1.4, S.level / 0.8); sightOil.position.y = 0.97 + 0.1 * S.level / 0.8 * (sightOil.scale.y);
  // LEDs bobines
  const ledOn = (led, on) => led.material.emissive.setHex(on ? 0xffb020 : 0x000000);
  ledOn(ev1.userData.leds[0], S.y2); ledOn(ev1.userData.leds[1], S.y1);
  ledOn(ev0.userData.leds[0], S.y0);
  retFilter.userData.ind.material.color.setHex(S.fault === 'filtre' ? 0xc0261a : 0x3c8a4a);
  retFilter.userData.ind.material.emissive.setHex(S.fault === 'filtre' ? 0x500000 : 0x0d2a12);
  cabinet.userData.disp.material.emissive.setHex(S.vfdTrip ? 0x6a0a0a : (S.motorOn ? 0x0a5a2a : 0x05150a));
  // manomètres
  const jit = S.motorOn ? (Math.random() - 0.5) * 0.6 : 0;
  for (const [g, v] of [[gP1, S.pP1], [gSys, S.pSys], [gA, S.pA]]) {
    const nv = Math.max(0, v + jit);
    if (Math.abs(nv - g.val) > 0.4) { g.val = nv; drawGauge(g.tex, nv, g.max, g.label); }
  }
}

// ---------- HUD ----------
const modeTxt = {
  ARRET: 'ARRÊT — moteur arrêté',
  VEILLE: 'VEILLE — pompes à vide : l\'huile tourne au réservoir sans pression',
  APPROCHE: 'APPROCHE RAPIDE — P1 + P2 (318 L/min) poussent le vérin, basse pression',
  MONTEE: 'SERRAGE — contact : P1 déchargée, P2 monte la pression jusqu\'au limiteur',
  MAINTIEN: 'MAINTIEN — pinces bloquées par le clapet piloté, pompes à vide. Le wagon est retourné à 180°.',
  DESSERRAGE: 'DESSERRAGE — l\'huile va en B, la tige remonte, les pinces s\'ouvrent',
};
function hud() {
  $('hMode').textContent = modeTxt[S.mode] + (S.auto ? '  (cycle auto)' : '');
  $('hHz').textContent = (S.motorOn ? S.hz : 0) + ' Hz';
  $('hRpm').textContent = Math.round(S.rpm) + ' tr/min';
  $('hQ').textContent = Math.round(S.q1) + '+' + Math.round(S.q2);
  $('hP').textContent = Math.round(S.pSys) + ' bar';
  $('hF').textContent = S.force.toFixed(1) + ' t';
  $('hT').textContent = Math.round(S.temp) + ' °C';
  $('hT').className = S.temp > 60 ? 'bad' : '';
  $('hW').textContent = S.power.toFixed(1) + ' kW';
  $('hW').className = S.power > 30 ? 'bad' : '';
  $('hL').textContent = Math.round(S.level * 100) + ' %';
  $('hL').className = S.level < 0.4 ? 'bad' : '';
  $('hzVal').textContent = S.hz + ' Hz';
  const al = [];
  if (S.level < 0.4) al.push('Niveau d\'huile BAS — cavitation des pompes (bruit, pression instable)');
  if (S.fault === 'filtre') al.push('Filtre de retour COLMATÉ (indicateur rouge) — contre-pression au retour');
  if (S.temp > 60) al.push('Température huile trop haute (' + Math.round(S.temp) + ' °C)');
  if (S.fault === 'limiteur' && S.mode === 'MAINTIEN') al.push('Serrage insuffisant : pression limitée à 90 bar (limiteur déréglé)');
  if (S.fault === 'fuite' && S.mode === 'MAINTIEN' && S.pA < 160) al.push('La pression des pinces CHUTE : fuite interne (joint de piston / clapet piloté)');
  if (S.vfdTrip) al.push('VARIATEUR EN DÉFAUT — appuyer sur Réarmer');
  if (S.fault === 'bobine' && (S.mode === 'APPROCHE' || S.mode === 'MONTEE')) al.push('Bobine Y1 sans effet : le vérin ne bouge pas');
  $('alarms').innerHTML = al.map((a) => '<div>⚠ ' + a + '</div>').join('');
  $('alarms').style.display = al.length ? 'block' : 'none';
  updateSchema();
}
let flashT = 0;
function flash(t) { $('toast').textContent = t; $('toast').style.opacity = 1; flashT = 3; }
function alarm(t) { flash(t); }

// ---------- Schéma 2D (ISO simplifié) ----------
function updateSchema() {
  const sv = $('schema'); if (!sv || sv.closest('.pane').style.display === 'none') return;
  const on = S.motorOn && S.rpm > 30;
  const col = (id, c) => { const el = sv.querySelector('#' + id); if (el) el.setAttribute('stroke', c); };
  const grey = '#8a8f94';
  const hi = S.pSys > PDEC ? '#c23a2a' : '#d08a2a';
  col('sSuc', on ? '#6f8fa3' : grey);
  col('sP1', on ? (S.unloadOpen ? '#6d9a6a' : '#d08a2a') : grey);
  col('sP2', on ? hi : grey);
  col('sP', on && S.y0 ? hi : grey);
  col('sT', on ? '#3a74c2' : grey);
  col('sA', S.mode === 'DESSERRAGE' ? '#3a74c2' : (S.pA > 5 ? (S.pA > PDEC ? '#c23a2a' : '#d08a2a') : grey));
  col('sB', S.mode === 'DESSERRAGE' ? '#d08a2a' : (S.mode === 'APPROCHE' ? '#3a74c2' : grey));
  col('sDec', S.unloadOpen ? '#6d9a6a' : grey);
  col('sRel', S.reliefOpen ? '#c23a2a' : grey);
  col('sY0', on && !S.y0 ? '#6d9a6a' : grey);
  sv.querySelector('#y1t').setAttribute('fill', S.y1 ? '#e0a020' : '#ddd');
  sv.querySelector('#y2t').setAttribute('fill', S.y2 ? '#e0a020' : '#ddd');
  sv.querySelector('#y0t').setAttribute('fill', S.y0 ? '#e0a020' : '#ddd');
  sv.querySelector('#spool').setAttribute('transform', `translate(${S.y1 ? 40 : S.y2 ? -40 : 0},0)`);
  sv.querySelector('#srod').setAttribute('transform', `translate(${S.pos * 40},0)`);
  sv.querySelector('#mrot').setAttribute('fill', on ? '#e0a020' : '#ddd');
}

// ---------- Interaction : toucher une pièce ----------
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
let downPos = null; let selected = null; const savedMats = new Map();
canvas.addEventListener('pointerdown', (e) => { downPos = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!downPos || Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) > 8) return;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(root.children, true).filter((h) => h.object.visible && partByMesh.has(h.object) && !(hoodMode === 1 && partByMesh.get(h.object).obj === hood) && h.object.parent.visible);
  if (hits.length) selectPart(partByMesh.get(hits[0].object), false);
  else clearSel();
});
function clearSel() {
  for (const [m, mat] of savedMats) m.material = mat; savedMats.clear();
  selected = null; $('info').style.display = 'none';
}
function selectPart(p, focus) {
  clearSel(); selected = p;
  p.obj.traverse((m) => { if (m.isMesh && m.material !== M.glass && !m.material.map?.userData?.c) { savedMats.set(m, m.material); m.material = M.highlight; } });
  $('infoT').textContent = p.name; $('infoD').textContent = p.role; $('info').style.display = 'block';
  if (focus) {
    const b = new THREE.Box3().setFromObject(p.obj); const c = b.getCenter(new THREE.Vector3());
    const sz = Math.max(0.5, b.getSize(new THREE.Vector3()).length());
    flyTo(c.clone().add(new THREE.Vector3(1.2, 0.8, 1.6).normalize().multiplyScalar(sz * 2.4 + 1.0)), c);
  }
}
let fly = null;
function flyTo(pos, tgt) { fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: tgt, u: 0 }; }

// ---------- UI ----------
function bindUI() {
  $('bStart').onclick = () => { if (S.motorOn) cmdStop(); else cmdStart(); };
  $('bClamp').onclick = () => { S.auto = false; cmdClamp(); };
  $('bUnclamp').onclick = () => { S.auto = false; cmdUnclamp(); };
  $('bAuto').onclick = () => { if (S.auto) { S.auto = false; flash('Cycle auto arrêté.'); } else cmdAuto(); };
  $('bReset').onclick = cmdReset;
  $('hz').oninput = (e) => { S.hz = +e.target.value; };
  $('bSlow').onclick = () => { S.slow = !S.slow; $('bSlow').classList.toggle('on', S.slow); };
  $('bHood').onclick = () => { hoodMode = (hoodMode + 1) % 3; applyHood(); applyCut(); };
  $('bCut').onclick = () => { cutaway = !cutaway; applyCut(); };
  $('bFlow').onclick = () => { showFlow = !showFlow; $('bFlow').classList.toggle('on', showFlow); };
  $('bHome').onclick = () => flyTo(HOME_POS.clone(), HOME_TGT.clone());
  $('infoX').onclick = clearSel;
  $('sheetToggle').onclick = () => document.body.classList.toggle('collapsed');
  document.querySelectorAll('.tab').forEach((t) => t.onclick = () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('on')); t.classList.add('on');
    document.querySelectorAll('.pane').forEach((p) => p.style.display = 'none');
    $(t.dataset.p).style.display = 'block';
    document.body.classList.remove('collapsed');
    updateSchema();
  });
  // pièces
  const pl = $('partsList');
  parts.filter((p) => p.name !== 'Socle en béton').forEach((p) => {
    const b = document.createElement('button'); b.className = 'item'; b.textContent = p.name;
    b.onclick = () => { if (hoodMode === 0) { hoodMode = 1; applyHood(); applyCut(); } selectPart(p, true); };
    pl.appendChild(b);
  });
  // pannes
  const fl = $('faultList');
  FAULTS.forEach((f) => {
    const d = document.createElement('div'); d.className = 'fault';
    d.innerHTML = `<button class="item">${f.t}</button><div class="fd"><b>Symptômes :</b> ${f.s}<br><b>Causes :</b> ${f.c}<br><b>Solutions :</b> ${f.r}</div>`;
    d.querySelector('button').onclick = () => {
      const was = S.fault === f.id;
      document.querySelectorAll('.fault').forEach((x) => x.classList.remove('on'));
      S.fault = was ? 'none' : f.id;
      if (!was) { d.classList.add('on'); flash('Panne simulée : ' + f.t + '. Lancez le cycle pour observer.'); }
      else flash('Panne retirée : fonctionnement normal.');
      $('faultNow').textContent = S.fault === 'none' ? 'Aucune panne (fonctionnement normal)' : 'Panne active : ' + f.t;
    };
    fl.appendChild(d);
  });
  buildQuiz();
}

const FAULTS = [
  { id: 'niveau', t: "Niveau d'huile bas", s: "Pompes bruyantes (cavitation), pression qui saute, vérin saccadé, alarme niveau.", c: "Fuite sur un flexible, un raccord ou un joint de vérin ; vidange mal refaite.", r: "Arrêter, rechercher et réparer la fuite, refaire le niveau avec la même huile (ISO VG 46) en passant par un filtre." },
  { id: 'filtre', t: 'Filtre de retour colmaté', s: "Indicateur de colmatage rouge, échauffement, contre-pression au retour, risque d'ouverture du by-pass (huile non filtrée).", c: "Huile polluée (poussière de bauxite, usure), cartouche non changée à temps.", r: "Changer la cartouche, vérifier le reniflard et les joints de tige (entrée de poussière), analyser l'huile." },
  { id: 'chaud', t: 'Huile trop chaude', s: "Température > 60 °C, huile qui devient fluide, pression qui baisse, joints qui durcissent.", c: "Pompes qui débitent en continu par le limiteur, ventilation bouchée, niveau bas, soleil, variateur mal réglé.", r: "Vérifier la mise à vide (Y0), nettoyer grilles et réservoir, contrôler le réglage du limiteur, refaire le niveau." },
  { id: 'limiteur', t: 'Limiteur de pression déréglé', s: "La pression ne dépasse pas ~90 bar : serrage insuffisant, le wagon peut glisser au retournement (DANGER).", c: "Ressort cassé, siège usé, impureté sous le clapet, réglage modifié.", r: "Contrôler au manomètre, nettoyer ou remplacer la cartouche, régler à la valeur constructeur puis plomber le réglage." },
  { id: 'decharge', t: 'Valve de décharge bloquée fermée', s: "Au serrage, P1 continue à débiter à haute pression : la puissance dépasse 30 kW, le variateur se met en défaut (surintensité).", c: "Tiroir grippé par la pollution, ressort mal réglé, pilotage bouché.", r: "Démonter et nettoyer la valve, changer l'huile/filtres si polluée, régler la pression de décharge (~50 bar)." },
  { id: 'fuite', t: 'Fuite interne du vérin', s: "Pendant le maintien, la pression des pinces baisse lentement, le patin recule.", c: "Joint de piston usé ou clapet piloté qui fuit.", r: "Isoler le vérin et faire un test de fuite, remplacer les joints ou le clapet piloté." },
  { id: 'bobine', t: 'Bobine Y1 hors service', s: "On commande le serrage mais le vérin ne bouge pas ; la LED de la bobine reste éteinte.", c: "Bobine grillée, connecteur débranché, fusible ou sortie automate 24 V en défaut.", r: "Mesurer le 24 V au connecteur, contrôler la résistance de la bobine, tester avec la commande manuelle de l'électrovanne, remplacer." },
];

const QUIZ = [
  { q: 'Que veut dire HPU sur la plaque ?', a: ['Haute Pression Unique', 'Hydraulic Power Unit (groupe hydraulique)', 'Huile Pour Usine'], c: 1, e: "HPU = Hydraulic Power Unit : centrale ou groupe hydraulique qui fournit l'huile sous pression." },
  { q: 'Pourquoi deux débits : 260 + 58 L/min ?', a: ['Pour avoir une pompe de secours', 'Approche rapide à basse pression + serrage à haute pression avec peu de puissance', 'Pour remplir le réservoir'], c: 1, e: "Montage double pompe haute / basse pression : la grande pompe fait vite, la petite fait fort." },
  { q: 'Que fait la valve de décharge quand la pression dépasse ~50 bar ?', a: ['Elle arrête le moteur', 'Elle envoie le débit de P1 au réservoir sans pression', 'Elle augmente la pression'], c: 1, e: "Ainsi seule P2 monte à 180 bar : 58 L/min × 180 bar ≈ 20 kW, sous les 30 kW du moteur." },
  { q: 'À quoi sert le variateur (« VARIABLE Hz ») ?', a: ['À changer la vitesse du moteur donc le débit', 'À régler la pression maximale', 'À changer le sens de rotation des pinces'], c: 0, e: "Moins de Hz = moteur plus lent = moins de débit, démarrage en douceur et économies d'énergie." },
  { q: 'Que signifie 24 VDC ?', a: ['Tension du moteur', 'Tension de commande (bobines, capteurs, automate)', 'Pression en bar'], c: 1, e: "Le moteur est en 400 V triphasé ; la commande est en 24 V continu, moins dangereuse." },
  { q: 'Pourquoi les pinces restent serrées pendant le retournement, pompes à vide ?', a: ["Grâce au clapet anti-retour piloté qui bloque l'huile en A", 'Grâce au filtre de retour', 'Grâce au reniflard'], c: 0, e: "Le clapet piloté enferme l'huile dans la chambre A ; il ne s'ouvre qu'avec la commande de desserrage." },
  { q: 'Effort d\'un vérin Ø125 à 180 bar ?', a: ['Environ 2 tonnes', 'Environ 22 tonnes', 'Environ 220 tonnes'], c: 1, e: "F = p × S = 180×10⁵ Pa × 0,01227 m² ≈ 221 000 N ≈ 22 t." },
  { q: 'IP65 veut dire :', a: ['Étanche à la poussière et protégé des jets d\'eau', 'Fonctionne à 65 °C', 'Pression 65 bar'], c: 0, e: "6 = totalement protégé contre la poussière ; 5 = protégé contre les jets d'eau." },
];
function buildQuiz() {
  const z = $('quiz'); let score = 0, done = 0;
  QUIZ.forEach((q, i) => {
    const d = document.createElement('div'); d.className = 'qq';
    d.innerHTML = `<p><b>${i + 1}. ${q.q}</b></p>` + q.a.map((a, j) => `<button class="item" data-j="${j}">${a}</button>`).join('') + '<div class="qe"></div>';
    d.querySelectorAll('button').forEach((b) => b.onclick = () => {
      if (d.dataset.done) return; d.dataset.done = 1; done++;
      const j = +b.dataset.j;
      if (j === q.c) { score++; b.classList.add('good'); } else { b.classList.add('badb'); d.querySelectorAll('button')[q.c].classList.add('good'); }
      d.querySelector('.qe').textContent = q.e;
      $('qScore').textContent = `Score : ${score} / ${done}` + (done === QUIZ.length ? (score >= 6 ? ' — Bravo !' : ' — Revoyez le cours.') : '');
    });
    z.appendChild(d);
  });
}

// ---------- Boucle ----------
let lastLayout = '';
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const th = $('top').offsetHeight, sh = $('sheet').offsetHeight;
  const key = w + 'x' + h + ':' + th + ':' + sh;
  if (key === lastLayout) return; lastLayout = key;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  const visAsp = w / Math.max(100, h - th - sh); camera.fov = visAsp < 0.9 ? 62 : visAsp < 1.4 ? 50 : 40;
  document.documentElement.style.setProperty('--th', (th + 6) + 'px');
  const vc = (th + (h - sh)) / 2, d = vc - h / 2;
  camera.setViewOffset(w, h, 0, -d, w, h);
  camera.updateProjectionMatrix();
}
const clock = new THREE.Clock();
let hudT = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), DT_MAX);
  resize();
  step(dt); updateFlows(dt); updateVisuals(dt);
  if (fly) {
    fly.u = Math.min(1, fly.u + dt * 1.6); const e = 1 - Math.pow(1 - fly.u, 3);
    camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (fly.u >= 1) fly = null;
  }
  controls.update();
  hudT += dt; if (hudT > 0.12) { hudT = 0; hud(); }
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) $('toast').style.opacity = 0; }
  $('bStart').textContent = S.motorOn ? '■ Arrêter le moteur' : '▶ Démarrer le moteur';
  $('bStart').classList.toggle('on', S.motorOn);
  $('bAuto').classList.toggle('on', S.auto);
  renderer.render(scene, camera);
}
bindUI(); applyHood(); applyCut();
window.__S = S; window.__cmd = { cmdStart, cmdStop, cmdClamp, cmdUnclamp, cmdAuto };
loop();
