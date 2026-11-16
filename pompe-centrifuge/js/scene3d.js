/* =====================================================================
   scene3d.js — Scène 3D du banc « pompe centrifuge » (Three.js)
   ---------------------------------------------------------------------
   Repère : 1 unité ≈ 10 cm. L'arbre de la pompe est selon Z : l'ouïe
   (aspiration axiale) regarde l'opérateur (+Z), le moteur est derrière.
   Le couvercle avant du corps de pompe est transparent pour voir la roue
   tourner. La bâche est à gauche ; l'eau aspirée remonte par la crépine
   et le clapet de pied, le refoulement monte (manomètre, clapet, vanne,
   débitmètre) puis retombe dans la bâche.
   Les tubes sont transparents : des particules montrent l'eau qui
   circule ; des bulles blanches apparaissent en cas de cavitation ou
   d'entrée d'air. La rotation affichée de la roue est ralentie.
   ===================================================================== */

import * as THREE from '../vendor/three.min.js';
import { OrbitControls, RoomEnvironment } from '../vendor/three.min.js';

const YP = 1.8;                 // axe de la pompe
const XR = 0.62;                // refoulement vertical
const Y_HAUT = 6.3;             // conduite de retour
const X_BACHE = -6.0;           // crépine et retour dans la bâche
const BACHE = { x0: -8, x1: -4, z0: -1.6, z1: 1.6, h: 3.4 };
const ROTA = { y0: 4.8, y1: 6.0 };   // rotamètre
const DIR_PORTRAIT = new THREE.Vector3(0.3, 0.32, 1).normalize();
const DIR_PAYSAGE = new THREE.Vector3(0.28, 0.3, 1).normalize();
const EAU = 0x1e88ff, EAU_PRESSION = 0x1565c0, AIR = 0x9aa4ae;

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const TRACES = {
  aspiration: [v(X_BACHE, 0.95, 1.0), v(X_BACHE, YP, 1.0), v(0, YP, 1.0), v(0, YP, 0.3)],
  refoulement: [v(XR, YP + 1.05, 0), v(XR, Y_HAUT, 0), v(X_BACHE, Y_HAUT, 0), v(X_BACHE, 3.75, 0)]
};

/* ---------------------------- Outils -------------------------------- */
function mat(couleur, metal = 0.3, rugo = 0.5, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: couleur, metalness: metal, roughness: rugo, ...extra });
}
function verre(couleur = 0xcfe8ff, opacite = 0.22) {
  return new THREE.MeshStandardMaterial({ color: couleur, metalness: 0, roughness: 0.08, transparent: true, opacity: opacite, depthWrite: false });
}
function ajout(groupe, geo, materiau, x = 0, y = 0, z = 0, ombre = true) {
  const m = new THREE.Mesh(geo, materiau);
  m.position.set(x, y, z);
  m.castShadow = ombre; m.receiveShadow = ombre;
  groupe.add(m);
  return m;
}
const cylY = (r, h, seg = 24, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const cylX = (r, h, seg = 24) => new THREE.CylinderGeometry(r, r, h, seg).rotateZ(Math.PI / 2);
const cylZ = (r, h, seg = 24, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg).rotateX(Math.PI / 2);
function coinsBoite(b) {
  const c = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) c.push(new THREE.Vector3(x, y, z));
  return c;
}
function textureTexte(texte, opts = {}) {
  const { fond = 'rgba(15,23,42,0.88)', couleur = '#ffffff', taille = 56, hauteur = 128, bord = '#38bdf8' } = opts;
  const police = `bold ${taille}px system-ui, Roboto, Arial, sans-serif`;
  const c = document.createElement('canvas');
  const mesure = c.getContext('2d');
  mesure.font = police;
  const largeur = Math.ceil(mesure.measureText(texte).width + hauteur * 0.75);
  c.width = largeur; c.height = hauteur;
  const ctx = c.getContext('2d');
  ctx.fillStyle = fond;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(4, 4, largeur - 8, hauteur - 8, hauteur / 2.6); else ctx.rect(4, 4, largeur - 8, hauteur - 8);
  ctx.fill();
  if (bord) { ctx.lineWidth = 6; ctx.strokeStyle = bord; ctx.stroke(); }
  ctx.fillStyle = couleur; ctx.font = police; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(texte, largeur / 2, hauteur / 2 + 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.ratio = largeur / hauteur;
  return t;
}
/* Cadran de manomètre de min à max (bar), 270° */
function textureCadran(min, max, pas, rouge) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const cx = 128, cy = 128;
  x.fillStyle = '#fbfbf7'; x.beginPath(); x.arc(cx, cy, 124, 0, Math.PI * 2); x.fill();
  x.lineWidth = 6; x.strokeStyle = '#333'; x.stroke();
  const ang = (p) => (225 - ((p - min) / (max - min)) * 270) * Math.PI / 180;
  if (rouge !== undefined) {
    x.strokeStyle = '#e11d48'; x.lineWidth = 12;
    x.beginPath(); x.arc(cx, cy, 100, -ang(rouge), -ang(max)); x.stroke();
  }
  if (min < 0) {
    x.strokeStyle = '#2563eb'; x.lineWidth = 12;
    x.beginPath(); x.arc(cx, cy, 100, -ang(0), -ang(min)); x.stroke();
  }
  x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const n = Math.round((max - min) / pas);
  for (let i = 0; i <= n * 2; i++) {
    const p = min + i * pas / 2, a = ang(p), grand = i % 2 === 0;
    const r1 = grand ? 92 : 100, r2 = 112;
    x.lineWidth = grand ? 4 : 2; x.strokeStyle = '#111';
    x.beginPath(); x.moveTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1); x.lineTo(cx + Math.cos(a) * r2, cy - Math.sin(a) * r2); x.stroke();
    if (grand) { x.font = 'bold 22px Arial'; x.fillText(String(Math.round(p * 10) / 10).replace('.', ','), cx + Math.cos(a) * 70, cy - Math.sin(a) * 70); }
  }
  x.font = 'bold 26px Arial'; x.fillText('bar', cx, cy + 62);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------------------------------------------------------------
   Classe ScenePompe
   --------------------------------------------------------------------- */
export class ScenePompe {
  constructor(canvas, surSelection) {
    this.canvas = canvas;
    this.surSelection = surSelection;
    this.composants = {};
    this.etiquettes = [];
    this.lignes = {};
    this.manometres = [];
    this.anim = null;
    this.qualite = 2;
    this.tempsImages = [];
    this.flaque = 0;
    this._initRendu();
    this._construireDecor();
    this._construireBache();
    this._construireAspiration();
    this._construirePompe();
    this._construireMoteur();
    this._construireRefoulement();
    this._construireVariateur();
    this._construireTubes();
    this._construireEffets();
    this._construireEtiquettes();
    this._initInteraction();
    this.redimensionner();
    this.recentrer(true);
  }

