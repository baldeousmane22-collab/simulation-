/* =====================================================================
   scene3d.js — Fraiseuse animée en 3D (Three.js embarqué)
   ---------------------------------------------------------------------
   Comme sur une fraiseuse à console : la fraise tourne à poste fixe et
   c'est la table (X), le chariot (Y) et la console (Z) qui déplacent la
   pièce. La matière est enlevée en direct :
   - opérations rectilignes : la section de la pièce (profil) change au
     passage de la fraise (gère les contre-dépouilles : T, queue d'aronde) ;
   - poche et contournage : carte des hauteurs creusée par la fraise ;
   - perçage, taraudage, alésage : trous qui se creusent, filets, alésage qui s'agrandit ;
   - taillage d'engrenage : roue montée sur diviseur, une dent creusée à chaque passe ;
   - rainure de clavette et goujures hélicoïdales : pièce cylindrique creusée en direct.
   Repère de la pièce (mm) : x longueur (−60…60), y hauteur (0…40),
   z largeur (−30…30, +z côté opérateur). Unités de la scène : mm.
   ===================================================================== */

import * as THREE from '../vendor/three.min.js';
import { OrbitControls, RoomEnvironment } from '../vendor/three.min.js';

const L = 120, W = 60, H = 40;          // pièce brute
const YT = 150;                          // hauteur fixe du bout de la fraise (ou de l'axe en horizontal)
const BRIDE = 30;                        // dessus de la table → dessous de la pièce (étau + cales)

/* ---------- Outils (fraises) ---------- */
const OUT = {
  surfacer: { nom: 'Fraise à surfacer Ø80', R: 40 },
  cyl63: { nom: 'Fraise cylindrique Ø63', R: 31.5, horiz: true },
  f20: { nom: 'Fraise 2 tailles Ø20', R: 10 },
  f16: { nom: 'Fraise 2 tailles Ø16', R: 8 },
  f12: { nom: 'Fraise 2 tailles Ø12', R: 6 },
  f10: { nom: 'Fraise 2 tailles Ø10 (coupe au centre)', R: 5 },
  chanfrein: { nom: 'Fraise à chanfreiner 90°', R: 10 },
  disque80: { nom: 'Fraise 3 tailles Ø80 × 10', R: 40, horiz: true },
  t24: { nom: 'Fraise à rainure en T Ø24', R: 12 },
  aronde: { nom: 'Fraise à queue d\'aronde 60°', R: 12.5 },
  centre: { nom: 'Foret à centrer Ø5', R: 2.5 },
  foret10: { nom: 'Foret hélicoïdal Ø10', R: 5 },
  foret85: { nom: 'Foret hélicoïdal Ø8,5', R: 4.25 },
  taraud: { nom: 'Taraud machine M10 × 1,5', R: 5 },
  foret18: { nom: 'Foret hélicoïdal Ø18', R: 9 },
  tete24: { nom: 'Tête à aléser réglée à Ø24,4 (ébauche)', R: 12.2 },
  tete25: { nom: 'Tête à aléser réglée à Ø25 (finition)', R: 12.5 },
  module: { nom: 'Fraise-module m 2,5 n° 2 (14 à 16 dents)', R: 30, horiz: true },
  f8clav: { nom: 'Fraise à rainurer 2 dents Ø8 (coupe au centre)', R: 4 },
  convexe: { nom: 'Fraise convexe R4 Ø70 (fraise de forme)', R: 35, horiz: true }
};

/* Arbre à claveter : Ø30, rainure b = 8, t1 = 4, longueur 30 (centres des arrondis à x = ±11) */
const ARBRE = { R: 15, L: 120, hAxe: 45, b: 8, t1: 4, xc: 11 };
/* Goujures hélicoïdales : ébauche Ø40 × 50, 4 goujures R4, angle d'hélice 30° → pas P = π D / tan β */
const HELICE = { R: 20, L: 50, N: 4, beta: 30 * Math.PI / 180, prof: 4, hAxe: 85 };
HELICE.P = Math.PI * 2 * HELICE.R / Math.tan(HELICE.beta);

/* Roue dentée : Z dents, module m, largeur b, profil en développante (α = 20°) */
const ALPHA = 20 * Math.PI / 180, inv = (a) => Math.tan(a) - a;
const ROUE = { Z: 16, m: 2.5, b: 20, yAxe: 85 };
ROUE.ra = ROUE.m * ROUE.Z / 2 + ROUE.m; ROUE.h = 2.25 * ROUE.m;
/* Contour de la roue (points [z, y]) : seuls les creux pour lesquels coupe(j) est vrai sont taillés */
function contourRoue(coupe) {
  const { Z, m } = ROUE, r = m * Z / 2, rb = r * Math.cos(ALPHA), rIn = r - 1.25 * m, rOut = r + m, a = 2 * Math.PI / Z;
  const psi = (rr) => Math.max(0.004, Math.PI / (2 * Z) + inv(ALPHA) - inv(rr > rb ? Math.acos(rb / rr) : 0));
  const d = Math.PI / 2 - a / 2, pts = [], pol = (rr, t) => pts.push([rr * Math.cos(t + d), rr * Math.sin(t + d)]);
  for (let k = 0; k < Z; k++) {
    const c = k * a, avant = coupe((k + Z - 1) % Z), apres = coupe(k);
    if (avant) for (let i = 0; i <= 6; i++) { const rr = rIn + (rOut - rIn) * i / 6; pol(rr, c - psi(rr)); }
    else pol(rOut, c - psi(rOut));
    pol(rOut, c);
    if (apres) {
      for (let i = 6; i >= 0; i--) { const rr = rIn + (rOut - rIn) * i / 6; pol(rr, c + psi(rr)); }
      const a0 = c + psi(rIn), a1 = c + a - psi(rIn); for (let j = 1; j < 4; j++) pol(rIn, a0 + (a1 - a0) * j / 4);
    } else { const a0 = c + psi(rOut), a1 = c + a - psi(rOut); for (let j = 0; j <= 4; j++) pol(rOut, a0 + (a1 - a0) * j / 4); }
  }
  return pts;
}

/* ---------- Profils (sections de la pièce, points [z, y]) ---------- */
const BASE = [[-30, 0], [30, 0], [30, H], [-30, H]];
const dessus = (y) => [[-30, 0], [30, 0], [30, y], [-30, y]];
const fenteT = (a, y) => [[-30, 0], [30, 0], [30, H], [a, H], [a, y], [-a, y], [-a, H], [-30, H]];
const TA = 6.73;   // demi-largeur en haut de la queue d'aronde 60° (12,5 − 10 / tan 60°)

/* Passes : outil, position de la fraise (z, y = bout ou axe), profil obtenu, côté de la matière */
const DEFS = {
  surfacage: { passes: [
    { outil: 'surfacer', z: 8, y: 37, prof: dessus(37), nom: 'ébauche ap = 3 mm', cote: 0 },
    { outil: 'surfacer', z: 8, y: 36, prof: dessus(36), nom: 'finition ap = 1 mm', cote: 0 }] },
  roulant: { passes: [
    { outil: 'cyl63', z: 0, y: 38 + 31.5, prof: dessus(38), nom: 'ébauche ap = 2 mm', cote: 'h', av: 11 },
    { outil: 'cyl63', z: 0, y: 37 + 31.5, prof: dessus(37), nom: 'finition ap = 1 mm', cote: 'h', av: 8 }] },
  epaulement: { passes: [
    { outil: 'f20', z: 25, y: 34, prof: [[-30, 0], [30, 0], [30, 34], [15, 34], [15, H], [-30, H]], nom: 'passe 1, ap = 6 mm', cote: -1 },
    { outil: 'f20', z: 25, y: 28, prof: [[-30, 0], [30, 0], [30, 28], [15, 28], [15, H], [-30, H]], nom: 'passe 2, ap = 6 mm', cote: -1 }] },
  rainure: { passes: [
    { outil: 'f16', z: 0, y: 35, prof: fenteT(8, 35), nom: 'passe 1, ap = 5 mm', cote: 0 },
    { outil: 'f16', z: 0, y: 30, prof: fenteT(8, 30), nom: 'passe 2, ap = 5 mm', cote: 0 }] },
  chanfrein: { passes: [
    { outil: 'chanfrein', z: 33, y: 33, prof: [[-30, 0], [30, 0], [30, 36], [26, H], [-30, H]], nom: 'chanfrein côté opérateur', cote: -1 },
    { outil: 'chanfrein', z: -33, y: 33, prof: [[-30, 0], [30, 0], [30, 36], [26, H], [-26, H], [-30, 36]], nom: 'chanfrein côté colonne', cote: 1 }] },
  disque: { passes: [
    { outil: 'disque80', z: 0, y: 34 + 40, prof: fenteT(5, 34), nom: 'passe 1, ap = 6 mm', cote: 'h', av: 21 },
    { outil: 'disque80', z: 0, y: 28 + 40, prof: fenteT(5, 28), nom: 'passe 2, ap = 6 mm', cote: 'h', av: 21 }] },
  rainureT: { passes: [
    { outil: 'f12', z: 0, y: 30, prof: fenteT(6, 30), nom: 'col : passe 1, ap = 10 mm', cote: 0 },
    { outil: 'f12', z: 0, y: 20, prof: fenteT(6, 20), nom: 'col : passe 2, ap = 10 mm', cote: 0 },
    { outil: 't24', z: 0, y: 20, prof: [[-30, 0], [30, 0], [30, H], [6, H], [6, 28], [12, 28], [12, 20], [-12, 20], [-12, 28], [-6, 28], [-6, H], [-30, H]], nom: 'fraise en T', cote: 0 }] },
  aronde: { passes: [
    { outil: 'f12', z: 0, y: 35, prof: fenteT(6, 35), nom: 'ébauche : passe 1, ap = 5 mm', cote: 0 },
    { outil: 'f12', z: 0, y: 30, prof: fenteT(6, 30), nom: 'ébauche : passe 2, ap = 5 mm', cote: 0 },
    { outil: 'aronde', z: 0, y: 30, prof: [[-30, 0], [30, 0], [30, H], [TA, H], [12.5, 30], [-12.5, 30], [-TA, H], [-30, H]], nom: 'fraise à queue d\'aronde', cote: 0 }] },
  poche: { carte: true, outil: 'f10', niveaux: [36, 32], cote: 0 },
  contournage: { carte: true, outil: 'f16', niveaux: [35, 30], cote: 1 },
  /* Trous : étapes successives (outil, profondeur de la pointe sous le dessus, débourrage) */
  percage: { trous: [[-35, -12], [35, -12], [35, 12], [-35, 12]], r: 5, etapes: [
    { outil: 'centre', prof: 2, type: 'pointage', lab: 'Pointage au foret à centrer' },
    { outil: 'foret10', prof: 20 + 3, debourrage: 8, type: 'percage', lab: 'Perçage Ø10 avec débourrage' }] },
  taraudage: { trous: [[-30, 0], [30, 0]], r: 4.25, filet: true, etapes: [
    { outil: 'centre', prof: 2, type: 'pointage', lab: 'Pointage au foret à centrer' },
    { outil: 'foret85', prof: 22 + 2.6, debourrage: 9, type: 'percage', lab: 'Perçage Ø8,5 (= 10 − 1,5)' },
    { outil: 'taraud', prof: 18, type: 'taraud', lab: 'Taraudage M10 : avance = pas × n' }] },
  alesage: { trous: [[0, 0]], r: 12.5, E: 34, etapes: [
    { outil: 'centre', prof: 2, type: 'pointage', lab: 'Pointage au foret à centrer' },
    { outil: 'foret18', prof: 25 + 5.4, debourrage: 10, type: 'percage', lab: 'Avant-trou au foret Ø18' },
    { outil: 'tete24', prof: 25, type: 'alesage', lab: 'Alésage d\'ébauche Ø24,4' },
    { outil: 'tete25', prof: 25, type: 'alesage', lab: 'Alésage de finition Ø25 H7' }] },
  denture: { denture: true, outil: 'module' },
  clavette: { cyl: 'clavette', outil: 'f8clav' },
  helice: { cyl: 'helice', outil: 'convexe' }
};

