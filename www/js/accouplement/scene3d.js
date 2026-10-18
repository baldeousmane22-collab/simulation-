/* =====================================================================
   accouplement/scene3d.js — Scène 3D du banc moteur + réducteur (Three.js)
   ---------------------------------------------------------------------
   Repère : 1 unité ≈ 10 cm. L'axe X suit la ligne d'arbres (moteur à
   gauche, réducteur puis frein de charge à droite), Y est vertical, Z
   vient vers l'opérateur. Le plan de l'accouplement est en x = 0.
   Les défauts d'alignement sont exagérés (× 40) pour être visibles et
   les rotations sont ralenties pour que l'œil puisse les suivre.
   ===================================================================== */

import * as THREE from '../../vendor/three.min.js';
import { OrbitControls, RoomEnvironment } from '../../vendor/three.min.js';
import { CARAC } from './simulation.js';

export const EXAGERATION = 40;   // amplification visuelle du désalignement
export const RALENTI = 0.08;     // facteur de ralenti des rotations affichées
const Y0 = 1.42;                 // hauteur de la ligne d'arbres
const SOCLE = 0.4;               // dessus du socle
const X_PATTE_AV = -CARAC.L_AVANT / 100, X_PATTE_AR = -CARAC.L_ARRIERE / 100;
const Z_PATTE = 0.72;
const DIR_PORTRAIT = new THREE.Vector3(0.9, 0.75, 1.25).normalize();
const DIR_PAYSAGE = new THREE.Vector3(0.45, 0.45, 1).normalize();

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
/* Cylindre d'axe X (entre x0 et x1) */
function cylX(r, x0, x1, seg = 32, r2 = r) {
  const g = new THREE.CylinderGeometry(r2, r, Math.abs(x1 - x0), seg);
  g.rotateZ(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, 0);
  return g;
}
/* Secteur d'anneau extrudé selon X (crabots, branches de l'étoile) */
function secteur(r0, r1, a0, a1, x0, x1) {
  const f = new THREE.Shape();
  f.absarc(0, 0, r1, a0, a1, false);
  f.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
  f.absarc(0, 0, r0, a1, a0, true);
  f.closePath();
  const g = new THREE.ExtrudeGeometry(f, { depth: Math.abs(x1 - x0), bevelEnabled: false, curveSegments: 8 });
  // Extrusion selon Z → on la couche selon X ; (u, v) du profil → (z, y)
  g.rotateY(Math.PI / 2);
  g.translate(Math.min(x0, x1), 0, 0);
  return g;
}
/* Engrenage droit d'axe X (profil simplifié) */
function engrenage(nbDents, rExt, rPied, epaisseur, x) {
  const f = new THREE.Shape();
  const pas = (Math.PI * 2) / nbDents;
  for (let i = 0; i < nbDents; i++) {
    const a = i * pas;
    [[rPied, a], [rExt, a + pas * 0.18], [rExt, a + pas * 0.42], [rPied, a + pas * 0.6]].forEach(([r, ang], k) => {
      const px = Math.cos(ang) * r, py = Math.sin(ang) * r;
      if (i === 0 && k === 0) f.moveTo(px, py); else f.lineTo(px, py);
    });
  }
  f.closePath();
  const g = new THREE.ExtrudeGeometry(f, { depth: epaisseur, bevelEnabled: false, curveSegments: 4 });
  g.rotateY(Math.PI / 2);
  g.translate(x - epaisseur / 2, 0, 0);
  return g;
}
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

/* ---------------------------------------------------------------------
   Classe SceneAccouplement
   --------------------------------------------------------------------- */
export class SceneAccouplement {
  constructor(canvas, surSelection) {
    this.canvas = canvas;
    this.surSelection = surSelection;
    this.composants = {};
    this.etiquettes = [];
    this.anim = null;
    this.qualite = 2;
    this.tempsImages = [];
    this.aMoteur = 0; this.aSortie = 0;   // angles affichés (ralentis)
    this.thetaMesure = 0;                  // angle des comparateurs (rad)
    this._initRendu();
    this._construireDecor();
    this._construireMoteur();
    this._construireAccouplement();
    this._construireReducteur();
    this._construireCharge();
    this._construireVariateur();
    this._construireComparateurs();
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
    s.left = -10; s.right = 10; s.top = 8; s.bottom = -6; s.near = 1; s.far = 40;
    soleil.shadow.bias = -0.0008;
    this.scene.add(soleil, soleil.target);
    this.soleil = soleil;
    this._mat = {
      acier: mat(0xb8c0c8, 0.85, 0.3), acierFonce: mat(0x5b6570, 0.7, 0.4),
      noir: mat(0x22262b, 0.3, 0.6), bleu: mat(0x2563a6, 0.45, 0.4),
      gris: mat(0x6b7f73, 0.5, 0.45), socle: mat(0x4b5563, 0.6, 0.45),
      cale: mat(0xd6c38a, 0.85, 0.3)
    };
  }

