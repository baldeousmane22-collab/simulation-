/* =====================================================================
   scene3d.js — Banc hydraulique réaliste en 3D (Three.js)
   ---------------------------------------------------------------------
   Repère : 1 unité = 10 cm, sol en y = 0, face avant vers +z.
   À gauche : centrale (réservoir 40 L, moteur électrique, lanterne +
   accouplement, pompe à engrenages, bloc limiteur + manomètre, filtre de
   retour, refroidisseur air/huile). Au centre : distributeur 4/3 à
   électroaimants sur son embase, réducteur de débit unidirectionnel.
   À droite : vérin à tirants ISO 6020 vertical, plateau guidé par deux
   colonnes, masses en plaques d'acier (100 kg par plaque).
   « Vue en coupe » : carters transparents (pignons de la pompe, tiroir
   du distributeur, clapet du limiteur, piston et chambres du vérin).
   « Voir l'huile » : flexibles transparents, huile colorée selon la
   pression et chevrons qui défilent dans le sens et à la vitesse du débit.
   ===================================================================== */

import * as THREE from '../vendor/three.min.js';
import { OrbitControls, RoomEnvironment } from '../vendor/three.min.js';

const P_MAX_COULEUR = 160;   // bar : rouge

function mat(couleur, metal = 0.2, rugo = 0.5, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: couleur, metalness: metal, roughness: rugo, ...extra });
}
/* Couleur de l'huile selon la pression (bleu → vert → jaune → rouge). */
export function couleurPression(p, cible = new THREE.Color()) {
  const k = Math.min(Math.max(p / P_MAX_COULEUR, 0), 1);
  return cible.setHSL((220 - 220 * k) / 360, 0.85, 0.5);
}

/* Profil d'un pignon (ExtrudeGeometry, axe z). */
function geoPignon(nDents, rTete, rPied, ep) {
  const sh = new THREE.Shape();
  const pasA = Math.PI * 2 / nDents;
  for (let i = 0; i < nDents; i++) {
    const a = i * pasA;
    const pts = [[a, rPied], [a + pasA * 0.18, rTete], [a + pasA * 0.42, rTete], [a + pasA * 0.6, rPied]];
    pts.forEach(([ang, r], j) => {
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0 && j === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
    });
  }
  sh.closePath();
  const trou = new THREE.Path(); trou.absarc(0, 0, rPied * 0.3, 0, Math.PI * 2, true); sh.holes.push(trou);
  const g = new THREE.ExtrudeGeometry(sh, { depth: ep, bevelEnabled: false });
  g.translate(0, 0, -ep / 2);
  return g;
}

/* Cadran de manomètre (texture canvas). */
function texCadran(max, titre, pas, sousPas, rouge) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#f8f8f4'; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
  const ang = (v) => (-225 + 270 * (v / max)) * Math.PI / 180;
  if (rouge != null) {
    g.strokeStyle = '#d42020'; g.lineWidth = 16; g.beginPath(); g.arc(256, 256, 200, ang(rouge), ang(max)); g.stroke();
  }
  g.strokeStyle = '#111'; g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let v = 0; v <= max + 1e-6; v += sousPas) {
    const a = ang(v), maj = Math.abs(v / pas - Math.round(v / pas)) < 1e-6;
    const r1 = maj ? 178 : 192;
    g.lineWidth = maj ? 5 : 2;
    g.beginPath(); g.moveTo(256 + Math.cos(a) * r1, 256 + Math.sin(a) * r1); g.lineTo(256 + Math.cos(a) * 210, 256 + Math.sin(a) * 210); g.stroke();
    if (maj) { g.font = 'bold 38px Arial'; g.fillText(String(Math.round(v * 10) / 10), 256 + Math.cos(a) * 145, 256 + Math.sin(a) * 145); }
  }
  g.font = 'bold 40px Arial'; g.fillText('bar', 256, 345);
  g.font = '24px Arial'; g.fillStyle = '#444'; g.fillText(titre, 256, 170); g.fillText('Cl. 1,6  ⌀100', 256, 392);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/* Texture des chevrons qui défilent dans les flexibles. */