  /* --------------------------- Rendu -------------------------------- */
  _initRendu() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = r;
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.screenSpacePanning = true;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.addEventListener('start', () => { this.anim = null; this.vueManuelle = true; });
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.9));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.6);
    soleil.position.set(4, 14, 10);
    soleil.castShadow = true;
    soleil.shadow.mapSize.set(1024, 1024);
    const s = soleil.shadow.camera;
    s.left = -11; s.right = 9; s.top = 9; s.bottom = -5; s.near = 1; s.far = 40;
    soleil.shadow.bias = -0.0008;
    soleil.target.position.set(-2, 2, 0);
    this.scene.add(soleil, soleil.target);
    this.soleil = soleil;
    this._mat = {
      fonte: mat(0x2f6fb3, 0.45, 0.45), fonteFonce: mat(0x1e4f86, 0.45, 0.5),
      acier: mat(0xd5dbe1, 0.9, 0.25), acierFonce: mat(0x5b6570, 0.7, 0.4),
      noir: mat(0x22262b, 0.3, 0.6), rouge: mat(0xc81e1e, 0.35, 0.45),
      laiton: mat(0xc9a43b, 0.9, 0.3), bronze: mat(0xb07b3a, 0.85, 0.35),
      socle: mat(0x4b5563, 0.6, 0.45), jaune: mat(0xfacc15, 0.2, 0.5), tube: mat(0x9aa3ad, 0.8, 0.35)
    };
  }

  _groupe(id, parent = this.scene) {
    const g = new THREE.Group();
    g.userData.compId = id;
    this.composants[id] = g;
    parent.add(g);
    return g;
  }

  _manometre(parent, x, y, z, min, max, pas, rouge, rayon = 0.24) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    ajout(g, cylZ(rayon, 0.12, 32), this._mat.acier, 0, 0, -0.06);
    const face = new THREE.Mesh(new THREE.CircleGeometry(rayon * 0.9, 32), new THREE.MeshBasicMaterial({ map: textureCadran(min, max, pas, rouge), toneMapped: false }));
    face.position.z = 0.002;
    g.add(face);
    const aiguille = new THREE.Group();
    aiguille.position.z = 0.012;
    const tige = new THREE.Mesh(new THREE.BoxGeometry(0.018, rayon * 0.8, 0.006), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    tige.position.y = rayon * 0.36;
    aiguille.add(tige);
    g.add(aiguille);
    const vitre = ajout(g, new THREE.CircleGeometry(rayon * 0.95, 32), verre(0xffffff, 0.12), 0, 0, 0.02, false);
    vitre.userData.vitre = true;
    const m = { aiguille, min, max, valeur: 0 };
    this.manometres.push(m);
    return m;
  }

  /* --------------------------- Sol, châssis ------------------------- */
  _construireDecor() {
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), mat(0xc9d1d9, 0, 0.9));
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    this.scene.add(sol);
    const grille = new THREE.GridHelper(60, 60, 0xaab4bf, 0xb9c2cc);
    grille.position.y = 0.002;
    grille.material.transparent = true; grille.material.opacity = 0.5;
    this.scene.add(grille);
    // Socle commun pompe + moteur
    const g = this._groupe('socle');
    ajout(g, new THREE.BoxGeometry(1.8, 0.3, 4.6), this._mat.socle, 0, 0.3, -1.55);
    for (const z of [0.5, -3.6]) ajout(g, new THREE.BoxGeometry(2.0, 0.15, 0.4), this._mat.socle, 0, 0.075, z);
    // Flaque (fuite de garniture)
    this.matFlaque = new THREE.MeshStandardMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1 });
    this.meshFlaque = ajout(this.scene, new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), this.matFlaque, 0.9, 0.006, -0.4, false);
    this.meshFlaque.visible = false;
  }

  /* ------------------------------ Bâche ----------------------------- */
  _construireBache() {
    const g = this._groupe('bache');
    const B = BACHE, w = B.x1 - B.x0, d = B.z1 - B.z0, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2;
    const vitre = ajout(g, new THREE.BoxGeometry(w, B.h, d), verre(0xe0f2fe, 0.14), cx, B.h / 2, cz, false);
    vitre.userData.vitre = true;
    ajout(g, new THREE.BoxGeometry(w, 0.06, d), this._mat.acierFonce, cx, 0.03, cz);
    // Arêtes du cadre
    for (const x of [B.x0, B.x1]) for (const z of [B.z0, B.z1]) ajout(g, new THREE.BoxGeometry(0.08, B.h, 0.08), this._mat.acierFonce, x, B.h / 2, z);
    for (const z of [B.z0, B.z1]) ajout(g, new THREE.BoxGeometry(w, 0.08, 0.08), this._mat.acierFonce, cx, B.h, z);
    for (const x of [B.x0, B.x1]) ajout(g, new THREE.BoxGeometry(0.08, 0.08, d), this._mat.acierFonce, x, B.h, cz);
    // Eau (hauteur réglée à chaque image)
    const geo = new THREE.BoxGeometry(w - 0.12, 1, d - 0.12);
    geo.translate(0, 0.5, 0);
    this.matEau = new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.38, roughness: 0.05, depthWrite: false });
    this.eau = ajout(g, geo, this.matEau, cx, 0.06, cz, false);
    this.eau.userData.vitre = true;
    // Règle de niveau graduée
    ajout(g, new THREE.BoxGeometry(0.06, B.h - 0.2, 0.02), this._mat.jaune, B.x1 - 0.15, B.h / 2, B.z1 + 0.02, false);
    // Repère de l'axe de la pompe sur la bâche (trait rouge)
    ajout(g, new THREE.BoxGeometry(0.4, 0.03, 0.02), this._mat.rouge, B.x1 - 0.15, YP, B.z1 + 0.035, false);
  }

  /* ----------- Crépine, clapet de pied, vanne, vacuomètre ----------- */
  _construireAspiration() {
    const M = this._mat;
    const cr = this._groupe('crepine');
    // Crépine perforée (grille) + clapet de pied en laiton
    const grilleMat = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.9, roughness: 0.3, wireframe: true });
    ajout(cr, cylY(0.25, 0.45, 18), grilleMat, X_BACHE, 0.33, 1.0, false);
    ajout(cr, cylY(0.26, 0.04, 24), M.acier, X_BACHE, 0.1, 1.0);
    ajout(cr, cylY(0.2, 0.3, 20), M.laiton, X_BACHE, 0.72, 1.0);
    this.battant = ajout(cr, cylY(0.14, 0.03, 16), M.bronze, X_BACHE, 0.88, 1.0);
    // Traversée de la paroi de la bâche (bride)
    ajout(cr, cylX(0.3, 0.08, 24), M.acierFonce, BACHE.x1, YP, 1.0);
    // Vanne d'aspiration à opercule (volant vers le haut)
    const va = this._groupe('vanneAsp');
    ajout(va, new THREE.SphereGeometry(0.28, 20, 14), M.fonteFonce, -2.8, YP, 1.0);
    for (const dx of [-0.3, 0.3]) ajout(va, cylX(0.27, 0.06, 20), M.fonteFonce, -2.8 + dx, YP, 1.0);
    ajout(va, cylY(0.05, 0.7, 10), M.acier, -2.8, YP + 0.55, 1.0);
    const volant = new THREE.Group();
    volant.position.set(-2.8, YP + 0.85, 1.0);
    va.add(volant);
    ajout(volant, new THREE.TorusGeometry(0.24, 0.03, 8, 24).rotateX(Math.PI / 2), M.rouge, 0, 0, 0);
    for (let i = 0; i < 3; i++) { const b = ajout(volant, new THREE.BoxGeometry(0.48, 0.03, 0.03), M.rouge, 0, 0, 0); b.rotation.y = i * Math.PI / 3; }
    this.volantAsp = volant;
    // Vacuomètre (monté sur un piquage juste avant la pompe)
    const vac = this._groupe('vacuometre');
    ajout(vac, cylY(0.04, 0.4, 10), M.laiton, -1.0, YP + 0.35, 1.0);
    this.vacuometre = this._manometre(vac, -1.0, YP + 0.75, 1.13, -1, 1.5, 0.5, undefined, 0.24);
  }

  /* ------------------ Pompe : volute, roue, garniture ---------------- */
  _construirePompe() {
    const M = this._mat;
    const g = this._groupe('pompe');
    this.groupePompe = g;
    // Pied et corps en spirale (volute)
    ajout(g, new THREE.BoxGeometry(0.9, YP - 0.95, 0.5), M.fonte, 0, (YP - 0.95) / 2 + 0.45, -0.05);
    ajout(g, cylZ(0.85, 0.42, 48), M.fonte, 0, YP, -0.05);
    const spirale = ajout(g, new THREE.TorusGeometry(0.86, 0.17, 12, 48, Math.PI * 1.75), M.fonte, 0, YP, -0.05);
    spirale.rotation.z = Math.PI * 0.45;
    // Bec de refoulement (tangentiel, vers le haut) + bride
    ajout(g, cylY(0.19, 0.55, 24), M.fonte, XR, YP + 0.78, 0);
    ajout(g, cylY(0.27, 0.07, 24), M.fonte, XR, YP + 1.05, 0);
    // Fond intérieur sombre + couvercle avant transparent boulonné
    ajout(g, new THREE.CircleGeometry(0.8, 40), mat(0x1f2937, 0.3, 0.7), 0, YP, 0.1, false);
    const couvercle = ajout(g, cylZ(0.84, 0.04, 48), verre(0xdbeafe, 0.18), 0, YP, 0.2, false);
    couvercle.userData.vitre = true;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      ajout(g, cylZ(0.035, 0.06, 6), M.acierFonce, Math.cos(a) * 0.8, YP + Math.sin(a) * 0.8, 0.23);
    }
    // Ouïe (bride d'aspiration)
    ajout(g, cylZ(0.22, 0.12, 24), M.fonte, 0, YP, 0.28);
    // Eau dans le corps (teintée) : visible à travers le couvercle
    this.matEauCorps = new THREE.MeshBasicMaterial({ color: EAU, transparent: true, opacity: 0.22, depthWrite: false });
    const eauCorps = ajout(g, new THREE.CircleGeometry(0.79, 40), this.matEauCorps, 0, YP, 0.185, false);
    eauCorps.userData.vitre = true;
    // Roue à aubes courbes (tourne)
    const roue = new THREE.Group();
    roue.position.set(0, YP, 0.12);
    g.add(roue);
    this.roue = roue;
    const bronze = M.bronze;
    ajout(roue, new THREE.CircleGeometry(0.64, 40), bronze, 0, 0, -0.005, false);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Shape();
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        const u = k / 10, r = 0.14 + u * 0.48, a = u * 1.25;       // aube incurvée vers l'arrière
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      f.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) f.lineTo(p[0], p[1]);
      for (let k = pts.length - 1; k >= 0; k--) { const [x, y] = pts[k]; const l = Math.hypot(x, y); f.lineTo(x - y / l * 0.06, y + x / l * 0.06); }
      f.closePath();
      const aube = ajout(roue, new THREE.ExtrudeGeometry(f, { depth: 0.06, bevelEnabled: false }), bronze, 0, 0, 0, false);
      aube.rotation.z = i * Math.PI / 3;
    }
    ajout(roue, cylZ(0.12, 0.09, 20), bronze, 0, 0, 0.03, false);
    ajout(roue, cylZ(0.05, 0.1, 6), M.acierFonce, 0, 0, 0.05, false);
    // Flèche du sens de rotation (sur le corps)
    const fl = new THREE.Shape();
    fl.moveTo(-0.18, 0); fl.lineTo(0.1, 0); fl.lineTo(0.1, 0.07); fl.lineTo(0.22, -0.04); fl.lineTo(0.1, -0.15); fl.lineTo(0.1, -0.08); fl.lineTo(-0.18, -0.08); fl.closePath();
    const fleche = ajout(g, new THREE.ShapeGeometry(fl), new THREE.MeshBasicMaterial({ color: 0xdc2626, side: THREE.DoubleSide }), -0.2, YP + 1.04, 0.15, false);
    fleche.rotation.x = -0.3;
    // Bouchon d'amorçage (rouge) et bouchon de vidange
    ajout(g, cylY(0.07, 0.12, 6), M.rouge, -0.45, YP + 0.85, -0.05);
    ajout(g, cylY(0.06, 0.1, 6), M.acierFonce, 0.35, YP - 0.95, 0.1);
    // Garniture mécanique (derrière la volute, autour de l'arbre)
    const gar = this._groupe('garniture');
    ajout(gar, cylZ(0.17, 0.12, 24), mat(0x111827, 0.2, 0.6), 0, YP, -0.36);
    ajout(gar, cylZ(0.12, 0.08, 24), M.acier, 0, YP, -0.45);
    this.positionGarniture = new THREE.Vector3(0, YP - 0.16, -0.4);
  }

  /* -------------- Lanterne, accouplement, moteur électrique ---------- */
  _construireMoteur() {
    const M = this._mat;
    // Lanterne ouverte + accouplement + carter grillagé
    const ac = this._groupe('accouplement');
    for (const x of [-0.42, 0.42]) ajout(ac, new THREE.BoxGeometry(0.08, 0.9, 0.55), M.fonte, x, YP, -0.75);
    ajout(ac, new THREE.BoxGeometry(0.9, 0.08, 0.55), M.fonte, 0, YP - 0.45, -0.75);
    const arbre = new THREE.Group();
    arbre.position.set(0, YP, 0);
    ac.add(arbre);
    this.arbre = arbre;
    ajout(arbre, cylZ(0.06, 0.75, 14), M.acier, 0, 0, -0.65);
    ajout(arbre, cylZ(0.2, 0.14, 20), M.acierFonce, 0, 0, -0.72);
    ajout(arbre, cylZ(0.2, 0.14, 20), M.acierFonce, 0, 0, -0.9);
    ajout(arbre, cylZ(0.21, 0.05, 20), mat(0xf59e0b, 0.1, 0.6), 0, 0, -0.81);
    ajout(arbre, new THREE.BoxGeometry(0.05, 0.05, 0.3), M.jaune, 0, 0.2, -0.81);   // repère de rotation
    const carter = ajout(ac, cylZ(0.32, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0xfacc15, wireframe: true }), 0, YP, -0.81, false);
    carter.userData.vitre = true;
    // Moteur
    const mo = this._groupe('moteur');
    ajout(mo, cylZ(0.55, 2.1, 40), mat(0x1f4e8c, 0.45, 0.4), 0, YP, -2.1);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      if (Math.sin(a) < -0.75) continue;
      const ail = ajout(mo, new THREE.BoxGeometry(0.05, 0.12, 1.8), mat(0x1f4e8c, 0.45, 0.4), Math.cos(a) * 0.58, YP + Math.sin(a) * 0.58, -2.1);
      ail.rotation.z = a + Math.PI / 2;
    }
    ajout(mo, cylZ(0.58, 0.12, 40), mat(0x1f4e8c, 0.45, 0.4), 0, YP, -1.06);
    ajout(mo, cylZ(0.54, 0.45, 40), mat(0x1f2937, 0.5, 0.5), 0, YP, -3.38);
    ajout(mo, new THREE.BoxGeometry(0.5, 0.3, 0.6), mat(0x1f4e8c, 0.45, 0.4), 0, YP + 0.7, -2.0);
    for (const z of [-1.4, -2.9]) ajout(mo, new THREE.BoxGeometry(1.2, 0.18, 0.35), mat(0x1f4e8c, 0.45, 0.4), 0, 0.54, z);
    ajout(mo, new THREE.BoxGeometry(0.85, YP - 0.6, 0.25), mat(0x1f4e8c, 0.45, 0.4), 0, (YP + 0.6) / 2 - 0.05, -1.4);
    ajout(mo, new THREE.BoxGeometry(0.85, YP - 0.6, 0.25), mat(0x1f4e8c, 0.45, 0.4), 0, (YP + 0.6) / 2 - 0.05, -2.9);
    // Ventilateur visible à travers la grille arrière
    const vent = new THREE.Group();
    vent.position.set(0, YP, -3.5);
    mo.add(vent);
    this.ventilo = vent;
    for (let i = 0; i < 6; i++) { const p = ajout(vent, new THREE.BoxGeometry(0.08, 0.9, 0.04), M.noir, 0, 0, 0); p.rotation.z = i * Math.PI / 6; }
    const grilleV = ajout(mo, new THREE.CircleGeometry(0.5, 24), new THREE.MeshStandardMaterial({ color: 0x111827, wireframe: true }), 0, YP, -3.61, false);
    grilleV.rotation.y = Math.PI;
    // Câble vers le variateur
    const courbe = new THREE.CatmullRomCurve3([v(0.25, YP + 0.85, -2.0), v(0.9, YP + 1.0, -2.2), v(1.9, 1.2, -1.8), v(2.4, 0.9, -1.55)]);
    ajout(mo, new THREE.TubeGeometry(courbe, 30, 0.04, 8, false), M.noir);
  }

  /* --------- Refoulement : manomètre, clapet, vanne, débitmètre ------ */
  _construireRefoulement() {
    const M = this._mat;
    const mano = this._groupe('manometre');
    ajout(mano, cylZ(0.04, 0.3, 10), M.laiton, XR, YP + 1.35, 0.18);
    this.manometre = this._manometre(mano, XR, YP + 1.35, 0.4, 0, 4, 1, 3.5, 0.24);
    const cl = this._groupe('clapet');
    ajout(cl, new THREE.SphereGeometry(0.24, 20, 14), M.fonteFonce, XR, YP + 1.85, 0);
    ajout(cl, new THREE.BoxGeometry(0.2, 0.2, 0.3), M.fonteFonce, XR, YP + 1.85, 0.2);
    for (const dy of [-0.26, 0.26]) ajout(cl, cylY(0.25, 0.06, 20), M.fonteFonce, XR, YP + 1.85 + dy, 0);
    // Vanne de refoulement à soupape, volant face à l'opérateur
    const vr = this._groupe('vanneRef');
    const yV = 4.3;
    ajout(vr, new THREE.SphereGeometry(0.3, 20, 14), M.fonteFonce, XR, yV, 0);
    for (const dy of [-0.3, 0.3]) ajout(vr, cylY(0.27, 0.06, 20), M.fonteFonce, XR, yV + dy, 0);
    ajout(vr, cylZ(0.12, 0.35, 16), M.fonteFonce, XR, yV, 0.35);
    const tigeV = ajout(vr, cylZ(0.04, 0.4, 10), M.acier, XR, yV, 0.6);
    this.tigeVanne = tigeV;
    const volant = new THREE.Group();
    volant.position.set(XR, yV, 0.75);
    vr.add(volant);
    ajout(volant, new THREE.TorusGeometry(0.28, 0.03, 8, 28), M.rouge, 0, 0, 0);
    for (let i = 0; i < 3; i++) { const b = ajout(volant, new THREE.BoxGeometry(0.56, 0.03, 0.03), M.rouge, 0, 0, 0); b.rotation.z = i * Math.PI / 3; }
    this.volantRef = volant;
    // Débitmètre à flotteur (rotamètre) : tube conique transparent + flotteur + échelle
    const db = this._groupe('debitmetre');
    const tube = ajout(db, cylY(0.17, ROTA.y1 - ROTA.y0, 24, 0.23), verre(0xe0f2fe, 0.25), XR, (ROTA.y0 + ROTA.y1) / 2, 0, false);
    tube.userData.vitre = true;
    for (const y of [ROTA.y0, ROTA.y1]) ajout(db, cylY(0.27, 0.1, 20), M.acierFonce, XR, y, 0);
    for (const dx of [-0.28, 0.28]) ajout(db, cylY(0.025, ROTA.y1 - ROTA.y0, 8), M.acier, XR + dx, (ROTA.y0 + ROTA.y1) / 2, -0.1);
    this.flotteur = ajout(db, new THREE.ConeGeometry(0.15, 0.18, 20).rotateX(Math.PI), mat(0xdc2626, 0.4, 0.4), XR, ROTA.y0 + 0.15, 0, false);
    // Échelle graduée 0 → 40 m³/h
    const c = document.createElement('canvas'); c.width = 96; c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#f8fafc'; x.fillRect(0, 0, 96, 512);
    x.fillStyle = '#111'; x.font = 'bold 26px Arial'; x.textAlign = 'right';
    for (let q = 0; q <= 40; q += 5) {
      const y = 492 - q / 40 * 472;
      x.fillRect(64, y - 1.5, 28, 3);
      if (q % 10 === 0) x.fillText(String(q), 60, y + 9);
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    ajout(db, new THREE.PlaneGeometry(0.22, ROTA.y1 - ROTA.y0 - 0.1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), XR + 0.42, (ROTA.y0 + ROTA.y1) / 2, 0.02, false);
    // Supports de la conduite de retour
    const sup = this._groupe('supports');
    for (const x2 of [-1.6, -4.4]) ajout(sup, new THREE.BoxGeometry(0.1, Y_HAUT, 0.1), M.acierFonce, x2, Y_HAUT / 2, -0.25);
  }

  /* ---------------------------- Variateur --------------------------- */
  _construireVariateur() {
    const g = this._groupe('variateur');
    ajout(g, new THREE.BoxGeometry(1.1, 1.6, 0.55), mat(0xe5e7eb, 0.3, 0.6), 2.4, 2.4, -1.55);
    ajout(g, new THREE.BoxGeometry(0.12, 1.6, 0.12), this._mat.socle, 2.05, 0.8, -1.55);
    ajout(g, new THREE.BoxGeometry(0.12, 1.6, 0.12), this._mat.socle, 2.75, 0.8, -1.55);
    const c = document.createElement('canvas'); c.width = 256; c.height = 160;
    this.canvasEcran = c;
    this.texEcran = new THREE.CanvasTexture(c);
    this.texEcran.colorSpace = THREE.SRGBColorSpace;
    ajout(g, new THREE.PlaneGeometry(0.78, 0.5), new THREE.MeshBasicMaterial({ map: this.texEcran, toneMapped: false }), 2.4, 2.75, -1.27, false);
    ajout(g, cylZ(0.08, 0.05, 20), mat(0x16a34a, 0.2, 0.5), 2.2, 2.2, -1.27);
    ajout(g, cylZ(0.08, 0.05, 20), mat(0xdc2626, 0.2, 0.5), 2.6, 2.2, -1.27);
    this._dessinerEcran({ f: 0, n: 0, I: 0, etat: 'STOP' });
  }

  _dessinerEcran(e) {
    const x = this.canvasEcran.getContext('2d');
    x.fillStyle = '#0b1f14'; x.fillRect(0, 0, 256, 160);
    x.fillStyle = '#4ade80';
    x.font = 'bold 54px monospace'; x.textAlign = 'right';
    x.fillText(e.f.toFixed(1), 190, 62);
    x.font = 'bold 28px monospace'; x.textAlign = 'left';
    x.fillText('Hz', 196, 62);
    x.font = 'bold 24px monospace';
    x.fillText(String(Math.round(e.n)).padStart(4, ' ') + ' tr/min', 14, 104);
    x.fillText(e.I.toFixed(1).padStart(4, ' ') + ' A', 14, 140);
    x.textAlign = 'right';
    x.fillText(e.etat, 244, 140);
    this.texEcran.needsUpdate = true;
  }

  /* ---------------------------- Tubes ------------------------------- */
  _cheminArrondi(points, r = 0.3) {
    const chemin = new THREE.CurvePath();
    let courant = points[0].clone();
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      if (i < points.length - 1) {
        const d1 = p.clone().sub(points[i - 1]);
        const d2 = points[i + 1].clone().sub(p);
        const rr = Math.min(r, d1.length() / 2, d2.length() / 2);
        const avant = p.clone().sub(d1.normalize().multiplyScalar(rr));
        const apres = p.clone().add(d2.normalize().multiplyScalar(rr));
        if (avant.distanceTo(courant) > 1e-4) chemin.add(new THREE.LineCurve3(courant, avant));
        chemin.add(new THREE.QuadraticBezierCurve3(avant, p.clone(), apres));
        courant = apres;
      } else {
        chemin.add(new THREE.LineCurve3(courant, p.clone()));
      }
    }
    return chemin;
  }

  _construireTubes() {
    const groupe = this._groupe('tuyaux');
    const geoParticule = new THREE.SphereGeometry(0.06, 8, 6);
    for (const [id, pts] of Object.entries(TRACES)) {
      const chemin = this._cheminArrondi(pts);
      const longueur = chemin.getLength();
      const rayon = id === 'aspiration' ? 0.16 : 0.13;
      const materiau = new THREE.MeshStandardMaterial({ color: EAU, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0, depthWrite: false });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(chemin, Math.max(24, Math.ceil(longueur * 10)), rayon, 14, false), materiau);
      tube.renderOrder = 2;
      groupe.add(tube);
      const echantillons = chemin.getSpacedPoints(Math.max(40, Math.ceil(longueur * 24)));
      const nb = Math.round(longueur / 0.22);
      const matPart = new THREE.MeshBasicMaterial({ color: EAU, toneMapped: false });
      const particules = new THREE.InstancedMesh(geoParticule, matPart, nb);
      particules.frustumCulled = false;
      this.scene.add(particules);
      this.lignes[id] = { materiau, matPart, particules, echantillons, longueur, nb, decalage: Math.random(), rayon };
    }
    this._mat4 = new THREE.Matrix4();
    this._vec = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._echelle = new THREE.Vector3();
  }

  /* ---------- Jet de retour, bulles, gouttes de garniture ---------- */
  _construireEffets() {
    // Jet qui retombe dans la bâche
    const geo = cylY(1, 1, 16);
    geo.translate(0, -0.5, 0);
    this.jet = ajout(this.scene, geo, new THREE.MeshStandardMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false }), X_BACHE, 3.75, 0, false);
    this.jet.userData.vitre = true;
    this.remous = ajout(this.scene, new THREE.RingGeometry(0.15, 0.45, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }), X_BACHE, 1, 0, false);
    // Bulles (cavitation / air) : dans le corps de pompe et la fin de l'aspiration
    const N = 70;
    this.bulles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), N);
    this.bulles.frustumCulled = false;
    this.bulles.renderOrder = 4;
    this.scene.add(this.bulles);
    this.phasesBulles = Array.from({ length: N }, () => ({ u: Math.random(), a: Math.random() * Math.PI * 2, r: Math.random(), s: Math.random() }));
    // Gouttes de la garniture
    const NG = 12;
    this.gouttes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.05 }), NG);
    this.gouttes.frustumCulled = false;
    this.scene.add(this.gouttes);
    this.phasesGouttes = Array.from({ length: NG }, (_, i) => i / NG);
  }

  /* --------------------------- Étiquettes --------------------------- */
  _construireEtiquettes() {
    const noms = [
      ['pompe', 'Pompe centrifuge', v(-0.2, YP - 1.25, 0.7)],
      ['bache', 'Bâche', v(-7.4, BACHE.h + 0.45, 0)],
      ['crepine', 'Crépine + clapet de pied', v(X_BACHE, 0.1, 1.9)],
      ['vanneAsp', 'Vanne d\'aspiration', v(-2.8, YP + 1.35, 1.0)],
      ['vacuometre', 'Vacuomètre', v(-1.0, YP + 1.3, 1.1)],
      ['garniture', 'Garniture', v(-0.9, YP - 0.3, -0.4)],
      ['accouplement', 'Accouplement', v(0.9, YP + 0.45, -0.8)],
      ['moteur', 'Moteur', v(0, YP + 1.15, -2.4)],
      ['manometre', 'Manomètre', v(XR + 0.85, YP + 1.35, 0.4)],
      ['clapet', 'Clapet anti-retour', v(XR + 1.05, YP + 1.85, 0)],
      ['vanneRef', 'Vanne de refoulement', v(XR + 1.2, 4.3, 0.6)],
      ['debitmetre', 'Débitmètre', v(XR + 1.0, 5.4, 0)],
      ['variateur', 'Variateur', v(2.4, 3.55, -1.5)]
    ];
    noms.forEach(([id, texte, pos], rang) => {
      const tex = textureTexte(texte);
      const m = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true, toneMapped: false });
      const sp = new THREE.Sprite(m);
      sp.userData = { compId: id, ratio: tex.userData.ratio, rang };
      sp.position.copy(pos);
      sp.renderOrder = 10;
      this.scene.add(sp);
      this.etiquettes.push(sp);
    });
    this.etiquettesActives = true;
    this.obstacles = [];
    this._ndc = new THREE.Vector3();
  }

  setEtiquettes(val) {
    this.etiquettesActives = val;
    if (!val) for (const s of this.etiquettes) s.visible = false;
  }
  setObstacles(r) { this.obstacles = r || []; }
  setMarges(m) { this.marges = m; }

  _majEtiquettes() {
    if (!this.etiquettesActives) return;
    const W = this.canvas.clientWidth || 1, H = this.canvas.clientHeight || 1;
    const hPx = Math.max(20, Math.min(30, Math.min(W, H) * 0.058));
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    this.camera.updateMatrixWorld();
    const pris = this.obstacles.slice();
    const libre = (r) => {
      if (r.x0 < 2 || r.y0 < 2 || r.x1 > W - 2 || r.y1 > H - 2) return false;
      for (const o of pris) if (r.x0 < o.x1 + 3 && r.x1 > o.x0 - 3 && r.y0 < o.y1 + 3 && r.y1 > o.y0 - 3) return false;
      return true;
    };
    const sel = this.idsSelection || [];
    const ordre = this.etiquettes.slice().sort((a, b) =>
      (sel.includes(a.userData.compId) ? -1 : a.userData.rang) - (sel.includes(b.userData.compId) ? -1 : b.userData.rang));
    const centres = [[0.5, 0.5], [0.5, -0.6], [0.5, 1.6], [-0.06, 0.5], [1.06, 0.5]];
    for (const sp of ordre) {
      const h = hPx, w = h * sp.userData.ratio;
      const s = 2 * h * tanV / H;
      sp.scale.set(s * sp.userData.ratio, s, 1);
      const p = this._ndc.copy(sp.position).project(this.camera);
      if (p.z > 1 || p.z < -1) { sp.visible = false; continue; }
      const cx = (p.x + 1) / 2 * W, cy = (1 - p.y) / 2 * H;
      let place = null;
      for (const [ux, uy] of centres) {
        const x0 = cx - ux * w, y0 = cy - (1 - uy) * h;
        const r = { x0, y0, x1: x0 + w, y1: y0 + h };
        if (libre(r)) { place = [ux, uy, r]; break; }
      }
      sp.visible = !!place;
      if (place) { sp.center.set(place[0], place[1]); pris.push(place[2]); }
    }
  }

  /* ---------------------- Interaction tactile ----------------------- */
  _initInteraction() {
    this.raycaster = new THREE.Raycaster();
    const debut = { x: 0, y: 0, t: 0, id: -1 };
    let nb = 0;
    this.canvas.addEventListener('pointerdown', (e) => {
      nb++;
      if (nb === 1) { debut.x = e.clientX; debut.y = e.clientY; debut.t = performance.now(); debut.id = e.pointerId; }
      else debut.id = -1;
    });
    this.canvas.addEventListener('pointerup', (e) => {
      nb = Math.max(0, nb - 1);
      if (e.pointerId !== debut.id) return;
      debut.id = -1;
      const dx = e.clientX - debut.x, dy = e.clientY - debut.y;
      if (dx * dx + dy * dy < 100 && performance.now() - debut.t < 450) this._toucher(e.clientX, e.clientY);
    });
    this.canvas.addEventListener('pointercancel', (e) => { nb = Math.max(0, nb - 1); if (e.pointerId === debut.id) debut.id = -1; });
  }

  _toucher(cx, cy) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    let hits = this.raycaster.intersectObjects(this.etiquettes.filter(s => s.visible), false);
    if (!hits.length) hits = this.raycaster.intersectObjects(Object.values(this.composants), true);
    for (const h of hits) {
      if (h.object.userData.vitre) continue;
      let o = h.object;
      while (o && !o.userData.compId) o = o.parent;
      if (!o || ['socle', 'supports', 'tuyaux'].includes(o.userData.compId)) continue;
      this.selectionner(o.userData.compId); this.surSelection(o.userData.compId); return;
    }
  }

  selectionner(ids) {
    for (const c of this.cadres || []) { this.scene.remove(c); c.geometry.dispose(); }
    this.cadres = [];
    const liste = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    this.idsSelection = liste;
    for (const id of liste) {
      const g = this.composants[id];
      if (!g) continue;
      const boite = new THREE.Box3().setFromObject(g);
      boite.expandByScalar(0.08);
      const cadre = new THREE.Box3Helper(boite, 0xfacc15);
      cadre.material.depthTest = false;
      cadre.renderOrder = 9;
      this.scene.add(cadre);
      this.cadres.push(cadre);
    }
  }

  /* ---------------------------- Caméra ------------------------------ */
  _cadrer(boite, immediat = false, points = null) {
    const cam = this.camera.clone();
    cam.aspect = this.camera.aspect;
    cam.updateProjectionMatrix();
    const dir = (cam.aspect < 1 ? DIR_PORTRAIT : DIR_PAYSAGE).clone();
    const centre = boite.getCenter(new THREE.Vector3());
    const coins = points || coinsBoite(boite);
    const W = this.canvas.clientWidth || 1, H = this.canvas.clientHeight || 1;
    const m = this.marges || { haut: 0, bas: 0, gauche: 0, droite: 0 };
    const xg = -1 + 2 * m.gauche / W, xd = 1 - 2 * m.droite / W;
    const yb = -1 + 2 * m.bas / H, yh = 1 - 2 * m.haut / H;
    let dist = boite.getSize(new THREE.Vector3()).length();
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    for (let i = 0; i < 16; i++) {
      cam.position.copy(centre).addScaledVector(dir, dist);
      cam.lookAt(centre);
      cam.updateMatrixWorld();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const c of coins) {
        const p = c.clone().project(cam);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
      const droite = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      const haut = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const demiH = dist * tanV, demiL = demiH * cam.aspect;
      centre.addScaledVector(droite, ((x0 + x1) / 2 - (xg + xd) / 2) * demiL)
            .addScaledVector(haut, ((y0 + y1) / 2 - (yb + yh) / 2) * demiH);
      const ech = Math.max((x1 - x0) / (xd - xg), (y1 - y0) / (yh - yb)) / 0.96;
      dist *= Math.max(0.5, Math.min(2, ech));
    }
    dist = Math.max(dist, 2);
    const pos = centre.clone().addScaledVector(dir, dist);
    if (immediat) {
      this.camera.position.copy(pos);
      this.controls.target.copy(centre);
      this.controls.update();
      this.anim = null;
    } else {
      this.anim = { t: 0, duree: 0.9, p0: this.camera.position.clone(), p1: pos, c0: this.controls.target.clone(), c1: centre };
    }
  }

  recentrer(immediat = false) {
    this.vueManuelle = false;
    if (!this.volumeBanc) {
      const boite = new THREE.Box3(new THREE.Vector3(-8.1, 0, -3.7), new THREE.Vector3(3.0, 6.6, 1.9));
      this.volumeBanc = { boite, points: coinsBoite(boite) };
    }
    this._cadrer(this.volumeBanc.boite, immediat, this.volumeBanc.points);
  }

  focaliser(ids) {
    const b = new THREE.Box3();
    for (const id of ids) {
      const g = this.composants[id];
      if (g) b.union(new THREE.Box3().setFromObject(g));
    }
    if (b.isEmpty()) return;
    b.expandByScalar(0.3);
    this.vueManuelle = true;
    this._cadrer(b);
  }

  redimensionner() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.vueManuelle && !this.anim) this.recentrer(true);
  }

  /* --------------------- Mise à jour par image ---------------------- */
  maj(sim, dt) {
    const r = sim.res, c = sim.cmd;
    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.duree);
      const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
      this.camera.position.lerpVectors(a.p0, a.p1, e);
      this.controls.target.lerpVectors(a.c0, a.c1, e);
      if (a.t >= 1) this.anim = null;
    }
    // Rotation de la roue, de l'arbre et du ventilateur (ralentie)
    this.roue.rotation.z = -sim.angle;
    this.arbre.rotation.z = -sim.angle;
    this.ventilo.rotation.z = -sim.angle;
    // Vibrations du groupe pompe (exagérées pour être visibles)
    const vib = Math.min(0.02, r.vibration * 0.0025) * (sim.n > 0.05 ? 1 : 0);
    const bruit = () => (Math.random() - 0.5) * vib;
    this.groupePompe.position.set(bruit(), bruit(), bruit());
    this.composants.moteur.position.set(bruit() * 0.5, bruit() * 0.5, 0);
    // Niveau de la bâche (hauteur d'aspiration exagérée : 1 m ≈ 25 cm à l'écran)
    const yEau = Math.max(0.5, Math.min(BACHE.h - 0.3, YP - c.aspiration * 0.25));
    this.eau.scale.y = yEau - 0.06;
    this.matEau.color.setHex(r.bulles > 0.3 && sim.pannes.entreeAir ? 0x93c5fd : 0x3b82f6);
    // Vannes : volants
    this.volantAsp.rotation.y = c.vanneAsp ? 0 : Math.PI * 4;
    this.volantRef.rotation.z = -c.vanneRef / 100 * Math.PI * 6;
    this.volantRef.position.z = 0.75 + c.vanneRef / 100 * 0.12;
    this.tigeVanne.position.z = 0.6 + c.vanneRef / 100 * 0.06;
    // Clapet de pied : le battant se soulève avec le débit
    this.battant.position.y = 0.88 + Math.min(0.08, sim.Q / 300);
    // Débitmètre : position du flotteur (haut du flotteur = lecture)
    const yF = ROTA.y0 + 0.12 + Math.min(1, sim.Q / 40) * (ROTA.y1 - ROTA.y0 - 0.22);
    const sautille = sim.pannes.entreeAir || sim.cavitation > 0.2 ? Math.sin(sim.temps * 23) * 0.04 * (sim.n > 0.3 ? 1 : 0) : 0;
    this.flotteur.position.y += (yF + sautille - this.flotteur.position.y) * Math.min(1, dt * 6);
    // Manomètres (aiguille amortie, oscille en cavitation)
    const osc = sim.cavitation * 0.08 * Math.sin(sim.temps * 31);
    for (const [m, p] of [[this.vacuometre, r.pAsp + osc * 0.5], [this.manometre, r.pRef + osc]]) {
      m.valeur += (Math.max(m.min, Math.min(m.max * 1.02, p)) - m.valeur) * Math.min(1, dt * 8);
      m.aiguille.rotation.z = (135 - ((m.valeur - m.min) / (m.max - m.min)) * 270) * Math.PI / 180;
    }
    // Eau dans le corps : grise si désamorcée, rougeoie si l'eau chauffe
    this.matEauCorps.color.setHex(sim.amorcee ? EAU : AIR);
    this.matEauCorps.opacity = sim.amorcee ? 0.22 + Math.min(0.3, Math.max(0, sim.tCorps - 50) / 150) : 0.08;
    if (sim.tCorps > 60) this.matEauCorps.color.lerp(new THREE.Color(0xf97316), Math.min(0.7, (sim.tCorps - 60) / 60));
    // Écran du variateur
    this._tEcran = (this._tEcran || 0) + dt;
    if (this._tEcran > 0.2) {
      this._tEcran = 0;
      this._dessinerEcran({ f: sim.f, n: sim.vitesse, I: r.intensite, etat: c.marche ? (sim.pannes.sens ? 'REV' : 'RUN') : 'STOP' });
    }
    this._majTubes(sim, dt);
    this._majEffets(sim, dt, yEau);
    this.controls.update();
    this._majEtiquettes();
  }

  _majTubes(sim, dt) {
    const m = this._mat4, pos = this._vec, q = this._quat, s = this._echelle;
    q.identity();
    for (const [id, ligne] of Object.entries(this.lignes)) {
      // Désamorcée : aspiration et corps vides (air) ; le refoulement reste plein au-dessus du clapet
      const vide = !sim.amorcee && id === 'aspiration';
      const coul = vide ? AIR : id === 'refoulement' && sim.res.pRef > 0.4 ? EAU_PRESSION : EAU;
      ligne.materiau.color.setHex(coul);
      ligne.materiau.opacity = vide ? 0.18 : 0.32;
      ligne.matPart.color.setHex(coul);
      const vit = (sim.Q / 20) * 3.2;
      ligne.decalage = (ligne.decalage + (vit * dt) / ligne.longueur) % 1;
      const ech = ligne.echantillons, nE = ech.length - 1;
      const taille = vide ? 0 : 1;
      for (let i = 0; i < ligne.nb; i++) {
        const u = (i / ligne.nb + ligne.decalage) % 1;
        const f = u * nE, k = Math.floor(f), fr = f - k;
        const a = ech[k], b = ech[Math.min(nE, k + 1)];
        pos.set(a.x + (b.x - a.x) * fr, a.y + (b.y - a.y) * fr, a.z + (b.z - a.z) * fr);
        // Dans l'aspiration, l'eau sous la surface de la bâche est cachée par l'eau du réservoir : rien à faire
        s.set(taille, taille, taille);
        m.compose(pos, q, s);
        ligne.particules.setMatrixAt(i, m);
      }
      ligne.particules.instanceMatrix.needsUpdate = true;
    }
  }

  _majEffets(sim, dt, yEau) {
    const r = sim.res;
    const m = this._mat4, pos = this._vec, q = this._quat, s = this._echelle;
    q.identity();
    // Jet de retour
    const debit = Math.min(1, sim.Q / 30);
    this.jet.visible = sim.Q > 0.5;
    const hJet = 3.75 - yEau;
    this.jet.scale.set(0.04 + 0.08 * debit, hJet, 0.04 + 0.08 * debit);
    this.remous.visible = this.jet.visible;
    this.remous.position.y = yEau + 0.01;
    const rr = 0.8 + 0.25 * Math.sin(sim.temps * 9);
    this.remous.scale.set(rr * (0.5 + debit), 1, rr * (0.5 + debit));
    // Bulles : cavitation à l'ouïe et en périphérie de la roue, air dans l'aspiration
    const intensite = r.bulles;
    const N = this.phasesBulles.length;
    for (let i = 0; i < N; i++) {
      const b = this.phasesBulles[i];
      b.u = (b.u + dt * (0.8 + 1.5 * b.s) * (0.4 + sim.n)) % 1;
      const actif = i / N < intensite;
      let e = 0;
      if (actif) {
        if (i % 3 === 0) {
          // Dans la fin de l'aspiration, vers la pompe
          pos.set(-2.2 + b.u * 2.2 + Math.cos(b.a) * 0.08, YP + Math.sin(b.a) * 0.08, 1.0 + (b.r - 0.5) * 0.1);
          e = 0.8 + b.s;
        } else {
          // Dans la roue : naissent à l'ouïe, grossissent puis implosent en périphérie
          const ang = b.a - sim.angle * (0.6 + b.s * 0.3);
          const rad = 0.12 + b.u * 0.55;
          pos.set(Math.cos(ang) * rad, YP + Math.sin(ang) * rad, 0.17);
          e = (b.u < 0.8 ? 0.6 + b.u * 1.4 : (1 - b.u) * 8) * (0.6 + b.s);
        }
      }
      s.set(e, e, e);
      m.compose(pos, q, s);
      this.bulles.setMatrixAt(i, m);
    }
    this.bulles.instanceMatrix.needsUpdate = true;
    // Gouttes de la garniture + flaque
    const fuite = r.fuiteGarniture;
    for (let i = 0; i < this.phasesGouttes.length; i++) {
      this.phasesGouttes[i] = (this.phasesGouttes[i] + dt * (0.6 + fuite)) % 1;
      const u = this.phasesGouttes[i];
      const h = this.positionGarniture.y - 0.45;
      pos.set(this.positionGarniture.x + 0.03 * Math.sin(i * 7.1), this.positionGarniture.y - h * u * u, this.positionGarniture.z);
      const e = fuite > 0 && i / this.phasesGouttes.length < 0.3 + 0.7 * Math.min(1, fuite) ? 1 : 0;
      s.set(e, e * 1.3, e);
      m.compose(pos, q, s);
      this.gouttes.setMatrixAt(i, m);
    }
    this.gouttes.instanceMatrix.needsUpdate = true;
    this.flaque = fuite > 0 ? Math.min(0.9, this.flaque + dt * 0.03 * (0.4 + fuite)) : Math.max(0, this.flaque - dt * 0.3);
    this.meshFlaque.visible = this.flaque > 0.01;
    this.meshFlaque.scale.set(this.flaque, 1, this.flaque * 0.7);
  }

  rendre(dtReel) {
    this.renderer.render(this.scene, this.camera);
    this.nbImages = (this.nbImages || 0) + 1;
    if (this.nbImages < 120) return;
    this.tempsImages.push(dtReel);
    if (this.tempsImages.length >= 90) {
      const moy = this.tempsImages.reduce((a, b) => a + b, 0) / this.tempsImages.length;
      this.tempsImages.length = 0;
      if (moy > 1 / 40 && this.qualite > 0) this.reduireQualite();
    }
  }

  reduireQualite() {
    this.qualite--;
    if (this.qualite === 1) this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    else if (this.qualite === 0) {
      this.renderer.setPixelRatio(1);
      this.soleil.castShadow = false;
      this.renderer.shadowMap.enabled = false;
      this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    }
    this.redimensionner();
  }
}
