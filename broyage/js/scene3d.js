/* =====================================================================
   scene3d.js — Vue 3D animée de la chaîne de broyage (Three.js)
   Lit l'état calculé par app.js (window.BROYAGE) et l'affiche en 3D :
   culbuteur, trémie, alimentateur à tabliers, miettes, chaîne racleuse,
   broyeur à rouleaux, convoyeur CV301 et leurs chaînes cinématiques.
   Coordonnées : x, y du plan 2D (1 u = 2 cm) ; z = profondeur.
   ===================================================================== */
import * as THREE from '../vendor/three.min.js';
import { OrbitControls, RoomEnvironment } from '../vendor/three.min.js';

const B = window.BROYAGE;
const G = B.GEO, S = 0.01;
const X = (x) => (x - 960) * S, Y = (y) => (G.SOL - y) * S;

// ---------- Rendu ----------
const canvas = document.getElementById('canvas3d');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  renderer = null;
}

if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMappingExposure = 0.9;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);
  scene.fog = new THREE.Fog(0x0b1220, 40, 90);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 300);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.screenSpacePanning = true;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.maxDistance = 60; controls.minDistance = 1.2;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 0.9));
  const lum = new THREE.DirectionalLight(0xffffff, 1.4); lum.position.set(2, 3, 4);
  camera.add(lum); scene.add(camera);

  // ---------- Matériaux ----------
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.35, ...o });
  const M = {
    acier: mat(0x8b95a5, { metalness: 0.6, roughness: 0.4 }), fonce: mat(0x4b5563), charpente: mat(0x334155),
    jaune: mat(0xeab308, { metalness: 0.2 }), bleu: mat(0x2563eb, { metalness: 0.3 }), bleuF: mat(0x1e3a8a),
    reduc: mat(0x64748b, { metalness: 0.45 }), orange: mat(0xf59e0b, { metalness: 0.3 }), rouge: mat(0xdc2626),
    violet: mat(0xa855f7), caout: mat(0x161b26, { metalness: 0, roughness: 0.9 }), beton: mat(0x1d2535, { metalness: 0, roughness: 0.95 }),
    sol: mat(0x1c2537, { metalness: 0, roughness: 1 }), bauxite: mat(0x7a3216, { metalness: 0, roughness: 1 }),
    vitre: mat(0x94a3b8, { transparent: true, opacity: 0.16, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    jupe: mat(0x64748b, { transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
    noir: mat(0x0f172a), vert: mat(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 0.6 }), invisible: new THREE.MeshBasicMaterial({ visible: false })
  };
  // bande avec stries pour voir le mouvement
  const texBande = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 16;
    const g = c.getContext('2d'); g.fillStyle = '#1a1f2b'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#2f3746'; g.fillRect(0, 0, 6, 16);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  const racine = new THREE.Group(); scene.add(racine);
  const ajout = (o, parent = racine) => { parent.add(o); return o; };

  // ---------- Primitives (dimensions en unités du plan, z en m×0,5) ----------
  function boite(w, h, d, m, x, y, z = 0, parent) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w * S, h * S, d), m);
    o.position.set(X(x), Y(y), z); return ajout(o, parent);
  }
  function boiteLoc(w, h, d, m, lx, ly, z, parent) { // coordonnées locales d'un groupe
    const o = new THREE.Mesh(new THREE.BoxGeometry(w * S, h * S, d), m);
    o.position.set(lx * S, -ly * S, z); return ajout(o, parent);
  }
  function segment(x1, y1, x2, y2, ep, d, m, z = 0, parent) {
    const dx = X(x2) - X(x1), dy = Y(y2) - Y(y1), L = Math.hypot(dx, dy);
    const o = new THREE.Mesh(new THREE.BoxGeometry(L, ep * S, d), m);
    o.position.set((X(x1) + X(x2)) / 2, (Y(y1) + Y(y2)) / 2, z); o.rotation.z = Math.atan2(dy, dx);
    return ajout(o, parent);
  }
  function cylZ(r, L, m, x, y, z = 0, parent, seg = 24) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r * S, r * S, L, seg), m);
    o.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.add(o); g.position.set(X(x), Y(y), z);
    return ajout(g, parent);
  }
  function geoEngrenage(r, n, ht, prof, trou = 0) {
    const s = new THREE.Shape();
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, da = Math.PI * 2 / n, pt = (a, rr) => [Math.cos(a) * rr * S, Math.sin(a) * rr * S];
      const p = [pt(a0, r), pt(a0 + da * 0.25, r + ht), pt(a0 + da * 0.5, r + ht), pt(a0 + da * 0.75, r)];
      p.forEach(([a, b], k) => (i === 0 && k === 0 ? s.moveTo(a, b) : s.lineTo(a, b)));
    }
    s.closePath();
    if (trou > 0) { const h = new THREE.Path(); h.absarc(0, 0, trou * S, 0, Math.PI * 2, true); s.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -prof / 2); return g;
  }
  function engrenage(r, n, ht, prof, m, x, y, z = 0, parent) {
    const o = new THREE.Mesh(geoEngrenage(r, n, ht, prof, r > 25 ? 0 : r * 0.3), m);
    o.position.set(X(x), Y(y), z); return ajout(o, parent);
  }
  // moteur électrique horizontal (axe selon x)
  function moteur(x, y, w, h, z, sens = 1) {
    const g = new THREE.Group(); g.position.set(X(x), Y(y), z); ajout(g);
    const r = h / 2 * S, L = w * 0.72 * S;
    const corps = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 28), M.bleu); corps.rotation.z = Math.PI / 2; g.add(corps);
    for (let i = -3; i <= 3; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.07, r * 1.07, L * 0.03, 28), M.bleuF); a.rotation.z = Math.PI / 2; a.position.x = i * L / 8; g.add(a); }
    const capot = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.95, w * 0.2 * S, 28), M.bleuF); capot.rotation.z = Math.PI / 2; capot.position.x = -sens * (L / 2 + w * 0.1 * S); g.add(capot);
    const bb = new THREE.Mesh(new THREE.BoxGeometry(L * 0.3, r * 0.5, r * 0.9), M.noir); bb.position.y = r * 1.15; g.add(bb);
    const pied = new THREE.Mesh(new THREE.BoxGeometry(L * 0.9, r * 0.3, r * 2.2), M.charpente); pied.position.y = -r * 1.05; g.add(pied);
    const arbre = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, w * 0.25 * S, 12), M.acier); arbre.rotation.z = Math.PI / 2; arbre.position.x = sens * (L / 2 + w * 0.12 * S); g.add(arbre);
    // ventilateur visible (tourne)
    const ventil = new THREE.Group(); ventil.position.x = -sens * (L / 2 + w * 0.21 * S); g.add(ventil);
    for (let k = 0; k < 3; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.004, r * 1.5, r * 0.18), M.acier); p.rotation.x = k * Math.PI / 3; ventil.add(p); }
    return { g, ventil };
  }
  function reducteur(x, y, w, h, z, d = 0.5) {
    const g = new THREE.Group(); g.position.set(X(x), Y(y), z); ajout(g);
    const c = new THREE.Mesh(new THREE.BoxGeometry(w * S, h * S, d), M.reduc); g.add(c);
    const j = new THREE.Mesh(new THREE.BoxGeometry(w * S * 1.04, h * S * 0.06, d * 1.04), M.charpente); g.add(j);
    for (const sx of [-1, 1]) { const n = new THREE.Mesh(new THREE.BoxGeometry(w * S * 0.12, h * S * 0.9, d * 1.06), M.charpente); n.position.x = sx * w * S * 0.3; g.add(n); }
    return g;
  }
  function accouplement(x, y, z, r = 10) { return cylZ(r, 0.04, M.jaune, x, y, z); }
  function tourneAxeX(r, L, m, x, y, z) {    // pièce tournant autour d'un axe horizontal x (arbre, accouplement)
    const g = new THREE.Group(); g.position.set(X(x), Y(y), z); ajout(g);
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r * S, r * S, L * S, 16), m); o.rotation.z = Math.PI / 2; g.add(o);
    const rep = new THREE.Mesh(new THREE.BoxGeometry(L * S * 1.02, r * S * 0.35, r * S * 2.05), M.noir); g.add(rep);
    return g;
  }

  const anim = {};   // pièces animées
  const zones = [];  // volumes de sélection (toucher)
  function zone(id, x1, y1, x2, y2, z1, z2) {
    const o = new THREE.Mesh(new THREE.BoxGeometry((x2 - x1) * S, (y2 - y1) * S, z2 - z1), M.invisible);
    o.position.set(X((x1 + x2) / 2), Y((y1 + y2) / 2), (z1 + z2) / 2); o.userData.id = id; zones.push(o); racine.add(o);
  }

  // =====================================================================
  //  Construction
  // =====================================================================
  // --- Génie civil : sol (arrière), sous-sol, mur du fond ---
  boite(2300, 16, 15, M.sol, 960, G.SOL + 24, -9.4);             // sol (arrière, vue en coupe)
  boite(2300, 600, 0.2, M.beton, 960, G.SOL + 300, -2.0);         // mur du fond
  boite(2300, 10, 5.5, M.sol, 960, 885, 0.65);                    // plancher du sous-sol
  boite(225, 16, 3.9, M.beton, -28, G.SOL + 16, 0.05);            // dalle à gauche de la fosse

  // --- Culbuteur ---
  const C = G.CUL;
  const piv = new THREE.Group(); piv.position.set(X(C.x), Y(C.y), 0); racine.add(piv);
  for (const z of [-1.55, 1.55]) {
    const ann = new THREE.Mesh(geoEngrenage(C.R + 4, 100, 6, 0.16, C.R - 10), M.reduc); ann.position.z = z; piv.add(ann);
    const bande = new THREE.Mesh(new THREE.TorusGeometry((C.R - 9) * S, 0.035, 8, 64), M.jaune); bande.position.z = z + (z > 0 ? 0.09 : -0.09); piv.add(bande);
  }
  for (const [lx, ly] of [[-118, -60], [118, -60], [-125, 75], [125, 75]]) boiteLoc(14, 14, 3.3, M.charpente, lx, ly, 0, piv);
  boiteLoc(210, 10, 3.3, M.fonce, 0, 82, 0, piv);                       // plateforme
  // --- Voie ferrée : rails profilés (champignon, âme, patin), traverses, ballast ---
  const RAIL_Y = C.y + 67, ECART = 54, PAS_W = 3.0;                      // dessus du rail, demi-écartement, pas des wagons
  const matRail = mat(0xa8b0bc, { metalness: 0.85, roughness: 0.3 });
  const geoRail = (L) => {
    const f = [[-6, 10], [6, 10], [6, 8], [1.3, 7], [1.3, 3], [3, 2], [3, 0], [-3, 0], [-3, 2], [-1.3, 3], [-1.3, 7], [-6, 8]];
    const sh = new THREE.Shape(f.map(([u, v]) => new THREE.Vector2(u * S, (v - 10) * S)));   // origine = dessus du rail
    const g = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false }); g.translate(0, 0, -L / 2); return g;
  };
  function rail(lx, ly, z1, z2, parent) {           // rail le long de z (lx, ly : position du dessus, repère du parent)
    const o = new THREE.Mesh(geoRail(z2 - z1), matRail); o.position.set(lx, ly, (z1 + z2) / 2); return ajout(o, parent);
  }
  for (const s of [-1, 1]) rail(s * ECART * S, -67 * S, -1.65, 1.65, piv);        // rails sur la plateforme du culbuteur
  for (const s of [-1, 1]) boiteLoc(14, 5, 3.3, M.charpente, s * ECART, 79.5, 0, piv);   // semelles sous les rails
  // voie arrière (sur ballast) et voie avant (sur pont métallique)
  const Z_AR = [-17, -1.85], Z_AV = [1.85, 11];
  for (const s of [-1, 1]) for (const [z1, z2] of [Z_AR, Z_AV]) rail(X(C.x + s * ECART), Y(RAIL_Y), z1, z2);
  const matTrav = mat(0x6b6f76, { metalness: 0.1, roughness: 0.9 }), nTr = Math.round((Z_AR[1] - Z_AR[0]) / 0.3) + Math.round((Z_AV[1] - Z_AV[0]) / 0.3);
  const trav = new THREE.InstancedMesh(new THREE.BoxGeometry(170 * S, 5 * S, 0.12), matTrav, nTr); racine.add(trav);
  let it = 0;
  for (const [z1, z2] of [Z_AR, Z_AV]) for (let z = z1 + 0.15; z < z2 && it < nTr; z += 0.3) {
    trav.setMatrixAt(it++, new THREE.Matrix4().makeTranslation(X(C.x), Y(RAIL_Y + 12.5), z));
  }
  trav.count = it;
  const ballast = new THREE.Shape([[-100, 320], [100, 320], [135, 327], [-135, 327]].map(([u, v]) => new THREE.Vector2(u * S, Y(v))));
  const gB = new THREE.ExtrudeGeometry(ballast, { depth: Z_AR[1] - Z_AR[0], bevelEnabled: false }); gB.translate(X(C.x), 0, Z_AR[0]);
  racine.add(new THREE.Mesh(gB, mat(0x57534e, { metalness: 0, roughness: 1 })));
  // pont côté avant : deux poutres en I, entretoises, poteaux
  for (const s of [-1, 1]) {
    const xg = C.x + s * ECART;
    boite(14, 3, Z_AV[1] - Z_AV[0], M.charpente, xg, RAIL_Y + 16.5, (Z_AV[0] + Z_AV[1]) / 2);
    boite(3, 22, Z_AV[1] - Z_AV[0], M.charpente, xg, RAIL_Y + 29, (Z_AV[0] + Z_AV[1]) / 2);
    boite(14, 3, Z_AV[1] - Z_AV[0], M.charpente, xg, RAIL_Y + 41.5, (Z_AV[0] + Z_AV[1]) / 2);
    for (const z of [4.6, 8.2, 11]) boite(10, 880 - RAIL_Y - 43, 0.1, M.charpente, xg, (RAIL_Y + 43 + 880) / 2, z);
  }
  for (let z = Z_AV[0] + 0.6; z < Z_AV[1]; z += 1.2) boite(2 * ECART, 6, 0.06, M.charpente, C.x, RAIL_Y + 30, z);
  // --- Wagons (trémie ouverte, bogies, attelages) ---
  const tole = mat(0x4b5563, { metalness: 0.5 }), tole2 = mat(0x374151, { metalness: 0.5 });
  const geoRoue = new THREE.CylinderGeometry(9 * S, 9 * S, 0.05, 20); geoRoue.rotateZ(Math.PI / 2);
  const geoTas = (() => {
    const p = [[-90, 44], [90, 44], [72, 52], [35, 61], [0, 64], [-35, 61], [-72, 52]];
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(p.map(([u, v]) => new THREE.Vector2(u * S, v * S))), { depth: 2.5, bevelEnabled: false });
    g.translate(0, 0, -1.25); return g;
  })();
  function creerWagon(plein) {
    const w = new THREE.Group(), roues = [];
    boiteLoc(192, 6, 2.7, tole, 0, 47, 0, w);                                   // fond
    for (const s of [-1, 1]) boiteLoc(6, 95, 2.7, tole, s * 93, 2, 0, w);        // parois longues
    for (const s of [-1, 1]) boiteLoc(192, 95, 0.05, tole, 0, 2, s * 1.33, w);   // parois d'extrémité
    for (const s of [-1, 1]) boiteLoc(200, 5, 2.76, tole2, 0, s > 0 ? -46 : 44, 0, w);     // cadre haut / bas
    for (const s of [-1, 1]) for (const k of [-0.9, -0.3, 0.3, 0.9]) boiteLoc(5, 97, 0.06, tole2, s * 97, 2, k, w); // raidisseurs
    for (const zb of [-0.95, 0.95]) {
      boiteLoc(130, 8, 0.75, M.charpente, 0, 52, zb, w);                        // châssis du bogie
      for (const dz of [-0.28, 0.28]) for (const s of [-1, 1]) {
        const r = new THREE.Mesh(geoRoue, M.noir); r.position.set(s * (ECART - 3.5) * S, -58 * S, zb + dz); w.add(r); roues.push(r);
      }
    }
    for (const s of [-1, 1]) boiteLoc(14, 10, 0.18, M.charpente, 0, 48, s * 1.42, w);  // attelages
    const ch = boiteLoc(180, 88, 2.6, M.bauxite, 0, 0, 0, w);
    ch.add(new THREE.Mesh(geoTas, M.bauxite));                                   // dôme de bauxite
    ch.visible = plein;
    w.userData = { charge: ch, roues };
    return w;
  }
  const wagon = creerWagon(true); piv.add(wagon);
  const charge = wagon.userData.charge;
  // brides de serrage
  const brides = [];
  for (const s of [-1, 1]) { const b = boiteLoc(40, 10, 2.6, M.jaune, s * 90, -70, 0, piv); brides.push(b); boiteLoc(8, 26, 2.6, M.jaune, s * 90, -86, 0, piv); }
  // rame : wagons pleins en attente (arrière), wagons vidés (avant)
  const rame = new THREE.Group(); rame.position.set(X(C.x), Y(C.y), 0); racine.add(rame);
  const wagonsRame = [];
  for (const k of [-4, -3, -2, -1, 1, 2, 3]) { const w = creerWagon(k < 0); w.position.z = k * PAS_W; rame.add(w); wagonsRame.push(w); }
  anim.cul = { piv, wagon, charge, brides, rame, wagonsRame, PAS_W };
  // galets porteurs
  for (const a of [Math.PI * 0.62, Math.PI * 0.38]) for (const z of [-1.55, 1.55]) {
    const gx = C.x + Math.cos(a) * (C.R + 14), gy = C.y + Math.sin(a) * (C.R + 14);
    cylZ(10, 0.22, M.acier, gx, gy, z); boite(28, 40, 0.3, M.charpente, gx, gy + 20, z);
  }
  // entraînement : pignon + réducteur + frein + accouplement + moteur (côté avant)
  const zC = 1.55;
  const px = C.x + C.R + 10 + 18;
  anim.pignon = engrenage(16, 9, 5, 0.2, M.acier, px, C.y, zC);
  boite(190, G.SOL - 268, 0.8, M.beton, 540, (268 + G.SOL) / 2 + 4, zC);
  anim.arbreCul = tourneAxeX(4, 40, M.acier, 444, C.y, zC);
  reducteur(493, 239, 70, 58, zC, 0.6);
  anim.freinCul = cylZ(16, 0.05, M.rouge, 537, C.y, zC + 0.28);
  anim.accCul = tourneAxeX(9, 12, M.jaune, 550, C.y, zC);
  anim.motCul = moteur(598, 240, 72, 36, zC, -1);
  zone('culbuteur', 95, 60, 640, 330, -1.8, 2);

  // --- Trémie ---
  const T = G.TREM, zT = 0.95;
  for (const s of [-1, 1]) {
    const f = new THREE.Shape([[T.xh1, T.yh], [T.xh2, T.yh], [T.xb2, T.yb], [T.xb1, T.yb]].map(([a, b]) => new THREE.Vector2(X(a), Y(b))));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(f), s > 0 ? M.vitre : M.fonce); m.position.z = s * zT; racine.add(m);
  }
  segment(T.xh1, T.yh, T.xb1, T.yb, 7, zT * 2, M.acier);
  segment(T.xh2, T.yh, T.xb2, T.yb, 7, zT * 2, M.acier);
  segment(T.xb1, T.yb, T.xb1, G.AL_HAUT - 30, 7, 1.1, M.acier);
  segment(T.xb2, T.yb, T.xb2, G.AL_HAUT - 34, 7, 1.1, M.acier);
  boite(7, G.AL_HAUT - 34 - T.yb + 4, 1.1, M.jaune, T.xb2, (G.AL_HAUT - 34 + T.yb) / 2);   // porte de réglage
  for (const s of [-1, 1]) boite(14, 12, 0.08, M.charpente, T.xh1 - 4, T.yh - 4, s * zT), boite(14, 12, 0.08, M.charpente, T.xh2 + 4, T.yh - 4, s * zT);
  let remplissage = null, dernierStock = -1;
  function majTremie() {
    const st = B.etat.stock;
    if (Math.abs(st - dernierStock) < 0.5) return;
    dernierStock = st;
    if (remplissage) { racine.remove(remplissage); remplissage.geometry.dispose(); remplissage = null; }
    if (st <= 0.2) return;
    const sy = T.yb - (st / G.CAPA) * (T.yb - T.yh), k = (sy - T.yh) / (T.yb - T.yh);
    const xl = T.xh1 + (T.xb1 - T.xh1) * k, xr = T.xh2 + (T.xb2 - T.xh2) * k;
    const pts = [[xl + 3, sy], [T.xb1 + 3, T.yb], [T.xb1 + 3, G.AL_HAUT - 2], [T.xb2 - 3, G.AL_HAUT - 2], [T.xb2 - 3, T.yb], [xr - 3, sy], [(xl + xr) / 2, sy - 12]];
    const sh = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(X(a), Y(b))));
    const g = new THREE.ExtrudeGeometry(sh, { depth: zT * 1.9, bevelEnabled: false }); g.translate(0, 0, -zT * 0.95);
    remplissage = new THREE.Mesh(g, M.bauxite); racine.add(remplissage);
  }

  // --- Alimentateur à tabliers ---
  const A = G.AL, LA = A.x2 - A.x1, nA = Math.ceil(LA / A.P), zA = 0.55;
  for (const s of [-1, 1]) boite(LA, 12, 0.08, M.charpente, (A.x1 + A.x2) / 2, A.y, s * zA);
  for (let x = A.x1 - 10; x <= A.x2 + 10; x += 170) for (const s of [-1, 1]) boite(10, 880 - A.y, 0.1, M.charpente, x, (A.y + 880) / 2, s * zA);
  for (let x = A.x1 + 40; x < A.x2; x += 70) cylZ(5, zA * 2, M.fonce, x, A.y - 4);
  const tabliers = new THREE.InstancedMesh(new THREE.BoxGeometry((A.P - 3) * S, 8 * S, zA * 1.8), mat(0x9ca3af, { metalness: 0.55 }), nA * 2);
  racine.add(tabliers);
  anim.barbA = [];
  for (const x of [A.x1, A.x2]) for (const s of [-1, 1]) anim.barbA.push(engrenage(A.r - 4, 8, 5, 0.1, M.acier, x, A.y, s * 0.42));
  cylZ(5, zA * 2.3, M.acier, A.x1, A.y); cylZ(5, zA * 2.6, M.acier, A.x2, A.y, 0.15);
  boite(22, 6, 0.1, M.jaune, A.x1 - 29, A.y, zA);     // tendeur
  for (const s of [-1, 1]) boite(330, 38, 0.03, M.jupe, T.xb2 + 165, G.AL_HAUT - 21, s * 0.46);   // jupes latérales
  // entraînement (côté avant)
  const zAD = 0.85;
  boite(115, 6, 0.7, M.charpente, 787, 524, zAD);
  anim.redA = reducteur(821, 495, 62, 50, zAD, 0.4);
  anim.sortieA = engrenage(7, 9, 3, 0.05, M.acier, 828, 496, zAD + 0.24);
  anim.secA = engrenage(11, 12, 3, 0.05, M.acier, A.x2, A.y, zAD + 0.24);
  segment(828 - 9, 496, A.x2 - 13, A.y, 3, 0.03, M.fonce, zAD + 0.24);
  segment(828 + 9, 496, A.x2 + 13, A.y, 3, 0.03, M.fonce, zAD + 0.24);
  anim.accA = tourneAxeX(8, 10, M.jaune, 784, 495, zAD);
  anim.motA = moteur(747, 495, 62, 30, zAD, 1);
  boite(46, 60, 0.4, M.noir, 673, 480, zAD);
  boite(34, 14, 0.02, M.vert, 673, 465, zAD + 0.21);                 // écran du variateur
  zone('alim', 140, 470, 860, 625, -0.7, 1.2);

  // --- Chaîne racleuse ---
  const R = G.RA, LR = R.x2 - R.x1, zR = 0.36;
  boite(R.xd1 - (R.x1 - 25), 4, zR * 2, M.acier, (R.x1 - 25 + R.xd1) / 2, R.fond + 2);
  boite(R.x2 + 20 - R.xd2, 4, zR * 2, M.acier, (R.xd2 + R.x2 + 20) / 2, R.fond + 2);
  boite(LR + 45, R.fond - 648, 0.04, M.fonce, (R.x1 + R.x2) / 2 - 2, (648 + R.fond) / 2, -zR);
  boite(LR + 45, R.fond - 648, 0.02, M.vitre, (R.x1 + R.x2) / 2 - 2, (648 + R.fond) / 2, zR);
  boite(4, R.fond - 648, zR * 2, M.acier, R.x1 - 25, (648 + R.fond) / 2); boite(4, R.fond - 648, zR * 2, M.acier, R.x2 + 20, (648 + R.fond) / 2);
  for (let x = R.x1; x < R.x2; x += 150) boite(8, 880 - R.fond, 0.08, M.charpente, x, (R.fond + 880) / 2, -zR);
  segment(R.xd1, R.fond + 2, R.xd1 + 2, B.yBande(R.xd1) - 14, 3, zR * 2, M.fonce);
  segment(R.xd2, R.fond + 2, R.xd2 + 4, B.yBande(R.xd2) - 14, 3, zR * 2, M.fonce);
  for (const s of [-1, 1]) for (const yy of [R.y - R.r + 2, R.y + R.r - 2]) boite(LR, 3, 0.04, mat(0xa1a1aa, { metalness: 0.7 }), (R.x1 + R.x2) / 2, yy, s * 0.26);
  const nR = Math.ceil(LR / 40);
  const raclettes = new THREE.InstancedMesh(new THREE.BoxGeometry(4 * S, 1, zR * 1.85), M.jaune, nR * 2); racine.add(raclettes);
  anim.barbR = [];
  for (const x of [R.x1, R.x2]) for (const s of [-1, 1]) anim.barbR.push(engrenage(R.r - 4, 7, 4, 0.06, M.acier, x, R.y, s * 0.26));
  const zRD = 0.6;
  boite(75, 5, 0.5, M.charpente, 792, 754, zRD);
  segment(R.x2, R.y, 760, 735, 4, 0.04, M.acier, zRD);
  reducteur(769, 736, 34, 32, zRD, 0.32);
  anim.accR = tourneAxeX(7, 8, M.jaune, 792, 736, zRD);
  anim.motR = moteur(817, 736, 34, 24, zRD, -1);
  zone('racleuse', 120, 645, 840, 760, -0.5, 0.9);

  // --- Broyeur ---
  const Br = G.BR, zB = 0.62;
  const carter = new THREE.Shape([[Br.x1, Br.y1], [Br.x2, Br.y1], [Br.x2 - 25, Br.ry - 10], [Br.x2 - 25, Br.y2], [Br.x1 + 25, Br.y2], [Br.x1 + 25, Br.ry - 10]].map(([a, b]) => new THREE.Vector2(X(a), Y(b))));
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(carter), s > 0 ? M.vitre : M.fonce); m.position.z = s * zB; racine.add(m); }
  segment(Br.x1 - 6, Br.y1 - 8, Br.x1, Br.y1, 5, zB * 2, M.jaune); segment(Br.x1, Br.y1, Br.x1 + 25, Br.ry - 10, 5, zB * 2, M.jaune); segment(Br.x1 + 25, Br.ry - 10, Br.x1 + 25, Br.y2, 5, zB * 2, M.jaune);
  segment(Br.x2 + 6, Br.y1 - 8, Br.x2, Br.y1, 5, zB * 2, M.jaune); segment(Br.x2, Br.y1, Br.x2 - 25, Br.ry - 10, 5, zB * 2, M.jaune); segment(Br.x2 - 25, Br.ry - 10, Br.x2 - 25, Br.y2, 5, zB * 2, M.jaune);
  const dentsMat = mat(0x9ca3af, { metalness: 0.7, roughness: 0.35 });
  anim.r1 = engrenage(Br.R - 6, 10, 8, zB * 1.8, dentsMat, Br.rx1, Br.ry);
  anim.r2 = engrenage(Br.R - 6, 10, 8, zB * 1.8, dentsMat, Br.rx2, Br.ry);
  // deux modules : chaque rouleau a sa propre chaîne cinématique, dans l'axe du rouleau (côté avant)
  // rouleau → accouplement à denture → réducteur → coupleur hydraulique → moteur
  boite(140, 6, 1.9, M.charpente, (Br.rx1 + Br.rx2) / 2, Br.ry + 33, 1.7);                 // passerelle support
  for (const x of [Br.rx1 - 32, Br.rx2 + 32]) for (const z of [0.85, 2.55]) boite(8, 880 - Br.ry - 36, 0.08, M.charpente, x, (Br.ry + 36 + 880) / 2, z);
  anim.modB = [];
  [Br.rx1, Br.rx2].forEach((x, k) => {
    cylZ(6, 0.5, M.acier, x, Br.ry, zB + 0.1);                                               // arbre du rouleau
    const acc = cylZ(11, 0.08, M.fonce, x, Br.ry, 0.88);                                    // accouplement à denture
    boite(4, 20, 0.09, M.jaune, x, Br.ry, 0.88);
    const red = new THREE.Mesh(new THREE.BoxGeometry(48 * S, 56 * S, 0.5), M.reduc); red.position.set(X(x), Y(Br.ry), 1.17); racine.add(red);
    boite(52, 4, 0.52, M.charpente, x, Br.ry, 1.17);
    const arb = cylZ(4, 0.14, M.acier, x, Br.ry, 1.48);
    const coup = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), M.orange); coup.scale.set(17 * S, 17 * S, 0.17); coup.position.set(X(x), Y(Br.ry), 1.66); racine.add(coup);
    const mot = moteur(x, Br.ry, 72, 36, 2.12, -1); mot.g.rotation.y = -Math.PI / 2;
    // repère du sens de rotation sur l'accouplement
    acc.add(new THREE.Mesh(new THREE.BoxGeometry(18 * S, 4 * S, 0.1), M.jaune));
    anim.modB.push({ acc, arb, mot, sens: k ? 1 : -1 });
  });
  zone('broyeur', 835, 590, 1030, 750, -0.8, 2.7);

  // --- Convoyeur CV301 ---
  const V = G.CV, ang = Math.atan2(Y(V.y2 - V.rt) - Y(V.y1 - V.rq), X(V.x2) - X(V.x1)), zV = 0.42;
  const longB = Math.hypot(X(V.x2) - X(V.x1), Y(V.y2 - V.rt) - Y(V.y1 - V.rq));
  const bandeMat = new THREE.MeshStandardMaterial({ map: texBande, roughness: 0.9, metalness: 0 });
  texBande.repeat.set(longB / 0.35, 1);
  const bande = segment(V.x1, B.yBande(V.x1) - 2.5, V.x2, B.yBande(V.x2) - 2.5, 5, zV * 1.6, bandeMat);
  // brin de retour avec tendeur à contrepoids
  const tx = 1480, ty = 790, retMat = M.caout;
  segment(V.x1, B.yRetour(V.x1), 1440, B.yRetour(1440), 5, zV * 1.6, retMat);
  segment(1440, B.yRetour(1440), tx - 13, ty, 5, zV * 1.6, retMat);
  segment(tx + 13, ty, 1520, B.yRetour(1520), 5, zV * 1.6, retMat);
  segment(1520, B.yRetour(1520), V.x2, B.yRetour(V.x2), 5, zV * 1.6, retMat);
  anim.tend = [cylZ(8, zV * 1.8, M.fonce, 1440, B.yRetour(1440)), cylZ(8, zV * 1.8, M.fonce, 1520, B.yRetour(1520)), cylZ(13, zV * 1.8, M.fonce, tx, ty)];
  for (const s of [-1, 1]) segment(tx + s * 12, ty, tx + s * 12, ty + 25, 2, 0.03, M.acier, 0);
  boite(44, 40, 0.8, mat(0x52525b), tx, ty + 45);
  // rouleaux porteurs en auge et charpente
  anim.rouleaux = [];
  for (let x = V.x1 + 30; x < V.x2 - 10; x += 40) {
    const y = B.yBande(x) + 6;
    anim.rouleaux.push(cylZ(5, zV * 1.0, M.fonce, x, y));
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(5 * S, 5 * S, 0.32, 12), M.fonce);
      w.position.set(X(x), Y(y) + 0.1, s * (zV * 0.5 + 0.13)); w.rotation.x = s * (Math.PI / 2 - 0.5); racine.add(w);
    }
  }
  for (let x = V.x1 + 90; x < V.x2 - 30; x += 160) if (x < 1420 || x > 1540) cylZ(5, zV * 1.8, M.fonce, x, B.yRetour(x) + 6);
  for (const s of [-1, 1]) segment(V.x1, B.yBande(V.x1) + 14, V.x2, B.yBande(V.x2) + 14, 8, 0.06, M.charpente, s * (zV + 0.12));
  for (let x = V.x1 + 60; x < V.x2; x += 160) for (const s of [-1, 1]) boite(6, 880 - B.yBande(x) - 14, 0.06, M.charpente, x, (B.yBande(x) + 14 + 880) / 2, s * (zV + 0.12));
  // garde-bandes (bavettes) au chargement
  for (const s of [-1, 1]) segment(700, B.yBande(700) - 12, 1040, B.yBande(1040) - 12, 22, 0.02, M.jupe, s * zV * 0.75);
  anim.tamQ = cylZ(V.rq - 3, zV * 1.9, M.acier, V.x1, V.y1);
  anim.tamT = cylZ(V.rt - 3, zV * 1.9, M.acier, V.x2, V.y2);
  for (const [x, y, r] of [[V.x1, V.y1, V.rq], [V.x2, V.y2, V.rt]]) {
    const enr = new THREE.Mesh(new THREE.CylinderGeometry(r * S, r * S, zV * 1.6, 24, 1, true, x === V.x1 ? Math.PI : 0, Math.PI), retMat);
    enr.rotation.x = Math.PI / 2; enr.rotation.y = 0; const g = new THREE.Group(); g.add(enr); g.position.set(X(x), Y(y), 0); racine.add(g);
  }
  boite(22, 6, 0.1, M.jaune, V.x1 - 34, V.y1, zV + 0.1);
  // goulotte de tête
  boite(82, 240, 1.2, M.vitre, V.x2 + 47, 668);
  boite(82, 240, 0.03, M.fonce, V.x2 + 47, 668, -0.6);
  // entraînement de tête
  const zVD = zV + 0.45;
  cylZ(6, zVD + 0.1, M.acier, V.x2, V.y2, zVD / 2);
  boite(170, 6, 0.8, M.charpente, 1837, 610, zVD);
  anim.arbreV = tourneAxeX(5, 100, M.acier, 1710, V.y2, zVD);
  cylZ(10, 0.12, M.violet, 1752, V.y2, zVD);
  reducteur(1791, 581, 58, 52, zVD, 0.5);
  const cV = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), M.orange); cV.scale.set(15 * S, 15 * S, 15 * S); cV.position.set(X(1839), Y(V.y2), zVD); racine.add(cV);
  anim.motV = moteur(1887, 580, 62, 36, zVD, -1);
  zone('cv301', 630, 540, 1960, 890, -0.7, 1.3);
  anim.bande = bande;

  // --- Bauxite (blocs, miettes, fragments) ---
  const MAXP = 1500;
  const geoBloc = new THREE.IcosahedronGeometry(1, 0);
  const blocs = new THREE.InstancedMesh(geoBloc, new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, flatShading: true }), MAXP);
  blocs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  blocs.setColorAt(0, new THREE.Color()); blocs.count = 0; blocs.frustumCulled = false; racine.add(blocs);
  const couleurs = new Map();
  const coul = (c) => { let v = couleurs.get(c); if (!v) { v = new THREE.Color(c); couleurs.set(c, v); } return v; };
  const LIM = { tablier: 0.4, raclage: 0.28, bande: 0.26, chute: 1.1 };

  // ---------- Étiquettes HTML ----------
  const calque = document.getElementById('etiq3d');
  const divs = [];
  const vec = new THREE.Vector3();

  // ---------- Caméra ----------
  function recentrer() {
    const el = canvas.parentElement, a = (el.clientWidth || 1) / (el.clientHeight || 1);
    if (a < 1.2) { controls.target.set(X(600), Y(520), 0); camera.position.set(X(600) + 1.5, Y(520) + 2.6, 14 / Math.max(a, 0.6)); }
    else { controls.target.set(X(930), Y(520), 0); camera.position.set(X(930) + 2, Y(520) + 3.5, 26 / Math.min(a, 1.9)); }
    controls.update();
  }
  function redim() {
    const el = canvas.parentElement, w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(redim).observe(canvas.parentElement);

  // ---------- Toucher ----------
  (() => {
    const d = { x: 0, y: 0, t: 0, id: -1 }; let nb = 0;
    canvas.addEventListener('pointerdown', (e) => { nb++; if (nb === 1) Object.assign(d, { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }); });
    const fin = (e) => {
      nb = Math.max(0, nb - 1);
      if (e.type !== 'pointerup' || e.pointerId !== d.id) return;
      if ((e.clientX - d.x) ** 2 + (e.clientY - d.y) ** 2 > 100 || performance.now() - d.t > 450) return;
      const rc = canvas.getBoundingClientRect(), ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1), camera);
      const h = ray.intersectObjects(zones, false).sort((a, b) => volume(a.object) - volume(b.object))[0];
      B.choisir(h ? h.object.userData.id : undefined);
    };
    const volume = (o) => { const p = o.geometry.parameters; return p.width * p.height * p.depth; };
    canvas.addEventListener('pointerup', fin);
    canvas.addEventListener('pointercancel', fin);
  })();

  // =====================================================================
  //  Animation (appelée par app.js à chaque image)
  // =====================================================================
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), ech = new THREE.Vector3(), eul = new THREE.Euler();
  const ang3 = { cul: 0, A: 0, R: 0, B: 0, V: 0 };
  function tourneMoteur(mt, ramp, dt) { mt.ventil.rotation.x += dt * 40 * ramp; }

  let tR = performance.now();
  const dtReel = () => { const t = performance.now(), d = (t - tR) / 1000; tR = t; return d; };
  function rendre(dt) {
    const e = B.etat, ma = B.mach, cu = B.cul;
    for (const k of ['culbuteur', 'alim', 'racleuse', 'broyeur', 'cv301']) ang3[k] = (ang3[k] || 0) + dt * 40 * ma[k].ramp;
    // culbuteur
    anim.cul.piv.rotation.z = -cu.th;
    // échange de wagon : la rame avance d'un pas, le wagon vidé sort vers l'avant
    const f = cu.phase === 'echange' ? Math.min(1, cu.t / 2.4) : 0, avance = f * anim.cul.PAS_W;
    anim.cul.wagon.position.z = avance; anim.cul.rame.position.z = avance;
    const plein = cu.phase === 'echange' ? false : cu.charge > 0.02;
    anim.cul.charge.visible = plein;
    anim.cul.charge.scale.y = Math.max(0.02, cu.charge);
    anim.cul.charge.position.y = -(46 - 88 * cu.charge / 2) * S;
    const aRoue = -avance / (9 * S);
    for (const r of anim.cul.wagon.userData.roues) r.rotation.x = aRoue;
    for (const w of anim.cul.wagonsRame) for (const r of w.userData.roues) r.rotation.x = aRoue;
    anim.cul.brides.forEach(b => { b.position.y = -(-70 + cu.bride * 18) * S; });
    anim.pignon.rotation.z = cu.th * 200 / 17 / 2;
    anim.arbreCul.rotation.x = anim.accCul.rotation.x = ang3.culbuteur;
    tourneMoteur(anim.motCul, ma.culbuteur.ramp, dt);
    // alimentateur
    const P = A.P;
    let k = 0;
    for (let i = 0; i < nA; i++) {
      const x = A.x1 + ((e.offA + i * P) % LA + LA) % LA;
      if (x + P - 3 <= A.x2) { pos.set(X(x + P / 2), Y(G.AL_HAUT + 4), 0); ech.set(1, 1, 1); } else ech.set(0, 0, 0);
      m4.compose(pos, q.identity(), ech); tabliers.setMatrixAt(k++, m4);
      const xr = A.x2 - ((e.offA + i * P) % LA + LA) % LA;
      if (xr - P + 3 >= A.x1) { pos.set(X(xr - P / 2), Y(A.y + A.r - 4), 0); ech.set(1, 1, 1); } else ech.set(0, 0, 0);
      m4.compose(pos, q, ech); tabliers.setMatrixAt(k++, m4);
    }
    tabliers.instanceMatrix.needsUpdate = true;
    anim.barbA.forEach(g => { g.rotation.z = -e.offA / A.r; });
    anim.secA.rotation.z = -e.offA / 11; anim.sortieA.rotation.z = -e.offA / 7;
    anim.accA.rotation.x = ang3.alim; tourneMoteur(anim.motA, ma.alim.ramp, dt);
    // chaîne racleuse
    k = 0;
    const yb = R.y + R.r - 2, yh = R.y - R.r + 2;
    for (let i = 0; i < nR; i++) {
      const d = ((e.offR + i * 40) % LR + LR) % LR;
      pos.set(X(R.x1 + d), Y((yb - 5 + R.fond) / 2), 0); ech.set(1, (R.fond - yb + 5) * S, 1); m4.compose(pos, q, ech); raclettes.setMatrixAt(k++, m4);
      pos.set(X(R.x2 - d), Y(yh - 2), 0); ech.set(1, 12 * S, 1); m4.compose(pos, q, ech); raclettes.setMatrixAt(k++, m4);
    }
    raclettes.instanceMatrix.needsUpdate = true;
    anim.barbR.forEach(g => { g.rotation.z = e.offR / R.r; });
    anim.accR.rotation.x = ang3.racleuse; tourneMoteur(anim.motR, ma.racleuse.ramp, dt);
    // broyeur
    anim.r1.rotation.z = -e.angR; anim.r2.rotation.z = e.angR + 0.3;
    for (const md of anim.modB) { md.acc.rotation.z = md.sens * e.angR; md.arb.rotation.z = md.sens * ang3.broyeur; tourneMoteur(md.mot, ma.broyeur.ramp, dt); }
    // convoyeur
    texBande.offset.x = -e.offB * S / 0.35;
    anim.tamQ.rotation.z = -e.offB / V.rq; anim.tamT.rotation.z = -e.offB / V.rt;
    anim.tend.forEach(g => { g.rotation.z = e.offB / 10; });
    for (const g of anim.rouleaux) g.rotation.z = -e.offB / 5;
    anim.arbreV.rotation.x = e.offB / V.rt; tourneMoteur(anim.motV, ma.cv301.ramp, dt);
    // trémie
    majTremie();
    // bauxite
    const ps = B.parts();
    let n = 0;
    for (const p of ps) {
      if (n >= MAXP) break;
      if (p.z3 === undefined) p.z3 = (Math.random() - 0.5) * 2 * (p.cible === 'tremie' ? 1.0 : 0.4);
      const lim = LIM[p.st] || 1.1;
      if (p.z3 > lim) p.z3 = lim - Math.random() * 0.05; else if (p.z3 < -lim) p.z3 = -lim + Math.random() * 0.05;
      pos.set(X(p.x), Y(p.y), p.z3);
      eul.set(p.a, p.a * 1.7, 0); q.setFromEuler(eul);
      const r = p.r * S * (p.miette ? 1.3 : 1.15); ech.set(r, r * 0.85, r);
      m4.compose(pos, q, ech); blocs.setMatrixAt(n, m4); blocs.setColorAt(n, coul(p.c)); n++;
    }
    q.identity();
    blocs.count = n; blocs.instanceMatrix.needsUpdate = true; if (blocs.instanceColor) blocs.instanceColor.needsUpdate = true;

    majVol(Math.min(0.05, dtReel()));
    controls.update();
    renderer.render(scene, camera);
    etiquettes();
  }

  function etiquettes() {
    const l = B.etat.etiq ? B.libelles() : [];
    while (divs.length < l.length) { const d = document.createElement('div'); d.className = 'etiq3d'; calque.appendChild(d); divs.push(d); }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    divs.forEach((d, i) => {
      const it = l[i];
      if (!it) { d.style.display = 'none'; return; }
      vec.set(X(it[1]), Y(it[2]), it[0].startsWith('Culbuteur') ? 1.7 : 0.9).project(camera);
      if (vec.z > 1 || Math.abs(vec.x) > 1.1 || Math.abs(vec.y) > 1.1 || (it[3] === 0 && camera.position.distanceTo(controls.target) > 16)) { d.style.display = 'none'; return; }
      d.style.display = '';
      if (d.textContent !== it[0]) d.textContent = it[0];
      d.className = 'etiq3d p' + it[3];
      d.style.transform = `translate(-50%,-50%) translate(${((vec.x + 1) / 2 * w).toFixed(1)}px,${((1 - vec.y) / 2 * h).toFixed(1)}px)`;
    });
  }

  // centrage progressif de la caméra sur une machine touchée
  let vol = null;
  const CADRAGE = { culbuteur: [300, 230, 7.5, 5, 9], alim: [520, 560, 0, 2.6, 8], racleuse: [450, 700, 0, 2, 7],
    broyeur: [930, 660, 0, 2.2, 6.5], cv301: [1250, 680, 0, 3, 11] };
  function cibler(id) {
    const c = CADRAGE[id]; if (!c) return;
    const t = new THREE.Vector3(X(c[0]), Y(c[1]), 0), dir = new THREE.Vector3(c[2] * 0.25 + 0.6, c[3] / c[4], 1).normalize();
    vol = { t0: controls.target.clone(), p0: camera.position.clone(), t1: t, p1: t.clone().addScaledVector(dir, c[4] * 1.15), k: 0 };
  }
  function majVol(dt) {
    if (!vol) return;
    vol.k = Math.min(1, vol.k + dt * 1.6); const e = vol.k * vol.k * (3 - 2 * vol.k);
    controls.target.lerpVectors(vol.t0, vol.t1, e); camera.position.lerpVectors(vol.p0, vol.p1, e);
    if (vol.k >= 1) vol = null;
  }
  controls.addEventListener('start', () => { vol = null; });
  window.VUE3D = { rendre, recentrer, redim, cibler };
  redim(); recentrer();
  B.changerVue('3d');
}