/* Trajets de la poche et du contournage (plan x, z) */
function trajetPoche() {
  return [[-25, -10], [25, -10], [25, -10 / 3], [-25, -10 / 3], [-25, 10 / 3], [25, 10 / 3], [25, 10], [-25, 10], [-25, -10], [25, -10], [25, 10], [-25, 10]];
}
function trajetContour() {
  const p = [[80, 30], [42, 30]], arc = (cx, cz, a0, a1) => { for (let i = 1; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8; p.push([cx + 18 * Math.cos(a), cz + 18 * Math.sin(a)]); } };
  p.push([-42, 30]); arc(-42, 12, Math.PI / 2, Math.PI);
  p.push([-60, -12]); arc(-42, -12, Math.PI, 1.5 * Math.PI);
  p.push([42, -30]); arc(42, -12, 1.5 * Math.PI, 2 * Math.PI);
  p.push([60, 12]); arc(42, 12, 0, Math.PI / 2);
  p.push([20, 30]);
  return p;
}

/* Mode de fraisage selon le côté de la matière et le sens d'avance (M3 : sens horaire vu de dessus) */
export function modeFraisage(cote, dir) {
  if (cote === 0) return 'mixte (opposition d\'un côté, avalant de l\'autre)';
  if (cote === 'h') return dir < 0 ? 'en avalant' : 'en opposition';
  return cote === dir ? 'en avalant' : 'en opposition';
}

/* ---------- Géométries ---------- */
/* Corps de fraise à goujures : extrusion d'un contour denté, torsadé (hélice) et éventuellement conique */
function fraiseGeom(R, h, nT, twist = 0, conicite = null) {
  const s = new THREE.Shape(), N = nT * 12;
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2, ph = (a * nT / (Math.PI * 2)) % 1;
    const r = ph < 0.55 ? R : ph < 0.65 ? R * (1 - 0.3 * (ph - 0.55) / 0.1) : R * (0.7 + 0.3 * (ph - 0.65) / 0.35);
    if (i === 0) s.moveTo(r * Math.cos(a), r * Math.sin(a)); else s.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, steps: (twist || conicite) ? 10 : 1 });
  if (twist || conicite) {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i); const t = pos.getZ(i) / h;
      const a = twist * t, c = Math.cos(a), sn = Math.sin(a), k = conicite ? conicite(t) : 1;
      [x, y] = [(x * c - y * sn) * k, (x * sn + y * c) * k];
      pos.setXY(i, x, y);
    }
  }
  g.computeVertexNormals();
  return g;
}

const matMetal = (c, rough = 0.35, metal = 0.75) => new THREE.MeshStandardMaterial({ color: c, metalness: metal, roughness: rough });
const COUL = { fraise: 0xd9dee6, carbure: 0x8f98a3, or: 0xd8b04a, mandrin: 0x3f4b5c, machine: 0x24506a, machine2: 0x1d4258, fonte: 0x4b5563, table: 0x6b7785, etau: 0x3b5d7a };

