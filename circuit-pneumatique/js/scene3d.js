/* =====================================================================
   scene3d.js — Scène 3D du banc pneumatique (Three.js)
   ---------------------------------------------------------------------
   Repère : 1 unité ≈ 10 cm. Les composants sont montés sur un panneau
   rainuré vertical (face avant en z = 0) ; le compresseur et sa cuve sont
   posés au sol à gauche. Le vérin est vertical, à droite : il soulève un
   plateau chargé, guidé par deux colonnes. Son tube est transparent pour
   voir le piston et la pression dans chaque chambre.
   Les tubes sont transparents : des particules montrent l'air qui circule
   (bleu = air comprimé, vert = échappement, gris = atmosphère).
   En haut à gauche, le circuit 2 : bouton poussoir 3/2 (2V1), soupape
   d'échappement rapide (2V2) et vérin simple effet à ressort (2A), à tube
   transparent pour voir le ressort se comprimer. Le carter et le cylindre
   du compresseur sont transparents : on voit le piston, la bielle et le
   vilebrequin tourner (rotation ralentie).
   Le schéma ISO 1219 du banc est imprimé sur le panneau, au-dessus du
   distributeur, et s'anime en direct comme dans l'onglet Schéma.
   ===================================================================== */

import * as THREE from '../vendor/three.min.js';
import { OrbitControls, RoomEnvironment } from '../vendor/three.min.js';
import { P_ATM } from './simulation.js';
import { svgSchema, majSchema } from './schema.js';

const Z = 0.4;                    // plan médian des composants (devant le panneau)
const XV = 5.2;                   // axe du vérin
const Y_FOND = 2.0;               // centre du fond du vérin (chambre A)
const Y_TUBE0 = 2.35, Y_TUBE1 = 4.6;   // tube du vérin
const Y_TETE = 4.95;              // centre de la tête (chambre B)
const COURSE = 2.0;               // 200 mm
const EP_PISTON = 0.25;
const Y_PLATEAU0 = 5.65;          // dessous du plateau, tige rentrée
const Y_DIST = 2.6, X_DIST = 2.4; // distributeur
const Y_FRL = 3.6;
const XB = -1.4, Y_BOUTON = 5.0;   // bouton poussoir 2V1
const Y_SE = 6.55, X_SE0 = -1.2;   // vérin simple effet : axe, début du tube
const COURSE2 = 0.5;              // 50 mm
const X_NOURRICE = 0.9;
const DIR_PORTRAIT = new THREE.Vector3(0.35, 0.3, 1).normalize();
const DIR_PAYSAGE = new THREE.Vector3(0.3, 0.28, 1).normalize();
const COULEURS = { pression: 0x1e88ff, echap: 0x19c24a, repos: 0x9aa4ae };

/* Tracés des tubes (mêmes identifiants que sim.res.lignes) */
const v = (x, y, z = Z) => new THREE.Vector3(x, y, z);
const TRACES = {
  cuve: [v(-5.7, 4.45), v(-5.7, 4.75), v(-4.9, 4.75), v(-4.9, 3.1)],
  alim: [v(-3.9, 3.5), v(-3.9, 4.3), v(-2.85, 4.3), v(-2.85, Y_FRL), v(-2.5, Y_FRL)],
  reseau: [v(X_NOURRICE + 0.17, Y_FRL), v(1.3, Y_FRL), v(1.3, 1.75), v(X_DIST, 1.75), v(X_DIST, Y_DIST - 0.225)],
  ligneA: [v(2.2, Y_DIST + 0.225), v(2.2, 3.15), v(2.2, 3.15, Z + 0.32), v(3.9, 3.15, Z + 0.32), v(3.9, Y_FOND, Z + 0.32), v(4.2, Y_FOND), v(4.62, Y_FOND)],
  ligneB: [v(2.6, Y_DIST + 0.225), v(2.6, Y_TETE), v(4.62, Y_TETE)],
  pilote14: [v(6.62, Y_PLATEAU0 + 0.06), v(6.85, Y_PLATEAU0 + 0.06, 0.2), v(6.85, 1.3, 0.2), v(1.5, 1.3, 0.2), v(1.5, Y_DIST, 0.2), v(1.68, Y_DIST)],
  alim2: [v(X_NOURRICE, Y_FRL + 0.15), v(X_NOURRICE, 4.6), v(XB, 4.6), v(XB, Y_BOUTON - 0.25)],
  ligne2: [v(XB, Y_BOUTON + 0.25), v(XB, Y_SE - 0.42)],
  alimSel: [v(X_NOURRICE, Y_FRL - 0.15), v(X_NOURRICE, 0.95), v(6.0, 0.95), v(6.0, 1.55)],
  alimCapteurs: [v(6.0, 1.95), v(6.0, 2.2), v(6.3, 2.2, 0.15), v(6.3, Y_PLATEAU0 + COURSE - 0.15, 0.15)],
  pilote12: [v(6.62, Y_PLATEAU0 + COURSE + 0.06), v(7.0, Y_PLATEAU0 + COURSE + 0.06, 0.2), v(7.0, 1.12, 0.2), v(3.3, 1.12, 0.2), v(3.3, Y_DIST, 0.2), v(3.12, Y_DIST)]
};
const FINS = { pilote14: true, pilote12: true, alimCapteurs: true };

/* ---------------------------- Outils -------------------------------- */
function mat(couleur, metal = 0.3, rugo = 0.5, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: couleur, metalness: metal, roughness: rugo, ...extra });
}
function verre(couleur = 0xcfe8ff, opacite = 0.22) {
  return new THREE.MeshStandardMaterial({ color: couleur, metalness: 0, roughness: 0.1, transparent: true, opacity: opacite, depthWrite: false });
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
const cylZ = (r, h, seg = 24) => new THREE.CylinderGeometry(r, r, h, seg).rotateX(Math.PI / 2);
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
/* Cadran de manomètre (0 → pMax bar, 270°), zone rouge au-delà de pRouge */
function textureManometre(pMax, pRouge) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const cx = 128, cy = 128;
  x.fillStyle = '#fbfbf7'; x.beginPath(); x.arc(cx, cy, 124, 0, Math.PI * 2); x.fill();
  x.lineWidth = 6; x.strokeStyle = '#333'; x.stroke();
  const ang = (p) => (225 - (p / pMax) * 270) * Math.PI / 180;
  x.strokeStyle = '#e11d48'; x.lineWidth = 12;
  x.beginPath(); x.arc(cx, cy, 100, -ang(pRouge), -ang(pMax)); x.stroke();
  x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let p = 0; p <= pMax; p += 0.5) {
    const a = ang(p), grand = Number.isInteger(p);
    const r1 = grand ? 92 : 100, r2 = 112;
    x.lineWidth = grand ? 4 : 2; x.strokeStyle = '#111';
    x.beginPath(); x.moveTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1); x.lineTo(cx + Math.cos(a) * r2, cy - Math.sin(a) * r2); x.stroke();
    if (grand && (pMax <= 10 || p % 2 === 0)) { x.font = 'bold 24px Arial'; x.fillText(String(p), cx + Math.cos(a) * 72, cy - Math.sin(a) * 72); }
  }
  x.font = 'bold 26px Arial'; x.fillText('bar', cx, cy + 62);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------------------------------------------------------------
   Classe ScenePneumatique
   --------------------------------------------------------------------- */