  _groupe(id, parent = this.scene) {
    const g = new THREE.Group();
    g.userData.compId = id;
    this.composants[id] = g;
    parent.add(g);
    return g;
  }

  /* -------------------- Sol, socle, cales, vis ---------------------- */
  _construireDecor() {
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), mat(0xc9d1d9, 0, 0.9));
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    this.scene.add(sol);
    const grille = new THREE.GridHelper(60, 60, 0xaab4bf, 0xb9c2cc);
    grille.position.y = 0.002;
    grille.material.transparent = true; grille.material.opacity = 0.5;
    this.scene.add(grille);

    const g = this._groupe('socle');
    const M = this._mat;
    // Socle mécano-soudé : deux longerons en U + traverses + semelles
    for (const z of [-0.85, 0.85]) {
      ajout(g, new THREE.BoxGeometry(10.6, 0.36, 0.5), M.socle, -0.1, 0.2, z);
    }
    for (const x of [-5.1, -2.9, 0.0, 2.2, 4.9]) ajout(g, new THREE.BoxGeometry(0.3, 0.3, 1.3), M.socle, x, 0.17, 0);
    // Plateaux d'appui usinés sous les pattes du moteur et du réducteur
    for (const x of [X_PATTE_AV, X_PATTE_AR]) for (const z of [-Z_PATTE, Z_PATTE]) {
      ajout(g, new THREE.BoxGeometry(0.7, 0.04, 0.55), mat(0x9aa3ad, 0.8, 0.3), x, SOCLE - 0.02, z);
    }
    // Cales pelables (hauteur ajustée à chaque image sous les pattes)
    this.cales = [];
    for (const x of [X_PATTE_AV, X_PATTE_AR]) for (const z of [-Z_PATTE, Z_PATTE]) {
      const geo = new THREE.BoxGeometry(0.5, 1, 0.4);
      geo.translate(0, 0.5, 0);
      const c = ajout(g, geo, M.cale, x, SOCLE, z);
      c.userData.x = x; c.userData.z = z;
      this.cales.push(c);
    }
    // Vis de poussée latérales (côté arrière du socle)
    for (const x of [X_PATTE_AV, X_PATTE_AR]) {
      ajout(g, new THREE.BoxGeometry(0.3, 0.35, 0.2), M.socle, x, SOCLE + 0.17, -1.25);
      ajout(g, cylX(0.04, -0.25, 0.25, 10).rotateY(Math.PI / 2), M.acier, x, SOCLE + 0.2, -1.12);
      ajout(g, new THREE.CylinderGeometry(0.08, 0.08, 0.08, 6).rotateX(Math.PI / 2), M.acierFonce, x, SOCLE + 0.2, -1.4);
    }
  }

  /* ----------------------------- Moteur ----------------------------- */
  _construireMoteur() {
    const M = this._mat;
    // Le groupe « moteur » a son origine au plan de l'accouplement, sur l'axe :
    // décalages et inclinaisons d'alignement s'appliquent autour de ce point.
    const g = this._groupe('moteur');
    g.position.set(0, Y0, 0);
    this.moteur = g;
    ajout(g, cylX(0.85, -4.25, -1.5, 40), M.bleu);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      if (Math.cos(a) < -0.8) continue;   // pas d'ailettes entre les pattes
      const ail = ajout(g, new THREE.BoxGeometry(2.6, 0.16, 0.05), M.bleu, -2.9, Math.cos(a) * 0.88, Math.sin(a) * 0.88);
      ail.rotation.x = a;
    }
    ajout(g, cylX(0.88, -1.62, -1.38, 40), M.bleu);                 // flasque avant
    ajout(g, cylX(0.86, -4.4, -4.2, 40), M.bleu);                   // flasque arrière
    ajout(g, cylX(0.82, -5.0, -4.4, 40), mat(0x1f2937, 0.5, 0.5));  // capot de ventilateur
    ajout(g, cylX(0.6, -5.03, -4.99, 32), mat(0x111827, 0.4, 0.7)); // grille
    ajout(g, new THREE.BoxGeometry(0.75, 0.38, 0.65), M.bleu, -2.7, 1.02, 0);   // boîte à bornes
    ajout(g, new THREE.BoxGeometry(0.75, 0.06, 0.7), mat(0x1d4ed8, 0.45, 0.4), -2.7, 1.23, 0);
    // Plaque signalétique
    ajout(g, new THREE.BoxGeometry(0.7, 0.32, 0.01), mat(0xe5e7eb, 0.6, 0.4), -2.4, 0.15, 0.87, false);
    // Pattes (dessous à −0,9 de l'axe)
    for (const x of [X_PATTE_AV, X_PATTE_AR]) for (const z of [-Z_PATTE, Z_PATTE]) {
      ajout(g, new THREE.BoxGeometry(0.55, 0.12, 0.45), M.bleu, x, -0.84, z);
      ajout(g, new THREE.BoxGeometry(0.35, 0.4, 0.14), M.bleu, x, -0.62, z * 0.85);
      ajout(g, new THREE.CylinderGeometry(0.07, 0.07, 0.08, 6), M.acierFonce, x, -0.74, z);
    }
    // Rotor visible : arbre + moyeu moteur (tournent)
    const rot = new THREE.Group();
    g.add(rot);
    this.rotorMoteur = rot;
    ajout(rot, cylX(0.12, -1.38, -0.5, 20), M.acier);
    // Clavette de l'arbre moteur (repère jaune : on voit l'arbre tourner)
    ajout(rot, new THREE.BoxGeometry(0.5, 0.05, 0.05), mat(0xfacc15, 0.3, 0.5), -0.95, 0.13, 0);
  }

  /* ------------------------ Accouplement ---------------------------- */
  _construireAccouplement() {
    const M = this._mat;
    const acierMoyeu = mat(0x9ca3af, 0.9, 0.28);
    // Moyeu moteur (suit le moteur) : corps + 3 crabots
    const hm = new THREE.Group();
    hm.userData.compId = 'accouplement';
    ajout(hm, cylX(0.5, -0.6, -0.14, 40), acierMoyeu);
    for (let k = 0; k < 3; k++) {
      const a = k * (Math.PI * 2 / 3);
      ajout(hm, secteur(0.2, 0.5, a, a + THREE.MathUtils.degToRad(50), -0.14, 0.12), acierMoyeu);
    }
    ajout(hm, new THREE.BoxGeometry(0.42, 0.04, 0.04), mat(0xffffff, 0.2, 0.5), -0.37, 0.5, 0, false);  // repère
    this.rotorMoteur.add(hm);
    this.moyeuMoteur = hm;

    // Moyeu réducteur, étoile et protection (fixes, sur l'axe du réducteur)
    const g = this._groupe('accouplement');
    g.position.set(0, Y0, 0);
    const hr = new THREE.Group();
    g.add(hr);
    ajout(hr, cylX(0.5, 0.14, 0.6, 40), acierMoyeu);
    for (let k = 0; k < 3; k++) {
      const a = k * (Math.PI * 2 / 3) + Math.PI / 3;
      ajout(hr, secteur(0.2, 0.5, a, a + THREE.MathUtils.degToRad(50), -0.12, 0.14), acierMoyeu);
    }
    ajout(hr, new THREE.BoxGeometry(0.42, 0.04, 0.04), mat(0xffffff, 0.2, 0.5), 0.37, 0.5, 0, false);
    this.moyeuReducteur = hr;
    // Étoile élastomère : 6 branches entre les crabots + anneau central
    const etoile = new THREE.Group();
    this.matEtoile = mat(0xf59e0b, 0.05, 0.75);
    for (let k = 0; k < 6; k++) {
      const a = THREE.MathUtils.degToRad(50) + k * Math.PI / 3;
      ajout(etoile, secteur(0.17, 0.47, a, a + THREE.MathUtils.degToRad(10), -0.12, 0.12), this.matEtoile, 0, 0, 0, false);
    }
    ajout(etoile, cylX(0.2, -0.12, 0.12, 24), this.matEtoile, 0, 0, 0, false);
    hr.add(etoile);
    this.etoile = etoile;
    // Carter de protection (demi-cylindre ajouré), déposé quand la machine est consignée
    const carter = this._groupe('carter');
    carter.position.set(0, Y0, 0);
    const geoC = new THREE.CylinderGeometry(0.78, 0.78, 1.7, 32, 1, true, -Math.PI / 2, Math.PI);
    geoC.rotateZ(-Math.PI / 2);
    geoC.rotateX(-Math.PI / 2);
    const coque = ajout(carter, geoC, mat(0xf97316, 0.2, 0.5, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), -0.15, 0, 0, false);
    coque.renderOrder = 3;
    ajout(carter, geoC, new THREE.MeshBasicMaterial({ color: 0x7c2d12, wireframe: true, transparent: true, opacity: 0.3 }), -0.15, 0, 0, false);
    for (const x of [-0.95, 0.65]) {
      ajout(carter, new THREE.BoxGeometry(0.06, 0.06, 1.56), mat(0xea580c, 0.3, 0.5), x, 0, 0);
      for (const z of [-0.76, 0.76]) ajout(carter, new THREE.BoxGeometry(0.06, Y0 - SOCLE, 0.06), mat(0xea580c, 0.3, 0.5), x, -(Y0 - SOCLE) / 2, z * 1.1);
    }
    this.carter = carter;
  }

  /* --------------------------- Réducteur ---------------------------- */
  _construireReducteur() {
    const M = this._mat;
    const g = this._groupe('reducteur');
    const gris = M.gris;
    const x0 = 0.85, x1 = 3.25, y0 = 0.55, y1 = 3.0, z = 0.85;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    // Carter : fond, côtés, dessus, dessous ; face avant transparente pour voir les engrenages
    ajout(g, new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.08), gris, cx, cy, -z);
    ajout(g, new THREE.BoxGeometry(0.1, y1 - y0, 2 * z), gris, x0, cy, 0);
    ajout(g, new THREE.BoxGeometry(0.1, y1 - y0, 2 * z), gris, x1, cy, 0);
    ajout(g, new THREE.BoxGeometry(x1 - x0 + 0.1, 0.1, 2 * z), gris, cx, y1, 0);
    ajout(g, new THREE.BoxGeometry(x1 - x0 + 0.1, 0.1, 2 * z), gris, cx, y0, 0);
    const vitre = ajout(g, new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.04), verre(0xe6f2ff, 0.16), cx, cy, z, false);
    vitre.renderOrder = 3;
    vitre.userData.vitre = true;
    for (const [w, h, px, py] of [[x1 - x0 + 0.1, 0.1, cx, y1], [x1 - x0 + 0.1, 0.1, cx, y0], [0.1, y1 - y0, x0, cy], [0.1, y1 - y0, x1, cy]]) {
      ajout(g, new THREE.BoxGeometry(w, h, 0.08), gris, px, py, z);
    }
    // Semelle de fixation, nervures, bouchons, voyant d'huile
    ajout(g, new THREE.BoxGeometry(x1 - x0 + 0.5, 0.15, 2 * z + 0.4), gris, cx, SOCLE + 0.075, 0);
    for (const px of [x0 + 0.1, x1 - 0.1]) for (const pz of [-z - 0.1, z + 0.1]) ajout(g, new THREE.CylinderGeometry(0.07, 0.07, 0.1, 6), M.acierFonce, px, SOCLE + 0.2, pz);
    ajout(g, cylX(0.36, 0.75, 0.86, 32), gris, 0, Y0, 0);           // chapeau de palier d'entrée
    ajout(g, cylX(0.36, 3.24, 3.36, 32), gris, 0, Y0, 0);           // chapeau de palier de sortie
    ajout(g, new THREE.CylinderGeometry(0.1, 0.12, 0.18, 12), mat(0xdc2626, 0.3, 0.5), 2.6, y1 + 0.12, 0.3);  // bouchon reniflard
    const voyant = ajout(g, new THREE.CylinderGeometry(0.16, 0.16, 0.04, 24).rotateX(Math.PI / 2), verre(0xffffff, 0.5), x1 - 0.35, 1.0, z + 0.03, false);
    voyant.renderOrder = 4;
    this.voyantY = 1.0;
    // Huile dans le carter (niveau visible par la vitre et le voyant)
    const geoH = new THREE.BoxGeometry(x1 - x0 - 0.12, 1, 2 * z - 0.12);
    geoH.translate(0, 0.5, 0);
    this.huile = ajout(g, geoH, new THREE.MeshStandardMaterial({ color: 0xd99a1c, transparent: true, opacity: 0.5, roughness: 0.15, depthWrite: false }), cx, y0 + 0.05, 0, false);
    this.huile.renderOrder = 1;
    this.huile.userData.vitre = true;
    // Arbres
    const yInt = Y0 + 0.8;
    this.arbreEntree = new THREE.Group(); this.arbreEntree.position.set(0, Y0, 0); g.add(this.arbreEntree);
    this.arbreInter = new THREE.Group(); this.arbreInter.position.set(0, yInt, 0); g.add(this.arbreInter);
    this.arbreSortie = new THREE.Group(); this.arbreSortie.position.set(0, Y0, 0); g.add(this.arbreSortie);
    ajout(this.arbreEntree, cylX(0.12, 0.55, 1.6, 20), M.acier);
    ajout(this.arbreInter, cylX(0.1, 0.95, 3.15, 16), M.acier);
    ajout(this.arbreSortie, cylX(0.16, 1.9, 4.75, 20), M.acier);
    // 1er étage : pignon d'entrée (10 dents) → roue (22 dents) ; 2e étage : pignon → roue de sortie
    const acierG = mat(0xd7dde3, 0.95, 0.22), bronze = mat(0xc5a35a, 0.9, 0.3);
    ajout(this.arbreEntree, engrenage(10, 0.27, 0.2, 0.3, 1.25), acierG, 0, 0, 0, false);
    ajout(this.arbreInter, engrenage(22, 0.55, 0.48, 0.3, 1.25), bronze, 0, 0, 0, false);
    ajout(this.arbreInter, engrenage(10, 0.27, 0.2, 0.36, 2.55), acierG, 0, 0, 0, false);
    ajout(this.arbreSortie, engrenage(22, 0.55, 0.48, 0.36, 2.55), bronze, 0, 0, 0, false);
    // Clavette visible sur l'arbre d'entrée (devient rouge si cisaillée)
    this.matClavette = mat(0x374151, 0.6, 0.4);
    ajout(this.arbreEntree, new THREE.BoxGeometry(0.4, 0.06, 0.06), this.matClavette, 0.38, 0.13, 0, false);
  }

  /* ------------------------ Frein de charge ------------------------- */
  _construireCharge() {
    const M = this._mat;
    const g = this._groupe('charge');
    // Palier support de l'arbre
    ajout(g, new THREE.BoxGeometry(0.5, Y0 - SOCLE - 0.2, 0.8), M.socle, 4.7, SOCLE + (Y0 - SOCLE - 0.2) / 2, 0);
    ajout(g, cylX(0.3, 4.48, 4.92, 24), M.acierFonce, 0, Y0, 0);
    // Disque (tourne avec l'arbre de sortie) avec repère blanc
    const disque = new THREE.Group();
    disque.position.set(0, Y0, 0);
    g.add(disque);
    this.matDisque = mat(0x9ca3af, 0.9, 0.35, { emissive: 0x000000 });
    ajout(disque, cylX(0.9, 3.95, 4.08, 48), this.matDisque);
    ajout(disque, cylX(0.35, 3.85, 4.18, 24), M.acierFonce);
    ajout(disque, new THREE.BoxGeometry(0.14, 0.5, 0.06), mat(0xffffff, 0.2, 0.5), 4.09, 0.6, 0, false);
    this.disque = disque;
    // Étrier de frein (fixe) sur une potence
    ajout(g, new THREE.BoxGeometry(0.45, 0.5, 0.32), mat(0xb91c1c, 0.4, 0.45), 4.01, Y0 + 0.78, 0);
    const hPot = Y0 + 1.12 - SOCLE;
    ajout(g, new THREE.BoxGeometry(0.2, hPot, 0.2), M.socle, 4.4, SOCLE + hPot / 2, -1.0);
    ajout(g, new THREE.BoxGeometry(0.45, 0.14, 1.1), M.socle, 4.2, Y0 + 1.05, -0.5);
  }

  /* -------------------------- Variateur ----------------------------- */
  _construireVariateur() {
    const g = this._groupe('variateur');
    ajout(g, new THREE.BoxGeometry(1.3, 2.0, 0.7), mat(0xe5e7eb, 0.3, 0.6), -6.8, 2.2, -0.6);
    ajout(g, new THREE.BoxGeometry(0.15, 1.2, 0.15), this._mat.socle, -7.2, 0.6, -0.6);
    ajout(g, new THREE.BoxGeometry(0.15, 1.2, 0.15), this._mat.socle, -6.4, 0.6, -0.6);
    ajout(g, new THREE.BoxGeometry(1.0, 0.1, 0.6), this._mat.socle, -6.8, 0.05, -0.6);
    // Écran (texture mise à jour quelques fois par seconde)
    const c = document.createElement('canvas');
    c.width = 256; c.height = 160;
    this.canvasEcran = c;
    this.texEcran = new THREE.CanvasTexture(c);
    this.texEcran.colorSpace = THREE.SRGBColorSpace;
    const ecran = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56), new THREE.MeshBasicMaterial({ map: this.texEcran, toneMapped: false }));
    ecran.position.set(-6.8, 2.6, -0.24);
    g.add(ecran);
    ajout(g, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 20).rotateX(Math.PI / 2), mat(0x16a34a, 0.2, 0.5), -7.05, 1.85, -0.23);
    ajout(g, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 20).rotateX(Math.PI / 2), mat(0xdc2626, 0.2, 0.5), -6.55, 1.85, -0.23);
    // Câble vers la boîte à bornes du moteur
    const courbe = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6.8, 1.2, -0.6), new THREE.Vector3(-6.0, 0.06, -0.5),
      new THREE.Vector3(-4.0, 0.06, -0.3), new THREE.Vector3(-2.9, 2.0, -0.2), new THREE.Vector3(-2.7, Y0 + 1.15, -0.2)
    ]);
    ajout(this.scene, new THREE.TubeGeometry(courbe, 40, 0.05, 8, false), this._mat.noir);
    this._dessinerEcran({ f: 0, n: 0, I: 0, etat: 'STOP' });
  }

  _dessinerEcran(e) {
    const x = this.canvasEcran.getContext('2d');
    x.fillStyle = '#0b1f14'; x.fillRect(0, 0, 256, 160);
    x.fillStyle = e.etat === 'OL' ? '#f87171' : '#4ade80';
    x.font = 'bold 54px monospace';
    x.textAlign = 'right';
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

  /* ------------------------- Comparateurs --------------------------- */
  _texCadran() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#fbfbf7'; x.beginPath(); x.arc(128, 128, 124, 0, Math.PI * 2); x.fill();
    x.lineWidth = 6; x.strokeStyle = '#222'; x.stroke();
    x.strokeStyle = '#111';
    for (let i = 0; i < 100; i++) {
      const a = i / 100 * Math.PI * 2 - Math.PI / 2;
      const l = i % 10 === 0 ? 22 : i % 5 === 0 ? 15 : 9;
      x.lineWidth = i % 10 === 0 ? 3 : 1.5;
      x.beginPath(); x.moveTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118);
      x.lineTo(128 + Math.cos(a) * (118 - l), 128 + Math.sin(a) * (118 - l)); x.stroke();
    }
    x.fillStyle = '#111'; x.font = 'bold 20px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let v = 0; v < 100; v += 20) {
      const a = v / 100 * Math.PI * 2 - Math.PI / 2;
      x.fillText(String(v), 128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80);
    }
    x.font = '14px Arial'; x.fillText('0,01 mm', 128, 170);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* Un comparateur : boîtier rond + aiguille, cadran orienté selon « normale » */
  _comparateur(parent, tex) {
    const g = new THREE.Group();
    parent.add(g);
    const corps = new THREE.CylinderGeometry(0.2, 0.2, 0.09, 32);
    ajout(g, corps, mat(0xd1d5db, 0.85, 0.3), 0, 0, 0, false);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.18, 32), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.047;
    g.add(face);
    const aiguille = new THREE.Group();
    aiguille.position.y = 0.05;
    const tige = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.16), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    tige.position.z = -0.07;
    aiguille.add(tige);
    g.add(aiguille);
    return { groupe: g, aiguille };
  }

  _construireComparateurs() {
    const g = this._groupe('comparateur');
    g.position.set(0, Y0, 0);
    const bras = new THREE.Group();     // tourne avec les arbres (angle de mesure)
    g.add(bras);
    this.brasComparateur = bras;
    const alu = mat(0x9ca3af, 0.8, 0.35), noir = this._mat.noir;
    // Collier sur le moyeu du réducteur + tige radiale + barre axiale
    ajout(bras, cylX(0.53, 0.3, 0.5, 32), noir, 0, 0, 0, false);
    ajout(bras, new THREE.BoxGeometry(0.08, 0.5, 0.08), alu, 0.4, 0.78, 0, false);
    ajout(bras, new THREE.BoxGeometry(0.95, 0.07, 0.07), alu, -0.05, 1.02, 0, false);
    const tex = this._texCadran();
    // Comparateur radial au-dessus du moyeu moteur (palpeur vertical)
    const rad = this._comparateur(bras, tex);
    rad.groupe.position.set(-0.4, 0.86, 0.0);
    rad.groupe.rotation.x = Math.PI / 2;  // cadran face à l'opérateur (+Z)
    ajout(bras, new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), alu, -0.4, 0.62, 0, false);
    this.aiguilleRadiale = rad.aiguille;
    // Comparateur de face (palpeur axial sur la face du moyeu moteur)
    const fac = this._comparateur(bras, tex);
    fac.groupe.position.set(0.12, 0.72, 0.0);
    fac.groupe.rotation.x = Math.PI / 2;
    ajout(bras, cylX(0.018, -0.14, 0.05, 8), alu, 0, 0.47, 0, false);
    ajout(bras, new THREE.BoxGeometry(0.05, 0.3, 0.05), alu, 0.08, 0.6, 0, false);
    this.aiguilleFace = fac.aiguille;
    g.visible = false;
    this.comparateurs = g;
  }

  /* --------------------------- Étiquettes --------------------------- */
  _construireEtiquettes() {
    const noms = [
      ['moteur', 'Moteur asynchrone', new THREE.Vector3(-2.9, Y0 + 1.65, 0)],
      ['reducteur', 'Réducteur', new THREE.Vector3(2.05, 3.45, 0)],
      ['accouplement', 'Accouplement élastique', new THREE.Vector3(0, Y0 - 0.95, 1.2)],
      ['charge', 'Frein de charge', new THREE.Vector3(4.3, Y0 + 1.6, 0)],
      ['variateur', 'Variateur', new THREE.Vector3(-6.8, 3.55, -0.6)],
      ['socle', 'Cales / socle', new THREE.Vector3(-3, 0.25, 1.4)],
      ['carter', 'Carter de protection', new THREE.Vector3(-0.1, Y0 + 1.05, 0.3)],
      ['comparateur', 'Comparateurs', new THREE.Vector3(-0.2, Y0 + 1.55, 0.3)]
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
      const comp = this.composants[sp.userData.compId];
      if (comp && !comp.visible) { sp.visible = false; continue; }
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
    if (!hits.length) hits = this.raycaster.intersectObjects(Object.values(this.composants).filter(g => g.visible), true);
    for (const h of hits) {
      if (h.object.userData.vitre) continue;
      let o = h.object;
      while (o && !o.userData.compId) o = o.parent;
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
      if (!g || !g.visible) continue;
      const boite = new THREE.Box3().setFromObject(g);
      if (id === 'accouplement') boite.union(new THREE.Box3().setFromObject(this.moyeuMoteur));
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
      const boite = new THREE.Box3(), points = [];
      for (const [id, g] of Object.entries(this.composants)) {
        if (id === 'comparateur') continue;
        const b = new THREE.Box3().setFromObject(g);
        if (id === 'socle') { b.min.z = Math.max(b.min.z, -1.3); }
        boite.union(b);
        points.push(...coinsBoite(b));
      }
      this.volumeBanc = { boite, points };
    }
    this._cadrer(this.volumeBanc.boite, immediat, this.volumeBanc.points);
  }

  /* Vue rapprochée de l'accouplement (alignement) ou de composants */
  focaliser(ids) {
    const b = new THREE.Box3();
    for (const id of ids) {
      const g = this.composants[id];
      if (!g) continue;
      const vis = g.visible;
      g.visible = true;
      b.union(new THREE.Box3().setFromObject(g));
      g.visible = vis;
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
  maj(sim, dt, etatUI = {}) {
    const r = sim.res;
    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.duree);
      const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
      this.camera.position.lerpVectors(a.p0, a.p1, e);
      this.controls.target.lerpVectors(a.c0, a.c1, e);
      if (a.t >= 1) this.anim = null;
    }

    // Rotations (ralenties) ; machine consignée : les arbres suivent l'angle de mesure
    const w2r = Math.PI / 30;
    this.aMoteur += sim.n * w2r * dt * RALENTI;
    this.aSortie += sim.nSortie * w2r * dt * RALENTI;
    this.thetaMesure = etatUI.thetaMesure ?? 0;
    const consigne = sim.consigne;
    const aM = consigne ? this.thetaMesure : this.aMoteur;
    const aS = consigne ? this.thetaMesure / sim.cmd.rapport : this.aSortie;
    this.rotorMoteur.rotation.x = aM;
    // Étoile usée : jeu entre les crabots (le moyeu réducteur « bat »)
    let jeu = 0;
    if (r.elastoHS && Math.abs(sim.n) > 5) jeu = 0.12 * Math.sin(sim.temps * 9) + 0.25 * sim.choc;
    this.moyeuReducteur.rotation.x = aM - jeu;
    this.matEtoile.color.setHex(r.elastoHS ? 0x57381c : sim.usure > 0.5 ? 0xb45309 : 0xf59e0b);
    this.etoile.scale.set(1, r.elastoHS ? 0.82 : 1, r.elastoHS ? 0.82 : 1);
    // Arbres du réducteur (la clavette cisaillée découple le moyeu de l'arbre d'entrée)
    const i = sim.cmd.rapport;
    const aEntree = sim.pannes.clavette ? aS * i : aM;
    this.arbreEntree.rotation.x = aEntree;
    this.arbreInter.rotation.x = -aEntree * (10 / 22) + 0.14;
    this.arbreSortie.rotation.x = aS;
    this.disque.rotation.x = aS;
    this.matClavette.color.setHex(sim.pannes.clavette ? 0xdc2626 : 0x374151);

    // Alignement exagéré : position et inclinaison du moteur, cales sous les pattes
    const d = sim.defauts();
    const E = EXAGERATION / 100;            // mm → unités (×40)
    let vib = 0;
    if (Math.abs(sim.n) > 5) vib = Math.min(0.03, 0.0035 * r.vibration);
    const bruit = () => (Math.random() - 0.5) * vib;
    this.moteur.position.set(bruit(), Y0 + d.dv * E + bruit(), d.dh * E + bruit());
    this.moteur.rotation.set(0, d.ah / 100 * EXAGERATION, -d.av / 100 * EXAGERATION);
    this.moteur.updateMatrixWorld(true);
    const p = this._vec || (this._vec = new THREE.Vector3());
    for (const c of this.cales) {
      p.set(c.userData.x, -0.9, c.userData.z).applyMatrix4(this.moteur.matrixWorld);
      c.scale.y = Math.max(0.01, p.y - SOCLE);
      c.position.x = p.x; c.position.z = p.z;
    }
    // Huile du réducteur
    this.huile.scale.y = sim.pannes.huile ? 0.18 : 0.62;
    // Disque de frein : rougeoie avec la puissance dissipée
    const chaud = Math.min(1, r.puissanceSortie / 1500);
    this.matDisque.emissive.setRGB(0.6 * chaud, 0.12 * chaud, 0);
    // Carter déposé et comparateurs installés quand la machine est consignée
    this.carter.visible = !consigne;
    this.comparateurs.visible = consigne;
    this.brasComparateur.rotation.x = this.thetaMesure;
    const lec = sim.lecture(this.thetaMesure * 180 / Math.PI);
    this.aiguilleRadiale.rotation.y = -lec.radial * Math.PI * 2;
    this.aiguilleFace.rotation.y = -lec.face * Math.PI * 2;

    // Écran du variateur (5 fois par seconde)
    this._tEcran = (this._tEcran || 0) + dt;
    if (this._tEcran > 0.2) {
      this._tEcran = 0;
      const etat = sim.declenche ? 'OL' : consigne ? 'LOCK' : sim.cmd.marche ? (sim.cmd.sens > 0 ? 'FWD' : 'REV') : 'STOP';
      this._dessinerEcran({ f: Math.abs(sim.f), n: Math.abs(sim.n), I: r.intensite, etat });
    }
    if (this.idsSelection && this.idsSelection.length && this._selVisible !== consigne) {
      this._selVisible = consigne;
      this.selectionner(this.idsSelection);
    }
    this.controls.update();
    this._majEtiquettes();
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