export class Fraisage {
  constructor(canvas, calque, surToucher) {
    this.canvas = canvas;
    this.calque = calque;
    this.surToucher = surToucher;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMappingExposure = 0.9;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1220);
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(40, 1, 1, 20000);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.screenSpacePanning = true;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 0.8));
    const sol = new THREE.DirectionalLight(0xffffff, 1.4);
    sol.position.set(1, 2, 3);
    this.camera.add(sol);
    this.scene.add(this.camera);

    this.racine = new THREE.Group();
    this.scene.add(this.racine);
    this.etiquettes = [];
    this.vitesse = 1;
    this.pause = false;
    this.montrerEtiq = true;
    this.arrosage = true;
    this.toursParSec = 2;
    this.dir = 1;
    this.t = 0;
    this.segIdx = -1;
    this.outils = {};
    this._construireMachineMobile();
    this._copeaux();
    this._tactile();
    this._redim();
    new ResizeObserver(() => this._redim()).observe(canvas.parentElement);
    let t0 = performance.now();
    const boucle = (t) => {
      const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
      if (!this.pause && this.segs) this._animer(dt * this.vitesse);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this._placerEtiquettes();
      requestAnimationFrame(boucle);
    };
    requestAnimationFrame(boucle);
  }

  _redim() {
    const el = this.canvas.parentElement, w = el.clientWidth || 1, h = el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const ancien = this.camera.aspect;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.cle && Math.abs(ancien - w / h) > 0.05) this.recentrer();   // nouvelle forme d'écran : recadrer
  }

  _tactile() {
    const debut = { x: 0, y: 0, t: 0, id: -1 };
    let nb = 0;
    this.canvas.addEventListener('pointerdown', (e) => { nb++; if (nb === 1) Object.assign(debut, { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }); });
    const fin = (e) => {
      nb = Math.max(0, nb - 1);
      if (e.type !== 'pointerup' || e.pointerId !== debut.id) return;
      const dx = e.clientX - debut.x, dy = e.clientY - debut.y;
      if (dx * dx + dy * dy < 100 && performance.now() - debut.t < 450) this._toucher(e.clientX, e.clientY);
    };
    this.canvas.addEventListener('pointerup', fin);
    this.canvas.addEventListener('pointercancel', fin);
  }

  _toucher(cx, cy) {
    const rc = this.canvas.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((cx - rc.left) / rc.width * 2 - 1, -(cy - rc.top) / rc.height * 2 + 1), this.camera);
    let info = null;
    for (const h of ray.intersectObjects(this.racine.children, true)) {
      let o = h.object;
      while (o && !o.userData.info) o = o.parent;
      if (o) { info = o.userData.info; break; }
    }
    this.surToucher?.(info);
  }

  _etiq(objet, local, texte, classe = '') {
    const el = document.createElement('div');
    el.className = 'etiq3d ' + classe;
    el.textContent = texte;
    this.calque.appendChild(el);
    this.etiquettes.push({ el, objet, local: new THREE.Vector3(...local) });
  }

  _placerEtiquettes() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, v = new THREE.Vector3();
    for (const e of this.etiquettes) {
      if (!this.montrerEtiq) { e.el.style.display = 'none'; continue; }
      v.copy(e.local); e.objet.localToWorld(v); v.project(this.camera);
      if (v.z > 1 || v.z < -1) { e.el.style.display = 'none'; continue; }
      e.el.style.display = '';
      e.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -50%)`;
    }
  }

  recentrer() {
    const horiz = this.bati?.userData.horiz, c = new THREE.Vector3(0, horiz ? YT - 40 : YT - 22, 0), R = this.camera.aspect < 1 ? 165 : 125;
    const fv = this.camera.fov * Math.PI / 180, fh = 2 * Math.atan(Math.tan(fv / 2) * this.camera.aspect);
    const dist = R / Math.sin(Math.min(fv, fh) / 2);
    this.controls.target.copy(c);
    this.camera.position.copy(c).addScaledVector((horiz ? new THREE.Vector3(1, 0.85, 0.75) : new THREE.Vector3(0.6, 0.62, 1)).normalize(), dist);
    this.controls.minDistance = 60;
    this.controls.maxDistance = dist * 3;
    this.camera.near = 2; this.camera.far = dist * 20;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  _box(x0, x1, y0, y1, z0, z1, mat, info) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (info) m.userData.info = info;
    return m;
  }
  _cyl(r, y0, y1, mat, seg = 32, info) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, seg), mat);
    m.position.y = (y0 + y1) / 2;
    if (info) m.userData.info = info;
    return m;
  }

  /* Console, chariot, table, étau et pièce : ce sont eux qui se déplacent */
  _construireMachineMobile() {
    const fonte = matMetal(COUL.machine, 0.55, 0.35), fonte2 = matMetal(COUL.machine2, 0.55, 0.35), acier = matMetal(COUL.table, 0.4, 0.7), etau = matMetal(COUL.etau, 0.45, 0.5);
    this.genou = new THREE.Group(); this.selle = new THREE.Group(); this.table = new THREE.Group(); this.pieceG = new THREE.Group();
    this.racine.add(this.genou); this.genou.add(this.selle); this.selle.add(this.table); this.table.add(this.pieceG);
    this.genou.add(this._box(-120, 120, -330, -70, -220, 80, fonte, { titre: 'Console', texte: 'Elle monte et descend le long de la colonne : c\'est elle qui règle la profondeur de passe.' }));
    const vol = this._cyl(34, 0, 10, acier); vol.rotation.x = Math.PI / 2; vol.position.set(0, -140, 85); this.genou.add(vol);
    this.selle.add(this._box(-110, 110, -70, -30, -95, 95, fonte2, { titre: 'Chariot transversal', texte: 'Il déplace la table vers l\'opérateur ou vers la colonne (axe Y de la machine).' }));
    this.table.add(this._box(-240, 240, -30, 0, -80, 80, acier, { titre: 'Table', texte: 'Table à rainures en T, mouvement longitudinal (axe X). C\'est son déplacement qui donne l\'avance Vf.' }));
    const sombre = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    for (const z of [-50, 0, 50]) this.table.add(this._box(-240, 240, -0.4, 0.3, z - 7, z + 7, sombre));
    const man = this._cyl(30, 0, 8, acier); man.rotation.z = Math.PI / 2; man.position.set(250, -15, 0); this.table.add(man);
    const poig = this._cyl(4, 0, 30, acier); poig.rotation.z = Math.PI / 2; poig.position.set(268, 5, 0); this.table.add(poig);
    // Étau
    const infoEtau = { titre: 'Étau', texte: 'Maintient la pièce. Le mors fixe (côté colonne) sert de référence ; la pièce repose sur des cales parallèles.' };
    this.etau = new THREE.Group(); this.table.add(this.etau);
    this.etau.add(this._box(-60, 60, 0, 18, -80, 80, etau, infoEtau));
    this.etau.add(this._box(-55, 55, 18, 55, -46, -30, etau, infoEtau));
    this.etau.add(this._box(-55, 55, 18, 55, 30, 46, etau, infoEtau));
    this.etau.add(this._box(-52, 52, 18, 30, 46, 70, etau, infoEtau));
    const vis = this._cyl(7, 0, 50, acier); vis.rotation.x = Math.PI / 2; vis.position.set(0, 10, 100); this.etau.add(vis);
    const bras = this._cyl(3, -28, 28, acier); bras.rotation.z = Math.PI / 2; bras.position.set(0, 10, 125); this.etau.add(bras);
    const cales = matMetal(0x94a3b8, 0.3, 0.8);
    for (const z of [-24, 24]) this.etau.add(this._box(-62, 62, 18, BRIDE, z - 4, z + 4, cales, { titre: 'Cales parallèles', texte: 'Elles surélèvent la pièce pour qu\'elle dépasse des mors et reste parallèle à la table.' }));
    this.pieceG.position.y = BRIDE;
  }

  /* Bâti fixe : colonne + tête verticale ou arbre horizontal */
  _construireBati(horiz) {
    if (this.bati && this.bati.userData.horiz === horiz) return;
    if (this.bati) { this.bati.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); this.racine.remove(this.bati); }
    const b = this.bati = new THREE.Group(); b.userData.horiz = horiz;
    const fonte = matMetal(COUL.machine, 0.55, 0.35), fonte2 = matMetal(COUL.machine2, 0.55, 0.35), acier = matMetal(0x9aa6b4, 0.3, 0.8);
    b.add(this._box(-110, 110, -460, 440, -380, -220, fonte, { titre: 'Colonne (bâti)', texte: 'Partie fixe de la machine. La console coulisse sur ses glissières.' }));
    b.add(this._box(-190, 190, -500, -460, -400, 160, fonte2));
    if (!horiz) {
      b.add(this._box(-60, 60, 360, 430, -220, -50, fonte2));
      b.add(this._box(-58, 58, 300, 430, -60, 60, fonte, { titre: 'Tête verticale', texte: 'Elle porte la broche. La broche tourne grâce au moteur (mouvement de coupe).' }));
      b.add(this._cyl(32, YT + 110, 300, acier, 32, { titre: 'Broche', texte: 'Elle entraîne la fraise en rotation (sens horaire M3). Le porte-outil est serré dans son cône.' }));
      const mot = this._cyl(42, 430, 520, matMetal(0x334155, 0.6, 0.3)); mot.position.z = -10; b.add(mot);
    } else {
      b.add(this._box(-55, 55, 440, 500, -380, 150, fonte2, { titre: 'Bélier', texte: 'Bras qui porte la lunette au-dessus de la table.' }));
      b.add(this._box(-42, 42, YT - 30, 440, 110, 136, fonte, { titre: 'Lunette (support d\'arbre)', texte: 'Elle soutient le bout de l\'arbre porte-fraise : moins de flexion et de vibrations.' }));
      const nez = this._cyl(45, 0, 25, acier, 32, { titre: 'Nez de broche', texte: 'La broche horizontale entraîne l\'arbre porte-fraise.' });
      nez.rotation.x = Math.PI / 2; nez.position.set(0, YT, -207); b.add(nez);
    }
    this.racine.add(b);
  }

  /* Modèle 3D d'une fraise (bout ou axe à l'origine locale) */
  _outil(cle) {
    if (this.outils[cle]) return this.outils[cle];
    const g = new THREE.Group(), o = OUT[cle];
    const mF = matMetal(COUL.fraise, 0.25, 0.85), mC = matMetal(COUL.carbure, 0.3, 0.8), mM = matMetal(COUL.mandrin, 0.4, 0.7), mOr = matMetal(COUL.or, 0.3, 0.8);
    const info = { titre: o.nom, texte: 'Outil de coupe. Touchez l\'onglet « Fiche » pour ses conditions d\'utilisation.' };
    const vert = (geom, mat, y = 0) => { geom.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geom, mat); m.position.y = y; m.userData.info = info; g.add(m); return m; };
    const mandrin = (y0) => { g.add(this._cyl(20, y0, 96, mM)); g.add(this._cyl(26, 96, 110, mM)); };
    if (cle === 'surfacer') {
      g.add(this._cyl(36, 5, 38, matMetal(0x334155, 0.4, 0.6), 40, info));
      for (let k = 0; k < 5; k++) {
        const a = k * Math.PI * 2 / 5, p = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 3.5), mOr);
        p.position.set(35.5 * Math.cos(a), 4.5, 35.5 * Math.sin(a)); p.rotation.y = -a + Math.PI / 2; p.userData.info = { titre: 'Plaquette carbure', texte: 'Plaquette amovible revêtue : on la tourne ou on la change quand elle est usée.' };
        g.add(p);
        const l = new THREE.Mesh(new THREE.BoxGeometry(14, 22, 8), matMetal(0x0f172a, 0.8, 0.2));
        l.position.set(30 * Math.cos(a + 0.3), 18, 30 * Math.sin(a + 0.3)); l.rotation.y = -a; g.add(l);
      }
      g.add(this._cyl(16, 38, 70, mM)); mandrin(70);
    } else if (o.horiz) {
      const e = cle === 'disque80' ? 10 : cle === 'module' || cle === 'convexe' ? 8 : 70, geo = cle === 'disque80' ? fraiseGeom(40, 10, 16, 0) : cle === 'module' ? fraiseGeom(30, 8, 12, 0) : cle === 'convexe' ? fraiseGeom(35, 8, 14, 0, null) : fraiseGeom(31.5, 70, 8, 0.9);
      geo.translate(0, 0, -e / 2);
      const m = new THREE.Mesh(geo, mF); m.userData.info = info; g.add(m);
      const arbre = this._cyl(13, -200, 135, acier(), 24, { titre: 'Arbre porte-fraise', texte: 'Il entraîne la fraise par une clavette ; les bagues positionnent la fraise sur l\'arbre.' });
      arbre.rotation.x = Math.PI / 2; arbre.position.set(0, 0, -32.5); g.add(arbre);
      const bag = matMetal(0x7c8796, 0.3, 0.8);
      for (const [z0, z1] of [[-200, -e / 2], [e / 2, 108]]) { const c = this._cyl(19, z0, z1, bag, 28, { titre: 'Bagues d\'entretoise', texte: 'Elles positionnent la fraise le long de l\'arbre.' }); c.rotation.x = Math.PI / 2; c.position.set(0, 0, (z0 + z1) / 2); g.add(c); }
      const ec = this._cyl(24, 0, 10, mM, 6); ec.rotation.x = Math.PI / 2; ec.position.set(0, 0, 140); g.add(ec);
      // repère de couleur sur le moyeu : rend la rotation bien visible
      const rep = this._box(-3, 3, 14, 24, -e / 2 - 1, e / 2 + 1, matMetal(0xf59e0b, 0.4, 0.3)); g.add(rep);
    } else if (cle === 'centre') {
      const p = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.5, 20), mF); p.rotation.x = Math.PI; p.position.y = 0.75; p.userData.info = info; g.add(p);
      g.add(this._cyl(2.5, 1.5, 6, mF, 20, info));
      const c = new THREE.Mesh(new THREE.CylinderGeometry(6, 2.5, 4, 24), mF); c.position.y = 8; g.add(c);
      g.add(this._cyl(6, 10, 45, mF, 24)); mandrin(45);
    } else if (cle === 'tete24' || cle === 'tete25') {
      const R = o.R, xb = R - 6;
      g.add(this._cyl(5, 3, 58, mF, 20, info)).position.x = xb;
      const plq = this._box(xb, R, 0, 4, -2, 2, mOr, { titre: 'Plaquette d\'alésage', texte: 'Elle tourne sur un cercle de rayon réglable : on règle le diamètre avec le vernier de la tête.' }); g.add(plq);
      g.add(this._box(xb - 6, xb + 6, 3, 8, -5, 5, mF));
      g.add(this._cyl(24, 58, 78, matMetal(0x334155, 0.4, 0.6), 32, { titre: 'Tête à aléser', texte: 'Le coulisseau se déplace radialement (vernier gradué) pour régler le diamètre d\'alésage.' }));
      g.add(this._box(-20, 20, 62, 76, -10, 10, mM));
      const vis = this._cyl(3, -26, 26, mOr); vis.rotation.z = Math.PI / 2; vis.position.y = 69; g.add(vis);
      g.add(this._cyl(16, 78, 96, mM)); g.add(this._cyl(26, 96, 110, mM));
    } else if (cle === 'foret10' || cle === 'foret85' || cle === 'foret18') {
      const R = o.R, hp = 0.6 * R, lc = 52;
      const p = new THREE.Mesh(new THREE.ConeGeometry(R, hp, 24), mF); p.rotation.x = Math.PI; p.position.y = hp / 2; p.userData.info = info; g.add(p);
      vert(fraiseGeom(R, lc, 2, 5.5), mF, hp);
      g.add(this._cyl(R, hp + lc, 72, mF, 24));
      g.add(this._cyl(16, 72, 84, mM)); g.add(this._cyl(22, 84, 110, mM));      // mandrin de perçage
    } else if (cle === 'taraud') {
      vert(fraiseGeom(5, 24, 4, 0, (t) => t < 0.15 ? 0.82 + 1.2 * t : 1), mF, 0);
      const helice = new THREE.Curve(); helice.getPoint = (u, v = new THREE.Vector3()) => v.set(4.9 * Math.cos(u * 32 * Math.PI), 2 + u * 22, 4.9 * Math.sin(u * 32 * Math.PI));
      const fil = new THREE.Mesh(new THREE.TubeGeometry(helice, 240, 0.45, 5), mF); fil.userData.info = info; g.add(fil);
      g.add(this._cyl(4, 24, 60, mF, 20)); g.add(this._box(-3.2, 3.2, 60, 68, -3.2, 3.2, mF));
      g.add(this._cyl(18, 66, 96, mM)); g.add(this._cyl(24, 96, 110, mM));      // porte-taraud
    } else if (cle === 'chanfrein') {
      vert(fraiseGeom(10, 10, 4, 0, (t) => Math.max(0.06, t)), mF); g.add(this._cyl(8, 10, 50, mF, 24)); mandrin(50);
    } else if (cle === 't24') {
      vert(fraiseGeom(12, 8, 6, 0.25), mF); g.add(this._cyl(4.6, 8, 30, mF, 20, info)); g.add(this._cyl(8, 30, 60, mF, 24)); mandrin(60);
    } else if (cle === 'aronde') {
      vert(fraiseGeom(12.5, 10, 6, 0, (t) => 1 - t * (1 - TA / 12.5)), mF); g.add(this._cyl(4.4, 10, 28, mF, 20, info)); g.add(this._cyl(8, 28, 60, mF, 24)); mandrin(60);
    } else {
      const R = o.R, lc = Math.max(22, R * 2.6), carb = cle === 'f20' || cle === 'f10';
      vert(fraiseGeom(R, lc, cle === 'f8clav' ? 2 : cle === 'f16' || cle === 'f12' ? 3 : 4, 1.1), carb ? mC : mF);
      g.add(this._cyl(R * 0.97, lc, lc + 22, carb ? mC : mF, 24)); mandrin(lc + 22);
    }
    function acier() { return matMetal(0xa3adba, 0.3, 0.85); }
    g.userData.cle = cle;
    this.outils[cle] = g;
    return g;
  }

  _mettreOutil(cle) {
    if (this.outilCourant === cle) return;
    this.outilCourant = cle;
    this.rotor.clear();
    this.rotor.add(this._outil(cle));
    this.surOutil?.(OUT[cle].nom);
  }

  /* ---------- Copeaux et arrosage ---------- */
  _copeaux() {
    const N = 220;
    this.matCop = new THREE.MeshStandardMaterial({ color: 0x6b7fc4, metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide });
    this.cop = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.35, 1.2), this.matCop, N);
    this.cop.frustumCulled = false;
    this.copEtat = Array.from({ length: N }, () => ({ vie: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }));
    const NA = 160;
    this.arr = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 6, 4), new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7, roughness: 0.1 }), NA);
    this.arr.frustumCulled = false;
    this.arrEtat = Array.from({ length: NA }, () => ({ vie: 0, p: new THREE.Vector3(), v: new THREE.Vector3() }));
    this.scene.add(this.cop, this.arr);
    this.factice = new THREE.Object3D();
    this.copIdx = 0; this.arrIdx = 0; this.aEmettre = 0; this.aArroser = 0;
    const gb = new THREE.CylinderGeometry(1.8, 3, 36, 12); gb.rotateX(Math.PI / 2);
    this.buse = new THREE.Mesh(gb, matMetal(0x1f2937, 0.6, 0.3));
    this.scene.add(this.buse);
  }

  couleurCopeaux(c) { this.matCop.color.setHex(c); }

  _emettre(dt, coupe) {
    const o = OUT[this.outilCourant], P = new THREE.Vector3(), V = new THREE.Vector3();
    if (coupe) this.aEmettre += dt * 90;
    while (this.aEmettre >= 1) {
      this.aEmettre -= 1;
      const c = this.copEtat[this.copIdx]; this.copIdx = (this.copIdx + 1) % this.copEtat.length;
      if (o.horiz) {
        const a = -Math.PI / 2 + (Math.random() - 0.3) * 0.6;
        P.set(o.R * Math.cos(a), YT + o.R * Math.sin(a) + 2, (Math.random() - 0.5) * (this.outilCourant === 'disque80' ? 10 : 60));
        V.set(60 + Math.random() * 60, 40 + Math.random() * 60, (Math.random() - 0.5) * 30);
        if (this.dir < 0) V.x = -V.x * 0.6;
      } else {
        const a = Math.random() * Math.PI * 2, rr = o.R * (0.7 + Math.random() * 0.35);
        P.set(rr * Math.cos(a), YT + 2 + (this.decalCop || 0) + Math.random() * 4, rr * Math.sin(a));
        V.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(40 + Math.random() * 50);
        V.addScaledVector(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), -60); // tangente (rotation horaire)
        V.y = 50 + Math.random() * 70;
      }
      c.p.copy(P); c.v.copy(V); c.vie = 1.2 + Math.random() * 0.6;
      c.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); c.w.set(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10);
    }
    const f = this.factice;
    for (let i = 0; i < this.copEtat.length; i++) {
      const c = this.copEtat[i];
      if (c.vie > 0) {
        c.vie -= dt; c.v.y -= 400 * dt; c.v.multiplyScalar(1 - 0.6 * dt); c.p.addScaledVector(c.v, dt);
        c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
        f.position.copy(c.p); f.rotation.copy(c.r); f.scale.setScalar(c.vie > 0 ? 1 : 0);
      } else f.scale.setScalar(0);
      f.updateMatrix(); this.cop.setMatrixAt(i, f.matrix);
    }
    this.cop.instanceMatrix.needsUpdate = true;
    // Arrosage : jet de liquide de coupe depuis la buse vers la zone de coupe
    this.buse.visible = this.arrosage;
    const src = new THREE.Vector3(o.horiz ? o.R + 25 : o.R + 28, YT + (o.horiz ? 10 : 50), o.horiz ? 0 : 30);
    const cible = new THREE.Vector3(o.horiz ? o.R * 0.5 : o.R * 0.6, o.horiz ? YT - o.R * 0.75 : YT + 3, o.horiz ? 0 : 6);
    this.buse.position.copy(src).addScaledVector(src.clone().sub(cible).normalize(), 18);
    this.buse.lookAt(cible);
    if (this.arrosage) this.aArroser += dt * 120;
    while (this.aArroser >= 1) {
      this.aArroser -= 1;
      const g = this.arrEtat[this.arrIdx]; this.arrIdx = (this.arrIdx + 1) % this.arrEtat.length;
      g.p.copy(src); g.v.copy(cible).sub(src).multiplyScalar(2.2).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(14));
      g.vie = 0.5;
    }
    for (let i = 0; i < this.arrEtat.length; i++) {
      const g = this.arrEtat[i];
      if (g.vie > 0) { g.vie -= dt; g.v.y -= 200 * dt; g.p.addScaledVector(g.v, dt); f.position.copy(g.p); f.scale.setScalar(1); }
      else f.scale.setScalar(0);
      f.rotation.set(0, 0, 0); f.updateMatrix(); this.arr.setMatrixAt(i, f.matrix);
    }
    this.arr.instanceMatrix.needsUpdate = true;
  }

  /* ---------- Pièce : profils extrudés ---------- */
  _pieceProfils(def) {
    const brut = matMetal(0x8a939f, 0.62, 0.45), usine = matMetal(0xdfe5ec, 0.22, 0.9);
    const info = { titre: 'Pièce', texte: 'Pièce brute 120 × 60 × 40 mm. Les surfaces usinées apparaissent brillantes.' };
    const profs = [BASE, ...def.passes.map(p => p.prof)];
    this.geos = profs.map(pr => {
      const s = new THREE.Shape(pr.map(([z, y]) => new THREE.Vector2(-z, y)));
      const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
      g.rotateY(Math.PI / 2);
      return g;
    });
    this.mFait = new THREE.Mesh(this.geos[0], usine); this.mBrut = new THREE.Mesh(this.geos[0], brut);
    this.mFait.userData.info = info; this.mBrut.userData.info = info;
    this.matBrut = brut; this.matUsine = usine;
    this.pieceG.add(this.mFait, this.mBrut);
  }

  _majProfils(seg, x) {
    const k = seg.passe;
    if (k == null) {
      const c = seg.faits;
      this.mFait.geometry = this.geos[c]; this.mFait.material = c ? this.matUsine : this.matBrut;
      this.mFait.position.x = this.x0; this.mFait.scale.x = this.x1 - this.x0; this.mFait.visible = true; this.mBrut.visible = false;
      return;
    }
    const d = this.dir, s = Math.max(this.x0, Math.min(this.x1, x + d * (seg.av || 0)));
    this.mFait.geometry = this.geos[k + 1]; this.mFait.material = this.matUsine;
    this.mBrut.geometry = this.geos[k]; this.mBrut.material = k ? this.matUsine : this.matBrut;
    const [f0, f1] = d > 0 ? [this.x0, s] : [s, this.x1], [b0, b1] = d > 0 ? [s, this.x1] : [this.x0, s];
    this.mFait.visible = f1 - f0 > 0.01; this.mFait.position.x = f0; this.mFait.scale.x = Math.max(0.01, f1 - f0);
    this.mBrut.visible = b1 - b0 > 0.01; this.mBrut.position.x = b0; this.mBrut.scale.x = Math.max(0.01, b1 - b0);
  }

  /* ---------- Pièce cylindrique (arbre, ébauche) : rayon variable r(x, θ) ---------- */
  /* xs : abscisses, th : angles (rad) ; tw : torsion (rad/mm) → maillage qui suit une hélice */
  _maillageCylindre(R, xs, th, info, tw = 0) {
    const nx = xs.length, nt = th.length, N = nx * nt, nv = N + 2 * (nt + 1);
    const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = [];
    const id = (i, j) => i * nt + (j % nt);
    for (let i = 0; i < nx - 1; i++) for (let j = 0; j < nt; j++) { const a = id(i, j), b = id(i + 1, j), c = id(i, j + 1), d = id(i + 1, j + 1); idx.push(a, b, c, b, d, c); }
    const c0 = N, c1 = N + nt + 1;                                  // centres des faces d'extrémité
    for (let j = 0; j < nt; j++) {
      idx.push(c0, c0 + 1 + j, c0 + 1 + (j + 1) % nt);
      idx.push(c1, c1 + 1 + (j + 1) % nt, c1 + 1 + j);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.75, roughness: 0.35 }));
    m.userData.info = info;
    const cyl = { R, nx, nt, xs, th, tw, mesh: m, r: new Float32Array(N).fill(R), ang: (i, j) => th[j] + tw * xs[i] };
    cyl.maj = () => {
      const brut = [0.5, 0.54, 0.6], usine = [0.88, 0.91, 0.95];
      for (let i = 0; i < nx; i++) for (let j = 0; j < nt; j++) {
        const v = i * nt + j, r = cyl.r[v];
        const a = th[j] + tw * xs[i]; pos[v * 3] = xs[i]; pos[v * 3 + 1] = r * Math.sin(a); pos[v * 3 + 2] = r * Math.cos(a);
        col.set(r < R - 0.01 ? usine : brut, v * 3);
      }
      for (const [c, i] of [[c0, 0], [c1, nx - 1]]) {
        pos.set([xs[i], 0, 0], c * 3); col.set(brut, c * 3);
        for (let j = 0; j < nt; j++) { const v = i * nt + j, q = c + 1 + j; pos.set([pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], q * 3); col.set(cyl.r[v] < R - 0.01 ? usine : brut, q * 3); }
      }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
      g.computeVertexNormals(); g.computeBoundingSphere();
    };
    cyl.maj();
    return cyl;
  }

  _pieceCylindre(def) {
    const fonte = matMetal(COUL.etau, 0.45, 0.5), acier = matMetal(0xa3adba, 0.3, 0.85);
    this.rotCyl = new THREE.Group(); this.pieceG.add(this.rotCyl);
    if (def.cyl === 'clavette') {
      const A = ARBRE;
      const xs = [], th = [];
      for (let x = -A.L / 2; x < -20; x += 2) xs.push(x);
      for (let x = -20; x < 20; x += 0.4) xs.push(x);
      for (let x = 20; x <= A.L / 2 + 1e-6; x += 2) xs.push(x);
      for (let a = 0; a < 60; a += 3) th.push(a * Math.PI / 180);          // maillage fin sur le dessus (zone de la rainure)
      for (let a = 60; a < 120; a += 0.6) th.push(a * Math.PI / 180);
      for (let a = 120; a < 360 - 1e-6; a += 3) th.push(a * Math.PI / 180);
      this.cyl = this._maillageCylindre(A.R, xs, th, { titre: 'Arbre Ø30', texte: 'Arbre en acier posé sur deux vés et bridé. On y creuse une rainure de clavette parallèle (forme A) b = 8, t1 = 4.' });
      this.cyl.ylim = new Float32Array(this.cyl.r.length).fill(Infinity);
      this.rotCyl.add(this.cyl.mesh);
      // vés (V à 90°) et brides
      const d = A.R * Math.SQRT2, haut = -5, prof = -A.hAxe;
      const forme = [[-25, prof], [25, prof], [25, haut], [haut + d, haut], [0, -d], [-(haut + d), haut], [-25, haut]];
      for (const xv of [-45, 45]) {
        const sh = new THREE.Shape(forme.map(([z, y]) => new THREE.Vector2(-z, y)));
        const gv = new THREE.ExtrudeGeometry(sh, { depth: 20, bevelEnabled: false }); gv.rotateY(Math.PI / 2); gv.translate(xv - 10, 0, 0);
        const ve = new THREE.Mesh(gv, fonte); ve.userData.info = { titre: 'Vé', texte: 'Bloc en V à 90° : l\'arbre s\'y centre tout seul. Deux vés identiques gardent l\'arbre parallèle à la table.' };
        this.pieceG.add(ve);
        this.pieceG.add(this._box(xv - 5, xv + 5, A.R, A.R + 7, -32, 32, acier, { titre: 'Bride', texte: 'Elle plaque l\'arbre dans les vés. Interposer une cale en laiton pour ne pas marquer l\'arbre.' }));
        for (const z of [-28, 28]) { const v = this._cyl(3, prof, A.R + 12, acier, 12); v.position.set(xv, (prof + A.R + 12) / 2, z); this.pieceG.add(v); }
      }
      this.x0 = -A.L / 2; this.x1 = A.L / 2;
    } else {
      const Hh = HELICE;
      this.cyl = this._maillageCylindre(Hh.R, Array.from({ length: 101 }, (_, i) => -Hh.L / 2 + Hh.L * i / 100), Array.from({ length: 288 }, (_, j) => j * 2 * Math.PI / 288), { titre: 'Ébauche Ø40', texte: `Ébauche montée sur le diviseur. 4 goujures hélicoïdales à 30° : pas de l'hélice P = π × D / tan β ≈ ${Math.round(Hh.P)} mm.` }, -2 * Math.PI / Hh.P);
      this.rotCyl.add(this.cyl.mesh);
      const infoDiv = { titre: 'Diviseur relié à la table', texte: `Le diviseur est entraîné par la vis de la table grâce à un train de roues : la pièce tourne pendant que la table avance (hélice de pas ${Math.round(Hh.P)} mm). Entre deux goujures : 40 / 4 = 10 tours de manivelle.` };
      this._diviseur(this.rotCyl, -14, infoDiv, Hh.hAxe);
      // train de roues (vis de table → diviseur)
      const roues = matMetal(0xd8b04a, 0.35, 0.7);
      for (const [y, z, r] of [[-62, -60, 16], [-62, -89, 11], [-32, -70, 13]]) { const c = this._cyl(r, -6, 6, roues, 24, { titre: 'Train de roues', texte: 'Il relie la vis de la table au diviseur : rapport = 40 × pas de la vis / pas de l\'hélice.' }); c.rotation.z = Math.PI / 2; c.position.set(-128, y, z); this.pieceG.add(c); }
      this.x0 = -Hh.L / 2; this.x1 = Hh.L / 2;
    }
  }

  /* Arbre : la fraise (rayon Rt, bout en y) balaie (xa, za) → (xb, zb) */
  _couperArbre(xa, za, xb, zb, y, Rt) {
    const c = this.cyl, { nx, nt, xs, th, R } = c;
    let change = false;
    const ux = xb - xa, uz = zb - za, l2 = ux * ux + uz * uz, R2 = Rt * Rt + 1e-3;
    for (let i = 0; i < nx; i++) {
      const x = xs[i]; if (x < Math.min(xa, xb) - Rt - 1 || x > Math.max(xa, xb) + Rt + 1) continue;
      for (let j = 0; j < nt; j++) {
        const a = c.ang(i, j), sn = Math.sin(a); if (sn <= 0.2) continue;
        const z = R * Math.cos(a), px = x - xa, pz = z - za;
        const t = l2 > 0 ? Math.max(0, Math.min(1, (px * ux + pz * uz) / l2)) : 0, dx = px - t * ux, dz = pz - t * uz;
        if (dx * dx + dz * dz > R2) continue;
        const v = i * nt + j;
        if (y < c.ylim[v]) { c.ylim[v] = y; const r = Math.min(R, y / sn); if (r < c.r[v]) { c.r[v] = r; change = true; } }
      }
    }
    return change;
  }

  /* Goujures : creux semi-circulaires R4 le long de l'hélice ; g < faits : complètes ; g = enCours : jusqu'à x */
  _majHelice(faits, enCours, xMax, xMin = -Infinity) {
    const c = this.cyl, Hh = HELICE, { nx, nt, xs, th, R } = c, aN = 2 * Math.PI / Hh.N, rp = Hh.prof;
    for (let i = 0; i < nx; i++) { if (xs[i] <= xMin || (xMin > -Infinity && xs[i] > xMax)) continue; for (let j = 0; j < nt; j++) {
      let r = R;
      for (let g = 0; g < Hh.N; g++) {
        if (g >= faits && !(g === enCours && xs[i] <= xMax)) continue;
        let d = c.ang(i, j) - (Math.PI / 2 - (2 * Math.PI * xs[i] / Hh.P + g * aN));
        d = Math.atan2(Math.sin(d), Math.cos(d));
        const sArc = R * d;
        if (Math.abs(sArc) < rp) r = Math.min(r, R - Math.sqrt(rp * rp - sArc * sArc));
      }
      c.r[i * nt + j] = r;
    } }
    c.sale = true;
  }

  /* ---------- Pièce : roue dentée sur diviseur ---------- */
  _pieceDenture() {
    const { Z, b, ra, yAxe } = ROUE;
    const brut = matMetal(0x8a939f, 0.62, 0.45), usine = matMetal(0xdfe5ec, 0.22, 0.9), fonte = matMetal(COUL.etau, 0.45, 0.5), acier = matMetal(0xa3adba, 0.3, 0.85), sombre = matMetal(0x1e293b, 0.7, 0.3);
    const info = { titre: 'Roue dentée (pièce)', texte: `Ébauche Ø${ra} × ${b} mm montée sur un mandrin entre le diviseur et la contre-pointe. Z = ${Z}, m = ${ROUE.m}.` };
    this.rotRoue = new THREE.Group(); this.pieceG.add(this.rotRoue);
    // profils : roue avec 0, 1, 2… creux taillés (ordre des passes)
    const ordre = (k) => (j) => { for (let g = 0; g < k; g++) if ((Z - g) % Z === j) return true; return false; };
    this.geos = [];
    for (let k = 0; k <= Z; k++) {
      const sh = new THREE.Shape(contourRoue(ordre(k)).map(([z, y]) => new THREE.Vector2(-z, y)));
      const t = new THREE.Path(); t.absarc(0, 0, 8, 0, Math.PI * 2, true); sh.holes.push(t);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false, curveSegments: 16 }); g.rotateY(Math.PI / 2);
      this.geos.push(g);
    }
    this.mFait = new THREE.Mesh(this.geos[0], usine); this.mBrut = new THREE.Mesh(this.geos[0], brut);
    this.mFait.userData.info = info; this.mBrut.userData.info = info;
    this.matBrut = brut; this.matUsine = usine;
    this.rotRoue.add(this.mFait, this.mBrut);
    const infoDiv = { titre: 'Diviseur universel', texte: `Rapport 40 : 1. Pour ${Z} dents : 40 / ${Z} = 2 tours + 1/2 tour de manivelle entre deux dents (2 tours + 10 trous sur le cercle de 20 trous).` };
    this._diviseur(this.rotRoue, 0, infoDiv, yAxe);
    this.x0 = -b / 2; this.x1 = b / 2;
  }

  /* Diviseur universel + mandrin + contre-pointe (rot : groupe qui tourne avec la pièce, dx : recul du diviseur) */
  _diviseur(rot, dx, infoDiv, yAxe) {
    const fonte = matMetal(COUL.etau, 0.45, 0.5), acier = matMetal(0xa3adba, 0.3, 0.85), sombre = matMetal(0x1e293b, 0.7, 0.3);
    const mOrange = () => matMetal(0xf59e0b, 0.4, 0.3);
    const axeX = (m, x0, x1) => { m.rotation.z = Math.PI / 2; m.position.x = (x0 + x1) / 2; return m; };
    // mandrin porte-pièce et mandrin 3 mors (tournent avec la roue)
    rot.add(axeX(this._cyl(8, -52 + dx, 64, acier, 24, { titre: 'Mandrin porte-pièce', texte: 'Arbre sur lequel la roue est serrée, entre le diviseur et la contre-pointe.' }), -52 + dx, 64));
    rot.add(axeX(this._cyl(18, -70 + dx, -52 + dx, fonte, 28, infoDiv), -70 + dx, -52 + dx));
    for (let k = 0; k < 3; k++) { const m = this._box(-56 + dx, -50 + dx, 12, 20, -3, 3, acier); const gm = new THREE.Group(); gm.rotation.x = k * 2 * Math.PI / 3; gm.add(m); rot.add(gm); }
    // diviseur (fixe sur la table)
    this.pieceG.add(this._box(-130 + dx, -72 + dx, -yAxe, -38, -42, 42, fonte, infoDiv));
    this.pieceG.add(axeX(this._cyl(30, -112 + dx, -70 + dx, fonte, 32, infoDiv), -112 + dx, -70 + dx));
    this.pieceG.add(axeX(this._cyl(40, -118 + dx, -112 + dx, sombre, 40, infoDiv), -118 + dx, -112 + dx));
    for (let k = 0; k < 20; k++) { const a = k * Math.PI / 10, t = axeX(this._cyl(1.6, -119 + dx, -117.5 + dx, acier, 8), -119 + dx, -117.5 + dx); t.position.y = 32 * Math.sin(a); t.position.z = 32 * Math.cos(a); this.pieceG.add(t); }
    this.manivelle = new THREE.Group(); this.manivelle.position.x = -122 + dx; this.pieceG.add(this.manivelle);
    this.manivelle.add(this._box(-2, 2, -3, 34, -3, 3, acier, { titre: 'Manivelle du diviseur', texte: infoDiv.texte }));
    const bouton = axeX(this._cyl(4, -14, -2, mOrange(), 16), -14, -2); bouton.position.y = 32; this.manivelle.add(bouton);
    // contre-pointe
    this.pieceG.add(this._box(68, 104, -yAxe, -18, -30, 30, fonte, { titre: 'Contre-pointe', texte: 'Elle soutient l\'autre bout du mandrin (pointe tournante).' }));
    this.pieceG.add(axeX(this._cyl(12, 64, 96, acier, 24), 64, 96));
  }

  /* ---------- Pièce : trous (perçage, taraudage) ---------- */
  _pieceTrous(def) {
    const brut = matMetal(0x8a939f, 0.62, 0.45), usine = matMetal(0xdfe5ec, 0.22, 0.9);
    const info = { titre: 'Pièce', texte: 'Pièce 120 × 60 × 40 mm, dessus déjà surfacé. Les trous se creusent au passage de l\'outil.' };
    const E = def.E || 28, r = def.r;                                       // épaisseur de la couche percée
    const forme = new THREE.Shape([[-L / 2, -W / 2], [L / 2, -W / 2], [L / 2, W / 2], [-L / 2, W / 2]].map(([x, z]) => new THREE.Vector2(x, -z)));
    for (const [x, z] of def.trous) { const t = new THREE.Path(); t.absarc(x, -z, r, 0, Math.PI * 2, true); forme.holes.push(t); }
    const g = new THREE.ExtrudeGeometry(forme, { depth: E, bevelEnabled: false, curveSegments: 28 });
    g.rotateX(-Math.PI / 2); g.translate(0, H - E, 0);             // (x, y) → (x, −z) ; extrusion vers le haut
    const paroi = brut.clone(); paroi.side = THREE.DoubleSide;           // parois des trous visibles de l'intérieur
    const couche = new THREE.Mesh(g, [usine, paroi]); couche.userData.info = info;
    const bas = this._box(-L / 2, L / 2, 0, H - E, -W / 2, W / 2, brut, info);
    this.pieceG.add(couche, bas);
    this.trous = def.trous.map(([x, z]) => {
      const grp = new THREE.Group(); grp.position.set(x, 0, z); this.pieceG.add(grp);
      const anneau = new THREE.Mesh(new THREE.RingGeometry(2.5, r, 28), usine); anneau.rotation.x = -Math.PI / 2; anneau.position.y = H;
      const centre = new THREE.Mesh(new THREE.CircleGeometry(2.5, 24), usine); centre.rotation.x = -Math.PI / 2; centre.position.y = H;
      const geoCone = (R, h) => { const c = new THREE.ConeGeometry(R, h, 28, 1, true); c.rotateX(Math.PI); c.translate(0, -h / 2, 0); return c; };
      const pointe = new THREE.Mesh(geoCone(2.5, 1.5), new THREE.MeshStandardMaterial({ color: 0xe5e9ef, metalness: 0.85, roughness: 0.25, side: THREE.BackSide }));
      pointe.position.y = H;
      const fond = new THREE.Mesh(geoCone(r, 0.6 * r), new THREE.MeshStandardMaterial({ color: 0xc9d0d8, metalness: 0.85, roughness: 0.3, side: THREE.BackSide }));
      grp.add(anneau, centre, pointe, fond);
      let filet = null;
      if (def.filet) {
        const h = new THREE.Curve(), tours = 20 / 1.5;
        h.getPoint = (u, v = new THREE.Vector3()) => v.set((r + 0.05) * Math.cos(u * tours * 2 * Math.PI), H - u * 20, (r + 0.05) * Math.sin(u * tours * 2 * Math.PI));
        filet = new THREE.Mesh(new THREE.TubeGeometry(h, 400, 0.42, 5), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.2 }));
        filet.userData.info = { titre: 'Filetage M10 × 1,5', texte: 'Filets taillés par le taraud. Pas = 1,5 mm : 1 tour de taraud = 1,5 mm de descente.' };
        grp.add(filet);
      }
      const geoMur = new THREE.CylinderGeometry(1, 1, 1, 36, 1, true), matMur = new THREE.MeshStandardMaterial({ color: 0xb8c0ca, metalness: 0.8, roughness: 0.35, side: THREE.BackSide });
      const mur = new THREE.Mesh(geoMur, matMur), murN = new THREE.Mesh(geoMur.clone(), new THREE.MeshStandardMaterial({ color: 0xeef2f6, metalness: 0.9, roughness: 0.15, side: THREE.BackSide }));
      const fondPlat = new THREE.Mesh(new THREE.RingGeometry(1, 1.01, 8), matMur.clone()); fondPlat.rotation.x = -Math.PI / 2; fondPlat.material.side = THREE.DoubleSide;
      grp.add(mur, murN, fondPlat);
      return { anneau, centre, pointe, fond, filet, r, mur, murN, fondPlat, rAnneau: 2.5, rPlat: null };
    });
    this._razTrous();
  }

  _razTrous() { this.etatTrous = this.trous.map(() => ({ pointe: false, prof: 0, filet: 0, rc: 0, rN: 0, profN: 0 })); this._majTrous(); }

  _majTrous() {
    this.trous.forEach((o, k) => {
      const e = this.etatTrous[k], perce = e.prof > 0.05;
      o.anneau.visible = !perce; o.centre.visible = !perce && !e.pointe; o.pointe.visible = !perce && e.pointe;
      o.fond.visible = perce; o.fond.position.y = H - e.prof;
      const rc = e.rc || o.r, kr = rc / o.r; o.fond.scale.set(kr, kr, kr);
      // anneau du dessus : son rayon intérieur suit le diamètre actuel du trou
      const rIn = !perce ? 2.5 : e.profN > 0.05 ? e.rN : rc;
      if (Math.abs(rIn - o.rAnneau) > 1e-3) { o.anneau.geometry.dispose(); o.anneau.geometry = new THREE.RingGeometry(rIn, o.r, 36); o.rAnneau = rIn; }
      o.anneau.visible = !perce || rIn < o.r - 0.01;
      // paroi de l'avant-trou (sous la partie déjà alésée) et paroi alésée
      const hm = e.prof - e.profN;
      o.mur.visible = perce && rc < o.r - 0.01 && hm > 0.05; o.mur.scale.set(rc, Math.max(hm, 0.01), rc); o.mur.position.y = H - e.profN - hm / 2;
      o.murN.visible = e.profN > 0.05 && e.rN < o.r - 0.01; o.murN.scale.set(e.rN, Math.max(e.profN, 0.01), e.rN); o.murN.position.y = H - e.profN / 2;
      const plat = e.profN > e.prof - 0.06 && e.rN > rc;
      o.fondPlat.visible = plat;
      if (plat) { o.fondPlat.position.y = H - e.prof + 0.02; if (o.rPlat !== e.rN) { o.fondPlat.geometry.dispose(); o.fondPlat.geometry = new THREE.RingGeometry(rc, e.rN, 36); o.rPlat = e.rN; } }
      if (o.filet) { const n = o.filet.geometry.index.count, f = Math.min(1, e.filet / 20); o.filet.visible = f > 0.01; o.filet.geometry.setDrawRange(0, Math.floor(n * f / 6) * 6); }
    });
  }

  /* Effet d'une position de l'outil sur les trous (pointe de l'outil en p.y) */
  _creuser(s, p) {
    if (s.trou == null || !this.etatTrous) return false;
    const e = this.etatTrous[s.trou], d = H - p.y;
    if (d <= 0) return false;
    if (s.etape === 'pointage') { if (!e.pointe) { e.pointe = true; return true; } return false; }
    if (s.etape === 'percage') { const R = OUT[s.outil].R, pr = d - 0.6 * R; e.rc = R; if (pr > e.prof) { e.prof = pr; return true; } return false; }
    if (s.etape === 'alesage') {
      const R = OUT[s.outil].R;
      if (R > e.rN + 1e-6) { if (e.rN > 0) e.rc = e.rN; e.rN = R; e.profN = 0; }
      const pr = Math.min(d, e.prof);
      if (pr > e.profN) { e.profN = pr; return true; }
      return false;
    }
    if (s.etape === 'taraud' && d > e.filet) { e.filet = d; return true; }
    return false;
  }

  /* ---------- Pièce : carte des hauteurs (poche, contournage) ---------- */
  _pieceCarte() {
    const nx = L + 1, nz = W + 1;
    this.carte = { nx, nz, h: new Float32Array(nx * nz) };
    const nb = nx * nz, bords = [];
    for (let i = 0; i < nx; i++) bords.push(i);                                // z = −30
    for (let j = 0; j < nz; j++) bords.push(j * nx + nx - 1);                 // x = +60
    for (let i = nx - 1; i >= 0; i--) bords.push((nz - 1) * nx + i);         // z = +30
    for (let j = nz - 1; j >= 0; j--) bords.push(j * nx);                     // x = −60
    this.carte.bords = bords;
    const pos = new Float32Array((nb + bords.length * 2) * 3), col = new Float32Array(pos.length), idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const v = j * nx + i; pos[v * 3] = -L / 2 + i; pos[v * 3 + 2] = -W / 2 + j;
      if (i < nx - 1 && j < nz - 1) { const a = v, b = v + 1, c = v + nx, d = v + nx + 1; idx.push(a, c, b, b, c, d); }
    }
    bords.forEach((v, k) => {
      const t = nb + k * 2;
      for (const q of [t, t + 1]) { pos[q * 3] = pos[v * 3]; pos[q * 3 + 2] = pos[v * 3 + 2]; }
      if (k < bords.length - 1) idx.push(t, t + 1, t + 2, t + 2, t + 1, t + 3);
    });
    // géométrie non indexée : une normale par face → arêtes nettes (parois verticales propres)
    this.carte.base = pos; this.carte.baseCol = col; this.carte.map = Uint32Array.from(idx);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(idx.length * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(idx.length * 3), 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.75, roughness: 0.35, side: THREE.DoubleSide }));
    m.userData.info = { titre: 'Pièce', texte: 'Pièce brute 120 × 60 × 40 mm. Les surfaces usinées apparaissent brillantes.' };
    this.carte.mesh = m;
    this.pieceG.add(m);
    this._razCarte();
  }

  _razCarte() { this.carte.h.fill(H); this._majCarte(); }

  _majCarte() {
    const { nx, nz, h, bords, mesh, base, baseCol, map } = this.carte, nb = nx * nz;
    const brut = [0.42, 0.46, 0.52], usine = [0.86, 0.9, 0.95];
    for (let v = 0; v < nb; v++) { base[v * 3 + 1] = h[v]; baseCol.set(h[v] < H - 0.01 ? usine : brut, v * 3); }
    bords.forEach((v, k) => {
      const t = nb + k * 2;
      base[t * 3 + 1] = h[v]; base[t * 3 + 4] = 0;
      baseCol.set(h[v] < H - 0.01 ? usine : brut, t * 3); baseCol.set(brut, t * 3 + 3);
    });
    const pos = mesh.geometry.attributes.position, col = mesh.geometry.attributes.color, P = pos.array, C = col.array;
    for (let k = 0; k < map.length; k++) {
      const a = map[k] * 3, b = k * 3;
      P[b] = base[a]; P[b + 1] = base[a + 1]; P[b + 2] = base[a + 2];
      C[b] = baseCol[a]; C[b + 1] = baseCol[a + 1]; C[b + 2] = baseCol[a + 2];
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingSphere();
  }

  /* La fraise balaye le segment (xa, za) → (xb, zb) : toutes les cases à moins de R du segment sont creusées */
  _couperCarte(xa, za, xb, zb, y, R) {
    if (y >= H) return false;
    const { nx, nz, h } = this.carte;
    let change = false;
    const i0 = Math.max(0, Math.floor(Math.min(xa, xb) + L / 2 - R)), i1 = Math.min(nx - 1, Math.ceil(Math.max(xa, xb) + L / 2 + R));
    const j0 = Math.max(0, Math.floor(Math.min(za, zb) + W / 2 - R)), j1 = Math.min(nz - 1, Math.ceil(Math.max(za, zb) + W / 2 + R));
    const ux = xb - xa, uz = zb - za, l2 = ux * ux + uz * uz, R2 = R * R + 1e-3;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = -L / 2 + i - xa, pz = -W / 2 + j - za;
      const t = l2 > 0 ? Math.max(0, Math.min(1, (px * ux + pz * uz) / l2)) : 0;
      const dx = px - t * ux, dz = pz - t * uz;
      if (dx * dx + dz * dz <= R2) { const v = j * nx + i; if (h[v] > y) { h[v] = y; change = true; } }
    }
    return change;
  }

  /* ---------- Trajectoire de la fraise ---------- */
  _trajet(cle) {
    const def = DEFS[cle], segs = [];
    let cur = null, outil = null;
    const ajoute = (type, vers, lab, o = {}) => {
      const de = cur || vers, d = Math.hypot(vers.x - de.x, vers.y - de.y, vers.z - de.z);
      const v = o.v || (type === 'rapide' ? 110 : type === 'plonge' ? 6 : type === 'descente' ? 30 : (def.carte ? 32 : 22));
      segs.push({ type, de: { ...de }, vers: { ...vers }, dur: o.dur ?? Math.max(0.25, d / v), lab, outil, ...o });
      cur = { ...vers };
    };
    if (def.cyl === 'clavette') {
      const A = ARBRE, sur = A.R + 12, xs = [-A.xc, A.xc];
      outil = 'f8clav'; cur = { x: xs[0], y: sur, z: 0 };
      ajoute('rapide', { x: xs[0], y: sur, z: 0 }, 'Positionnement sur l\'axe de l\'arbre, au bout de la rainure');
      ajoute('descente', { x: xs[0], y: A.R + 1, z: 0 }, 'Approche à 1 mm du dessus de l\'arbre');
      let cote = 0;
      for (let n = 1; n <= A.t1; n++) {
        const y = A.R - n;
        ajoute('plonge', { x: xs[cote], y, z: 0 }, `Plongée de 1 mm (profondeur ${n} / ${A.t1} mm)`, { coupe: true, v: 3 });
        cote = 1 - cote;
        ajoute('travail', { x: xs[cote], y, z: 0 }, `Fraisage pendulaire : passe ${n}/${A.t1} vers ${cote ? 'la droite' : 'la gauche'}`, { coupe: true, cote: 0, v: 10 });
      }
      ajoute('rapide', { x: xs[cote], y: sur, z: 0 }, 'Dégagement : rainure finie (b = 8, t1 = 4, L = 30)');
      ajoute('rapide', { x: xs[0], y: sur, z: 0 }, 'Retour au point de départ');
      segs.forEach(sg => { sg.faits = 0; });
    } else if (def.cyl === 'helice') {
      const Hh = HELICE, Rc = OUT.convexe.R, xa = -(Hh.L / 2 + 20), yc = Hh.R - Hh.prof + Rc, sur = Hh.R + Rc + 4;
      outil = 'convexe'; cur = { x: xa, y: sur, z: 0 };
      for (let g = 0; g < Hh.N; g++) {
        ajoute('descente', { x: xa, y: yc, z: 0 }, `Prise de passe : profondeur ${Hh.prof} mm`);
        ajoute('travail', { x: -xa, y: yc, z: 0 }, `Goujure ${g + 1}/${Hh.N} : la table avance et le diviseur fait tourner la pièce`, { passe: g, cote: 'h', v: 14 });
        ajoute('rapide', { x: -xa, y: sur, z: 0 }, 'Dégagement de la fraise');
        ajoute('rapide', { x: xa, y: sur, z: 0 }, 'Retour : la pièce tourne en sens inverse (train de roues)', { v: 60 });
        if (g < Hh.N - 1) ajoute('division', { x: xa, y: sur, z: 0 }, `Division : 40 / ${Hh.N} = 10 tours de manivelle → goujure ${g + 2}/${Hh.N}`, { dur: 1.1 });
      }
      let faits = 0, k = 0;
      for (const sg of segs) { sg.faits = faits; sg.k0 = k; if (sg.passe != null) faits = sg.passe + 1; if (sg.type === 'division') k++; }
      this.nbDiv = k;
    } else if (def.denture) {
      const { Z, ra, h } = ROUE, R = OUT.module.R, xa = -(ROUE.b / 2 + 17 + 6), yc = ra - h + R, sur = ra + R + 4;
      outil = 'module'; cur = { x: xa, y: sur, z: 0 };
      for (let g = 0; g < Z; g++) {
        ajoute('descente', { x: xa, y: yc, z: 0 }, `Prise de passe : h = 2,25 × m = ${(h).toLocaleString('fr-FR')} mm`);
        ajoute('travail', { x: -xa, y: yc, z: 0 }, `Taillage du creux ${g + 1}/${Z}`, { passe: g, cote: 'h', av: 17, v: 38 });
        ajoute('rapide', { x: -xa, y: sur, z: 0 }, 'Dégagement de la fraise');
        ajoute('rapide', { x: xa, y: sur, z: 0 }, 'Retour rapide de la table');
        if (g < Z - 1) ajoute('division', { x: xa, y: sur, z: 0 }, `Division : 40 / ${Z} = 2 tours 1/2 de manivelle → dent ${g + 2}/${Z}`, { dur: 0.75, div: g });
      }
      let faits = 0, k = 0;
      for (const sg of segs) { sg.faits = faits; sg.k0 = k; if (sg.passe != null) faits = sg.passe + 1; if (sg.type === 'division') k++; }
      this.nbDiv = k;
    } else if (def.trous) {
      const sur = H + 12;
      def.etapes.forEach((e) => {
        if (!cur) cur = { x: def.trous[0][0], y: sur, z: def.trous[0][1] };
        if (outil && e.outil !== outil) { const haut = { ...cur, y: sur + 25 }; ajoute('rapide', haut, 'Dégagement pour le changement d\'outil'); outil = e.outil; ajoute('change', haut, 'Changement d\'outil : ' + OUT[e.outil].nom, { dur: 1.8 }); }
        outil = e.outil;
        def.trous.forEach(([x, z], k) => {
          const o = { trou: k, etape: e.type, coupe: true }, n = `trou ${k + 1}/${def.trous.length}`;
          ajoute('rapide', { x, y: sur, z }, `Positionnement sur le ${n}`);
          ajoute('descente', { x, y: H + 2, z }, 'Approche rapide à 2 mm de la surface');
          if (e.type === 'alesage') {
            ajoute('travail', { x, y: H - e.prof, z }, `${e.lab}`, { ...o, v: 8 });
            ajoute('rapide', { x, y: H + 2, z }, 'Remontée broche arrêtée (la plaquette ne doit pas rayer l\'alésage)', { arret: true });
          } else if (e.type === 'taraud') {
            ajoute('travail', { x, y: H - e.prof, z }, `${e.lab} — ${n}`, { ...o, v: 7 });
            ajoute('travail', { x, y: H + 2, z }, 'Sortie du taraud : rotation inversée (M4)', { inverse: true, v: 9 });
          } else if (e.debourrage) {
            let z0 = 0;
            while (z0 < e.prof - 1e-6) {
              const z1 = Math.min(e.prof, z0 + e.debourrage);
              ajoute('travail', { x, y: H - z1, z }, `${e.lab} — ${n}`, { ...o, v: 10 });
              if (z1 < e.prof) { ajoute('rapide', { x, y: H + 2, z }, 'Débourrage : remontée pour évacuer les copeaux'); ajoute('descente', { x, y: H - z1 + 0.5, z }, 'Redescente rapide au fond du trou'); }
              z0 = z1;
            }
          } else ajoute('travail', { x, y: H - e.prof, z }, `${e.lab} — ${n}`, { ...o, v: 6 });
          ajoute('rapide', { x, y: sur, z }, 'Remontée hors du trou');
        });
      });
      const e0 = def.etapes[0], depart = { x: def.trous[0][0], y: H + 12, z: def.trous[0][1] };
      ajoute('rapide', depart, 'Retour au point de départ');
      if (outil !== e0.outil) { outil = e0.outil; ajoute('change', depart, 'Changement d\'outil : ' + OUT[e0.outil].nom, { dur: 1.2 }); }
      segs.forEach(sg => { sg.faits = 0; });
    } else if (!def.carte) {
      def.passes.forEach((p, k) => {
        const R = OUT[p.outil].R, xa = this.dir * -(L / 2 + R + 8), sur = OUT[p.outil].horiz ? H + R + 15 : H + 15;
        if (!cur) cur = { x: xa, y: sur, z: p.z };
        if (outil && p.outil !== outil) { const haut = { ...cur, y: Math.max(cur.y, sur) + 25 }; ajoute('rapide', haut, 'Dégagement pour le changement d\'outil'); outil = p.outil; ajoute('change', haut, 'Changement d\'outil : ' + OUT[p.outil].nom, { dur: 1.8 }); }
        outil = p.outil;
        ajoute('rapide', { x: xa, y: sur, z: p.z }, 'Approche rapide hors de la pièce');
        ajoute('descente', { x: xa, y: p.y, z: p.z }, 'Prise de passe : ' + p.nom);
        ajoute('travail', { x: -xa, y: p.y, z: p.z }, `Usinage passe ${k + 1}/${def.passes.length} — ${p.nom}`, { passe: k, cote: p.cote, av: p.av || 0 });
        ajoute('rapide', { x: -xa, y: sur, z: p.z }, 'Dégagement de la fraise');
      });
      const p0 = def.passes[0], R0 = OUT[p0.outil].R, depart = { x: this.dir * -(L / 2 + R0 + 8), y: OUT[p0.outil].horiz ? H + R0 + 15 : H + 15, z: p0.z };
      ajoute('rapide', depart, 'Retour au point de départ');
      if (outil !== p0.outil) { outil = p0.outil; ajoute('change', depart, 'Changement d\'outil : ' + OUT[p0.outil].nom, { dur: 1.2 }); }
      let faits = 0;
      for (const s of segs) { s.faits = faits; if (s.passe != null) faits = s.passe + 1; }
    } else {
      outil = def.outil;
      const chemin = cle === 'poche' ? trajetPoche() : trajetContour(), sur = H + 12;
      def.niveaux.forEach((y, n) => {
        const [x0, z0] = chemin[0];
        if (!cur) cur = { x: x0, y: sur, z: z0 };
        ajoute('rapide', { x: x0, y: sur, z: z0 }, 'Approche rapide');
        if (cle === 'poche') { ajoute('descente', { x: x0, y: H + 1, z: z0 }, 'Approche de la surface'); ajoute('plonge', { x: x0, y, z: z0 }, `Plongée à ${H - y} mm (fraise à coupe au centre)`, { coupe: true }); }
        else ajoute('descente', { x: x0, y, z: z0 }, `Descente hors de la pièce à ${H - y} mm`);
        for (let i = 1; i < chemin.length; i++) {
          const fin = cle === 'poche' && i >= 8;
          ajoute('travail', { x: chemin[i][0], y, z: chemin[i][1] }, cle === 'poche' ? (fin ? `Niveau ${n + 1}/2 — passe de contour (finition des flancs)` : `Niveau ${n + 1}/2 — balayage en zigzag`) : `Niveau ${n + 1}/2 — contournage en avalant (sens horaire)`, { coupe: true, cote: def.cote });
        }
        ajoute('rapide', { ...cur, y: sur }, 'Dégagement de la fraise');
      });
      const [x0, z0] = chemin[0];
      ajoute('rapide', { x: x0, y: sur, z: z0 }, 'Retour au point de départ');
      segs.forEach(s => { s.faits = 0; });
    }
    let t = 0;
    for (const s of segs) { s.t0 = t; t += s.dur; }
    this.duree = t;
    return segs;
  }

  _position(t) {
    const segs = this.segs;
    let i = Math.min(this.segIdxCache || 0, segs.length - 1);
    if (t < segs[i].t0) i = 0;
    while (i < segs.length - 1 && t >= segs[i].t0 + segs[i].dur) i++;
    this.segIdxCache = i;
    const s = segs[i], u = Math.max(0, Math.min(1, (t - s.t0) / s.dur)), e = s.type === 'rapide' ? u * u * (3 - 2 * u) : u;
    return { i, s, p: { x: s.de.x + (s.vers.x - s.de.x) * e, y: s.de.y + (s.vers.y - s.de.y) * e, z: s.de.z + (s.vers.z - s.de.z) * e } };
  }

  /* ---------- Construction d'une opération ---------- */
  construire(cle, dir = 1) {
    this.cle = cle; this.dir = DEFS[cle].passes ? dir : 1;
    const def = DEFS[cle];
    // vider la pièce
    this.pieceG.traverse(o => { if (o !== this.pieceG) { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => m.dispose()); } });
    this.geos?.forEach(g => g.dispose()); this.geos = null;
    this.pieceG.clear();
    for (const k in this.outils) this.outils[k].traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    this.outils = {}; this.outilCourant = null;
    for (const e of this.etiquettes) e.el.remove();
    this.etiquettes = [];
    const premier = def.cyl ? def.outil : def.denture ? 'module' : def.trous ? def.etapes[0].outil : def.carte ? def.outil : def.passes[0].outil, horiz = !!OUT[premier].horiz;
    const machineChange = !this.bati || this.bati.userData.horiz !== horiz;
    this._construireBati(horiz);
    if (machineChange && this.cle0) this.recentrer();
    this.cle0 = cle;
    this.etau.visible = !def.denture && !def.cyl;
    this._construireMachineMobileEtiquettes();
    if (!this.porte) {
      this.porte = new THREE.Group(); this.rotor = new THREE.Group(); this.porte.add(this.rotor); this.racine.add(this.porte);
    }
    this.porte.position.set(0, YT, 0);
    this.carte = null; this.trous = null; this.etatTrous = null; this.decalCop = 0; this.rotRoue = null; this.manivelle = null; this.cyl = null; this.rotCyl = null;
    this.beta = def.cyl === 'helice' ? HELICE.beta : 0; this.table.rotation.y = this.beta; this.table.position.z = 0;
    this.x0 = -L / 2; this.x1 = L / 2;
    this.hPiece = def.denture ? ROUE.yAxe : def.cyl === 'clavette' ? ARBRE.hAxe : def.cyl === 'helice' ? HELICE.hAxe : BRIDE; this.pieceG.position.y = this.hPiece; this.etau.visible = !def.denture && !def.cyl;
    if (def.cyl) this._pieceCylindre(def); else if (def.denture) this._pieceDenture(); else if (def.trous) this._pieceTrous(def); else if (def.carte) this._pieceCarte(); else this._pieceProfils(def);
    this.segs = this._trajet(cle);
    this.t = 0; this.segIdx = -1; this.segIdxCache = 0; this.dernierT = 0; this.idxTrou = 0; this.dernierTc = 0; this.cleHelice = null;
    this._mettreOutil(premier);
    this._etiq(this.porte, [OUT[premier].horiz ? 50 : 30, OUT[premier].horiz ? 30 : 60, OUT[premier].horiz ? 20 : 0], def.trous ? 'Outil' : 'Fraise', 'menant');
    const posP = def.denture ? [0, ROUE.ra + 8, 12] : def.cyl === 'clavette' ? [-40, 20, 16] : def.cyl === 'helice' ? [0, 26, 20] : [L / 2 - 8, H + 4, W / 2];
    this._etiq(this.pieceG, posP, def.denture ? 'Roue à tailler' : def.cyl === 'clavette' ? 'Arbre Ø30' : def.cyl === 'helice' ? 'Ébauche Ø40' : 'Pièce', 'mene');
    if (def.cyl === 'clavette') this._etiq(this.pieceG, [45, -25, 26], 'Vé + bride');
    if (def.cyl === 'helice') { this._etiq(this.pieceG, [-110, 45, 0], 'Diviseur'); this._etiq(this.pieceG, [-128, -45, -75], 'Train de roues'); this._etiq(this.table, [-150, 8, 60], 'Table orientée de 30°'); }
    if (def.denture) { this._etiq(this.pieceG, [-100, 45, 0], 'Diviseur'); this._etiq(this.pieceG, [86, 20, 0], 'Contre-pointe'); }
    if (horiz) this._etiq(this.porte, [0, 18, 85], 'Arbre porte-fraise');
    this._animer(0);
    return { segs: this.segs, duree: this.duree };
  }

  _construireMachineMobileEtiquettes() {
    this._etiq(this.table, [200, 6, 72], 'Table');
    if (this.etau.visible) this._etiq(this.etau, [-50, 50, 52], 'Étau');
    this._etiq(this.genou, [110, -180, 80], 'Console');
    if (this.bati.userData.horiz) this._etiq(this.bati, [0, 380, 124], 'Lunette');
    else this._etiq(this.bati, [0, 285, 34], 'Broche');
  }

  nomOutil() { return OUT[this.outilCourant]?.nom || ''; }

  sensAvance(dir) { if (this.cle) this.construire(this.cle, dir); }

  _animer(dt) {
    const pauseFin = 2.5, cycle = this.duree + pauseFin;
    let t = this.t + dt;
    if (t >= cycle) { t -= cycle; if (this.carte) this._razCarte(); if (this.trous) this._razTrous(); if (this.cyl && this.cle === 'clavette') { this.cyl.ylim.fill(Infinity); this.cyl.r.fill(ARBRE.R); this.cyl.sale = true; this.cyl.tMaj = 0; } this.idxTrou = 0; this.dernierT = 0; this.segIdxCache = 0; }
    // enlèvement de matière (carte) : échantillonnage entre l'instant précédent et maintenant
    let coupe = false;
    if (this.carte) {
      const R = OUT[this.outilCourant || DEFS[this.cle].outil].R;
      let change = false, prec = null;
      const t0 = Math.min(this.dernierT, t), pas = Math.max(0.005, (t - t0) / Math.ceil((t - t0) / 0.05 || 1));
      for (let ts = t0; ts <= t + 1e-6; ts += pas) {
        const { s, p } = this._position(Math.min(ts, this.duree - 1e-6));
        if (s.coupe) {
          const a = prec && prec.y === p.y ? prec : p;
          if (this._couperCarte(a.x, a.z, p.x, p.z, Math.max(a.y, p.y), R)) change = true;
        }
        prec = s.coupe ? p : null;
      }
      if (change) { this._majCarte(); coupe = true; }
    }
    this.t = t; this.dernierT = t;
    const { i, s, p } = this._position(Math.min(t, this.duree - 1e-6));
    if (this.cyl && this.cle === 'clavette') {
      let change = false, prec = null;
      const t0 = Math.min(this.dernierTc ?? 0, t), pas = Math.max(0.005, (t - t0) / Math.ceil((t - t0) / 0.04 || 1));
      for (let ts = t0; ts <= t + 1e-6; ts += pas) {
        const r0 = this._position(Math.min(ts, this.duree - 1e-6));
        if (r0.s.coupe) { const a = prec || r0.p; if (this._couperArbre(a.x, a.z, r0.p.x, r0.p.z, Math.max(a.y, r0.p.y), OUT.f8clav.R)) change = true; }
        prec = r0.s.coupe ? r0.p : null;
      }
      this.dernierTc = t;
      if (change) { this.cyl.sale = true; coupe = true; }
    }
    if (this.cyl && this.cle === 'helice') {
      const cleH = `${s.faits}|${s.passe ?? -1}`;
      if (cleH !== this.cleHelice) { this.cleHelice = cleH; this.helX = p.x; this._majHelice(s.passe != null ? s.passe : s.faits, s.passe ?? -1, p.x); }
      else if (s.passe != null && p.x > this.helX + 0.2) { this._majHelice(s.passe, s.passe, p.x, this.helX); this.helX = p.x; }   // seulement les colonnes nouvellement taillées
      coupe = s.passe != null && Math.abs(p.x) < HELICE.L / 2 + 16;
    }
    if (this.cyl?.sale) {                                 // maillage recalculé au plus ~12 fois par seconde (téléphones)
      const now = performance.now();
      if (now - (this.cyl.tMaj || 0) > 80 || !coupe) { this.cyl.maj(); this.cyl.tMaj = now; this.cyl.sale = false; }
    }
    if (this.trous) {
      // segments franchis depuis la dernière image : appliquer leur position finale
      let change = false;
      if ((this.idxTrou ?? 0) > i) this.idxTrou = 0;
      for (let k = this.idxTrou ?? 0; k < i; k++) if (this._creuser(this.segs[k], this.segs[k].vers)) change = true;
      this.idxTrou = i;
      if (s.type === 'travail' && this._creuser(s, p)) change = true;
      if (change) this._majTrous();
      coupe = s.coupe && s.type === 'travail' && p.y < H;
      this.decalCop = Math.max(0, H - p.y);
    }
    if (s.outil && s.type === 'change') { if (t - s.t0 > s.dur / 2) this._mettreOutil(s.outil); }
    else if (s.outil) this._mettreOutil(s.outil);
    if (!this.carte && !this.trous && !this.cyl) {
      this._majProfils(s, p.x);
      coupe = s.passe != null && Math.abs(p.x) < this.x1 + OUT[this.outilCourant].R * 0.8;
    }
    // déplacement de la console (hauteur), du chariot (z) et de la table (x)
    this.genou.position.y = YT - this.hPiece - p.y;
    if (this.rotRoue) {
      const u = s.type === 'division' ? Math.max(0, Math.min(1, (t - s.t0) / s.dur)) : 0, e = u * u * (3 - 2 * u), k = Math.min(this.nbDiv, (t >= this.duree ? this.nbDiv : s.k0) + e);
      this.rotRoue.rotation.x = -k * 2 * Math.PI / ROUE.Z;
      this.manivelle.rotation.x = -k * 2.5 * 2 * Math.PI;              // 40 / Z = 2,5 tours par division
    }
    if (this.beta) {                                      // table orientée de β : elle avance dans sa propre direction
      this.selle.position.z = 0;
      this.table.position.set(-(p.x * Math.cos(this.beta) + p.z * Math.sin(this.beta)), 0, p.x * Math.sin(this.beta) - p.z * Math.cos(this.beta));
    } else { this.selle.position.z = -p.z; this.table.position.x = -p.x; }
    if (this.rotCyl && this.cle === 'helice') {
      const u = s.type === 'division' ? Math.max(0, Math.min(1, (t - s.t0) / s.dur)) : 0, e = u * u * (3 - 2 * u), k = Math.min(this.nbDiv, (t >= this.duree ? this.nbDiv : s.k0) + e);
      const phi = 2 * Math.PI * p.x / HELICE.P + k * 2 * Math.PI / HELICE.N;
      this.rotCyl.rotation.x = -phi;
      if (this.manivelle) this.manivelle.rotation.x = -40 * phi;
    }
    // rotation de la fraise (arrêtée pendant le changement d'outil)
    const tourne = s.type !== 'change' && !s.arret && t < this.duree;
    const w = tourne ? this.toursParSec * Math.PI * 2 * dt * (s.inverse ? -1 : 1) : 0;
    if (OUT[this.outilCourant]?.horiz) { this.rotor.rotation.set(0, 0, this.rotor.rotation.z + w); }
    else { this.rotor.rotation.set(0, this.rotor.rotation.y - w, 0); }
    this._emettre(dt, coupe && tourne);
    const fini = t >= this.duree, cleSeg = fini ? -2 : i;
    if (cleSeg !== this.segIdx) {
      this.segIdx = cleSeg;
      this.surPhase?.(fini ? { lab: 'Opération terminée — contrôle de la pièce', type: 'fin' } : s, i, s.cote !== undefined && !fini ? modeFraisage(s.cote, this.dir) : '');
    }
    this.p = p;
  }
}
