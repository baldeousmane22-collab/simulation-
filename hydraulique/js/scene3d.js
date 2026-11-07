/* =====================================================================
   scene3d.js — Construction et animation de la scène 3D (Three.js)
   ---------------------------------------------------------------------
   Repère : 1 unité ≈ 10 cm. L'axe Y est vertical, l'axe Z vient vers
   l'utilisateur. Le banc est composé :
   - d'une centrale hydraulique au sol à gauche (réservoir, moteur, pompe),
   - d'un panneau vertical sur lequel sont fixés les appareils
     (clapet, régulateur, distributeur, vérin, filtre de retour).
   Les tuyaux sont transparents pour voir circuler les particules d'huile.
   ===================================================================== */

import * as THREE from '../vendor/three.min.js';
import { OrbitControls, RoomEnvironment } from '../vendor/three.min.js';
import { CARAC } from './simulation.js';

/* Couleurs du code pédagogique */
export const COULEURS = {
  asp: 0x1e88ff,    // aspiration : bleu
  hp: 0xff2d2d,     // haute pression : rouge
  ret: 0x19c24a,    // retour réservoir : vert
  repos: 0x9aa4ae,  // huile au repos : gris
  huile: 0xd99a1c   // couleur de l'huile dans le réservoir
};

/* ---------------------------------------------------------------------
   Tracés des conduites (points de passage, dans le sens normal du débit)
   --------------------------------------------------------------------- */
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const TRACES = {
  aspiration:     [V(-3.9, 0.45), V(-2.0, 0.45), V(-2.0, 0.68)],
  refoulement:    [V(-2.0, 2.1), V(-2.0, 3.2)],
  manometre:      [V(-2.0, 3.2), V(-2.0, 4.45)],
  limiteurEntree: [V(-2.0, 3.2), V(-3.1, 3.2)],
  limiteurRetour: [V(-3.4, 2.95), V(-3.4, 1.1)],
  pression1:      [V(-2.0, 3.2), V(0.4, 3.2)],
  pression2:      [V(1.4, 3.2), V(2.0, 3.2)],
  pression3:      [V(3.2, 3.2), V(4.4, 3.2), V(4.4, 3.75)],
  ligneA:         [V(4.4, 4.65), V(4.4, 5.3), V(2.5, 5.3), V(2.5, 5.95)],
  ligneB:         [V(5.2, 4.65), V(5.2, 5.3), V(6.3, 5.3), V(6.3, 5.95)],
  retour1:        [V(5.2, 3.75), V(5.2, 2.72)],
  retour2:        [V(4.82, 2.55), V(4.2, 2.55), V(4.2, 0.35), V(4.2, 0.35, 0.9), V(-3.6, 0.35, 0.9)]
};

/* Directions de vue par défaut (depuis le point visé vers la caméra) */
const DIR_PORTRAIT = new THREE.Vector3(1.6, 0.9, 1).normalize();
const DIR_PAYSAGE = new THREE.Vector3(0.28, 0.3, 1).normalize();

/* Géométrie du vérin (unités de la scène) */
const VERIN = {
  y: 6.4, rayon: 0.45, xArriere: 2.0, xAvant: 6.8,
  pistonMin: 2.35, pistonMax: 6.45, longTige: 5.0
};

/* ---------------------------------------------------------------------
   Outils de création
   --------------------------------------------------------------------- */
function mat(couleur, metal = 0.3, rugo = 0.5, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: couleur, metalness: metal, roughness: rugo, ...extra });
}
function verre(couleur = 0xcfe8ff, opacite = 0.25) {
  return new THREE.MeshStandardMaterial({
    color: couleur, metalness: 0, roughness: 0.1, transparent: true,
    opacity: opacite, depthWrite: false
  });
}
/* Ajoute un maillage à un groupe, avec position et ombres */
function ajout(groupe, geo, materiau, x = 0, y = 0, z = 0, ombre = true) {
  const m = new THREE.Mesh(geo, materiau);
  m.position.set(x, y, z);
  m.castShadow = ombre;
  m.receiveShadow = ombre;
  groupe.add(m);
  return m;
}
/* Cylindre orienté selon un axe ('x', 'y' ou 'z') */
function cylindre(r, h, axe = 'y', seg = 24, r2 = r) {
  const g = new THREE.CylinderGeometry(r2, r, h, seg);
  if (axe === 'x') g.rotateZ(-Math.PI / 2);
  if (axe === 'z') g.rotateX(Math.PI / 2);
  return g;
}
/* Ressort hélicoïdal (pour le limiteur et le distributeur) */
function ressort(rayon, longueur, spires, fil, axe = 'y') {
  const pts = [];
  const n = spires * 16;
  for (let i = 0; i <= n; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * rayon, (i / n) * longueur, Math.sin(a) * rayon));
  }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, fil, 6, false);
  if (axe === 'x') g.rotateZ(-Math.PI / 2);
  return g;
}
/* Profil d'un pignon de pompe (extrudé ensuite) */
function geometriePignon(nbDents, rExt, rPied, rAlesage, epaisseur) {
  const forme = new THREE.Shape();
  const pas = (Math.PI * 2) / nbDents;
  for (let i = 0; i < nbDents; i++) {
    const a = i * pas;
    const pts = [
      [rPied, a], [rExt, a + pas * 0.15], [rExt, a + pas * 0.38], [rPied, a + pas * 0.53]
    ];
    pts.forEach(([r, ang], k) => {
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0 && k === 0) forme.moveTo(x, y); else forme.lineTo(x, y);
    });
  }
  forme.closePath();
  const trou = new THREE.Path();
  trou.absarc(0, 0, rAlesage, 0, Math.PI * 2, true);
  forme.holes.push(trou);
  const g = new THREE.ExtrudeGeometry(forme, { depth: epaisseur, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -epaisseur / 2);
  return g;
}
/* Les 8 coins d'une boîte englobante */
function coinsBoite(b) {
  const c = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) c.push(new THREE.Vector3(x, y, z));
  return c;
}

/* Texture texte sur un canvas (étiquettes, repères d'orifices) */
function textureTexte(texte, opts = {}) {
  const { fond = 'rgba(20,32,48,0.88)', couleur = '#ffffff', taille = 56, hauteur = 128, rond = false, bord = null, ajuster = false } = opts;
  let { largeur = 512 } = opts;
  const police = `bold ${taille}px system-ui, Roboto, Arial, sans-serif`;
  const c = document.createElement('canvas');
  if (ajuster) {
    // Largeur calculée d'après le texte réel : le nom n'est jamais tronqué
    const mesure = c.getContext('2d');
    mesure.font = police;
    largeur = Math.ceil(mesure.measureText(texte).width + hauteur * 0.75);
  }
  c.width = largeur; c.height = hauteur;
  const ctx = c.getContext('2d');
  ctx.fillStyle = fond;
  if (rond) {
    ctx.beginPath(); ctx.arc(largeur / 2, hauteur / 2, hauteur / 2 - 4, 0, Math.PI * 2); ctx.fill();
    if (bord) { ctx.lineWidth = 8; ctx.strokeStyle = bord; ctx.stroke(); }
  } else {
    const r = hauteur / 2.6;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(4, 4, largeur - 8, hauteur - 8, r);
    else ctx.rect(4, 4, largeur - 8, hauteur - 8); // anciens navigateurs
    ctx.fill();
    if (bord) { ctx.lineWidth = 6; ctx.strokeStyle = bord; ctx.stroke(); }
  }
  ctx.fillStyle = couleur;
  ctx.font = police;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texte, largeur / 2, hauteur / 2 + 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.ratio = largeur / hauteur;
  return t;
}

/* ---------------------------------------------------------------------
   Classe Scene3D
   --------------------------------------------------------------------- */
export class Scene3D {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {(id:string)=>void} surSelection — appelé quand on touche un composant
   */
  constructor(canvas, surSelection) {
    this.canvas = canvas;
    this.surSelection = surSelection;
    this.composants = {};         // id → THREE.Group
    this.etiquettes = [];         // sprites des noms
    this.lignes = {};             // id → { materiau, particules, echantillons, longueur, decalage }
    this.anim = null;             // animation de caméra en cours
    this.qualite = 2;             // 2 = haute, 1 = moyenne, 0 = basse (adaptatif)
    this.tempsImages = [];
    this.position = { tiroir: 0, levier: 0 };

    this._initRendu();
    this._construireDecor();
    this._construireComposants();
    this._construireConduites();
    this._construireEtiquettes();
    this._initInteraction();
    this.redimensionner();
    this.recentrer(true);
  }