export class ScenePneumatique {
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
    this.angleVentilo = 0;
    this._initRendu();
    this._construireDecor();
    this._construireCompresseur();
    this._construireFRL();
    this._construireDistributeur();
    this._construireVerin();
    this._construireCapteurs();
    this._construireCircuit2();
    this._construireSchema();
    this._construireTubes();
    this._construireJets();
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
    soleil.position.set(3, 14, 12);
    soleil.castShadow = true;
    soleil.shadow.mapSize.set(1024, 1024);
    const s = soleil.shadow.camera;
    s.left = -11; s.right = 11; s.top = 10; s.bottom = -4; s.near = 1; s.far = 40;
    soleil.shadow.bias = -0.0008;
    soleil.target.position.set(0, 3, 0);
    this.scene.add(soleil, soleil.target);
    this.soleil = soleil;
    this._mat = {
      alu: mat(0xc3c9d0, 0.8, 0.35), aluFonce: mat(0x7b8590, 0.75, 0.4),
      acier: mat(0xd5dbe1, 0.9, 0.25), noir: mat(0x22262b, 0.3, 0.6),
      bleu: mat(0x2563a6, 0.4, 0.45), rouge: mat(0xc81e1e, 0.35, 0.45),
      laiton: mat(0xc9a43b, 0.9, 0.3), gris: mat(0x4b5563, 0.5, 0.5),
      bronze: mat(0x8d6a3a, 0.7, 0.75)
    };
  }

  _groupe(id, parent = this.scene) {
    const g = new THREE.Group();
    g.userData.compId = id;
    this.composants[id] = g;
    parent.add(g);
    return g;
  }

  /* Manomètre : boîtier + cadran + aiguille (face vers +Z) */
  _manometre(parent, x, y, z, pMax, pRouge, rayon = 0.22) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    ajout(g, cylZ(rayon, 0.1, 32), this._mat.noir, 0, 0, -0.05);
    const face = new THREE.Mesh(new THREE.CircleGeometry(rayon * 0.9, 32), new THREE.MeshBasicMaterial({ map: textureManometre(pMax, pRouge), toneMapped: false }));
    face.position.z = 0.002;
    g.add(face);
    const aiguille = new THREE.Group();
    aiguille.position.z = 0.012;
    const tige = new THREE.Mesh(new THREE.BoxGeometry(0.018, rayon * 0.8, 0.006), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    tige.position.y = rayon * 0.36;
    aiguille.add(tige);
    g.add(aiguille);
    ajout(g, new THREE.CircleGeometry(rayon * 0.95, 32), verre(0xffffff, 0.12), 0, 0, 0.02, false).userData.vitre = true;
    const m = { aiguille, pMax, valeur: 0 };
    this.manometres.push(m);
    return m;
  }

  /* -------------------- Sol et panneau rainuré ---------------------- */
  _construireDecor() {
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), mat(0xc9d1d9, 0, 0.9));
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    this.scene.add(sol);
    const grille = new THREE.GridHelper(60, 60, 0xaab4bf, 0xb9c2cc);
    grille.position.y = 0.002;
    grille.material.transparent = true; grille.material.opacity = 0.5;
    this.scene.add(grille);

    const g = this._groupe('panneau');
    const plaque = mat(0xb4bcc5, 0.75, 0.4), rainure = mat(0x5f6b78, 0.6, 0.5);
    ajout(g, new THREE.BoxGeometry(10.6, 7.4, 0.2), plaque, 2.2, 4.5, -0.1);
    for (let y = 1.1; y < 8.2; y += 0.5) ajout(g, new THREE.BoxGeometry(10.6, 0.05, 0.02), rainure, 2.2, y, 0.002, false);
    // Montants et pieds
    for (const x of [-3.0, 7.4]) {
      ajout(g, new THREE.BoxGeometry(0.25, 8.4, 0.3), this._mat.aluFonce, x, 4.2, -0.15);
      ajout(g, new THREE.BoxGeometry(0.4, 0.15, 2.2), this._mat.aluFonce, x, 0.075, 0);
    }
  }

  /* --------------- Compresseur à piston + cuve (au sol) ------------- */
  _construireCompresseur() {
    const g = this._groupe('compresseur');
    const M = this._mat;
    const rougeCuve = mat(0xb91c1c, 0.45, 0.4);
    // Cuve horizontale + fonds bombés, pieds et roues
    ajout(g, cylX(1.3, 3.2, 40), rougeCuve, -5.6, 1.8, Z);
    for (const s of [-1, 1]) {
      const fond = ajout(g, new THREE.SphereGeometry(1.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), rougeCuve, -5.6 + s * 1.6, 1.8, Z);
      fond.scale.y = 0.35;
      fond.rotation.z = -s * Math.PI / 2;
    }
    for (const x of [-6.9, -4.3]) ajout(g, new THREE.BoxGeometry(0.2, 0.7, 1.6), M.gris, x, 0.35, Z);
    for (const z of [Z - 0.85, Z + 0.85]) ajout(g, cylZ(0.3, 0.18, 24), M.noir, -7.2, 0.3, z);
    // Purge sous la cuve
    ajout(g, cylY(0.06, 0.25), M.laiton, -5.6, 0.42, Z);
    // Socle du groupe moto-compresseur sur la cuve
    ajout(g, new THREE.BoxGeometry(2.4, 0.12, 1.2), M.gris, -6.4, 3.12, Z);
    // Moteur électrique + ventilateur (tourne en marche)
    ajout(g, cylX(0.5, 1.3, 32), mat(0x1f4e8c, 0.45, 0.4), -6.85, 3.75, Z);
    ajout(g, new THREE.BoxGeometry(0.4, 0.3, 0.4), mat(0x1f4e8c, 0.45, 0.4), -6.85, 4.35, Z);
    const ventilo = new THREE.Group();
    ventilo.position.set(-7.62, 3.75, Z);
    g.add(ventilo);
    this.ventilo = ventilo;
    for (let i = 0; i < 4; i++) {
      const pale = ajout(ventilo, new THREE.BoxGeometry(0.04, 0.42, 0.12), M.noir, 0, 0, 0);
      pale.rotation.x = i * Math.PI / 4;
    }
    ajout(g, new THREE.TorusGeometry(0.5, 0.04, 8, 32).rotateY(Math.PI / 2), M.noir, -7.62, 3.75, Z);
    // Tête de compression à ailettes
    const tete = new THREE.Group();
    tete.position.set(-5.7, 0, Z);
    g.add(tete);
    this.teteCompresseur = tete;
    const carterVerre = ajout(tete, new THREE.BoxGeometry(0.75, 0.5, 0.75), verre(0xe2e8f0, 0.3), 0, 3.45, 0, false);
    carterVerre.userData.vitre = true;
    const chemise = ajout(tete, cylY(0.34, 0.9, 24), verre(0xe2e8f0, 0.28), 0, 4.0, 0, false);
    chemise.userData.vitre = true;
    const ailettes = mat(0xc3c9d0, 0.8, 0.35, { transparent: true, opacity: 0.55 });
    for (let i = 0; i < 6; i++) ajout(tete, new THREE.TorusGeometry(0.4, 0.035, 6, 28).rotateX(Math.PI / 2), ailettes, 0, 3.65 + i * 0.13, 0, false);
    // Équipage mobile visible : vilebrequin (disque + maneton), bielle, piston
    const vilo = new THREE.Group();
    vilo.position.set(0, 3.42, 0);
    tete.add(vilo);
    this.vilebrequin = vilo;
    ajout(vilo, cylZ(0.17, 0.08, 24), M.acierFonce, 0, 0, -0.06);
    ajout(vilo, cylZ(0.04, 0.2, 10), M.acier, 0.12, 0, 0);
    this.piston = ajout(tete, cylY(0.31, 0.16, 24), mat(0x6b7280, 0.7, 0.35), 0, 3.95, 0);
    this.bielle = ajout(tete, new THREE.BoxGeometry(0.06, 1, 0.05), M.acier, 0, 3.7, 0.02);
    this.positionManeton = 0.12;
    ajout(tete, new THREE.BoxGeometry(0.7, 0.14, 0.7), M.aluFonce, 0, 4.5, 0);
    ajout(tete, cylY(0.15, 0.3), M.noir, 0.42, 4.25, 0.15);   // filtre d'aspiration
    // Pressostat, manomètre de cuve, soupape de sûreté, robinet de sortie
    ajout(g, new THREE.BoxGeometry(0.55, 0.55, 0.45), mat(0x374151, 0.3, 0.5), -4.4, 3.45, Z);
    ajout(g, new THREE.BoxGeometry(0.2, 0.2, 0.1), mat(0xdc2626, 0.3, 0.5), -4.4, 3.82, Z + 0.15);
    this.manoCuve = this._manometre(g, -4.4, 3.45, Z + 0.32, 12, 10, 0.2);
    const soupape = new THREE.Group();
    soupape.position.set(-4.05, 3.3, Z - 0.1);
    g.add(soupape);
    ajout(soupape, cylY(0.08, 0.35), M.laiton, 0, 0.18, 0);
    ajout(soupape, new THREE.SphereGeometry(0.06, 10, 8), M.laiton, 0, 0.4, 0);
    this.positionSoupape = new THREE.Vector3(-4.05, 3.75, Z - 0.1);
    ajout(g, cylY(0.07, 0.4), M.laiton, -3.9, 3.3, Z);
    // Clapet anti-retour sur le tube de refoulement du compresseur
    ajout(g, cylY(0.1, 0.25, 12), M.laiton, -4.9, 3.6, Z);
    this.positionPurgeCuve = new THREE.Vector3(-5.6, 0.28, Z);
    const poignee = ajout(g, new THREE.BoxGeometry(0.35, 0.05, 0.08), M.rouge, -3.78, 3.45, Z);
    poignee.rotation.y = 0.4;
    // Voyant de marche
    const voyant = ajout(g, new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: 0x14532d, emissive: 0x000000 }), -4.55, 3.82, Z + 0.24, false);
    this.voyantCompresseur = voyant.material;
  }

  /* ------- Vanne 3/2 + Filtre + Régulateur + Lubrificateur (FRL) ------ */
  _construireFRL() {
    const M = this._mat;
    const corps = mat(0xd9dee4, 0.6, 0.35);
    // Équerre de fixation commune
    const equerre = this._groupe('fixationFRL');
    ajout(equerre, new THREE.BoxGeometry(3.3, 0.12, 0.45), M.aluFonce, -0.95, Y_FRL - 0.36, 0.22);
    // Vanne 3/2 à levier
    const vanne = this._groupe('vanne');
    ajout(vanne, new THREE.BoxGeometry(0.55, 0.6, 0.55), mat(0x1e3a8a, 0.4, 0.45), -2.2, Y_FRL, Z);
    const levier = new THREE.Group();
    levier.position.set(-2.2, Y_FRL + 0.32, Z + 0.1);
    vanne.add(levier);
    ajout(levier, new THREE.BoxGeometry(0.12, 0.1, 0.12), M.noir, 0, 0, 0);
    ajout(levier, new THREE.BoxGeometry(0.62, 0.08, 0.12), M.rouge, 0.25, 0.05, 0);
    this.levierVanne = levier;
    ajout(vanne, cylY(0.07, 0.18), M.noir, -2.2, Y_FRL - 0.38, Z);   // échappement de la vanne
    this.positionEchapVanne = new THREE.Vector3(-2.2, Y_FRL - 0.5, Z);
    // Filtre : corps, cuve transparente, eau, élément filtrant, purge
    const filtre = this._groupe('filtre');
    ajout(filtre, new THREE.BoxGeometry(0.55, 0.55, 0.55), corps, -1.4, Y_FRL, Z);
    ajout(filtre, cylY(0.17, 0.95, 24, 0.2), verre(0xdbeafe, 0.28), -1.4, Y_FRL - 0.74, Z, false).userData.vitre = true;
    ajout(filtre, cylY(0.1, 0.6, 16), mat(0xe5e7eb, 0, 0.9), -1.4, Y_FRL - 0.6, Z, false);
    const eauGeo = cylY(0.165, 1, 20);
    eauGeo.translate(0, 0.5, 0);
    this.eau = ajout(filtre, eauGeo, new THREE.MeshStandardMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.65, roughness: 0.1 }), -1.4, Y_FRL - 1.2, Z, false);
    ajout(filtre, cylY(0.05, 0.16), M.noir, -1.4, Y_FRL - 1.3, Z);
    // Régulateur : corps, molette, manomètre
    const reg = this._groupe('regulateur');
    ajout(reg, new THREE.BoxGeometry(0.55, 0.55, 0.55), corps, -0.6, Y_FRL, Z);
    ajout(reg, cylY(0.18, 0.4, 24, 0.22), M.noir, -0.6, Y_FRL + 0.47, Z);
    this.molette = ajout(reg, cylY(0.24, 0.12, 12), M.noir, -0.6, Y_FRL + 0.72, Z);
    ajout(reg, cylY(0.16, 0.3, 20), corps, -0.6, Y_FRL - 0.42, Z);
    this.manoReseau = this._manometre(reg, -0.6, Y_FRL, Z + 0.33, 10, 8, 0.24);
    // Lubrificateur
    const lub = this._groupe('lubrificateur');
    ajout(lub, new THREE.BoxGeometry(0.55, 0.55, 0.55), corps, 0.2, Y_FRL, Z);
    ajout(lub, cylY(0.17, 0.95, 24, 0.2), verre(0xfef3c7, 0.3), 0.2, Y_FRL - 0.74, Z, false).userData.vitre = true;
    ajout(lub, cylY(0.165, 0.45, 20), new THREE.MeshStandardMaterial({ color: 0xd97706, transparent: true, opacity: 0.7, roughness: 0.1 }), 0.2, Y_FRL - 0.98, Z, false);
    ajout(lub, new THREE.CylinderGeometry(0.08, 0.1, 0.15, 12), verre(0xffffff, 0.4), 0.2, Y_FRL + 0.35, Z, false);
    // Bloc de distribution (nourrice) : un départ par utilisation
    const nou = this._groupe('nourrice');
    ajout(nou, new THREE.BoxGeometry(0.35, 0.3, 0.35), mat(0x1e3a8a, 0.4, 0.45), X_NOURRICE, Y_FRL, Z);
    ajout(nou, new THREE.BoxGeometry(0.3, 0.08, 0.3), M.aluFonce, (X_NOURRICE + 0.475) / 2 + 0.05, Y_FRL, Z);
    for (const dy of [0.17, -0.17]) ajout(nou, cylY(0.06, 0.06, 12), M.laiton, X_NOURRICE, Y_FRL + dy, Z);
    this.positionPurgeFiltre = new THREE.Vector3(-1.4, Y_FRL - 1.42, Z);
    // Raccords entre modules
    for (const x of [-1.8, -1.0, -0.2]) ajout(equerre, new THREE.BoxGeometry(0.1, 0.45, 0.5), M.aluFonce, x, Y_FRL, Z);
  }

  /* ---------------------- Distributeur 5/2 -------------------------- */
  _construireDistributeur() {
    const M = this._mat;
    const g = this._groupe('distributeur');
    ajout(g, new THREE.BoxGeometry(1.5, 0.12, 0.55), M.aluFonce, X_DIST, Y_DIST - 0.3, 0.25);     // embase
    ajout(g, new THREE.BoxGeometry(1.1, 0.45, 0.45), mat(0x9aa5b1, 0.7, 0.35), X_DIST, Y_DIST, Z);
    // Têtes de pilotage 14 (gauche) et 12 (droite) avec commande manuelle
    this.boutons = {};
    for (const [cote, x] of [[14, X_DIST - 0.65], [12, X_DIST + 0.65]]) {
      ajout(g, new THREE.BoxGeometry(0.22, 0.42, 0.42), M.noir, x, Y_DIST, Z);
      const b = ajout(g, cylZ(0.07, 0.08, 16), new THREE.MeshStandardMaterial({ color: cote === 14 ? 0x2563eb : 0x16a34a, emissive: 0x000000, roughness: 0.4 }), x, Y_DIST + 0.08, Z + 0.24);
      this.boutons[cote] = b;
      this._zoneAppui(g, cote, x, Y_DIST + 0.08, Z + 0.3, 0.2);
    }
    // Fenêtre et indicateur de position du tiroir
    ajout(g, new THREE.BoxGeometry(0.7, 0.12, 0.01), verre(0x0f172a, 0.6), X_DIST, Y_DIST + 0.05, Z + 0.226, false).userData.vitre = true;
    this.tiroir = ajout(g, new THREE.BoxGeometry(0.3, 0.08, 0.01), mat(0xfacc15, 0.2, 0.4, { emissive: 0x3a2a00 }), X_DIST, Y_DIST + 0.05, Z + 0.232, false);
    // Plaque de repérage
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const x = c.getContext('2d');
    x.fillStyle = '#e5e7eb'; x.fillRect(0, 0, 512, 96);
    x.fillStyle = '#111'; x.font = 'bold 40px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('14     5/2     12', 256, 50);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    ajout(g, new THREE.PlaneGeometry(0.8, 0.15), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), X_DIST, Y_DIST - 0.12, Z + 0.226, false);
    // Raccords instantanés : 4 et 2 en haut, 1 en bas
    for (const xx of [2.2, 2.6]) ajout(g, cylY(0.08, 0.12, 12), M.laiton, xx, Y_DIST + 0.27, Z);
    ajout(g, cylY(0.08, 0.12, 12), M.laiton, X_DIST, Y_DIST - 0.27, Z);
    // Silencieux sur 5 et 3
    const sil = this._groupe('silencieux');
    this.positionsEchap = {};
    for (const [port, xx] of [[5, 2.0], [3, 2.8]]) {
      ajout(sil, cylY(0.06, 0.08, 12), M.laiton, xx, Y_DIST - 0.26, Z);
      ajout(sil, cylY(0.085, 0.3, 16), M.bronze, xx, Y_DIST - 0.45, Z);
      this.positionsEchap[port] = new THREE.Vector3(xx, Y_DIST - 0.62, Z);
    }
    this.matSilencieux = sil.children.filter((_, i) => i % 2 === 1).map(m => m.material);
  }

  /* ------------- Vérin vertical transparent + charge ---------------- */
  _construireVerin() {
    const M = this._mat;
    const g = this._groupe('verin');
    // Pattes de fixation sur le panneau
    ajout(g, new THREE.BoxGeometry(0.9, 0.12, 0.5), M.aluFonce, XV, Y_FOND - 0.41, 0.25);
    ajout(g, new THREE.BoxGeometry(0.12, 0.6, 0.3), M.aluFonce, XV, Y_FOND, 0.12);
    ajout(g, new THREE.BoxGeometry(0.12, 0.6, 0.3), M.aluFonce, XV, Y_TETE, 0.12);
    // Fond et tête (culasses carrées) + tirants
    ajout(g, new THREE.BoxGeometry(0.55, Y_TUBE0 - (Y_FOND - 0.35), 0.55), M.alu, XV, (Y_TUBE0 + Y_FOND - 0.35) / 2, Z);
    ajout(g, new THREE.BoxGeometry(0.55, (Y_TETE + 0.35) - Y_TUBE1, 0.55), M.alu, XV, (Y_TUBE1 + Y_TETE + 0.35) / 2, Z);
    for (const dx of [-0.21, 0.21]) for (const dz of [-0.21, 0.21]) {
      ajout(g, cylY(0.025, Y_TUBE1 - Y_TUBE0, 8), M.acier, XV + dx, (Y_TUBE0 + Y_TUBE1) / 2, Z + dz);
    }
    // Tube transparent et contenu des chambres (teinté selon la pression)
    ajout(g, cylY(0.2, Y_TUBE1 - Y_TUBE0, 32), verre(0xe0f2fe, 0.2), XV, (Y_TUBE0 + Y_TUBE1) / 2, Z, false).userData.vitre = true;
    const geoChambre = cylY(0.185, 1, 24);
    geoChambre.translate(0, 0.5, 0);
    this.matChambreA = new THREE.MeshBasicMaterial({ color: COULEURS.repos, transparent: true, opacity: 0.15, depthWrite: false });
    this.matChambreB = new THREE.MeshBasicMaterial({ color: COULEURS.repos, transparent: true, opacity: 0.15, depthWrite: false });
    this.chambreA = ajout(g, geoChambre, this.matChambreA, XV, Y_TUBE0, Z, false);
    this.chambreB = ajout(g, geoChambre.clone(), this.matChambreB, XV, Y_TUBE0, Z, false);
    this.chambreA.userData.vitre = this.chambreB.userData.vitre = true;
    // Équipage mobile : piston, tige, plateau, came et masses
    const mobile = new THREE.Group();
    g.add(mobile);
    this.mobile = mobile;
    ajout(mobile, cylY(0.185, EP_PISTON, 32), mat(0x1f2937, 0.4, 0.5), XV, Y_TUBE0 + EP_PISTON / 2, Z);
    ajout(mobile, cylY(0.19, 0.05, 32), mat(0x0f766e, 0.2, 0.6), XV, Y_TUBE0 + EP_PISTON * 0.3, Z);
    const lTige = Y_PLATEAU0 - (Y_TUBE0 + EP_PISTON);
    ajout(mobile, cylY(0.06, lTige, 16), M.acier, XV, Y_TUBE0 + EP_PISTON + lTige / 2, Z);
    // Régleurs de débit sur les orifices A (fond) et B (tête)
    const reg = this._groupe('regleur');
    this.positionsRegleurs = {};
    for (const [nom, y] of [['A', Y_FOND], ['B', Y_TETE]]) {
      ajout(reg, cylX(0.09, 0.35, 16), M.laiton, XV - 0.45, y, Z);
      ajout(reg, cylY(0.05, 0.25, 12), M.laiton, XV - 0.45, y + 0.2, Z);
      ajout(reg, cylY(0.09, 0.08, 10), M.noir, XV - 0.45, y + 0.35, Z);
      this.positionsRegleurs[nom] = new THREE.Vector3(XV - 0.45, y, Z);
    }
    this.vis = reg.children.filter((_, i) => i % 3 === 2);
    const manos = this._groupe('manometres');
    ajout(manos, cylY(0.03, 0.3, 8), M.laiton, 4.35, Y_FOND + 0.2, Z);
    this.manoA = this._manometre(manos, 4.35, Y_FOND + 0.48, Z + 0.06, 10, 8, 0.17);
    ajout(manos, cylY(0.03, 0.3, 8), M.laiton, 4.35, Y_TETE - 0.2, Z);
    this.manoB = this._manometre(manos, 4.35, Y_TETE - 0.48, Z + 0.06, 10, 8, 0.17);

    // Plateau, came et masses : composant « charge » (suit la tige)
    const plateau = this._groupe('charge');
    this.plateau = plateau;
    ajout(plateau, new THREE.BoxGeometry(1.5, 0.12, 0.7), mat(0x334155, 0.5, 0.45), XV, Y_PLATEAU0 + 0.06, Z);
    for (const dx of [-0.6, 0.6]) ajout(plateau, cylY(0.09, 0.3, 16), M.laiton, XV + dx, Y_PLATEAU0 + 0.06, Z);
    // Came qui actionne les capteurs (à droite du plateau)
    ajout(plateau, new THREE.BoxGeometry(0.4, 0.1, 0.12), mat(0xfacc15, 0.3, 0.5), XV + 0.9, Y_PLATEAU0 + 0.06, Z);
    // Masses de 5 kg (affichées selon la charge)
    this.masses = [];
    for (let i = 0; i < 8; i++) {
      const m = ajout(plateau, cylY(0.32, 0.08, 28), mat(i % 2 ? 0x4b5563 : 0x374151, 0.6, 0.4), XV, Y_PLATEAU0 + 0.16 + i * 0.085, Z);
      this.masses.push(m);
    }
    // Colonnes de guidage fixes
    const guides = this.composants.verin;
    for (const dx of [-0.6, 0.6]) ajout(guides, cylY(0.04, 3.4, 10), M.acier, XV + dx, Y_TETE + 0.35 + 1.7, Z);
    ajout(guides, new THREE.BoxGeometry(1.5, 0.12, 0.3), M.aluFonce, XV, Y_TETE + 0.35 + 3.4, Z);
    for (const dx of [-0.6, 0.6]) ajout(guides, new THREE.BoxGeometry(0.12, 0.12, 0.4), M.aluFonce, XV + dx, Y_TETE + 0.35 + 3.4, 0.15);
  }

  /* -------------- Capteurs de fin de course 1S1 / 1S2 --------------- */
  _construireCapteurs() {
    const g = this._groupe('capteurs');
    const M = this._mat;
    ajout(g, new THREE.BoxGeometry(0.15, 2.9, 0.2), M.aluFonce, 6.65, Y_PLATEAU0 + 1.0, 0.1);
    this.capteurs = [];
    for (const [k, y] of [[1, Y_PLATEAU0 + 0.06], [2, Y_PLATEAU0 + COURSE + 0.06]]) {
      const c = new THREE.Group();
      c.position.set(6.45, y, Z);
      g.add(c);
      ajout(c, new THREE.BoxGeometry(0.3, 0.4, 0.3), mat(0x1f2937, 0.3, 0.5), 0, 0, 0);
      const levier = new THREE.Group();
      levier.position.set(-0.15, 0, 0);
      c.add(levier);
      ajout(levier, new THREE.BoxGeometry(0.2, 0.04, 0.05), M.acier, -0.08, 0, 0);
      ajout(levier, cylZ(0.05, 0.06, 14), M.noir, -0.19, 0, 0);
      const led = ajout(c, new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0x14532d, emissive: 0x000000 }), 0.05, 0.12, 0.16, false);
      this.capteurs.push({ groupe: c, levier, led: led.material, y });
    }
    // Sélecteur de cycle 0V1 (3/2 à accrochage, bouton tournant) : alimente les capteurs
    const sel = this._groupe('selecteur');
    ajout(sel, new THREE.BoxGeometry(0.4, 0.4, 0.35), mat(0x1f2937, 0.3, 0.5), 6.0, 1.75, Z);
    const bouton = new THREE.Group();
    bouton.position.set(6.0, 1.75, Z + 0.2);
    sel.add(bouton);
    ajout(bouton, cylZ(0.13, 0.08, 20), M.noir, 0, 0, 0);
    ajout(bouton, new THREE.BoxGeometry(0.05, 0.22, 0.06), M.rouge, 0, 0, 0.05);
    this.boutonSelecteur = bouton;
  }

  /* --------- Circuit 2 : bouton 3/2, échappement rapide, vérin SE ---- */
  _construireCircuit2() {
    const M = this._mat;
    // Bouton poussoir 3/2 NF (champignon vert) monté sur le panneau
    const bt = this._groupe('bouton');
    ajout(bt, new THREE.BoxGeometry(0.4, 0.5, 0.38), mat(0x9aa5b1, 0.7, 0.35), XB, Y_BOUTON, Z);
    ajout(bt, new THREE.BoxGeometry(0.5, 0.1, 0.3), M.aluFonce, XB, Y_BOUTON - 0.3, 0.2);
    ajout(bt, cylZ(0.08, 0.12, 16), M.noir, XB, Y_BOUTON, Z + 0.24);
    const champignon = new THREE.Group();
    champignon.position.set(XB, Y_BOUTON, Z + 0.3);
    bt.add(champignon);
    ajout(champignon, cylZ(0.05, 0.12, 12), M.noir, 0, 0, 0.02);
    const tete = ajout(champignon, new THREE.SphereGeometry(0.17, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35, emissive: 0x000000 }), 0, 0, 0.08);
    this.champignon = champignon;
    this.matChampignon = tete.material;
    this._zoneAppui(bt, 'bouton2v1', XB, Y_BOUTON, Z + 0.42, 0.32);
    ajout(bt, cylY(0.05, 0.12, 10), M.bronze, XB + 0.14, Y_BOUTON - 0.3, Z);      // échappement 3
    this.positionEchapBouton = new THREE.Vector3(XB + 0.14, Y_BOUTON - 0.4, Z);
    // Soupape d'échappement rapide 2V2 vissée sous le fond du vérin
    const er = this._groupe('echapRapide');
    ajout(er, new THREE.BoxGeometry(0.28, 0.28, 0.28), M.laiton, XB, Y_SE - 0.4, Z);
    ajout(er, cylX(0.07, 0.2, 12), M.laiton, XB + 0.22, Y_SE - 0.4, Z);
    ajout(er, cylX(0.08, 0.2, 14), M.bronze, XB + 0.38, Y_SE - 0.4, Z);
    this.positionEchapRapide = new THREE.Vector3(XB + 0.5, Y_SE - 0.4, Z);
    // Vérin simple effet Ø20 × 50 à rappel par ressort, tube transparent
    const se = this._groupe('verinSE');
    const xFond = X_SE0 - 0.2, xTete = X_SE0 + 1.05;
    ajout(se, new THREE.BoxGeometry(0.4, 0.4, 0.4), M.alu, xFond, Y_SE, Z);
    ajout(se, new THREE.BoxGeometry(0.3, 0.4, 0.4), M.alu, xTete + 0.15, Y_SE, Z);
    for (const x of [xFond, xTete + 0.15]) ajout(se, new THREE.BoxGeometry(0.12, 0.3, 0.25), M.aluFonce, x, Y_SE, 0.13);
    const tubeSE = ajout(se, cylX(0.13, xTete - X_SE0, 24), verre(0xe0f2fe, 0.22), (X_SE0 + xTete) / 2, Y_SE, Z, false);
    tubeSE.userData.vitre = true;
    this.matChambre2 = new THREE.MeshBasicMaterial({ color: COULEURS.repos, transparent: true, opacity: 0.15, depthWrite: false });
    const geoCh = cylX(0.12, 1, 20);
    geoCh.translate(0.5, 0, 0);
    this.chambre2 = ajout(se, geoCh, this.matChambre2, X_SE0, Y_SE, Z, false);
    this.chambre2.userData.vitre = true;
    const mobile = new THREE.Group();
    se.add(mobile);
    this.mobile2 = mobile;
    ajout(mobile, cylX(0.12, 0.1, 24), mat(0x1f2937, 0.4, 0.5), X_SE0 + 0.05, Y_SE, Z);
    ajout(mobile, cylX(0.04, 1.4, 12), M.acier, X_SE0 + 0.1 + 0.7, Y_SE, Z);
    ajout(mobile, cylX(0.07, 0.08, 12), M.noir, X_SE0 + 1.54, Y_SE, Z);     // embout caoutchouc
    // Ressort de rappel hélicoïdal (comprimé par le piston)
    const pts = [];
    for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2 * 9; pts.push(new THREE.Vector3(i / 120, Math.cos(a) * 0.085, Math.sin(a) * 0.085)); }
    const ressort = ajout(se, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.012, 5, false), mat(0x94a3b8, 0.9, 0.3), 0, Y_SE, Z, false);
    this.ressort = ressort;
    this.longueurRessort = { x0: X_SE0 + 0.1, x1: xTete };
    // Butée fixe en face de la tige
    ajout(se, new THREE.BoxGeometry(0.1, 0.5, 0.35), M.aluFonce, X_SE0 + 2.12, Y_SE, Z);
  }

  /* ---------------------------- Tubes ------------------------------- */
  /* Arrondit les angles d'un tracé polygonal (rayon r) pour un tube propre */
  _cheminArrondi(points, r = 0.18) {
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

  /* Zone tactile invisible autour d'une commande manuelle du banc */
  _zoneAppui(parent, commande, x, y, z, rayon) {
    this.zonesAppui = this.zonesAppui || [];
    const m = new THREE.Mesh(new THREE.SphereGeometry(rayon, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set(x, y, z);
    m.userData.commande = commande;
    parent.add(m);
    this.zonesAppui.push(m);
  }

  _construireTubes() {
    const groupe = this._groupe('tuyaux');
    const geoParticule = new THREE.SphereGeometry(0.045, 8, 6);
    for (const [id, pts] of Object.entries(TRACES)) {
      const fin = !!FINS[id];
      const chemin = this._cheminArrondi(pts, fin ? 0.12 : 0.18);
      const longueur = chemin.getLength();
      const materiau = new THREE.MeshStandardMaterial({ color: COULEURS.repos, transparent: true, opacity: 0.32, roughness: 0.15, metalness: 0, depthWrite: false });
      const rayon = id === 'cuve' ? 0.06 : fin ? 0.035 : 0.07;
      const tube = new THREE.Mesh(new THREE.TubeGeometry(chemin, Math.max(16, Math.ceil(longueur * 10)), rayon, 10, false), materiau);
      tube.renderOrder = 2;
      groupe.add(tube);
      const nEch = Math.max(20, Math.ceil(longueur * 24));
      const echantillons = chemin.getSpacedPoints(nEch);
      const nb = fin ? 0 : Math.max(3, Math.round(longueur / 0.25));
      let particules = null, matPart = null;
      if (nb) {
        matPart = new THREE.MeshBasicMaterial({ color: COULEURS.repos, toneMapped: false });
        particules = new THREE.InstancedMesh(geoParticule, matPart, nb);
        particules.frustumCulled = false;
        this.scene.add(particules);
      }
      this.lignes[id] = { materiau, matPart, particules, echantillons, longueur, nb, decalage: Math.random(), type: '' };
    }
    // Point de fuite : coude du tube réseau
    this.positionFuite = new THREE.Vector3(1.3, Y_FRL, Z + 0.08);
    this._mat4 = new THREE.Matrix4();
    this._vec = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._echelle = new THREE.Vector3();
  }

  /* Jets d'air (échappements, fuite, soupape) : petites bouffées blanches */
  _construireJets() {
    this.emetteurs = {
      e3: { pos: this.positionsEchap[3], dir: new THREE.Vector3(0, -1, 0.15) },
      e5: { pos: this.positionsEchap[5], dir: new THREE.Vector3(0, -1, 0.15) },
      fuite: { pos: this.positionFuite, dir: new THREE.Vector3(0.3, 0.2, 1) },
      soupape: { pos: this.positionSoupape, dir: new THREE.Vector3(0, 1, 0.2) },
      vanne: { pos: this.positionEchapVanne, dir: new THREE.Vector3(0, -1, 0.3) },
      er: { pos: this.positionEchapRapide, dir: new THREE.Vector3(1, 0.1, 0.3) },
      bouton: { pos: this.positionEchapBouton, dir: new THREE.Vector3(0.2, -1, 0.3) }
    };
    // Gouttes d'eau de la purge (filtre et cuve du compresseur)
    const NG = 16;
    this.gouttes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.05 }), NG);
    this.gouttes.frustumCulled = false;
    this.scene.add(this.gouttes);
    this.phasesGouttes = Array.from({ length: NG }, (_, i) => i / NG);
    this.purge = 0;
    this.rebond = 0; this.tRebond = 0; this.rebond2 = 0;
    const N = 14;
    const noms = Object.keys(this.emetteurs);
    const geo = new THREE.SphereGeometry(0.06, 8, 6);
    const m = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.55, depthWrite: false });
    this.jets = new THREE.InstancedMesh(geo, m, N * noms.length);
    this.jets.frustumCulled = false;
    this.jets.renderOrder = 3;
    this.scene.add(this.jets);
    noms.forEach((nom, k) => {
      const e = this.emetteurs[nom];
      e.dir.normalize();
      e.debut = k * N; e.n = N; e.intensite = 0;
      e.phases = Array.from({ length: N }, (_, i) => i / N);
    });
  }

  /* --------------------------- Étiquettes --------------------------- */
  /* ------------- Schéma ISO imprimé sur le panneau (animé) ---------- */
  _construireSchema() {
    const g = this._groupe('schemaPanneau');
    const L = 2.6, H = L * 520 / 530, cx = 2.85, cy = 6.72;
    ajout(g, new THREE.BoxGeometry(L + 0.16, H + 0.36, 0.03), this._mat.aluFonce, cx, cy + 0.1, 0.015);
    const c = document.createElement('canvas');
    c.width = 1060; c.height = 1040;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    this.texSchema = new THREE.CanvasTexture(c);
    this.texSchema.colorSpace = THREE.SRGBColorSpace;
    this.texSchema.anisotropy = 4;
    ajout(g, new THREE.PlaneGeometry(L, H), new THREE.MeshBasicMaterial({ map: this.texSchema, toneMapped: false }), cx, cy, 0.035, false);
    // Bandeau de titre
    const t = document.createElement('canvas'); t.width = 1024; t.height = 64;
    const x = t.getContext('2d');
    x.fillStyle = '#1e293b'; x.fillRect(0, 0, 1024, 64);
    x.fillStyle = '#f8fafc'; x.font = 'bold 36px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('Schéma pneumatique du banc (ISO 1219)', 512, 34);
    const texT = new THREE.CanvasTexture(t); texT.colorSpace = THREE.SRGBColorSpace;
    ajout(g, new THREE.PlaneGeometry(L, L * 64 / 1024), new THREE.MeshBasicMaterial({ map: texT, toneMapped: false }), cx, cy + H / 2 + 0.11, 0.035, false);
    // Le SVG est tenu hors de la page, mis à jour comme celui de l'onglet, puis redessiné dans la texture
    this.svgSchema = document.createElement('div');
    this.svgSchema.innerHTML = svgSchema();
    const svg = this.svgSchema.firstElementChild;
    svg.setAttribute('width', c.width); svg.setAttribute('height', c.height);
    this.imgSchema = new Image();
    this.imgSchema.onload = () => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(this.imgSchema, 0, 0, c.width, c.height);
      this.texSchema.needsUpdate = true;
      this._schemaEnCours = false;
    };
    this.imgSchema.onerror = () => { this._schemaEnCours = false; };
    this._tSchema = 1;
  }

  /* Redessine le schéma du panneau (≈ 4 fois par seconde, seulement si l'image a changé) */
  _majSchema(sim, dt) {
    this._tSchema += dt;
    if (this._tSchema < 0.25 || this._schemaEnCours) return;
    this._tSchema = 0;
    majSchema(this.svgSchema, sim);
    const texte = new XMLSerializer().serializeToString(this.svgSchema.firstElementChild);
    if (texte === this._dernierSchema) return;
    this._dernierSchema = texte;
    this._schemaEnCours = true;
    this.imgSchema.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(texte);
  }

  _construireEtiquettes() {
    const noms = [
      ['compresseur', 'Compresseur + cuve', new THREE.Vector3(-5.6, 5.3, Z)],
      ['vanne', 'Vanne 3/2', new THREE.Vector3(-2.2, Y_FRL + 0.95, Z)],
      ['filtre', 'Filtre', new THREE.Vector3(-1.4, Y_FRL - 1.7, Z)],
      ['regulateur', 'Régulateur', new THREE.Vector3(-0.6, Y_FRL + 1.15, Z)],
      ['lubrificateur', 'Lubrificateur', new THREE.Vector3(0.2, Y_FRL - 1.7, Z)],
      ['distributeur', 'Distributeur 5/2', new THREE.Vector3(X_DIST, Y_DIST + 0.75, Z + 0.3)],
      ['silencieux', 'Silencieux', new THREE.Vector3(X_DIST, Y_DIST - 1.0, Z)],
      ['regleur', 'Régleurs de débit', new THREE.Vector3(XV - 0.9, Y_TETE + 0.8, Z)],
      ['verin', 'Vérin double effet', new THREE.Vector3(XV + 1.0, (Y_TUBE0 + Y_TUBE1) / 2, Z + 0.3)],
      ['charge', 'Charge', new THREE.Vector3(XV - 1.2, Y_PLATEAU0 + 0.4, Z)],
      ['capteurs', 'Capteurs 1S1 / 1S2', new THREE.Vector3(6.6, Y_PLATEAU0 + 2.7, Z)],
      ['tuyaux', 'Tubes', new THREE.Vector3(3.2, 3.15, Z + 0.4)],
      ['nourrice', 'Bloc de distribution', new THREE.Vector3(X_NOURRICE + 0.4, Y_FRL - 0.55, Z)],
      ['bouton', 'Bouton 3/2 (2V1)', new THREE.Vector3(XB - 0.95, Y_BOUTON, Z)],
      ['echapRapide', 'Échappement rapide', new THREE.Vector3(XB - 1.15, Y_SE - 0.4, Z)],
      ['verinSE', 'Vérin simple effet', new THREE.Vector3(X_SE0 + 0.5, Y_SE + 0.5, Z)],
      ['selecteur', 'Sélecteur 0V1', new THREE.Vector3(6.0, 1.75 - 0.5, Z + 0.3)],
      ['manometres', 'Manomètres A / B', new THREE.Vector3(3.55, (Y_FOND + Y_TETE) / 2, Z + 0.3)]
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

  setEtiquettes(v) {
    this.etiquettesActives = v;
    if (!v) for (const s of this.etiquettes) s.visible = false;
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
    this.appui = null;   // { commande, id } : bouton du banc maintenu par le doigt
    const finAppui = (e) => {
      if (!this.appui || e.pointerId !== this.appui.id) return false;
      const c = this.appui.commande;
      this.appui = null;
      this.controls.enabled = true;
      if (this.surCommande) this.surCommande(c, false);
      return true;
    };
    // Phase de capture : passe avant les contrôles de caméra
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.appui || !this.surCommande || !this.zonesAppui) return;
      const rect = this.canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      const h = this.raycaster.intersectObjects(this.zonesAppui, false)[0];
      if (!h) return;
      this.appui = { commande: h.object.userData.commande, id: e.pointerId };
      this.controls.enabled = false;
      try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* sans importance */ }
      this.surCommande(this.appui.commande, true);
    }, true);
    for (const ev of ['pointerup', 'pointercancel']) this.canvas.addEventListener(ev, (e) => { if (finAppui(e)) { nb = Math.max(0, nb - 1); debut.id = -1; e.stopImmediatePropagation(); } }, true);
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.appui && e.pointerId === this.appui.id) return;
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
      if (o && o.userData.compId === 'fixationFRL') continue;
      if (o && o.userData.compId === 'panneau') return;
      if (o) { this.selectionner(o.userData.compId); this.surSelection(o.userData.compId); return; }
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
      // Volume du banc (sans le panneau entier ni le sol) : compresseur → capteurs
      const boite = new THREE.Box3(new THREE.Vector3(-7.8, 0, -0.2), new THREE.Vector3(7.5, 8.6, 1.4));
      this.volumeBanc = { boite, points: coinsBoite(boite) };
    }
    this._cadrer(this.volumeBanc.boite, immediat, this.volumeBanc.points);
  }

  /* Vue rapprochée d'un ou plusieurs composants */
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
    // Compresseur : ventilateur, vibration de la tête, voyant
    const tourne = sim.compresseurTourne;
    this.vitVentilo = THREE.MathUtils.lerp(this.vitVentilo || 0, tourne ? 18 : 0, Math.min(1, dt * 2));
    this.angleVentilo += this.vitVentilo * dt;
    this.ventilo.rotation.x = this.angleVentilo;
    this.teteCompresseur.position.y = tourne ? Math.sin(sim.temps * 90) * 0.008 : 0;
    // Bielle-manivelle : position du piston selon l'angle du vilebrequin
    const th = this.angleVentilo, rm = this.positionManeton, lb = 0.42;
    this.vilebrequin.rotation.z = th;
    const xm = Math.cos(th) * rm, ym = Math.sin(th) * rm;
    const yPistonC = 3.42 + ym + Math.sqrt(lb * lb - xm * xm);
    this.piston.position.y = yPistonC + 0.08;
    this.bielle.position.set(xm / 2, 3.42 + (ym + yPistonC - 3.42) / 2, 0.02);
    this.bielle.scale.y = Math.hypot(xm, yPistonC - 3.42 - ym);
    this.bielle.rotation.z = Math.atan2(xm, yPistonC - 3.42 - ym);
    this.voyantCompresseur.emissive.setHex(tourne ? 0x22c55e : 0x000000);
    // Manomètres (aiguille amortie)
    const pc = Math.max(0, sim.pCuve - P_ATM), pr = Math.max(0, sim.pReseau - P_ATM);
    const pulsation = tourne ? 0.08 * Math.sin(th * 2) : 0;   // l'aiguille de la cuve « bat » au rythme du piston
    const pA = Math.max(0, sim.pA - P_ATM), pB = Math.max(0, sim.pB - P_ATM);
    for (const [m, p] of [[this.manoCuve, pc + pulsation], [this.manoReseau, pr], [this.manoA, pA], [this.manoB, pB]]) {
      m.valeur += (Math.min(m.pMax * 1.02, p) - m.valeur) * Math.min(1, dt * 8);
      m.aiguille.rotation.z = (135 - (m.valeur / m.pMax) * 270) * Math.PI / 180;
    }
    // Vanne : levier dans l'axe (ouverte) ou en travers (fermée)
    this.levierVanne.rotation.y = c.vanne ? 0 : -Math.PI / 2;
    this.boutonSelecteur.rotation.z += ((c.auto ? -Math.PI / 2 : 0) - this.boutonSelecteur.rotation.z) * Math.min(1, dt * 12);
    // Molette du régulateur (tourne avec la consigne), eau dans le filtre
    this.molette.rotation.y = c.reglage * 0.8;
    this.eau.scale.y = Math.max(0.01, 0.15 + 0.7 * sim.eau);
    // Distributeur : tiroir et boutons des pilotes
    const cibleTiroir = X_DIST + (sim.dist > 0 ? -0.17 : 0.17);
    this.tiroir.position.x += (cibleTiroir - this.tiroir.position.x) * Math.min(1, dt * 20);
    this.boutons[14].material.emissive.setHex(r.pilote14 ? 0x1d4ed8 : 0x000000);
    this.boutons[12].material.emissive.setHex(r.pilote12 ? 0x15803d : 0x000000);
    const sale = sim.pannes.silencieux;
    for (const m of this.matSilencieux) m.color.setHex(sale ? 0x2b2116 : 0x8d6a3a);
    // Vérin : équipage mobile et chambres
    const y = sim.position * COURSE;
    // Arrivée en butée : la charge rebondit légèrement (amortie par les amortissements)
    if (r.choc1 > 0.02) { this.rebond = Math.min(0.06, r.choc1 * 0.5); this.tRebond = 0; }
    this.tRebond += dt;
    const rebond = this.rebond * Math.exp(-this.tRebond * 9) * Math.sin(this.tRebond * 45);
    this.mobile.position.y = y;
    this.plateau.position.y = y;
    this.masses.forEach((m, i) => { m.position.y = Y_PLATEAU0 + 0.16 + i * 0.085 + rebond * (1 + i * 0.15); });
    const yPiston = Y_TUBE0 + y;
    this.chambreA.position.y = Y_TUBE0;
    this.chambreA.scale.y = Math.max(0.001, y);
    this.chambreB.position.y = yPiston + EP_PISTON;
    this.chambreB.scale.y = Math.max(0.001, Y_TUBE1 - (yPiston + EP_PISTON));
    for (const [m, p] of [[this.matChambreA, sim.pA - P_ATM], [this.matChambreB, sim.pB - P_ATM]]) {
      const u = Math.max(0, Math.min(1, p / 7));
      m.color.setHex(u > 0.04 ? COULEURS.pression : COULEURS.repos);
      m.opacity = 0.1 + 0.5 * u;
    }
    const nbMasses = Math.round(c.charge / 5);
    this.masses.forEach((m, i) => { m.visible = i < nbMasses; });
    // Vis des régleurs : plus haute quand le régleur est ouvert
    this.vis[0].position.y = Y_FOND + 0.3 + c.regleurRentree / 100 * 0.1;
    this.vis[1].position.y = Y_TETE + 0.3 + c.regleurSortie / 100 * 0.1;
    // Capteurs : 1S2 déréglé (remonté), leviers et voyants
    const deregle = sim.pannes.capteur;
    this.capteurs[1].groupe.position.y = this.capteurs[1].y + (deregle ? 0.4 : 0);
    const actifs = [r.capteur1, r.capteur2];
    const yCame = Y_PLATEAU0 + 0.06 + y;
    this.capteurs.forEach((k, i) => {
      // Le galet suit la came : il s'enfonce progressivement quand la came arrive dessus
      const yC = k.groupe.position.y;
      const appui = Math.max(0, Math.min(1, 1 - (Math.abs(yCame - yC) - 0.02) / 0.14));
      k.levier.rotation.z = 0.45 * appui;
      k.led.emissive.setHex(actifs[i] ? 0x22c55e : 0x000000);
    });
    // Circuit 2 : champignon enfoncé, piston, ressort, chambre
    this.champignon.position.z += ((Z + 0.3 - (c.bouton ? 0.07 : 0)) - this.champignon.position.z) * Math.min(1, dt * 25);
    this.matChampignon.emissive.setHex(c.bouton ? 0x14532d : 0x000000);
    const x2 = sim.position2 * COURSE2;
    if (r.choc2 > 0.05) this.rebond2 = Math.min(0.025, r.choc2 * 0.03);
    this.rebond2 *= Math.exp(-dt * 25);
    this.mobile2.position.x = x2 + this.rebond2 * Math.sin(sim.temps * 80);
    this.chambre2.scale.x = Math.max(0.001, x2 + 0.001);
    const u2 = Math.max(0, Math.min(1, (sim.p2 - P_ATM) / 7));
    this.matChambre2.color.setHex(u2 > 0.04 ? COULEURS.pression : COULEURS.repos);
    this.matChambre2.opacity = 0.1 + 0.5 * u2;
    const L = this.longueurRessort;
    this.ressort.position.x = L.x0 + x2;
    this.ressort.scale.x = Math.max(0.05, L.x1 - (L.x0 + x2));
    this.ressort.visible = !sim.pannes.ressort;

    this._majTubes(sim, dt);
    this._majJets(sim, dt);
    this._majGouttes(dt);
    this._majSchema(sim, dt);
    this.controls.update();
    this._majEtiquettes();
  }

  _majTubes(sim, dt) {
    const L = sim.res.lignes;
    const m = this._mat4, pos = this._vec, q = this._quat, s = this._echelle;
    q.identity();
    for (const [id, ligne] of Object.entries(this.lignes)) {
      const etat = L[id] || { type: 'repos', debit: 0 };
      if (ligne.type !== etat.type) {
        ligne.type = etat.type;
        const coul = COULEURS[etat.type];
        ligne.materiau.color.setHex(coul);
        ligne.materiau.opacity = etat.type === 'repos' ? 0.3 : 0.5;
        if (ligne.matPart) ligne.matPart.color.setHex(coul);
      }
      if (!ligne.particules) continue;
      // Vitesse des particules proportionnelle au débit (≈ 4 unités/s pour 100 NL/min)
      let vit = Math.max(-8, Math.min(8, etat.debit / 100 * 4));
      if (Math.abs(vit) < 0.05) vit = 0;
      ligne.decalage = (ligne.decalage + (vit * dt) / ligne.longueur) % 1;
      if (ligne.decalage < 0) ligne.decalage += 1;
      const ech = ligne.echantillons, nE = ech.length - 1;
      const taille = etat.type === 'repos' ? 0.6 : 1;
      for (let i = 0; i < ligne.nb; i++) {
        const u = (i / ligne.nb + ligne.decalage) % 1;
        const f = u * nE, k = Math.floor(f), fr = f - k;
        const a = ech[k], b = ech[Math.min(nE, k + 1)];
        pos.set(a.x + (b.x - a.x) * fr, a.y + (b.y - a.y) * fr, a.z + (b.z - a.z) * fr);
        s.set(taille, taille, taille);
        m.compose(pos, q, s);
        ligne.particules.setMatrixAt(i, m);
      }
      ligne.particules.instanceMatrix.needsUpdate = true;
    }
  }

  _majJets(sim, dt) {
    const r = sim.res;
    const debits = { e3: r.qEchap3, e5: r.qEchap5, fuite: r.qFuite, soupape: r.qSoupape, vanne: r.qVanne, er: r.qEchapRapide * 0.5, bouton: r.qBoutonEchap * 3 };
    const m = this._mat4, pos = this._vec, q = this._quat, s = this._echelle;
    q.identity();
    for (const [nom, e] of Object.entries(this.emetteurs)) {
      const cible = Math.max(0, Math.min(1, (debits[nom] || 0) / 60));
      e.intensite += (cible - e.intensite) * Math.min(1, dt * 6);
      for (let i = 0; i < e.n; i++) {
        e.phases[i] = (e.phases[i] + dt * (1.2 + 2 * e.intensite)) % 1;
        const u = e.phases[i];
        const actif = e.intensite > 0.02 && (i / e.n) < 0.3 + 0.7 * e.intensite;
        const ech = actif ? (0.5 + 1.8 * u) * (0.6 + 0.6 * e.intensite) : 0;
        const ecart = 0.06 * Math.sin(i * 12.9898) * u * 4;
        pos.copy(e.pos).addScaledVector(e.dir, u * (0.4 + 0.6 * e.intensite));
        pos.x += ecart; pos.z += 0.06 * Math.cos(i * 7.233) * u * 4;
        s.set(ech, ech, ech);
        m.compose(pos, q, s);
        this.jets.setMatrixAt(e.debut + i, m);
      }
    }
    this.jets.instanceMatrix.needsUpdate = true;
  }

  /* Purge : l'eau s'écoule du filtre et de la cuve du compresseur pendant 2 s */
  purger() { this.purge = 2.2; }
  _majGouttes(dt) {
    this.purge = Math.max(0, this.purge - dt);
    const m = this._mat4, pos = this._vec, q = this._quat, s = this._echelle;
    q.identity();
    const n = this.phasesGouttes.length;
    for (let i = 0; i < n; i++) {
      this.phasesGouttes[i] = (this.phasesGouttes[i] + dt * 1.6) % 1;
      const u = this.phasesGouttes[i];
      const depart = i % 2 ? this.positionPurgeFiltre : this.positionPurgeCuve;
      const h = depart.y - 0.02;
      pos.set(depart.x + 0.02 * Math.sin(i * 7.1), depart.y - h * u * u, depart.z);
      const e = this.purge > 0 ? 1 : 0;
      s.set(e, e * 1.4, e);
      m.compose(pos, q, s);
      this.gouttes.setMatrixAt(i, m);
    }
    this.gouttes.instanceMatrix.needsUpdate = true;
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