function texChevrons() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 32);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillStyle = '#9a9a9a';
  for (let i = 0; i < 4; i++) {
    const x = i * 64 + 18;
    g.beginPath(); g.moveTo(x, 4); g.lineTo(x + 18, 16); g.lineTo(x, 28); g.lineTo(x + 8, 28); g.lineTo(x + 26, 16); g.lineTo(x + 8, 4); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Texture du sol (béton d'atelier). */
function texSol() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#8d9096'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = 120 + Math.random() * 40 | 0;
    g.fillStyle = `rgba(${v},${v},${v + 4},0.25)`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  g.strokeStyle = 'rgba(60,60,60,0.35)'; g.lineWidth = 3; g.strokeRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class SceneHydraulique {
  constructor(canvas, conteneurEtiquettes) {
    this.canvas = canvas;
    this.conteneurEtiquettes = conteneurEtiquettes;
    this.coupe = false; this.huile = false; this.etiquettesVisibles = true;
    this.surSelection = null;
    this.enveloppes = [];      // matériaux rendus transparents en vue en coupe
    this.interieurs = [];      // objets visibles seulement en vue en coupe
    this.flexibles = [];
    this.etiquettes = [];
    this.selectionnables = [];
    this.aigs = {};
    this.angPompe = 0; this.angVentil = 0;
    this._c = new THREE.Color();
    this._initRendu();
    this._construireAtelier();
    this._construireCentrale();
    this._construireDistributeur();
    this._construireVerin();
    this._construireFlexibles();
    this._construireEtiquettes();
    this._initInteraction();
    this.redimensionner();
    this.recentrer(true);
  }

  /* ----------------------------- Rendu ------------------------------ */
  _initRendu() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x20262e);
    this.scene.fog = new THREE.Fog(0x20262e, 70, 140);
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
    const ctl = new OrbitControls(this.camera, this.canvas);
    ctl.enableDamping = true; ctl.dampingFactor = 0.1;
    ctl.minDistance = 3; ctl.maxDistance = 75;
    ctl.maxPolarAngle = Math.PI * 0.49;
    ctl.screenSpacePanning = true;
    ctl.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    ctl.addEventListener('start', () => { this.anim = null; });
    this.controls = ctl;
    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3530, 0.55));
    const soleil = new THREE.DirectionalLight(0xfff4e6, 2.2);
    soleil.position.set(8, 26, 18);
    soleil.castShadow = true;
    soleil.shadow.mapSize.set(2048, 2048);
    Object.assign(soleil.shadow.camera, { left: -16, right: 16, top: 22, bottom: -4, near: 2, far: 70 });
    soleil.shadow.bias = -0.0005; soleil.shadow.normalBias = 0.03;
    soleil.target.position.set(0, 4, 0);
    this.scene.add(soleil, soleil.target);
    const appoint = new THREE.DirectionalLight(0xc8d8ff, 0.5);
    appoint.position.set(-14, 10, -10);
    this.scene.add(appoint);

    this.m = {
      peinture: mat(0x2f5d7c, 0.35, 0.45), moteur: mat(0x3e5468, 0.4, 0.5),
      alu: mat(0xc4cad1, 0.85, 0.32), fonte: mat(0x59626c, 0.6, 0.55), acier: mat(0xd9dee4, 1.0, 0.18),
      chrome: mat(0xf2f4f7, 1.0, 0.06), noir: mat(0x1c1e21, 0.2, 0.62), caoutchouc: mat(0x151617, 0.0, 0.78),
      laiton: mat(0xc9a43b, 0.95, 0.28), jaune: mat(0xf2b705, 0.2, 0.45), rouge: mat(0xb81d1d, 0.3, 0.45),
      orange: mat(0xe8730c, 0.1, 0.6), gris: mat(0x8a929b, 0.5, 0.5), masse: mat(0x3c4147, 0.7, 0.42),
      verre: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 0.9, transparent: true, opacity: 0.25 }),
      huile: mat(0xc98a1b, 0.1, 0.15, { transparent: true, opacity: 0.85 })
    };
  }

  /* Ajoute un maillage (ombres activées). */
  _maillage(geo, materiau, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, materiau);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    (parent || this.scene).add(m);
    return m;
  }
  /* Matériau d'enveloppe : propre à l'objet, rendu transparent en coupe. */
  _env(materiau) {
    const m = materiau.clone();
    this.enveloppes.push(m);
    return m;
  }
  _interieur(obj) { obj.visible = false; this.interieurs.push(obj); return obj; }
  _selection(obj, nom) { obj.traverse((o) => { if (o.isMesh) o.userData.composant = nom; }); this.selectionnables.push(obj); }

  /* --------------------------- Atelier ------------------------------ */
  _construireAtelier() {
    const sol = this._maillage(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ map: texSol(), roughness: 0.9, metalness: 0 }));
    sol.rotation.x = -Math.PI / 2; sol.castShadow = false;
    // bande de sécurité jaune/noir autour du vérin
    const bande = this._maillage(new THREE.RingGeometry(5.0, 5.35, 4, 1), mat(0xf2b705, 0, 0.7), null, 7, 0.01, 0);
    bande.rotation.x = -Math.PI / 2; bande.rotation.z = Math.PI / 4; bande.castShadow = false;
    // mur de fond
    const mur = this._maillage(new THREE.PlaneGeometry(140, 40), mat(0x3a424c, 0, 0.95), null, 0, 20, -14);
    mur.castShadow = false; mur.receiveShadow = false;
  }

  /* --------------------------- Centrale ----------------------------- */
  _construireCentrale() {
    const M = this.m, gc = new THREE.Group(); this.scene.add(gc);
    // Réservoir
    const res = new THREE.Group(); gc.add(res);
    const matRes = this._env(M.peinture);
    this._maillage(new THREE.BoxGeometry(7, 4.4, 4.5), matRes, res, -7, 2.5, 0);
    this._maillage(new THREE.BoxGeometry(7.3, 0.14, 4.8), this._env(M.fonte), res, -7, 4.77, 0);
    for (const [x, z] of [[-10.2, 1.9], [-3.8, 1.9], [-10.2, -1.9], [-3.8, -1.9]]) this._maillage(new THREE.BoxGeometry(0.4, 0.3, 0.4), M.noir, res, x, 0.15, z);
    // huile dans le réservoir (visible en coupe)
    this.huileReservoir = this._interieur(this._maillage(new THREE.BoxGeometry(6.8, 3.2, 4.3), M.huile, res, -7, 1.9, 0));
    this._interieur(this._maillage(new THREE.BoxGeometry(0.06, 3.4, 4.3), M.fonte, res, -7.2, 2.2, 0));      // chicane
    const crepine = this._interieur(this._maillage(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 20), M.laiton, res, -6.1, 1.0, 0));
    crepine.castShadow = false;
    this._interieur(this._maillage(new THREE.CylinderGeometry(0.12, 0.12, 4.0, 12), M.acier, res, -6.1, 3.4, 0));
    // voyant de niveau + thermomètre sur la face avant
    this._maillage(new THREE.BoxGeometry(0.5, 2.2, 0.12), M.noir, res, -4.4, 2.6, 2.28);
    this._maillage(new THREE.BoxGeometry(0.28, 1.9, 0.06), M.verre, res, -4.4, 2.6, 2.36);
    this.niveauVoyant = this._maillage(new THREE.BoxGeometry(0.22, 1.4, 0.05), M.huile, res, -4.4, 2.35, 2.35);
    this.ecumeVoyant = this._maillage(new THREE.BoxGeometry(0.22, 0.25, 0.055), mat(0xf5f0e0, 0, 0.9), res, -4.4, 3.15, 2.355);
    this.ecumeVoyant.visible = false;
    // plaque signalétique
    const plaque = document.createElement('canvas'); plaque.width = 256; plaque.height = 128;
    const gp = plaque.getContext('2d');
    gp.fillStyle = '#d9dde2'; gp.fillRect(0, 0, 256, 128); gp.fillStyle = '#123';
    gp.font = 'bold 22px Arial'; gp.fillText('CENTRALE HYDRAULIQUE', 10, 30);
    gp.font = '18px Arial'; gp.fillText('40 L  •  ISO VG 46', 10, 60); gp.fillText('Pompe 10 cm³/tr  •  2,2 kW', 10, 86); gp.fillText('Pmax 160 bar  •  1450 tr/min', 10, 112);
    const tp = new THREE.CanvasTexture(plaque); tp.colorSpace = THREE.SRGBColorSpace;
    this._maillage(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshStandardMaterial({ map: tp, metalness: 0.5, roughness: 0.4 }), res, -8.2, 2.6, 2.26);
    this._selection(res, 'reservoir');

    // Moteur électrique (axe x)
    const mot = new THREE.Group(); gc.add(mot);
    const yAxe = 5.95;
    const corps = this._maillage(new THREE.CylinderGeometry(0.95, 0.95, 2.6, 40), M.moteur, mot, -8.9, yAxe, 0);
    corps.rotation.z = Math.PI / 2;
    for (let i = 0; i < 11; i++) {
      const ailette = this._maillage(new THREE.TorusGeometry(0.95, 0.07, 6, 40), M.moteur, mot, -10.0 + i * 0.22, yAxe, 0);
      ailette.rotation.y = Math.PI / 2;
    }
    const capot = this._maillage(new THREE.CylinderGeometry(0.9, 0.82, 0.7, 40), M.moteur, mot, -10.55, yAxe, 0); capot.rotation.z = Math.PI / 2;
    const grille = this._maillage(new THREE.CircleGeometry(0.8, 40), mat(0x111111, 0.4, 0.6, { side: THREE.DoubleSide }), mot, -10.91, yAxe, 0); grille.rotation.y = -Math.PI / 2;
    this._maillage(new THREE.BoxGeometry(0.8, 0.45, 0.7), M.moteur, mot, -8.9, yAxe + 1.12, 0);     // boîte à bornes
    this._maillage(new THREE.CylinderGeometry(0.1, 0.1, 0.25, 12), M.noir, mot, -8.9, yAxe + 1.0, 0.45).rotation.x = Math.PI / 2;
    for (const z of [-0.65, 0.65]) this._maillage(new THREE.BoxGeometry(2.0, 0.3, 0.35), M.moteur, mot, -8.9, 4.98, z);
    this.ventilateur = new THREE.Group(); this.ventilateur.position.set(-10.45, yAxe, 0); mot.add(this.ventilateur);
    for (let i = 0; i < 6; i++) {
      const pale = this._maillage(new THREE.BoxGeometry(0.04, 0.7, 0.2), M.noir, this.ventilateur, 0, 0, 0);
      pale.geometry.translate(0, 0.38, 0); pale.rotation.x = i * Math.PI / 3;
    }
    this._interieur(this.ventilateur);
    this.voyantMoteur = this._maillage(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshStandardMaterial({ color: 0x334433, emissive: 0x000000 }), mot, -8.6, yAxe + 1.36, 0);
    this._selection(mot, 'moteur');

    // Lanterne + accouplement élastique
    const lant = new THREE.Group(); gc.add(lant);
    for (const x of [-7.55, -6.65]) { const f = this._maillage(new THREE.CylinderGeometry(0.98, 0.98, 0.1, 40), M.alu, lant, x, yAxe, 0); f.rotation.z = Math.PI / 2; }
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      this._maillage(new THREE.BoxGeometry(0.9, 0.22, 0.22), M.alu, lant, -7.1, yAxe + Math.cos(a) * 0.86, Math.sin(a) * 0.86);
    }
    this.accouplement = new THREE.Group(); this.accouplement.position.set(-7.1, yAxe, 0); lant.add(this.accouplement);
    for (const [x, m] of [[-0.22, M.acier], [0, M.orange], [0.22, M.acier]]) {
      const c = this._maillage(new THREE.CylinderGeometry(0.38, 0.38, 0.2, 6), m, this.accouplement, x, 0, 0); c.rotation.z = Math.PI / 2;
    }
    this._selection(lant, 'accouplement');

    // Pompe à engrenages
    const pompe = new THREE.Group(); gc.add(pompe);
    this._maillage(new THREE.BoxGeometry(1.0, 1.25, 0.95), this._env(M.alu), pompe, -6.05, yAxe - 0.18, 0);
    this._maillage(new THREE.BoxGeometry(0.12, 1.3, 1.0), this._env(M.alu), pompe, -5.5, yAxe - 0.18, 0);
    this._maillage(new THREE.CylinderGeometry(0.17, 0.17, 0.35, 16), M.acier, pompe, -6.05, yAxe + 0.6, 0);  // orifice de refoulement
    this._maillage(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 16), M.acier, pompe, -6.05, 4.95, 0);         // aspiration
    this.pignons = [];
    const gp1 = geoPignon(10, 0.3, 0.23, 0.6);
    for (const [dy, sens] of [[0.0, 1], [-0.53, -1]]) {
      const p = this._maillage(gp1, M.acier, pompe, -6.05, yAxe + dy, 0);
      p.rotation.y = Math.PI / 2; p.userData.sens = sens;
      if (sens < 0) p.rotation.z = Math.PI / 10;
      this._interieur(p); this.pignons.push(p);
    }
    this._selection(pompe, 'pompe');

    // Bloc foré avec limiteur de pression et manomètre P
    const bloc = new THREE.Group(); gc.add(bloc);
    this._maillage(new THREE.BoxGeometry(1.3, 0.85, 1.1), this._env(M.alu), bloc, -4.3, 5.27, 0.2);
    this._maillage(new THREE.CylinderGeometry(0.28, 0.28, 0.55, 6), M.acier, bloc, -4.3, 5.97, 0.0);
    this._maillage(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16), M.acier, bloc, -4.3, 6.45, 0.0);
    this.boutonLimiteur = this._maillage(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 14), M.noir, bloc, -4.3, 6.82, 0.0);
    this._maillage(new THREE.BoxGeometry(0.08, 0.06, 0.62), M.jaune, this.boutonLimiteur, 0, 0.16, 0);
    // clapet et ressort (coupe)
    this.clapetLim = this._interieur(this._maillage(new THREE.ConeGeometry(0.14, 0.25, 16), M.acier, bloc, -4.3, 5.4, 0.0));
    this.clapetLim.rotation.x = Math.PI;
    const spires = [];
    for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 2 * 7; spires.push(new THREE.Vector3(Math.cos(a) * 0.13, i / 80, Math.sin(a) * 0.13)); }
    this.ressortLim = this._interieur(this._maillage(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spires), 200, 0.025, 6), M.laiton, bloc, -4.3, 5.55, 0.0));
    this._selection(bloc, 'limiteur');
    this.aigs.P = this._manometre(bloc, -4.3, 6.75, 1.05, 0.62, 250, 'Pompe P', 50, 10, 160);
    this._maillage(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 10), M.laiton, bloc, -4.3, 6.0, 0.9);

    // Filtre de retour, bouchon de remplissage
    const filtre = new THREE.Group(); gc.add(filtre);
    this._maillage(new THREE.CylinderGeometry(0.5, 0.5, 0.45, 28), M.alu, filtre, -9.3, 5.07, -1.55);
    this._maillage(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 28), M.noir, filtre, -9.3, 5.4, -1.55);
    this.indicColmatage = this._maillage(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12), mat(0x1f9d3a, 0.1, 0.4), filtre, -9.3, 5.55, -1.55);
    this._selection(filtre, 'filtre');
    this._maillage(new THREE.CylinderGeometry(0.3, 0.3, 0.35, 20), M.noir, gc, -5.0, 5.0, -1.6);

    // Refroidisseur air/huile (côté gauche)
    const ref = new THREE.Group(); gc.add(ref);
    this._maillage(new THREE.BoxGeometry(0.5, 3.3, 3.6), M.noir, ref, -10.85, 2.4, 0);
    for (let i = 0; i < 16; i++) this._maillage(new THREE.BoxGeometry(0.52, 0.05, 3.4), M.alu, ref, -10.86, 0.9 + i * 0.2, 0);
    this._maillage(new THREE.TorusGeometry(1.35, 0.08, 8, 40), M.noir, ref, -11.15, 2.4, 0).rotation.y = Math.PI / 2;
    this.helice = new THREE.Group(); this.helice.position.set(-11.2, 2.4, 0); ref.add(this.helice);
    for (let i = 0; i < 5; i++) {
      const pale = this._maillage(new THREE.BoxGeometry(0.03, 1.1, 0.42), M.gris, this.helice);
      pale.geometry.translate(0, 0.62, 0); pale.rotation.x = i * Math.PI * 2 / 5; pale.rotation.y = 0.35;
    }
    this._selection(ref, 'refroidisseur');
  }

  /* Manomètre à bain de glycérine (cadran face +z). */
  _manometre(parent, x, y, z, r, max, titre, pas, sousPas, rouge) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    const boitier = this._maillage(new THREE.CylinderGeometry(r * 1.06, r * 1.06, 0.3, 40), this.m.chrome, g, 0, 0, -0.1);
    boitier.rotation.x = Math.PI / 2;
    const face = this._maillage(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ map: texCadran(max, titre, pas, sousPas, rouge), roughness: 0.6 }), g, 0, 0, 0.06);
    face.castShadow = false;
    const aig = new THREE.Group(); aig.position.z = 0.09; g.add(aig);
    const lame = this._maillage(new THREE.BoxGeometry(0.035, r * 0.82, 0.02), mat(0x111111, 0.2, 0.4), aig);
    lame.geometry.translate(0, r * 0.32, 0); lame.castShadow = false;
    this._maillage(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), this.m.rouge, aig).rotation.x = Math.PI / 2;
    const verre = this._maillage(new THREE.CircleGeometry(r, 40), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.12, clearcoat: 1 }), g, 0, 0, 0.12);
    verre.castShadow = false;
    const lunette = this._maillage(new THREE.TorusGeometry(r * 1.03, 0.05, 10, 48), this.m.chrome, g, 0, 0, 0.1);
    lunette.castShadow = false;
    return { aig, max, val: 0 };
  }

  /* ------------------------ Distributeur 4/3 ------------------------ */
  _construireDistributeur() {
    const M = this.m, d = new THREE.Group(); this.scene.add(d);
    this._maillage(new THREE.BoxGeometry(1.6, 0.12, 1.6), M.fonte, d, 0, 0.06, 0);
    this._maillage(new THREE.BoxGeometry(0.4, 3.9, 0.4), M.peinture, d, 0, 2.0, 0);
    this._maillage(new THREE.BoxGeometry(1.9, 0.3, 1.4), M.fonte, d, 0, 4.1, 0);                     // embase
    this._maillage(new THREE.BoxGeometry(1.7, 1.0, 1.0), this._env(M.fonte), d, 0, 4.75, 0);         // corps
    for (const s of [-1, 1]) {
      this._maillage(new THREE.BoxGeometry(0.14, 0.95, 0.95), M.noir, d, s * 0.92, 4.75, 0);
      const bob = this._maillage(new THREE.CylinderGeometry(0.42, 0.42, 0.85, 28), M.noir, d, s * 1.42, 4.75, 0); bob.rotation.z = Math.PI / 2;
      this._maillage(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12), M.rouge, d, s * 1.92, 4.75, 0).rotation.z = Math.PI / 2;   // commande manuelle
      this._maillage(new THREE.BoxGeometry(0.6, 0.4, 0.6), M.gris, d, s * 1.42, 5.35, 0);                                        // connecteur DIN
      const led = this._maillage(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0x552200, emissive: 0x000000 }), d, s * 1.42, 5.55, 0.25);
      if (s < 0) this.ledB = led; else this.ledA = led;
      this._maillage(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 10), M.noir, d, s * 1.42, 5.9, -0.1);
    }
    // repères de bobines
    const etq = (txt, x) => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
      g.fillStyle = '#f2b705'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#111'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.fillText(txt, 32, 46);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      this._maillage(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshStandardMaterial({ map: t }), d, x, 4.75, 0.43).castShadow = false;
    };
    etq('Y1', 1.42); etq('Y2', -1.42);
    // tiroir (coupe)
    this.tiroir = this._interieur(new THREE.Group()); this.tiroir.position.set(0, 4.75, 0); d.add(this.tiroir);
    const axe = this._maillage(new THREE.CylinderGeometry(0.1, 0.1, 1.9, 16), M.chrome, this.tiroir); axe.rotation.z = Math.PI / 2;
    for (const x of [-0.6, -0.2, 0.2, 0.6]) { const p = this._maillage(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 24), M.chrome, this.tiroir, x, 0, 0); p.rotation.z = Math.PI / 2; }
    // chambres T A P B T (anneaux colorés fixes dans le corps)
    this.chambresDist = {};
    for (const [nom, x] of [['T1', -0.8], ['A', -0.4], ['P', 0], ['B', 0.4], ['T2', 0.8]]) {
      const anneau = this._interieur(this._maillage(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 24, 1, true), mat(0x3b82f6, 0, 0.4, { side: THREE.DoubleSide }), d, x, 4.75, 0));
      anneau.rotation.z = Math.PI / 2; anneau.castShadow = false;
      this.chambresDist[nom] = anneau;
    }
    this._selection(d, 'distributeur');

    // Réducteur de débit unidirectionnel (ligne A)
    const red = new THREE.Group(); this.scene.add(red);
    this._maillage(new THREE.BoxGeometry(1.0, 0.55, 0.55), M.laiton, red, 2.6, 2.4, 0.9);
    this._maillage(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 12), M.acier, red, 2.6, 2.83, 0.9);
    this.boutonReducteur = this._maillage(new THREE.CylinderGeometry(0.22, 0.22, 0.25, 18), M.noir, red, 2.6, 3.1, 0.9);
    this._maillage(new THREE.BoxGeometry(0.05, 0.05, 0.45), M.jaune, this.boutonReducteur, 0, 0.13, 0);
    this._maillage(new THREE.BoxGeometry(0.3, 2.15, 0.3), M.fonte, red, 2.6, 1.07, 0.9);
    this._selection(red, 'reducteur');
  }

  /* ------------------------------ Vérin ----------------------------- */
  _construireVerin() {
    const M = this.m, v = new THREE.Group(); this.scene.add(v);
    const X = 7;
    this._maillage(new THREE.BoxGeometry(2.2, 0.2, 2.2), M.fonte, v, X, 0.1, 0);
    this._maillage(new THREE.BoxGeometry(0.9, 0.7, 0.25), M.acier, v, X, 0.55, 0.3);
    this._maillage(new THREE.BoxGeometry(0.9, 0.7, 0.25), M.acier, v, X, 0.55, -0.3);
    const matTete = this._env(M.peinture);
    this._maillage(new THREE.BoxGeometry(0.85, 0.7, 0.85), matTete, v, X, 1.25, 0);
    this._maillage(new THREE.BoxGeometry(0.85, 0.7, 0.85), matTete, v, X, 7.3, 0);
    this.tube = this._maillage(new THREE.CylinderGeometry(0.33, 0.33, 5.35, 40, 1, true), this._env(M.peinture), v, X, 4.275, 0);
    for (const [dx, dz] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]]) {
      this._maillage(new THREE.CylinderGeometry(0.05, 0.05, 6.9, 10), M.acier, v, X + dx, 4.28, dz);
      for (const y of [0.85, 7.72]) this._maillage(new THREE.CylinderGeometry(0.085, 0.085, 0.12, 6), M.acier, v, X + dx, y, dz);
    }
    this._maillage(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 24), M.noir, v, X, 7.75, 0);   // racleur
    for (const y of [1.25, 7.3]) this._maillage(new THREE.CylinderGeometry(0.13, 0.13, 0.22, 12), M.acier, v, X - 0.5, y, 0).rotation.z = Math.PI / 2;  // orifices
    // tige + piston (mobiles)
    this.mobile = new THREE.Group(); v.add(this.mobile);
    this.piston = this._maillage(new THREE.CylinderGeometry(0.31, 0.31, 0.24, 32), M.acier, this.mobile, X, 0, 0);
    this._interieur(this.piston);
    for (const dy of [-0.07, 0.07]) this._interieur(this._maillage(new THREE.CylinderGeometry(0.315, 0.315, 0.05, 32), M.rouge, this.mobile, X, dy, 0));
    this.tige = this._maillage(new THREE.CylinderGeometry(0.14, 0.14, 6.3, 28), M.chrome, this.mobile, X, 3.15, 0);
    // huile des chambres (coupe)
    this.chA = this._interieur(this._maillage(new THREE.CylinderGeometry(0.3, 0.3, 1, 28), mat(0x3b82f6, 0, 0.3, { transparent: true, opacity: 0.8 }), v, X, 0, 0));
    this.chB = this._interieur(this._maillage(new THREE.CylinderGeometry(0.3, 0.3, 1, 28), mat(0x3b82f6, 0, 0.3, { transparent: true, opacity: 0.8 }), v, X, 0, 0));
    this.chA.castShadow = this.chB.castShadow = false;
    this._selection(v, 'verin');

    // Bâti de guidage et plateau chargé
    const b = new THREE.Group(); this.scene.add(b);
    for (const x of [X - 3.6, X + 3.6]) {
      this._maillage(new THREE.CylinderGeometry(0.16, 0.16, 20.4, 20), M.chrome, b, x, 10.2, 0);
      this._maillage(new THREE.BoxGeometry(0.9, 0.2, 0.9), M.fonte, b, x, 0.1, 0);
    }
    this._maillage(new THREE.BoxGeometry(8.2, 0.5, 0.7), M.jaune, b, X, 20.6, 0);
    this.plateau = new THREE.Group(); this.scene.add(this.plateau);
    this._maillage(new THREE.BoxGeometry(7.6, 0.25, 2.0), M.jaune, this.plateau, X, 0.125, 0);
    for (const dx of [-3.6, 3.6]) this._maillage(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 20), M.fonte, this.plateau, X + dx, 0.15, 0);
    this.masses = new THREE.Group(); this.plateau.add(this.masses);
    this._geoPlaque = new THREE.BoxGeometry(6.0, 0.4, 1.8);
    this._nbPlaques = -1;
    this._selection(this.plateau, 'charge');

    // panneau des manomètres A et B (prises Minimess)
    const pan = new THREE.Group(); this.scene.add(pan);
    this._maillage(new THREE.BoxGeometry(1.2, 5.2, 0.12), M.fonte, pan, X - 4.6, 3.9, 0.6);
    this._maillage(new THREE.BoxGeometry(0.2, 3.9, 0.2), M.fonte, pan, X - 4.6, 1.3, 0.5);
    this.aigs.B = this._manometre(pan, X - 4.6, 5.6, 0.75, 0.45, 250, 'Chambre B', 50, 10, 160);
    this.aigs.A = this._manometre(pan, X - 4.6, 2.9, 0.75, 0.45, 250, 'Chambre A', 50, 10, 160);
    this._selection(pan, 'manometres');
  }

  _majMasses(charge) {
    const n = Math.round(charge / 100);
    if (n === this._nbPlaques) return;
    this._nbPlaques = n;
    while (this.masses.children.length) this.masses.remove(this.masses.children[0]);
    for (let i = 0; i < n; i++) {
      this._maillage(this._geoPlaque, this.m.masse, this.masses, 7, 0.25 + 0.2 + i * 0.42, 0);
    }
  }

  /* ----------------------------- Flexibles --------------------------- */
  _flexible(points, rayon = 0.085) {
    const courbe = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    const lg = courbe.getLength();
    const ext = this._maillage(new THREE.TubeGeometry(courbe, Math.max(24, Math.round(lg * 6)), rayon, 12), this.m.caoutchouc.clone());
    const tex = texChevrons(); tex.repeat.set(Math.max(1, Math.round(lg / 1.2)), 1);
    const int = new THREE.Mesh(new THREE.TubeGeometry(courbe, Math.max(24, Math.round(lg * 6)), rayon * 0.62, 8), new THREE.MeshStandardMaterial({ map: tex, color: 0x3b82f6, emissive: 0x111111, roughness: 0.4 }));
    int.visible = false; this.scene.add(int);
    for (const t of [0, 1]) {   // embouts sertis
      const p = courbe.getPointAt(t), tg = courbe.getTangentAt(t);
      const e = this._maillage(new THREE.CylinderGeometry(rayon * 1.45, rayon * 1.45, 0.35, 14), this.m.acier);
      e.position.copy(p).addScaledVector(tg, t === 0 ? 0.15 : -0.15);
      e.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg);
    }
    const f = { ext, int, tex, q: 0, p: 0, lg };
    this.flexibles.push(f);
    return f;
  }

  _construireFlexibles() {
    this.fl = {
      pompe: this._flexible([[-6.05, 6.75, 0], [-6.0, 7.4, 0.2], [-5.3, 7.2, 0.5], [-5.15, 5.3, 0.4], [-4.95, 5.27, 0.4]]),
      P: this._flexible([[-3.65, 5.2, 0.2], [-2.8, 5.0, 0.0], [-1.6, 3.2, -1.0], [-0.4, 3.7, -1.2], [-0.4, 4.1, -0.7]], 0.09),
      T: this._flexible([[0.4, 4.1, -0.7], [0.5, 3.5, -1.6], [-3.0, 2.8, -2.6], [-8.0, 6.5, -2.4], [-9.3, 5.65, -1.55]], 0.1),
      A1: this._flexible([[-0.4, 4.1, 0.7], [-0.5, 3.4, 1.3], [1.2, 2.3, 1.2], [2.1, 2.4, 0.9]], 0.09),
      A2: this._flexible([[3.1, 2.4, 0.9], [4.2, 2.0, 1.0], [5.6, 1.0, 0.6], [6.2, 1.25, 0.1], [6.4, 1.25, 0]], 0.09),
      B: this._flexible([[0.4, 4.1, 0.7], [0.6, 3.5, 1.5], [3.2, 5.0, 1.6], [5.4, 7.8, 0.6], [6.2, 7.3, 0.1], [6.4, 7.3, 0]], 0.09),
      mA: this._flexible([[2.4, 2.9, 0.62], [2.6, 3.4, 0.9], [3.0, 3.2, 1.2], [2.9, 2.6, 0.95]], 0.035),
      mB: this._flexible([[2.4, 5.6, 0.62], [2.8, 6.4, 1.0], [4.6, 7.9, 1.2], [6.6, 7.65, 0.35]], 0.035)
    };
  }

  /* ----------------------------- Étiquettes -------------------------- */
  _construireEtiquettes() {
    const liste = [
      ['reservoir', 'Réservoir 40 L', [-7, 3.2, 2.3]], ['moteur', 'Moteur 2,2 kW', [-9.6, 7.5, 0]], ['pompe', 'Pompe à engrenages', [-6.05, 4.9, 0.6]],
      ['limiteur', 'Limiteur de pression', [-4.3, 7.9, 0.6]], ['refroidisseur', 'Refroidisseur', [-11, 4.3, 0]],
      ['distributeur', 'Distributeur 4/3', [-0.9, 6.3, 0]], ['reducteur', 'Réducteur de débit', [2.6, 3.6, 0.9]], ['verin', 'Vérin Ø50/28 × 500', [7.8, 4.3, 0.5]],
      ['charge', 'Charge', [7, 2, 1]], ['manometres', 'Manomètres A / B', [2.4, 6.7, 0.7]]
    ];
    for (const [id, texte, pos] of liste) {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'etiquette'; el.textContent = texte;
      el.addEventListener('click', (e) => { e.stopPropagation(); this.surSelection && this.surSelection(id); });
      this.conteneurEtiquettes.appendChild(el);
      const e = { id, el, pos: new THREE.Vector3(...pos) };
      if (id === 'charge') this.etiquetteCharge = e;
      this.etiquettes.push(e);
    }
  }

  _majEtiquettes() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, v = new THREE.Vector3();
    for (const e of this.etiquettes) {
      if (!this.etiquettesVisibles) { e.el.style.display = 'none'; continue; }
      v.copy(e.pos).project(this.camera);
      if (v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) { e.el.style.display = 'none'; continue; }
      e.el.style.display = '';
      e.el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px)`;
    }
  }

  /* --------------------------- Interaction --------------------------- */
  _initInteraction() {
    const ray = new THREE.Raycaster(), souris = new THREE.Vector2();
    let debut = null;
    this.canvas.addEventListener('pointerdown', (e) => { debut = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!debut) return;
      const dx = e.clientX - debut.x, dy = e.clientY - debut.y;
      const court = dx * dx + dy * dy < 80 && performance.now() - debut.t < 400;
      debut = null;
      if (!court) return;
      const r = this.canvas.getBoundingClientRect();
      souris.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(souris, this.camera);
      const h = ray.intersectObjects(this.selectionnables, true).find((i) => i.object.visible && i.object.userData.composant);
      if (h && this.surSelection) this.surSelection(h.object.userData.composant);
    });
    window.addEventListener('resize', () => this.redimensionner());
  }

  redimensionner() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /* Vues prédéfinies (animation douce de la caméra). */
  vue(nom, immediat = false) {
    const k = Math.max(1, 1.25 / this.camera.aspect);   // recule la caméra sur écran étroit (téléphone)
    const vues = {
      ensemble: [[2 * k, 13 * k, 32 * k], [0, 5.5, 0]],
      centrale: [[-4, 10, 13 * k], [-7, 5, 0]],
      distributeur: [[2.5, 7.5, 8 * k], [0.8, 4.4, 0]],
      verin: [[10, 9, 15 * k], [6, 6, 0]]
    };
    const [pos, cible] = vues[nom] || vues.ensemble;
    const fin = { pos: new THREE.Vector3(...pos), cible: new THREE.Vector3(...cible) };
    if (immediat) { this.camera.position.copy(fin.pos); this.controls.target.copy(fin.cible); this.controls.update(); this.anim = null; return; }
    this.anim = { t: 0, de: { pos: this.camera.position.clone(), cible: this.controls.target.clone() }, fin };
  }
  recentrer(immediat) { this.vue('ensemble', immediat); }

  setCoupe(on) {
    this.coupe = on;
    for (const m of this.enveloppes) { m.transparent = on; m.opacity = on ? 0.16 : 1; m.depthWrite = !on; m.needsUpdate = true; }
    for (const o of this.interieurs) o.visible = on;
  }
  setHuile(on) {
    this.huile = on;
    for (const f of this.flexibles) {
      const m = f.ext.material;
      m.transparent = on; m.opacity = on ? 0.22 : 1; m.depthWrite = !on; m.needsUpdate = true;
      f.int.visible = on;
    }
  }
  setEtiquettes(on) { this.etiquettesVisibles = on; this._majEtiquettes(); }

  /* --------------------------- Mise à jour --------------------------- */
  maj(m, reglages, dt) {
    // caméra animée
    if (this.anim) {
      this.anim.t = Math.min(1, this.anim.t + dt / 0.9);
      const e = this.anim.t < 0.5 ? 2 * this.anim.t ** 2 : 1 - (-2 * this.anim.t + 2) ** 2 / 2;
      this.camera.position.lerpVectors(this.anim.de.pos, this.anim.fin.pos, e);
      this.controls.target.lerpVectors(this.anim.de.cible, this.anim.fin.cible, e);
      if (this.anim.t >= 1) this.anim = null;
    }
    this.controls.update();

    // rotation (ralentie à l'écran pour rester lisible)
    const vitAff = m.n / 1450 * 9;   // rad/s affichés
    this.angPompe += vitAff * dt;
    this.accouplement.rotation.x = this.angPompe;
    this.ventilateur.rotation.x = this.angPompe;
    for (const p of this.pignons) p.rotation.z = (p.userData.sens > 0 ? this.angPompe : -this.angPompe + Math.PI / 10);
    const vRef = reglages.refroidOk ? m.n / 1450 * 14 : 0;
    this.angVentil += vRef * dt; this.helice.rotation.x = this.angVentil;
    // vibration légère du moteur et de la pompe en charge
    this.voyantMoteur.material.emissive.setHex(m.n > 50 ? 0x22dd44 : 0x000000);

    // limiteur : clapet, ressort, bouton
    this.clapetLim.position.y = 5.4 + m.clapet * 0.12;
    this.ressortLim.scale.y = 0.75 - m.clapet * 0.12;
    this.ressortLim.position.y = 5.55 + m.clapet * 0.12;
    this.boutonLimiteur.rotation.y = reglages.pTarage / 160 * Math.PI * 3;
    this.boutonReducteur.rotation.y = reglages.reducteur / 100 * Math.PI * 2.5;

    // manomètres amortis (glycérine)
    const aig = (a, p) => {
      a.val += (Math.max(p, 0) - a.val) * Math.min(1, dt / 0.08);
      a.aig.rotation.z = -(-225 + 270 * Math.min(a.val, a.max * 1.02) / a.max + 90) * Math.PI / 180;
    };
    aig(this.aigs.P, m.pP); aig(this.aigs.A, m.pA); aig(this.aigs.B, m.pB);

    // distributeur : tiroir, LED des électroaimants
    this.tiroir.position.x = m.tiroir * 0.2;
    this.ledA.material.emissive.setHex(m.tiroir > 0.1 ? 0xffa000 : 0x000000);
    this.ledB.material.emissive.setHex(m.tiroir < -0.1 ? 0xffa000 : 0x000000);
    const ch = this.chambresDist;
    couleurPression(m.pP, ch.P.material.color); couleurPression(m.pA, ch.A.material.color);
    couleurPression(m.pB, ch.B.material.color); couleurPression(m.pT, ch.T1.material.color); couleurPression(m.pT, ch.T2.material.color);

    // vérin : piston, tige, chambres, plateau
    const yP = 1.72 + m.x / 100;            // m.x en mm → unités (10 cm)
    this.mobile.position.y = 0;
    this.piston.position.y = yP;
    this.mobile.children.forEach((c, i) => { if (c !== this.piston && c !== this.tige) c.position.y = yP + (i === 1 ? -0.07 : 0.07); });
    this.tige.position.y = yP + 3.15;
    const yBas = 1.6, yHaut = 6.95;
    this.chA.position.y = (yBas + yP - 0.12) / 2; this.chA.scale.y = Math.max(yP - 0.12 - yBas, 0.01);
    this.chB.position.y = (yP + 0.12 + yHaut) / 2; this.chB.scale.y = Math.max(yHaut - yP - 0.12, 0.01);
    couleurPression(m.pA, this.chA.material.color); couleurPression(m.pB, this.chB.material.color);
    this.plateau.position.y = yP + 6.3;
    this._majMasses(reglages.charge);
    this.etiquetteCharge.pos.set(7, this.plateau.position.y + 0.6 + this._nbPlaques * 0.42, 1);
    this.etiquetteCharge.el.textContent = `Charge ${reglages.charge} kg`;

    // réservoir : niveau (le vérin sorti prélève de l'huile), écume si air / cavitation
    const vol = 1 - m.x / 500 * 0.035;
    this.niveauVoyant.scale.y = 0.78 * vol; this.niveauVoyant.position.y = 1.55 + 1.4 * 0.78 * vol / 2;
    this.huileReservoir.scale.y = vol;
    this.ecumeVoyant.visible = !!reglages.ecume;
    this.ecumeVoyant.position.y = this.niveauVoyant.position.y + 1.4 * 0.78 * vol / 2;
    this.indicColmatage.material.color.setHex(m.pT > 3.5 ? 0xd42020 : 0x1f9d3a);

    // flexibles : pression et débit
    const fl = this.fl;
    const regle = (f, p, q) => { f.p = p; f.q = q; };
    regle(fl.pompe, m.pP, m.qPompe); regle(fl.P, m.pP, m.qPompe - m.qLim);
    regle(fl.T, m.pT, Math.max(m.qT - m.qLim, 0)); regle(fl.A1, m.pA, m.qA); regle(fl.A2, m.pA, m.qA);
    regle(fl.B, m.pB, m.qB); regle(fl.mA, m.pA, 0); regle(fl.mB, m.pB, 0);
    if (this.huile) for (const f of this.flexibles) {
      couleurPression(f.p, f.int.material.color);
      f.tex.offset.x -= f.q * dt * 0.09;
    }

    this._majEtiquettes();
    this.renderer.render(this.scene, this.camera);
  }
}