  /* ------------------------- Rendu de base -------------------------- */
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
    // Éclairage par environnement (reflets réalistes sur les métaux)
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 70;
    this.controls.maxPolarAngle = Math.PI * 0.495; // ne pas passer sous le sol
    this.controls.screenSpacePanning = true;
    // Tactile : 1 doigt = rotation, 2 doigts = zoom (pincer) + déplacement
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    // Dès que l'utilisateur manipule la vue, on ne la recadre plus automatiquement
    this.controls.addEventListener('start', () => { this.anim = null; this.vueManuelle = true; });

    // Lumières
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.9));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.6);
    soleil.position.set(6, 16, 12);
    soleil.castShadow = true;
    soleil.shadow.mapSize.set(1024, 1024);
    const s = soleil.shadow.camera;
    s.left = -12; s.right = 16; s.top = 12; s.bottom = -6; s.near = 1; s.far = 50;
    soleil.shadow.bias = -0.0008;
    soleil.target.position.set(3, 2, 0);
    this.scene.add(soleil, soleil.target);
    this.soleil = soleil;
  }

  /* ------------------------- Sol et panneau ------------------------- */
  _construireDecor() {
    const decor = new THREE.Group();
    // Sol (dalle d'atelier)
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), mat(0xc9d1d9, 0, 0.9));
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    decor.add(sol);
    // Grille légère au sol
    const grille = new THREE.GridHelper(60, 60, 0xaab4bf, 0xb9c2cc);
    grille.position.y = 0.002;
    grille.material.transparent = true;
    grille.material.opacity = 0.5;
    decor.add(grille);

    // Panneau de montage rainuré (comme sur un banc école)
    const c = document.createElement('canvas');
    c.width = 64; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#d5dbe1'; ctx.fillRect(0, 0, 64, 512);
    ctx.fillStyle = '#9fa9b3';
    for (let y = 0; y < 512; y += 64) ctx.fillRect(0, y + 28, 64, 8);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    const panneau = ajout(decor, new THREE.BoxGeometry(13.7, 7.6, 0.12), mat(0xffffff, 0.6, 0.45, { map: tex }), 5.95, 3.9, -1.0);
    panneau.castShadow = false;
    // Pieds du panneau
    const piedMat = mat(0x4b5563, 0.6, 0.4);
    for (const x of [-0.7, 12.6]) {
      ajout(decor, new THREE.BoxGeometry(0.25, 7.8, 0.25), piedMat, x, 3.9, -1.1);
      ajout(decor, new THREE.BoxGeometry(0.4, 0.12, 2.4), piedMat, x, 0.06, -0.9);
    }
    this.scene.add(decor);
  }

  /* Crée un groupe de composant cliquable */
  _groupe(id) {
    const g = new THREE.Group();
    g.userData.compId = id;
    this.composants[id] = g;
    this.scene.add(g);
    return g;
  }

  /* --------------------------- Composants --------------------------- */
  _construireComposants() {
    const acier = mat(0xb8c0c8, 0.85, 0.3);
    const acierFonce = mat(0x5b6570, 0.7, 0.4);
    const laiton = mat(0xc9a43b, 0.9, 0.3);
    const noir = mat(0x22262b, 0.3, 0.6);
    this.materiaux = { acier, acierFonce, laiton, noir };

    /* ===== Réservoir ===== */
    {
      const g = this._groupe('reservoir');
      const tole = mat(0x3a6ea5, 0.5, 0.45);
      // Fond, côtés arrière/gauche/droit en tôle peinte ; façade transparente
      ajout(g, new THREE.BoxGeometry(4, 0.08, 2.6), tole, -5, 0.04, 0);
      ajout(g, new THREE.BoxGeometry(4, 2.4, 0.06), tole, -5, 1.2, -1.27);
      ajout(g, new THREE.BoxGeometry(0.06, 2.4, 2.6), tole, -6.97, 1.2, 0);
      const vitreDroite = ajout(g, new THREE.BoxGeometry(0.06, 2.4, 2.6), verre(0xbfdfff, 0.22), -3.03, 1.2, 0, false);
      vitreDroite.renderOrder = 2;
      vitreDroite.userData.vitre = true; // le toucher traverse la vitre (accès à la crépine)
      const facade = ajout(g, new THREE.BoxGeometry(4, 2.4, 0.06), verre(0xbfdfff, 0.22), -5, 1.2, 1.27, false);
      facade.renderOrder = 2;
      facade.userData.vitre = true;
      // Cadre de la façade
      for (const [w, h, x, y] of [[4.1, 0.1, -5, 2.4], [4.1, 0.1, -5, 0.05], [0.1, 2.4, -7, 1.2], [0.1, 2.4, -3, 1.2]]) {
        ajout(g, new THREE.BoxGeometry(w, h, 0.1), tole, x, y, 1.28);
      }
      // Couvercle
      ajout(g, new THREE.BoxGeometry(4.2, 0.12, 2.8), mat(0x2f5d8a, 0.5, 0.4), -5, 2.46, 0);
      // Bouchon de remplissage / reniflard
      ajout(g, cylindre(0.22, 0.25), acierFonce, -6.2, 2.65, 0.6);
      ajout(g, cylindre(0.28, 0.08), noir, -6.2, 2.8, 0.6);
      // Cloison de tranquillisation
      ajout(g, new THREE.BoxGeometry(0.04, 1.2, 2.4), mat(0x6f8fb5, 0.4, 0.5, { transparent: true, opacity: 0.5 }), -4.8, 0.7, 0, false).userData.vitre = true;
      // Huile : boîte dont la hauteur suit le niveau
      const geoHuile = new THREE.BoxGeometry(3.86, 1, 2.46);
      geoHuile.translate(0, 0.5, 0);
      const huile = ajout(g, geoHuile, new THREE.MeshStandardMaterial({
        color: COULEURS.huile, transparent: true, opacity: 0.62, roughness: 0.15, metalness: 0, depthWrite: false
      }), -5, 0.08, 0, false);
      huile.renderOrder = 1;
      huile.userData.vitre = true;
      this.huile = huile;
      // Repères MINI / MAXI sur la façade
      for (const [txt, y] of [['MAXI', 0.08 + 0.8 * 2.25], ['MINI', 0.08 + 0.4 * 2.25]]) {
        ajout(g, new THREE.BoxGeometry(0.5, 0.03, 0.02), mat(0xffffff, 0, 0.5), -6.6, y, 1.31, false);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: textureTexte(txt, { taille: 70, fond: 'rgba(0,0,0,0)', couleur: '#ffffff', largeur: 256 }), depthWrite: false }));
        sp.scale.set(0.8, 0.4, 1);
        sp.position.set(-6.0, y, 1.35);
        g.add(sp);
      }
      // Pieds
      for (const x of [-6.8, -3.2]) for (const z of [-1.1, 1.1]) ajout(g, new THREE.BoxGeometry(0.15, 0.08, 0.15), noir, x, 0.0, z);
    }

    /* ===== Crépine (dans le réservoir, toujours immergée) ===== */
    {
      const g = this._groupe('crepine');
      this.matCrepine = mat(0xc0c6cc, 0.8, 0.35);
      ajout(g, cylindre(0.3, 0.7, 'x', 20), this.matCrepine, -4.25, 0.45, 0);
      const grillage = new THREE.Mesh(cylindre(0.31, 0.7, 'x', 20), new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true }));
      grillage.position.set(-4.25, 0.45, 0);
      g.add(grillage);
      this.grillageCrepine = grillage;
      ajout(g, cylindre(0.33, 0.06, 'x'), acierFonce, -3.88, 0.45, 0);
      ajout(g, cylindre(0.33, 0.06, 'x'), acierFonce, -4.62, 0.45, 0);
    }

    /* ===== Pompe à engrenages (carter à capot transparent) ===== */
    {
      const g = this._groupe('pompe');
      this.pompe = g;
      const alu = mat(0xa9b3bd, 0.8, 0.35);
      // Carter : arrière plein, flasque, capot avant transparent
      ajout(g, new THREE.BoxGeometry(1.1, 1.25, 0.45), alu, 0, 0, -0.2);
      const fond = ajout(g, new THREE.BoxGeometry(0.98, 1.1, 0.02), mat(0x2b3138, 0.4, 0.7), 0, 0, 0.03, false);
      fond.receiveShadow = false;
      const capot = ajout(g, new THREE.BoxGeometry(1.1, 1.25, 0.08), verre(0xe6f2ff, 0.18), 0, 0, 0.42, false);
      capot.renderOrder = 3;
      // Cadre du capot
      for (const [w, h, x, y] of [[1.1, 0.07, 0, 0.6], [1.1, 0.07, 0, -0.6], [0.07, 1.25, 0.52, 0], [0.07, 1.25, -0.52, 0]]) {
        ajout(g, new THREE.BoxGeometry(w, h, 0.42), alu, x, y, 0.22);
      }
      // Vis de capot
      for (const x of [-0.45, 0.45]) for (const y of [-0.52, 0.52]) ajout(g, cylindre(0.04, 0.05, 'z', 8), acierFonce, x, y, 0.47);
      // Pignons (tournent quand la pompe marche)
      const geoP = geometriePignon(10, 0.3, 0.21, 0.06, 0.3);
      const matP = mat(0xd7dde3, 0.95, 0.22);
      // Pignons côte à côte : l'huile entre par le bas et sort par le haut
      this.pignon1 = ajout(g, geoP, matP, -0.255, 0, 0.22, false);
      this.pignon2 = ajout(g, geoP, mat(0xc5a35a, 0.9, 0.3), 0.255, 0, 0.22, false);
      ajout(g, cylindre(0.07, 0.42, 'z', 12), acierFonce, -0.255, 0, 0.18, false);
      ajout(g, cylindre(0.07, 0.42, 'z', 12), acierFonce, 0.255, 0, 0.18, false);
      // Orifices aspiration (en bas) et refoulement (en haut)
      ajout(g, cylindre(0.16, 0.2, 'y', 16), alu, 0, -0.68, 0);
      ajout(g, cylindre(0.16, 0.2, 'y', 16), alu, 0, 0.68, 0);
      // Arbre d'entraînement vers le moteur (côté droit)
      ajout(g, cylindre(0.06, 0.4, 'x', 12), acier, 0.7, 0, 0);
      // Console de fixation (derrière la pompe, jusqu'au sol)
      ajout(g, new THREE.BoxGeometry(1.2, 1.6, 0.2), mat(0x4b5563, 0.6, 0.45), 0, -0.6, -0.55);
      g.position.set(-2.0, 1.4, 0);
    }

    /* ===== Moteur électrique (derrière la pompe) ===== */
    {
      const g = this._groupe('moteur');
      const bleu = mat(0x2563a6, 0.45, 0.4);
      // Carcasse (axe X, à droite de la pompe)
      ajout(g, cylindre(0.55, 1.6, 'x', 32), bleu, 0, 0, 0);
      // Ailettes de refroidissement
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const ail = ajout(g, new THREE.BoxGeometry(1.4, 0.14, 0.06), bleu, 0, Math.cos(a) * 0.58, Math.sin(a) * 0.58);
        ail.rotation.x = a;
      }
      // Capot de ventilateur et flasque
      ajout(g, cylindre(0.56, 0.4, 'x', 32), mat(0x1f2937, 0.5, 0.5), 0.95, 0, 0);
      ajout(g, cylindre(0.6, 0.1, 'x', 32), bleu, -0.82, 0, 0);
      // Boîte à bornes
      ajout(g, new THREE.BoxGeometry(0.5, 0.25, 0.45), bleu, 0.1, 0.66, 0);
      // Pattes
      ajout(g, new THREE.BoxGeometry(1.2, 1.0, 1.0), mat(0x4b5563, 0.6, 0.45), 0, -0.9, 0);
      // Lanterne d'accouplement + accouplement visible (tourne)
      const lanterne = ajout(g, cylindre(0.32, 0.4, 'x', 20, 0.32), verre(0xdde7f0, 0.2), -1.07, 0, 0, false);
      lanterne.renderOrder = 3;
      const acc = new THREE.Group();
      acc.add(new THREE.Mesh(cylindre(0.2, 0.3, 'x', 6), mat(0xf59e0b, 0.3, 0.5)));
      const ergot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.08), noir);
      ergot.position.y = 0.15;
      acc.add(ergot);
      acc.position.set(-1.07, 0, 0);
      g.add(acc);
      this.accouplement = acc;
      g.position.set(-0.27, 1.4, 0);
    }

    /* ===== Limiteur de pression (vue en coupe : clapet + ressort) ===== */
    {
      const g = this._groupe('limiteur');
      const corps = ajout(g, cylindre(0.32, 1.0, 'y', 24), verre(0xffe1c2, 0.3), 0, 0.5, 0, false);
      corps.renderOrder = 3;
      ajout(g, cylindre(0.34, 0.12, 'y', 24), laiton, 0, 0.0, 0);      // embase
      ajout(g, cylindre(0.34, 0.12, 'y', 24), laiton, 0, 1.0, 0);      // chapeau
      ajout(g, new THREE.BoxGeometry(0.5, 0.35, 0.5), laiton, 0, -0.1, 0); // bloc d'orifices
      // Siège + clapet conique
      ajout(g, cylindre(0.2, 0.06, 'y', 20), acierFonce, 0, 0.12, 0, false);
      const geoClapet = new THREE.ConeGeometry(0.18, 0.25, 20);
      geoClapet.rotateX(Math.PI); // pointe vers le bas, sur le siège
      this.clapetLimiteur = ajout(g, geoClapet, mat(0xef4444, 0.5, 0.35), 0, 0.27, 0, false);
      // Ressort de tarage (sa longueur varie avec l'ouverture)
      this.ressortLimiteur = ajout(g, ressort(0.14, 1, 7, 0.025), mat(0xeab308, 0.8, 0.3), 0, 0.4, 0, false);
      // Vis de réglage et volant
      ajout(g, cylindre(0.05, 0.4, 'y', 12), acier, 0, 1.2, 0);
      const volant = new THREE.Group();
      volant.add(new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 8, 24).rotateX(Math.PI / 2), noir));
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), noir);
        b.rotation.y = i * Math.PI / 3;
        volant.add(b);
      }
      volant.position.y = 1.38;
      g.add(volant);
      this.volantLimiteur = volant;
      // Halo vert quand le limiteur s'ouvre
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), new THREE.MeshBasicMaterial({
        color: COULEURS.ret, transparent: true, opacity: 0, depthWrite: false
      }));
      halo.position.y = 0.35;
      g.add(halo);
      this.haloLimiteur = halo;
      // Support sur le couvercle
      ajout(g, new THREE.BoxGeometry(0.12, 0.55, 0.5), acierFonce, 0.38, -0.25, 0);
      g.position.set(-3.4, 3.1, 0);
    }

    /* ===== Manomètre (cadran + aiguille) ===== */
    {
      const g = this._groupe('manometre');
      ajout(g, cylindre(0.55, 0.28, 'z', 40), acier, 0, 0, 0);
      ajout(g, cylindre(0.12, 0.3, 'y', 12), laiton, 0, -0.62, 0);
      const cadran = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), new THREE.MeshBasicMaterial({ map: this._textureCadran(), toneMapped: false }));
      cadran.position.z = 0.145;
      g.add(cadran);
      // Aiguille : pivot au centre, pointe vers +X avant rotation
      const geoAig = new THREE.BoxGeometry(0.42, 0.035, 0.01);
      geoAig.translate(0.15, 0, 0);
      this.aiguille = new THREE.Mesh(geoAig, new THREE.MeshBasicMaterial({ color: 0xd11a1a }));
      this.aiguille.position.z = 0.16;
      g.add(this.aiguille);
      ajout(g, cylindre(0.04, 0.03, 'z', 12), noir, 0, 0, 0.17, false);
      const vitre = ajout(g, cylindre(0.5, 0.02, 'z', 40), verre(0xffffff, 0.12), 0, 0, 0.18, false);
      vitre.renderOrder = 3;
      g.position.set(-2.0, 5.05, 0);
    }

    /* ===== Clapet anti-retour (corps transparent, bille visible) ===== */
    {
      const g = this._groupe('clapet');
      const corps = ajout(g, cylindre(0.26, 0.8, 'x', 24), verre(0xd9f99d, 0.3), 0, 0, 0, false);
      corps.renderOrder = 3;
      for (const x of [-0.45, 0.45]) ajout(g, cylindre(0.2, 0.12, 'x', 6), laiton, x, 0, 0);
      ajout(g, new THREE.TorusGeometry(0.16, 0.04, 8, 20).rotateY(Math.PI / 2), acierFonce, -0.18, 0, 0, false); // siège
      this.billeClapet = ajout(g, new THREE.SphereGeometry(0.15, 20, 14), mat(0xe5e7eb, 1, 0.15), -0.1, 0, 0, false);
      this.ressortClapet = ajout(g, ressort(0.1, 1, 5, 0.018, 'x'), mat(0xeab308, 0.8, 0.3), 0.05, 0, 0, false);
      // Flèche du sens passant gravée sur le dessus
      const fl = ajout(g, new THREE.ConeGeometry(0.08, 0.2, 12).rotateZ(-Math.PI / 2), mat(0x111827, 0.2, 0.6), 0.12, 0.3, 0, false);
      ajout(g, new THREE.BoxGeometry(0.3, 0.04, 0.04), mat(0x111827, 0.2, 0.6), -0.1, 0.3, 0, false);
      fl.castShadow = false;
      ajout(g, new THREE.BoxGeometry(0.15, 0.3, 0.7), acierFonce, 0, -0.1, -0.6);
      g.position.set(0.9, 3.2, 0);
    }

    /* ===== Régulateur de débit réglable ===== */
    {
      const g = this._groupe('regulateur');
      ajout(g, new THREE.BoxGeometry(1.2, 0.6, 0.6), mat(0x16a34a, 0.4, 0.45), 0, 0, 0);
      for (const x of [-0.65, 0.65]) ajout(g, cylindre(0.16, 0.12, 'x', 16), laiton, x, 0, 0);
      ajout(g, cylindre(0.12, 0.25, 'y', 16), acier, 0, 0.42, 0);
      // Molette (tourne avec le réglage)
      const molette = new THREE.Group();
      molette.add(new THREE.Mesh(cylindre(0.28, 0.16, 'y', 18), noir));
      const index = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.26), mat(0xffffff, 0, 0.5));
      index.position.set(0, 0.09, 0.13);
      molette.add(index);
      molette.position.y = 0.6;
      g.add(molette);
      this.molette = molette;
      // Graduations « − / + » sur la face avant
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.4), new THREE.MeshBasicMaterial({
        map: textureTexte('−   DÉBIT   +', { taille: 46, fond: '#0f5132', largeur: 512, hauteur: 160 }), transparent: true
      }));
      plaque.position.set(0, 0, 0.305);
      g.add(plaque);
      ajout(g, new THREE.BoxGeometry(0.15, 0.3, 0.7), acierFonce, 0, -0.1, -0.6);
      g.position.set(2.6, 3.2, 0);
    }

    /* ===== Distributeur 4/3 (tiroir visible) ===== */
    {
      const g = this._groupe('distributeur');
      const corps = ajout(g, new THREE.BoxGeometry(2.4, 0.9, 0.9), verre(0xc7d2fe, 0.32), 0, 0, 0, false);
      corps.renderOrder = 3;
      // Arêtes du corps
      const aretes = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.4, 0.9, 0.9)), new THREE.LineBasicMaterial({ color: 0x334155 }));
      g.add(aretes);
      // Embase (plaque de montage) arrière
      ajout(g, new THREE.BoxGeometry(2.4, 0.9, 0.12), mat(0x334155, 0.6, 0.4), 0, 0, -0.5);
      // Tiroir avec ses portées
      const tiroir = new THREE.Group();
      tiroir.add(new THREE.Mesh(cylindre(0.1, 3.2, 'x', 16), acier));
      for (const x of [-0.8, 0, 0.8]) {
        const portee = new THREE.Mesh(cylindre(0.22, 0.32, 'x', 20), mat(0xdbe3ea, 0.95, 0.18));
        portee.position.x = x;
        tiroir.add(portee);
      }
      g.add(tiroir);
      this.tiroir = tiroir;
      // Ressorts de centrage (côté gauche) et carter
      ajout(g, cylindre(0.27, 0.5, 'x', 20), mat(0x475569, 0.6, 0.4), -1.45, 0, 0);
      // Levier de commande (côté droit), pivot sur une chape
      ajout(g, new THREE.BoxGeometry(0.3, 0.5, 0.95), mat(0x475569, 0.6, 0.4), 1.35, 0, 0.1);
      const levier = new THREE.Group();
      const bras = new THREE.Mesh(cylindre(0.05, 1.2, 'y', 10), acier);
      bras.position.y = 0.6;
      levier.add(bras);
      const boule = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), mat(0xdc2626, 0.2, 0.4));
      boule.position.y = 1.25;
      levier.add(boule);
      levier.position.set(1.55, 0.2, 0.42);
      g.add(levier);
      this.levier = levier;
      // Orifices (P et T en bas, A et B en haut)
      for (const [x, y] of [[-0.4, -0.5], [0.4, -0.5], [-0.4, 0.5], [0.4, 0.5]]) {
        ajout(g, cylindre(0.14, 0.12, 'y', 16), laiton, x, y, 0);
      }
      // Plaque avant : symbole des 3 positions (case active surlignée)
      this.canvasPlaque = document.createElement('canvas');
      this.canvasPlaque.width = 768; this.canvasPlaque.height = 256;
      this.texPlaque = new THREE.CanvasTexture(this.canvasPlaque);
      this.texPlaque.colorSpace = THREE.SRGBColorSpace;
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 0.65), new THREE.MeshBasicMaterial({ map: this.texPlaque, toneMapped: false }));
      plaque.position.set(0, 0, 0.46);
      g.add(plaque);
      this._dessinerPlaque(0);
      g.position.set(4.8, 4.2, 0);
    }

    /* ===== Vérin double effet ===== */
    {
      const g = this._groupe('verin');
      const longueur = VERIN.xAvant - VERIN.xArriere;
      const xc = (VERIN.xAvant + VERIN.xArriere) / 2;
      const tube = ajout(g, cylindre(VERIN.rayon, longueur - 0.4, 'x', 32), verre(0xe0f2fe, 0.22), xc, VERIN.y, 0, false);
      tube.renderOrder = 3;
      const fondMat = mat(0x0f4c81, 0.55, 0.4);
      ajout(g, new THREE.BoxGeometry(0.22, 1.1, 1.1), fondMat, VERIN.xArriere + 0.11, VERIN.y, 0);
      ajout(g, new THREE.BoxGeometry(0.22, 1.1, 1.1), fondMat, VERIN.xAvant - 0.11, VERIN.y, 0);
      // Tirants
      for (const dy of [-0.42, 0.42]) for (const dz of [-0.42, 0.42]) {
        ajout(g, cylindre(0.04, longueur, 'x', 8), acier, xc, VERIN.y + dy, dz);
      }
      // Huile dans les chambres (couleur selon pression)
      const geoCh = cylindre(VERIN.rayon - 0.05, 1, 'x', 24);
      this.chambreA = ajout(g, geoCh, new THREE.MeshStandardMaterial({ color: COULEURS.huile, transparent: true, opacity: 0.55, depthWrite: false }), 0, VERIN.y, 0, false);
      this.chambreB = ajout(g, geoCh.clone(), new THREE.MeshStandardMaterial({ color: COULEURS.huile, transparent: true, opacity: 0.55, depthWrite: false }), 0, VERIN.y, 0, false);
      this.chambreA.renderOrder = 1; this.chambreB.renderOrder = 1;
      // Piston + tige + chape + charge (ensemble mobile)
      const mobile = new THREE.Group();
      mobile.add(new THREE.Mesh(cylindre(VERIN.rayon - 0.04, 0.3, 'x', 28), mat(0x9ca3af, 0.9, 0.25)));
      const joint = new THREE.Mesh(cylindre(VERIN.rayon - 0.035, 0.08, 'x', 28), noir);
      mobile.add(joint);
      const tige = new THREE.Mesh(cylindre(0.18, VERIN.longTige, 'x', 20), mat(0xf1f5f9, 1, 0.12));
      tige.position.x = VERIN.longTige / 2;
      tige.castShadow = true;
      mobile.add(tige);
      const chape = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.45), acierFonce);
      chape.position.x = VERIN.longTige + 0.1;
      mobile.add(chape);
      mobile.position.set(VERIN.pistonMin, VERIN.y, 0);
      g.add(mobile);
      this.mobileVerin = mobile;
      // Orifices A (arrière) et B (avant)
      ajout(g, cylindre(0.13, 0.15, 'y', 16), laiton, 2.5, VERIN.y - VERIN.rayon - 0.02, 0);
      ajout(g, cylindre(0.13, 0.15, 'y', 16), laiton, 6.3, VERIN.y - VERIN.rayon - 0.02, 0);
      // Pattes de fixation sur le panneau
      for (const x of [2.15, 6.65]) ajout(g, new THREE.BoxGeometry(0.2, 0.4, 0.5), acierFonce, x, VERIN.y, -0.75);
    }

    /* ===== Charge entraînée par la tige (sur glissière) ===== */
    {
      // Groupe séparé (non suivi par le cadre) mais cliquable : fiche « vérin »
      const g = new THREE.Group();
      g.userData.compId = 'verin';
      this.scene.add(g);
      ajout(g, new THREE.BoxGeometry(5.6, 0.12, 0.6), mat(0x6b7280, 0.6, 0.4), 9.9, 5.62, 0);
      for (const x of [7.4, 12.4]) ajout(g, new THREE.BoxGeometry(0.15, 0.3, 1.0), mat(0x6b7280, 0.6, 0.4), x, 5.62, -0.5);
      const charge = new THREE.Group();
      const boite = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), mat(0xf59e0b, 0.2, 0.55));
      boite.castShadow = true;
      charge.add(boite);
      const etiq = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({
        map: textureTexte('400 kg', { taille: 64, fond: '#1f2937', largeur: 256, hauteur: 128 })
      }));
      etiq.position.z = 0.505;
      charge.add(etiq);
      charge.position.set(0, VERIN.y - 0.2, 0);
      g.add(charge);
      this.charge = charge;
      this.groupeCharge = g;
    }

    /* ===== Filtre de retour ===== */
    {
      const g = this._groupe('filtreRetour');
      ajout(g, new THREE.BoxGeometry(0.8, 0.35, 0.8), mat(0x64748b, 0.7, 0.35), 0, 0, 0);
      ajout(g, cylindre(0.36, 1.2, 'y', 28), mat(0xe5e7eb, 0.3, 0.45), 0, -0.78, 0);
      ajout(g, cylindre(0.38, 0.1, 'y', 28), mat(0x64748b, 0.7, 0.35), 0, -0.2, 0);
      // Indicateur de colmatage (vert = propre)
      this.indicateurFiltre = ajout(g, cylindre(0.08, 0.12, 'z', 16), mat(0x22c55e, 0.1, 0.4, { emissive: 0x0a3d1a }), 0.22, 0.05, 0.42, false);
      ajout(g, cylindre(0.14, 0.15, 'x', 16), laiton, -0.45, 0, 0);
      ajout(g, new THREE.BoxGeometry(0.15, 0.3, 0.9), acierFonce, 0, 0, -0.6);
      g.position.set(5.2, 2.55, 0);
    }

    /* Gouttes de fuite + flaque (panne « fuite ») */
    {
      const n = 14;
      this.gouttes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: 0xc27c0e, roughness: 0.1, emissive: 0x3a2000 }), n);
      this.gouttes.userData.phases = Array.from({ length: n }, (_, i) => i / n);
      this.gouttes.visible = false;
      this.gouttes.frustumCulled = false;
      this.scene.add(this.gouttes);
      this.flaque = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: 0x8a5a12, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 }));
      this.flaque.rotation.x = -Math.PI / 2;
      this.flaque.position.set(2.5, 0.01, 0);
      this.flaque.scale.setScalar(0.001);
      this.scene.add(this.flaque);
      this.tailleFlaque = 0;
    }
  }

  /* Texture du cadran du manomètre : 0 à 250 bar sur 270° */
  _textureCadran() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x = c.getContext('2d');
    const cx = 256, cy = 256;
    x.fillStyle = '#fbfbf7'; x.beginPath(); x.arc(cx, cy, 250, 0, Math.PI * 2); x.fill();
    x.lineWidth = 10; x.strokeStyle = '#333'; x.stroke();
    const ang = (v) => (225 - (v / CARAC.P_MAX_MANO) * 270) * Math.PI / 180;
    // Zone rouge (au-delà de 200 bar)
    x.strokeStyle = '#e11d48'; x.lineWidth = 22;
    x.beginPath(); x.arc(cx, cy, 200, -ang(200), -ang(250)); x.stroke();
    x.fillStyle = '#111';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let v = 0; v <= 250; v += 10) {
      const a = ang(v);
      const grand = v % 50 === 0;
      const r1 = grand ? 185 : 200, r2 = 225;
      x.lineWidth = grand ? 7 : 3; x.strokeStyle = '#111';
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1);
      x.lineTo(cx + Math.cos(a) * r2, cy - Math.sin(a) * r2);
      x.stroke();
      if (grand) {
        x.font = 'bold 44px Arial';
        x.fillText(String(v), cx + Math.cos(a) * 145, cy - Math.sin(a) * 145);
      }
    }
    x.font = 'bold 50px Arial'; x.fillText('bar', cx, cy + 120);
    x.font = '28px Arial'; x.fillStyle = '#555'; x.fillText('MANOMÈTRE', cx, cy + 70);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  /* Plaque du distributeur : 3 cases, la case active est surlignée.
     pos : +1 = sortie (case gauche), 0 = neutre, -1 = rentrée (case droite) */
  _dessinerPlaque(pos) {
    const x = this.canvasPlaque.getContext('2d');
    const W = 768, H = 256, w = 220, y0 = 30, h = 196;
    x.fillStyle = '#f8fafc'; x.fillRect(0, 0, W, H);
    const cases = [1, 0, -1];
    cases.forEach((p, i) => {
      const x0 = 54 + i * w;
      x.fillStyle = p === pos ? '#fde68a' : '#ffffff';
      x.fillRect(x0, y0, w, h);
      x.lineWidth = 6; x.strokeStyle = '#111'; x.strokeRect(x0, y0, w, h);
      const xa = x0 + 60, xb = x0 + w - 60; // colonnes A/P (gauche) et B/T (droite)
      const haut = y0 + 20, bas = y0 + h - 20;
      x.strokeStyle = '#111'; x.fillStyle = '#111'; x.lineWidth = 6;
      const fleche = (x1, y1, x2, y2) => {
        x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
        const a = Math.atan2(y2 - y1, x2 - x1);
        x.beginPath();
        x.moveTo(x2, y2);
        x.lineTo(x2 - 26 * Math.cos(a - 0.4), y2 - 26 * Math.sin(a - 0.4));
        x.lineTo(x2 - 26 * Math.cos(a + 0.4), y2 - 26 * Math.sin(a + 0.4));
        x.closePath(); x.fill();
      };
      const bouchon = (xx, yy, versBas) => {
        x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy + (versBas ? 40 : -40)); x.stroke();
        x.beginPath(); x.moveTo(xx - 20, yy + (versBas ? 40 : -40)); x.lineTo(xx + 20, yy + (versBas ? 40 : -40)); x.stroke();
      };
      if (p === 1) { fleche(xa, bas, xa, haut); fleche(xb, haut, xb, bas); }          // P→A, B→T
      else if (p === -1) { fleche(xa, bas, xb, haut); fleche(xa, haut, xb, bas); }   // P→B, A→T
      else { // centre tandem : P→T, A et B bouchés
        x.beginPath(); x.moveTo(xa, bas); x.lineTo(xa, bas - 50); x.lineTo(xb, bas - 50); x.lineTo(xb, bas); x.stroke();
        bouchon(xa, haut, true); bouchon(xb, haut, true);
      }
    });
    x.fillStyle = '#111'; x.font = 'bold 30px Arial'; x.textAlign = 'center';
    x.fillText('A', 54 + w + 60, 20); x.fillText('B', 54 + 2 * w - 60, 20);
    x.fillText('P', 54 + w + 60, 250); x.fillText('T', 54 + 2 * w - 60, 250);
    this.texPlaque.needsUpdate = true;
    this.positionPlaque = pos;
  }

  /* ---------------------------- Conduites --------------------------- */
  /* Arrondit les angles d'un tracé polygonal (rayon r) pour un tube propre */
  _cheminArrondi(points, r = 0.22) {
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

  _construireConduites() {
    const groupeTuyaux = this._groupe('tuyaux');
    const geoParticule = new THREE.SphereGeometry(0.062, 8, 6);
    const geoRaccord = cylindre(0.14, 0.16, 'y', 6);
    const matRaccord = mat(0xc9a43b, 0.9, 0.3);

    for (const [id, pts] of Object.entries(TRACES)) {
      const chemin = this._cheminArrondi(pts);
      const longueur = chemin.getLength();
      // Tube transparent teinté selon l'état
      const materiau = new THREE.MeshStandardMaterial({
        color: COULEURS.repos, transparent: true, opacity: 0.32, roughness: 0.15, metalness: 0, depthWrite: false
      });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(chemin, Math.max(16, Math.ceil(longueur * 10)), 0.1, 12, false), materiau);
      tube.renderOrder = 2;
      groupeTuyaux.add(tube);

      // Raccords hexagonaux aux deux extrémités
      for (const [a, b] of [[pts[0], pts[1]], [pts[pts.length - 1], pts[pts.length - 2]]]) {
        const r = new THREE.Mesh(geoRaccord, matRaccord);
        r.position.copy(a).add(b.clone().sub(a).normalize().multiplyScalar(0.06));
        r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        r.castShadow = true;
        groupeTuyaux.add(r);
      }

      // Échantillonnage du chemin (table de points) pour animer vite les particules
      const nEch = Math.max(20, Math.ceil(longueur * 24));
      const echantillons = chemin.getSpacedPoints(nEch);
      const nb = Math.max(3, Math.round(longueur / 0.3));
      const matPart = new THREE.MeshBasicMaterial({ color: COULEURS.repos, toneMapped: false });
      const particules = new THREE.InstancedMesh(geoParticule, matPart, nb);
      particules.frustumCulled = false;
      particules.userData.ignorerSelection = true;
      this.scene.add(particules);
      this.lignes[id] = { materiau, matPart, particules, echantillons, longueur, nb, decalage: Math.random(), type: 'repos' };
    }
    this._mat4 = new THREE.Matrix4();
    this._vec = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._echelle = new THREE.Vector3();
  }

  /* ---------------------------- Étiquettes --------------------------
     Les étiquettes gardent une taille fixe à l'écran (en pixels).
     À chaque image, on calcule leur rectangle à l'écran : une étiquette qui
     en chevauche une plus importante est décalée (au-dessus, en dessous, à
     gauche ou à droite) ; si aucune place n'est libre, elle est masquée.
     Elles réapparaissent dès qu'on zoome. Une étiquette qui sortirait de
     l'écran (ou passerait sous un bouton) est aussi masquée : jamais coupée.
     ------------------------------------------------------------------ */
  _construireEtiquettes() {
    // Ordre = priorité d'affichage quand la place manque
    const noms = [
      ['verin', 'Vérin double effet', V(4.4, 7.35, 0)],
      ['distributeur', 'Distributeur 4/3', V(7.2, 4.2, 0.3)],
      ['pompe', 'Pompe à engrenages', V(-2.2, 0.15, 1.2)],
      ['limiteur', 'Limiteur de pression', V(-3.4, 4.95, 0)],
      ['reservoir', 'Réservoir', V(-5.6, 3.25, 0.9)],
      ['manometre', 'Manomètre', V(-2.0, 5.95, 0)],
      ['moteur', 'Moteur électrique', V(-0.2, 2.35, 0)],
      ['regulateur', 'Régulateur de débit', V(2.6, 4.25, 0)],
      ['clapet', 'Clapet anti-retour', V(0.9, 2.55, 0.5)],
      ['filtreRetour', 'Filtre de retour', V(6.65, 1.9, 0.3)],
      ['crepine', 'Crépine', V(-4.3, 1.25, 1.5)]
    ];
    noms.forEach(([id, texte, pos], rang) => {
      const sp = this._sprite(texte, pos, id, { fond: 'rgba(15,23,42,0.88)', bord: '#38bdf8', ajuster: true }, 1);
      sp.userData.rang = rang;
      this.etiquettes.push(sp);
    });
    // Repères des orifices P, T, A, B (plus petits, moins prioritaires)
    const reperes = [
      ['P', V(3.95, 3.55, 0.35), '#dc2626'], ['T', V(5.62, 3.55, 0.35), '#16a34a'],
      ['A', V(3.95, 4.9, 0.35), '#2563eb'], ['B', V(5.62, 4.9, 0.35), '#7c3aed'],
      ['A', V(2.1, 5.75, 0.35), '#2563eb'], ['B', V(6.7, 5.75, 0.35), '#7c3aed'],
      ['P', V(-1.65, 2.3, 0.35), '#dc2626'], ['T', V(-3.0, 3.0, 0.5), '#16a34a']
    ];
    for (const [l, pos, coul] of reperes) {
      const sp = this._sprite(l, pos, 'distributeur', { fond: coul, rond: true, taille: 80, bord: '#ffffff', largeur: 128 }, 0.8);
      sp.userData.repere = true;
      sp.userData.rang = 100;
      this.etiquettes.push(sp);
    }
    this.etiquettesActives = true;
    this.obstacles = [];          // zones de l'écran occupées par les boutons (px)
    this._ndc = new THREE.Vector3();
  }

  /* facteurTaille : 1 pour les noms, plus petit pour les repères P/T/A/B */
  _sprite(texte, pos, id, opts, facteurTaille) {
    const tex = textureTexte(texte, { ...opts, hauteur: 128 });
    const m = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true, toneMapped: false });
    const sp = new THREE.Sprite(m);
    sp.userData.compId = id;
    sp.userData.ratio = tex.userData.ratio;
    sp.userData.facteurTaille = facteurTaille;
    sp.position.copy(pos);
    sp.renderOrder = 10;
    this.scene.add(sp);
    return sp;
  }

  setEtiquettes(visible) {
    this.etiquettesActives = visible;
    if (!visible) for (const s of this.etiquettes) s.visible = false;
  }

  /* Zones de l'écran recouvertes par l'interface (rectangles en px relatifs au canvas) */
  setObstacles(rects) { this.obstacles = rects || []; }

  /* Marges (px) de la zone 3D cachées par l'interface, utilisées pour le cadrage */
  setMarges(m) { this.marges = m; }

  /* Hauteur d'une étiquette à l'écran (px) : plus petite sur téléphone */
  _hauteurEtiquettePx() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    return Math.max(20, Math.min(30, Math.min(w, h) * 0.058));
  }

  /* Placement des étiquettes sans chevauchement (appelé à chaque image) */
  _majEtiquettes() {
    if (!this.etiquettesActives) return;
    const W = this.canvas.clientWidth || 1, H = this.canvas.clientHeight || 1;
    const hPx = this._hauteurEtiquettePx();
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    this.camera.updateMatrixWorld();
    const pris = this.obstacles.slice();
    const marge = 3;
    const libre = (r) => {
      if (r.x0 < 2 || r.y0 < 2 || r.x1 > W - 2 || r.y1 > H - 2) return false; // jamais coupée par le bord
      for (const o of pris) {
        if (r.x0 < o.x1 + marge && r.x1 > o.x0 - marge && r.y0 < o.y1 + marge && r.y1 > o.y0 - marge) return false;
      }
      return true;
    };
    // Les étiquettes des composants sélectionnés passent en premier
    const sel = this.idsSelection || [];
    const ordre = this.etiquettes.slice().sort((a, b) => {
      const pa = sel.includes(a.userData.compId) && !a.userData.repere ? -1 : a.userData.rang;
      const pb = sel.includes(b.userData.compId) && !b.userData.repere ? -1 : b.userData.rang;
      return pa - pb;
    });
    // Positions essayées : centrée, au-dessus, en dessous, à droite, à gauche
    const centres = [[0.5, 0.5], [0.5, -0.6], [0.5, 1.6], [-0.06, 0.5], [1.06, 0.5]];
    for (const sp of ordre) {
      const h = hPx * sp.userData.facteurTaille, w = h * sp.userData.ratio;
      const s = 2 * h * tanV / H; // échelle « sans atténuation » équivalente à h pixels
      sp.scale.set(s * sp.userData.ratio, s, 1);
      const p = this._ndc.copy(sp.position).project(this.camera);
      if (p.z > 1 || p.z < -1) { sp.visible = false; continue; }
      const cx = (p.x + 1) / 2 * W, cy = (1 - p.y) / 2 * H;
      let place = null;
      for (const [ux, uy] of centres) {
        const x0 = cx - ux * w, y0 = cy - (1 - uy) * h;
        const r = { x0, y0, x1: x0 + w, y1: y0 + h };
        if (libre(r)) { place = [ux, uy, r]; break; }
        if (sp.userData.repere) break; // les repères ne se déplacent pas
      }
      const prioritaire = sel.includes(sp.userData.compId) && !sp.userData.repere;
      if (!place && prioritaire && sp.userData.ratio) {
        // Composant touché : son nom s'affiche toujours, ramené dans l'écran
        const x0 = Math.min(Math.max(cx - w / 2, 4), W - w - 4);
        const y0 = Math.min(Math.max(cy - h / 2, 4), H - h - 4);
        const r = { x0, y0, x1: x0 + w, y1: y0 + h };
        // Décalage écran → coordonnées « center » du sprite
        place = [(cx - x0) / w, 1 - (cy - y0) / h, r];
      }
      sp.visible = !!place;
      if (place) {
        sp.center.set(place[0], place[1]);
        pris.push(place[2]);
      }
    }
  }

  /* ------------------------ Interaction tactile ---------------------- */
  _initInteraction() {
    this.raycaster = new THREE.Raycaster();
    const debut = { x: 0, y: 0, t: 0, id: -1 };
    let nbPointeurs = 0;
    this.canvas.addEventListener('pointerdown', (e) => {
      nbPointeurs++;
      if (nbPointeurs === 1) { debut.x = e.clientX; debut.y = e.clientY; debut.t = performance.now(); debut.id = e.pointerId; }
      else debut.id = -1; // geste à deux doigts : pas une sélection
    });
    const fin = (e) => {
      nbPointeurs = Math.max(0, nbPointeurs - 1);
      if (e.pointerId !== debut.id) return;
      debut.id = -1;
      const dx = e.clientX - debut.x, dy = e.clientY - debut.y;
      if (dx * dx + dy * dy < 100 && performance.now() - debut.t < 450) this._toucher(e.clientX, e.clientY);
    };
    this.canvas.addEventListener('pointerup', fin);
    this.canvas.addEventListener('pointercancel', (e) => { nbPointeurs = Math.max(0, nbPointeurs - 1); if (e.pointerId === debut.id) debut.id = -1; });
  }

  /* Recherche du composant sous le doigt */
  _toucher(cx, cy) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    // On teste d'abord les étiquettes (elles sont toujours au premier plan)
    const etiq = this.etiquettes.filter(s => s.visible && !s.userData.repere);
    let hits = this.raycaster.intersectObjects(etiq, false);
    if (!hits.length) {
      const cibles = Object.values(this.composants);
      if (this.groupeCharge) cibles.push(this.groupeCharge);
      hits = this.raycaster.intersectObjects(cibles, true);
    }
    for (const h of hits) {
      if (h.object.userData.vitre) continue;
      let o = h.object;
      while (o && !o.userData.compId) o = o.parent;
      if (o) { this.selectionner(o.userData.compId); this.surSelection(o.userData.compId); return; }
    }
  }

  /* Cadre jaune autour du ou des composants sélectionnés (id ou tableau d'id) */
  selectionner(ids) {
    for (const c of this.cadres || []) { this.scene.remove(c); c.geometry.dispose(); }
    this.cadres = [];
    const liste = Array.isArray(ids) ? ids : [ids];
    this.idsSelection = liste.filter(Boolean);
    for (const id of liste) {
      if (!id || !this.composants[id] || id === 'tuyaux') continue;
      const boite = new THREE.Box3().setFromObject(this.composants[id]);
      if (id === 'verin' && this.groupeCharge) boite.union(new THREE.Box3().setFromObject(this.groupeCharge));
      boite.expandByScalar(0.08);
      const cadre = new THREE.Box3Helper(boite, 0xfacc15);
      cadre.material.depthTest = false;
      cadre.renderOrder = 9;
      this.scene.add(cadre);
      this.cadres.push(cadre);
    }
  }

  /* --------------------------- Caméra ------------------------------- */
  /* Cadre la caméra sur une boîte englobante (animation douce).
     On projette les 8 coins de la boîte à l'écran et on ajuste, en
     quelques itérations, la distance et le point visé pour que la boîte
     remplisse l'écran sans déborder (quelle que soit l'orientation). */
  _cadrer(boite, immediat = false, points = null) {
    const cam = this.camera.clone();
    cam.aspect = this.camera.aspect;
    cam.updateProjectionMatrix();
    // En portrait, vue plus de biais : le banc (très large) paraît moins long
    // et remplit mieux la hauteur de l'écran.
    const dir = (cam.aspect < 1 ? (this.dirPortrait || DIR_PORTRAIT) : DIR_PAYSAGE).clone();
    const centre = boite.getCenter(new THREE.Vector3());
    // Points à faire tenir à l'écran : ceux fournis, sinon les 8 coins de la boîte
    const coins = points || coinsBoite(boite);
    // Zone utile de l'écran (sans les boutons posés sur la 3D), en coordonnées -1..1
    const W = this.canvas.clientWidth || 1, H = this.canvas.clientHeight || 1;
    const m = this.marges || { haut: 0, bas: 0, gauche: 0, droite: 0 };
    const xg = -1 + 2 * m.gauche / W, xd = 1 - 2 * m.droite / W;
    const yb = -1 + 2 * m.bas / H, yh = 1 - 2 * m.haut / H;
    let dist = boite.getSize(new THREE.Vector3()).length();
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const remplissage = 0.97; // la boîte occupe 97 % de la zone utile
    for (let i = 0; i < 16; i++) {
      cam.position.copy(centre).addScaledVector(dir, dist);
      cam.lookAt(centre);
      cam.updateMatrixWorld();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const c of coins) {
        const p = c.clone().project(cam);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
        y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
      // Recentrage : le milieu de la boîte doit tomber au milieu de la zone utile
      const droite = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      const haut = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const demiH = dist * tanV, demiL = demiH * cam.aspect;
      centre.addScaledVector(droite, ((x0 + x1) / 2 - (xg + xd) / 2) * demiL)
            .addScaledVector(haut, ((y0 + y1) / 2 - (yb + yh) / 2) * demiH);
      // Ajustement de la distance selon le côté le plus contraint
      const ech = Math.max((x1 - x0) / (xd - xg), (y1 - y0) / (yh - yb)) / remplissage;
      dist *= Math.max(0.5, Math.min(2, ech));
    }
    dist = Math.max(dist, 4);
    const pos = centre.clone().addScaledVector(dir, dist);
    if (immediat) {
      this.camera.position.copy(pos);
      this.controls.target.copy(centre);
      this.controls.update();
      this.anim = null;
    } else {
      this.anim = {
        t: 0, duree: 0.9,
        p0: this.camera.position.clone(), p1: pos,
        c0: this.controls.target.clone(), c1: centre
      };
    }
  }

  recentrer(immediat = false) {
    this.vueManuelle = false;
    // Volume du banc calculé une seule fois, au repos : cadrage toujours identique
    if (!this.volumeBanc) this.volumeBanc = this._boiteBanc();
    const { boite, points } = this.volumeBanc;
    this._cadrer(boite, immediat, points);
  }

  /* Volume occupé par le banc : boîtes de chaque composant (et de la charge du
     vérin à sa position actuelle), sans le grand panneau de fond. On garde les
     coins de chaque boîte : le cadrage suit la forme réelle du banc au lieu
     d'une grande boîte qui laisserait du vide à l'écran. */
  _boiteBanc() {
    const boite = new THREE.Box3(), points = [];
    const objets = Object.values(this.composants).filter(g => g.userData.compId !== 'tuyaux');
    // Les tuyaux sont pris segment par segment (pas une seule grande boîte)
    for (const l of Object.values(this.lignes)) {
      const e = l.echantillons;
      for (let i = 0; i < e.length; i += 6) { points.push(e[i].clone()); boite.expandByPoint(e[i]); }
    }
    for (const g of objets) {
      const b = new THREE.Box3().setFromObject(g);
      boite.union(b);
      points.push(...coinsBoite(b));
    }
    // Charge du vérin comptée tige rentrée (position de départ) : le cadrage
    // est toujours identique, quelle que soit la position actuelle de la tige.
    if (this.charge) {
      const x = this.charge.position.x;
      for (const pos of [VERIN.pistonMin]) {
        this.charge.position.x = pos + VERIN.longTige + 0.75;
        this.charge.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(this.charge);
        boite.union(b);
        points.push(...coinsBoite(b));
      }
      this.charge.position.x = x;
      this.charge.updateMatrixWorld(true);
    }
    return { boite, points };
  }

  /* Focalise la vue sur un ou plusieurs composants (mode pas à pas) */
  focaliser(ids) {
    const b = new THREE.Box3();
    for (const id of ids) {
      const g = this.composants[id];
      if (g) b.union(new THREE.Box3().setFromObject(g));
      if (id === 'verin' && this.groupeCharge) b.union(new THREE.Box3().setFromObject(this.groupeCharge));
    }
    if (b.isEmpty()) return;
    b.expandByScalar(0.6);
    this.vueManuelle = true;
    this._cadrer(b);
  }

  redimensionner() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Si l'utilisateur n'a pas déplacé la vue, on garde le cadrage optimal
    // (rotation du téléphone, ouverture/fermeture du panneau…)
    if (!this.vueManuelle && !this.anim) this.recentrer(true);
  }

  /* ---------------------- Mise à jour par image ---------------------- */
  maj(sim, dt) {
    const r = sim.res, c = sim.cmd;
    const t = sim.temps;

    // Animation de caméra éventuelle
    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.duree);
      const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2; // easeInOut
      this.camera.position.lerpVectors(a.p0, a.p1, e);
      this.controls.target.lerpVectors(a.c0, a.c1, e);
      if (a.t >= 1) this.anim = null;
    }

    // Pompe : rotation des pignons (sens opposés) et de l'accouplement
    const vitesse = sim.vitesseRotation;
    this.angle = (this.angle || 0) + vitesse * dt * 9;
    this.pignon1.rotation.z = this.angle;
    this.pignon2.rotation.z = -this.angle + Math.PI - 1.03 * (Math.PI / 5); // décalage d'engrènement
    this.accouplement.rotation.x = this.angle;
    // Vibrations en cas de cavitation
    const vib = r.cavitation ? 0.015 : 0;
    this.pompe.position.x = -2.0 + (Math.random() - 0.5) * vib;
    this.pompe.position.y = 1.4 + (Math.random() - 0.5) * vib;

    // Niveau d'huile
    this.huile.scale.y = Math.max(0.01, sim.niveauHuile * 2.25);

    // Crépine colmatée : couleur brune
    this.matCrepine.color.setHex(sim.pannes.filtre ? 0x5c3b1e : 0xc0c6cc);
    this.grillageCrepine.material.color.setHex(sim.pannes.filtre ? 0x2a1a0a : 0x333333);

    // Manomètre : 0 → 225°, 250 bar → -45°
    const P = Math.max(0, Math.min(CARAC.P_MAX_MANO, r.pression));
    this.aiguille.rotation.z = THREE.MathUtils.degToRad(225 - (P / CARAC.P_MAX_MANO) * 270);

    // Limiteur : levée du clapet, compression du ressort, halo
    const ouv = r.ouvertureLimiteur;
    const levee = ouv * 0.16;
    this.clapetLimiteur.position.y = 0.27 + levee;
    const longRessort = 0.55 - levee - (c.tarage - 20) / 180 * 0.1;
    this.ressortLimiteur.position.y = 0.4 + levee;
    this.ressortLimiteur.scale.y = Math.max(0.2, longRessort);
    this.volantLimiteur.rotation.y = (c.tarage / 200) * Math.PI * 3;
    this.haloLimiteur.material.opacity = ouv > 0.05 ? 0.15 + 0.2 * ouv * (0.6 + 0.4 * Math.sin(t * 10)) : 0;
    this.haloLimiteur.scale.setScalar(1 + 0.06 * Math.sin(t * 10) * ouv);

    // Clapet anti-retour : la bille recule quand l'huile passe
    const debitClapet = r.lignes.pression2 ? Math.abs(r.lignes.pression2.debit) : 0;
    const ouvClapet = sim.pannes.clapet ? 0 : Math.min(1, debitClapet / CARAC.QNOM * 1.5);
    this.billeClapet.position.x = -0.1 + 0.12 * ouvClapet;
    this.ressortClapet.position.x = 0.05 + 0.12 * ouvClapet;
    this.ressortClapet.scale.x = 0.3 - 0.12 * ouvClapet;

    // Régulateur : rotation de la molette
    this.molette.rotation.y = -(c.debitPct / 100) * Math.PI * 1.5;

    // Distributeur : tiroir et levier (mouvement amorti)
    const cibleTiroir = c.distributeur * 0.32;
    this.position.tiroir += (cibleTiroir - this.position.tiroir) * Math.min(1, dt * 10);
    this.tiroir.position.x = this.position.tiroir;
    this.levier.rotation.z = -this.position.tiroir * 1.3;
    if (this.positionPlaque !== c.distributeur) this._dessinerPlaque(c.distributeur);

    // Vérin : position du piston, longueur des chambres
    const xp = VERIN.pistonMin + sim.positionVerin * (VERIN.pistonMax - VERIN.pistonMin);
    this.mobileVerin.position.x = xp;
    const xInt0 = VERIN.xArriere + 0.22, xInt1 = VERIN.xAvant - 0.22;
    const lA = Math.max(0.01, xp - 0.15 - xInt0);
    const lB = Math.max(0.01, xInt1 - (xp + 0.15));
    this.chambreA.scale.set(lA, 1, 1); this.chambreA.position.x = xInt0 + lA / 2;
    this.chambreB.scale.set(lB, 1, 1); this.chambreB.position.x = xp + 0.15 + lB / 2;
    const coulChambre = (type) => type === 'hp' ? COULEURS.hp : type === 'ret' ? COULEURS.ret : COULEURS.huile;
    this.chambreA.material.color.setHex(coulChambre(r.lignes.ligneA?.type));
    this.chambreB.material.color.setHex(coulChambre(r.lignes.ligneB?.type));
    this.charge.position.x = xp + VERIN.longTige + 0.75;

    // Indicateur du filtre de retour (orange si fort débit)
    const qRet = r.lignes.retour1 ? r.lignes.retour1.debit : 0;
    this.indicateurFiltre.material.color.setHex(qRet > CARAC.QNOM * 1.05 ? 0xf59e0b : 0x22c55e);

    // Particules dans les conduites
    this._majParticules(sim, dt);

    // Fuite : gouttes qui tombent du raccord A du vérin + flaque
    this._majFuite(sim, dt);

    this.controls.update();
    this._majEtiquettes();
  }

  _majParticules(sim, dt) {
    const L = sim.res.lignes;
    const m = this._mat4, pos = this._vec, q = this._quat, s = this._echelle;
    q.identity();
    for (const [id, ligne] of Object.entries(this.lignes)) {
      const etat = L[id] || { type: 'repos', debit: 0 };
      // Couleur du tube et des particules
      if (ligne.type !== etat.type) {
        ligne.type = etat.type;
        const coul = COULEURS[etat.type];
        ligne.materiau.color.setHex(coul);
        ligne.materiau.opacity = etat.type === 'repos' ? 0.28 : 0.4;
        ligne.matPart.color.setHex(coul);
      }
      // Vitesse des particules proportionnelle au débit (3,5 unités/s au débit nominal)
      const v = (etat.debit / CARAC.QNOM) * 3.5;
      ligne.decalage = (ligne.decalage + (v * dt) / ligne.longueur) % 1;
      if (ligne.decalage < 0) ligne.decalage += 1;
      const ech = ligne.echantillons, nE = ech.length - 1;
      const taille = etat.type === 'repos' ? 0.7 : 1;
      // Bulles en cas de cavitation dans l'aspiration
      const cav = id === 'aspiration' && sim.res.cavitation;
      for (let i = 0; i < ligne.nb; i++) {
        let u = (i / ligne.nb + ligne.decalage) % 1;
        const f = u * nE, k = Math.floor(f), fr = f - k;
        const a = ech[k], b = ech[Math.min(nE, k + 1)];
        pos.set(a.x + (b.x - a.x) * fr, a.y + (b.y - a.y) * fr, a.z + (b.z - a.z) * fr);
        let e = taille;
        if (cav && i % 3 === 0) e = 1.4 + 0.4 * Math.sin(sim.temps * 20 + i);
        s.set(e, e, e);
        m.compose(pos, q, s);
        ligne.particules.setMatrixAt(i, m);
      }
      ligne.particules.instanceMatrix.needsUpdate = true;
    }
  }

  _majFuite(sim, dt) {
    const fuite = sim.pannes.fuite;
    this.gouttes.visible = fuite;
    if (fuite) {
      const intensite = Math.min(1, 0.25 + sim.res.Qfuite / 2);
      const ph = this.gouttes.userData.phases;
      const m = this._mat4, pos = this._vec, q = this._quat, s = this._echelle;
      q.identity();
      const hauteur = 5.85;
      for (let i = 0; i < ph.length; i++) {
        ph[i] = (ph[i] + dt * (0.35 + 0.6 * intensite)) % 1;
        const u = ph[i];
        // Chute accélérée (gravité) depuis le raccord A
        pos.set(2.5 + 0.05 * Math.sin(i * 7.1), hauteur - hauteur * u * u, 0.12 * Math.cos(i * 3.3));
        const e = i / ph.length < intensite ? 1 : 0;
        s.set(e, e * 1.3, e);
        m.compose(pos, q, s);
        this.gouttes.setMatrixAt(i, m);
      }
      this.gouttes.instanceMatrix.needsUpdate = true;
      this.tailleFlaque = Math.min(1.3, this.tailleFlaque + dt * 0.02 * (0.3 + intensite));
    } else {
      this.tailleFlaque = Math.max(0, this.tailleFlaque - dt * 0.5);
    }
    this.flaque.visible = this.tailleFlaque > 0.01;
    this.flaque.scale.set(this.tailleFlaque, this.tailleFlaque, 1);
  }

  /* Rendu + adaptation automatique de la qualité si le téléphone peine */
  rendre(dtReel) {
    this.renderer.render(this.scene, this.camera);
    // On ignore les 2 premières secondes (compilation des shaders)
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
    if (this.qualite === 1) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    } else if (this.qualite === 0) {
      this.renderer.setPixelRatio(1);
      this.soleil.castShadow = false;
      this.renderer.shadowMap.enabled = false;
      this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    }
    this.redimensionner();
  }
}
