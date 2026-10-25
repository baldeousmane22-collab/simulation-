/* =====================================================================
   scene3d.js — Scène 3D : moteur + machine entraînée + accouplement
   ---------------------------------------------------------------------
   Repère : 1 unité = 100 mm. L'axe du moteur est l'axe X (y = 0).
   Le groupe « menee » (machine entraînée) pivote autour du centre de
   l'accouplement : décalage radial (Y), angle (autour de Z) et écart
   axial (X). Les désalignements sont exagérés (facteur E) pour être vus.
   Chaque type d'accouplement est construit par une fonction de CONSTR :
   moyeu A (côté moteur, c = -1), moyeu B (côté machine, c = +1) et
   pièces intermédiaires recalculées à chaque image (cinématique réelle :
   Oldham, cardan, entretoise, soufflet…). L'élément qui travaille se
   colore du vert au rouge selon le taux de désalignement.
   ===================================================================== */

import * as THREE from '../vendor/three.min.js';
import { OrbitControls, RoomEnvironment } from '../vendor/three.min.js';

const X = new THREE.Vector3(1, 0, 0);
const ROUGE = new THREE.Color(0xe11d1d);
const DIR_VUE = new THREE.Vector3(0.42, 0.36, 1).normalize();

/* ---------------------------- Outils -------------------------------- */
function mat(couleur, metal = 0.3, rugo = 0.5, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: couleur, metalness: metal, roughness: rugo, ...extra });
}
const cylX = (r, l, s = 40) => new THREE.CylinderGeometry(r, r, l, s).rotateZ(-Math.PI / 2);
// anneau d'axe X (rayon extérieur, intérieur, longueur)
function anneau(re, ri, l, s = 48) {
  const p = [new THREE.Vector2(ri, -l / 2), new THREE.Vector2(re, -l / 2), new THREE.Vector2(re, l / 2), new THREE.Vector2(ri, l / 2), new THREE.Vector2(ri, -l / 2)];
  return new THREE.LatheGeometry(p, s).rotateZ(-Math.PI / 2);
}
// secteur annulaire (r1..r2, angles a0..a1 en degrés) extrudé selon +X de 0 à « ep »
function secteur(r1, r2, a0, a1, ep) {
  const d = THREE.MathUtils.degToRad, s = new THREE.Shape();
  s.absarc(0, 0, r2, d(a0), d(a1), false);
  s.absarc(0, 0, r1, d(a1), d(a0), true);
  // forme dans le plan (y, z) : x_forme → y, y_forme → z
  return new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: false, curveSegments: 10 })
    .applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
}
// position sur le cercle de rayon r à l'angle a (degrés), dans le plan (y, z)
const polaire = (r, a) => [Math.cos(a * Math.PI / 180) * r, Math.sin(a * Math.PI / 180) * r];

function ajout(parent, geo, m, x = 0, y = 0, z = 0, nom) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true; o.receiveShadow = true;
  if (nom) o.userData.nom = nom;
  parent.add(o);
  return o;
}

/* ===================================================================== */
export class Scene3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.onPiece = null;
    this.vueManuelle = false;
    this.anim = null;
    this._initRendu();
    this._construireBanc();
    this._initInteraction();
    this.redimensionner();
  }

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
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100);
    const c = new OrbitControls(this.camera, this.canvas);
    c.enableDamping = true; c.dampingFactor = 0.12;
    c.minDistance = 1.2; c.maxDistance = 25;
    c.screenSpacePanning = true;
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    c.addEventListener('start', () => { this.anim = null; this.vueManuelle = true; });
    this.controls = c;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.9));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.7);
    soleil.position.set(3, 9, 6);
    soleil.castShadow = true;
    soleil.shadow.mapSize.set(1024, 1024);
    Object.assign(soleil.shadow.camera, { left: -7, right: 7, top: 5, bottom: -5, near: 1, far: 30 });
    soleil.shadow.bias = -0.0008;
    this.scene.add(soleil);
    this.m = {
      acier: mat(0xd5dbe1, 0.9, 0.25), acierFonce: mat(0x5b6570, 0.7, 0.4), fonte: mat(0x6b7480, 0.6, 0.45),
      noir: mat(0x22262b, 0.3, 0.6), bleu: mat(0x2f6fb3, 0.45, 0.45), vert: mat(0x2e7d4f, 0.4, 0.5),
      socle: mat(0x3f4652, 0.6, 0.5), jaune: mat(0xfacc15, 0.2, 0.5), bronze: mat(0xb07b3a, 0.85, 0.35),
      trou: mat(0x111111, 0.2, 0.9)
    };
  }

  /* ------------------- Banc : moteur, machine, socle ------------------ */
  _construireBanc() {
    const m = this.m;
    const socle = ajout(this.scene, new THREE.BoxGeometry(11, 0.2, 2.6), m.socle, -0.4, -1.3, 0, 'Châssis (socle commun)');
    socle.castShadow = false;
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.25 }));
    sol.rotation.x = -Math.PI / 2; sol.position.y = -1.4; sol.receiveShadow = true;
    this.scene.add(sol);

    // Moteur électrique (groupe fixe)
    const g1 = this.moteur = new THREE.Group();
    this.scene.add(g1);
    const N = 'Moteur électrique (machine menante)';
    ajout(g1, cylX(0.85, 3.1), m.bleu, -3.35, 0, 0, N);
    for (let i = 0; i < 12; i++) {
      const a = i * 30, [y, z] = polaire(0.86, a);
      const ail = ajout(g1, new THREE.BoxGeometry(2.8, 0.1, 0.03), m.bleu, -3.4, y, z, N);
      ail.rotation.x = a * Math.PI / 180;
    }
    ajout(g1, cylX(0.8, 0.5), m.acierFonce, -5.1, 0, 0, 'Capot du ventilateur');
    ajout(g1, cylX(0.6, 0.12), m.bleu, -1.75, 0, 0, N);
    ajout(g1, new THREE.BoxGeometry(0.7, 0.35, 0.6), m.bleu, -3.2, 0.95, 0, 'Boîte à bornes');
    for (const x of [-4.4, -2.3]) for (const z of [-0.7, 0.7]) ajout(g1, new THREE.BoxGeometry(0.45, 0.62, 0.32), m.bleu, x, -0.9, z, 'Patte du moteur');
    this.arbreA = ajout(g1, cylX(0.17, 1.9), m.acier, -1.55, 0, 0, 'Bout d\'arbre moteur');

    // Machine entraînée (pivote autour du centre de l'accouplement)
    const g2 = this.menee = new THREE.Group();
    this.scene.add(g2);
    const M = 'Machine entraînée (réducteur)';
    ajout(g2, new THREE.BoxGeometry(2.6, 1.7, 1.6), m.vert, 3.2, 0.15, 0, M);
    ajout(g2, cylX(0.5, 0.16), m.vert, 1.85, 0, 0, 'Palier / chapeau de roulement');
    ajout(g2, cylX(0.22, 0.1), m.noir, 1.74, 0, 0, 'Joint à lèvre');
    ajout(g2, new THREE.BoxGeometry(2.8, 0.14, 1.8), m.vert, 3.2, -0.95, 0, M);
    for (const x of [2.2, 4.2]) for (const z of [-0.75, 0.75]) ajout(g2, new THREE.BoxGeometry(0.4, 0.25, 0.3), m.vert, x, -1.12, z, 'Patte de la machine (cales de réglage)');
    this.arbreB = ajout(g2, cylX(0.17, 1.9), m.acier, 1.55, 0, 0, 'Bout d\'arbre de la machine');

    // Axes de rotation (vert : moteur, orange : machine)
    const axe = (c, parent) => {
      const o = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 13, 6).rotateZ(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true, opacity: 0.9 }));
      o.renderOrder = 10;
      parent.add(o);
      return o;
    };
    this.axes = [axe(0x22c55e, g1), axe(0xf97316, g2)];
    this.racine = new THREE.Group();   // pièces de l'accouplement (nettoyées à chaque changement)
    this.scene.add(this.racine);
  }

  /* ------------------ Construction d'un accouplement ------------------ */
  choisirType(t) {
    const vieux = [...this.racine.children, this.spinA, this.spinB].filter(Boolean);
    for (const o of vieux) { o.parent.remove(o); o.traverse(n => { if (n.geometry) n.geometry.dispose(); }); }
    this.type = t;
    this.g = GEOM[t.id].g;
    this.spinA = new THREE.Group(); this.moteur.add(this.spinA);
    this.spinB = new THREE.Group(); this.menee.add(this.spinB);
    this.spinA.position.x = -this.g / 2; this.spinB.position.x = this.g / 2;
    this.mobiles = []; this.charges = []; this.capots = [];
    this.pont = null;
    const b = {
      A: this.spinA, B: this.spinB, g: this.g, m: this.m, racine: this.racine,
      charge: (c, extra) => { const x = mat(c, 0.35, 0.55, extra); this.charges.push({ m: x, base: new THREE.Color(c) }); return x; },
      capot: (c) => { const x = mat(c, 0.7, 0.35, { transparent: true, side: THREE.DoubleSide }); this.capots.push(x); return x; },
      mobile: (obj, maj) => { this.racine.add(obj); this.mobiles.push({ obj, maj }); return obj; },
      pont: (da, db) => { this.pont = { da, db }; }
    };
    GEOM[t.id].construire(b);
    this.thetaB = null;
    // bouts d'arbre : jusqu'aux faces des moyeux (dans la fourche pour le cardan)
    const bout = t.id === 'cardan' ? 0.6 : this.g / 2 + 0.02;
    for (const [a, s] of [[this.arbreA, -1], [this.arbreB, 1]]) { a.scale.x = (2.5 - bout) / 1.9; a.position.x = s * (2.5 + bout) / 2; }
  }

  /* ---------------------------- Vue --------------------------------- */
  recentrer(immediat = false, dir = DIR_VUE) {
    const a = this.camera.aspect;
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const d = Math.max(1.6 / t, 1.7 / (t * a)) + 0.6;
    const p1 = dir.clone().multiplyScalar(d), c1 = new THREE.Vector3(0, -0.05, 0);
    this.vueManuelle = false;
    if (immediat) { this.camera.position.copy(p1); this.controls.target.copy(c1); this.anim = null; this.controls.update(); return; }
    this.anim = { t: 0, duree: 0.8, p0: this.camera.position.clone(), p1, c0: this.controls.target.clone(), c1 };
  }
  vue(nom) {
    const d = { face: new THREE.Vector3(0.001, 0.05, 1), dessus: new THREE.Vector3(0.001, 1, 0.02), axe: new THREE.Vector3(1, 0.25, 0.35).normalize() }[nom] || DIR_VUE;
    this.recentrer(false, d.normalize());
  }

  redimensionner() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.vueManuelle && !this.anim) this.recentrer(true);
  }

  _initInteraction() {
    const ray = new THREE.Raycaster(), debut = { x: 0, y: 0, t: 0, id: -1 };
    let nb = 0;
    this.canvas.addEventListener('pointerdown', (e) => {
      nb++;
      if (nb === 1) Object.assign(debut, { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId });
      else debut.id = -1;
    });
    this.canvas.addEventListener('pointerup', (e) => {
      nb = Math.max(0, nb - 1);
      if (e.pointerId !== debut.id) return;
      debut.id = -1;
      const dx = e.clientX - debut.x, dy = e.clientY - debut.y;
      if (dx * dx + dy * dy > 100 || performance.now() - debut.t > 450) return;
      const rc = this.canvas.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1), this.camera);
      for (const h of ray.intersectObjects([this.racine, this.moteur, this.menee], true)) {
        let o = h.object;
        while (o && !o.userData.nom) o = o.parent;
        if (o && o.visible) { if (this.onPiece) this.onPiece(o.userData.nom); return; }
      }
    });
    this.canvas.addEventListener('pointercancel', (e) => { nb = Math.max(0, nb - 1); if (e.pointerId === debut.id) debut.id = -1; });
  }

  /* ------------------------ Mise à jour par image --------------------- */
  // e = { theta, r, a, x (valeurs affichées : unités et radians), eclate, transparent, axes, taux, secousse }
  maj(e, dt) {
    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.duree);
      const k = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
      this.camera.position.lerpVectors(a.p0, a.p1, k);
      this.controls.target.lerpVectors(a.c0, a.c1, k);
      if (a.t >= 1) this.anim = null;
    }
    const s = e.secousse;
    this.moteur.position.set(0, s * Math.sin(e.theta + 0.6), s * 0.5 * Math.cos(e.theta));
    this.menee.position.set(e.x, e.r - s * Math.sin(e.theta + 0.6), -s * 0.5 * Math.cos(2 * e.theta));
    // cardan : angle dans le plan horizontal (la machine ne plonge pas dans le socle)
    if (e.planHorizontal) this.menee.rotation.set(0, -e.a, 0); else this.menee.rotation.set(0, 0, e.a);
    this.moteur.updateMatrixWorld(); this.menee.updateMatrixWorld();

    // Faces des moyeux (non éclatées) et axes
    const qA = this.moteur.quaternion.clone(), qB = this.menee.quaternion.clone();
    const pA = this.moteur.localToWorld(new THREE.Vector3(-this.g / 2, 0, 0));
    const pB = this.menee.localToWorld(new THREE.Vector3(this.g / 2, 0, 0));
    const dA = X.clone().applyQuaternion(qA), dB = X.clone().applyQuaternion(qB);
    const ctx = { theta: e.theta, pA, pB, qA, qB, dA, dB, eclate: e.eclate };
    ctx.thetaB = this.type.id === 'cardan' ? this._thetaCardan(ctx) : e.theta;
    if (this.pont) {
      ctx.SA = pA.clone().addScaledVector(dA, this.pont.da);
      ctx.SB = pB.clone().addScaledVector(dB, -this.pont.db);
      ctx.qS = new THREE.Quaternion().setFromUnitVectors(X, ctx.SB.clone().sub(ctx.SA).normalize());
      ctx.L = ctx.SA.distanceTo(ctx.SB);
    }
    const ec = e.eclate * 0.9;
    this.spinA.position.x = -this.g / 2 - ec;
    this.spinB.position.x = this.g / 2 + ec;
    this.spinA.rotation.x = e.theta;
    this.spinB.rotation.x = ctx.thetaB;
    for (const mo of this.mobiles) mo.maj(mo.obj, ctx);

    // Couleur de l'élément qui travaille, capots, axes
    const k = THREE.MathUtils.clamp((e.taux - 0.5) / 1.0, 0, 1);
    for (const c of this.charges) c.m.color.copy(c.base).lerp(ROUGE, k);
    for (const c of this.capots) { c.opacity = e.transparent ? 0.28 : 1; c.depthWrite = !e.transparent; }
    for (const a of this.axes) a.visible = e.axes;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // Cardan : la fourche B suit le 2e bras du croisillon (exact, non homocinétique)
  _thetaCardan(ctx) {
    const c1 = new THREE.Vector3(0, Math.cos(ctx.theta), Math.sin(ctx.theta)).applyQuaternion(ctx.qA);
    const c2 = new THREE.Vector3().crossVectors(ctx.dB, c1).normalize();
    ctx.c1 = c1; ctx.c2 = c2;
    const l = c2.clone().applyQuaternion(ctx.qB.clone().invert());
    let tb = Math.atan2(-l.y, l.z);
    const p = this.thetaB ?? ctx.theta;
    tb += Math.round((p - tb) / Math.PI) * Math.PI;   // continuité (fourche symétrique)
    return (this.thetaB = tb);
  }
}

/* ---------------------- Aides de placement ------------------------- */
const Rx = (a) => new THREE.Quaternion().setFromAxisAngle(X, a);
function auMilieu(o, c, f = 0.5, phase = 0) {
  o.position.lerpVectors(c.pA, c.pB, f);
  o.quaternion.slerpQuaternions(c.qA, c.qB, f).multiply(Rx(c.theta + phase));
}
function surPont(o, c) {
  o.position.lerpVectors(c.SA, c.SB, 0.5);
  o.quaternion.copy(c.qS).multiply(Rx(c.theta));
  const u = o.userData;
  if (u.etire) u.etire.scale.x = c.L / u.L0;
  if (u.bouts) { u.bouts[0].position.x = -c.L / 2; u.bouts[1].position.x = c.L / 2; }
}
// moyeu standard : alésage (corps) + flasque côté face. c = -1 (A) ou +1 (B)
function moyeu(b, G, c, o) {
  const { rC = 0.36, lC = 0.55, rF = 0, eF = 0, mat = b.m.fonte, nom = 'Moyeu' } = o;
  ajout(G, cylX(rC, lC), mat, c * (eF + lC / 2), 0, 0, nom);
  if (rF) ajout(G, cylX(rF, eF), mat, c * eF / 2, 0, 0, nom);
  // repère jaune pour voir la rotation + clavette
  ajout(G, new THREE.BoxGeometry(lC * 0.7, 0.03, 0.08), b.m.jaune, c * (eF + lC / 2), rC + 0.005, 0, 'Repère de rotation');
  ajout(G, new THREE.BoxGeometry(lC + eF, 0.06, 0.07), b.m.acierFonce, c * (lC + eF) / 2, 0.17, 0, 'Clavette');
}
function boulon(G, x, y, z, l, m, nom = 'Boulon') {
  ajout(G, cylX(0.04, l, 12), m, x, y, z, nom);
  ajout(G, new THREE.CylinderGeometry(0.075, 0.075, 0.06, 6).rotateZ(-Math.PI / 2), m, x - l / 2, y, z, nom);
  ajout(G, new THREE.CylinderGeometry(0.075, 0.075, 0.06, 6).rotateZ(-Math.PI / 2), m, x + l / 2, y, z, 'Écrou');
}

/* ===================== Les 12 types d'accouplement ==================== */
const GEOM = {
  plateaux: {
    g: 0.04,
    construire(b) {
      const bm = b.charge(0x8b949e, { metalness: 0.8, roughness: 0.3 });
      for (const [G, c] of [[b.A, -1], [b.B, 1]]) {
        moyeu(b, G, c, { rC: 0.36, lC: 0.55, rF: 0.7, eF: 0.15, nom: 'Plateau (flasque) claveté' });
        if (c < 0) ajout(G, cylX(0.3, 0.06), b.m.fonte, 0.02, 0, 0, 'Emboîtement de centrage');
      }
      for (let i = 0; i < 6; i++) {
        const [y, z] = polaire(0.53, i * 60 + 30);
        boulon(b.A, 0.02, y, z, 0.4, bm, 'Boulon ajusté (travaille au cisaillement)');
      }
    }
  },
  manchon: {
    g: 0.04,
    construire(b) {
      for (const [G, c] of [[b.A, -1], [b.B, 1]]) ajout(G, new THREE.BoxGeometry(0.7, 0.06, 0.07), b.m.acierFonce, c * 0.38, 0.17, 0, 'Clavette');
      const m = b.charge(0xaab3bd, { metalness: 0.85, roughness: 0.3 });
      const G = new THREE.Group();
      ajout(G, anneau(0.38, 0.17, 1.5), m, 0, 0, 0, 'Manchon rigide (douille)');
      for (const x of [-0.45, 0.45]) ajout(G, new THREE.CylinderGeometry(0.06, 0.06, 0.14, 6), b.m.acierFonce, x, 0.42, 0, 'Vis de pression');
      ajout(G, new THREE.BoxGeometry(1.0, 0.03, 0.09), b.m.jaune, 0, 0.385, 0.12, 'Repère de rotation');
      b.mobile(G, auMilieu);
    }
  },
  crabots: {
    g: 0.26,
    construire(b) {
      const n = 'Moyeu à crabots';
      for (const [G, c, a0] of [[b.A, -1, 0], [b.B, 1, 60]]) {
        moyeu(b, G, c, { rC: 0.38, lC: 0.45, rF: 0.62, eF: 0.18, nom: n });
        for (let i = 0; i < 3; i++) {
          const a = a0 + i * 120;
          ajout(G, secteur(0.28, 0.62, a - 20, a + 20, 0.24), b.m.fonte, c < 0 ? 0 : -0.24, 0, 0, 'Crabot (griffe)');
        }
      }
      const m = b.charge(0xf2c218);
      const E = new THREE.Group();
      ajout(E, anneau(0.29, 0.2, 0.22, 24), m, 0, 0, 0, 'Étoile en élastomère (pièce d\'usure)');
      for (let i = 0; i < 6; i++) ajout(E, secteur(0.28, 0.6, i * 60 + 20, i * 60 + 40, 0.22), m, -0.11, 0, 0, 'Étoile en élastomère (pièce d\'usure)');
      b.mobile(E, (o, c) => auMilieu(o, c));
    }
  },
  pneu: {
    g: 0.5,
    construire(b) {
      for (const [G, c] of [[b.A, -1], [b.B, 1]]) {
        moyeu(b, G, c, { rC: 0.34, lC: 0.5, rF: 0.74, eF: 0.08, nom: 'Moyeu à flasque' });
        ajout(G, anneau(0.72, 0.52, 0.06), b.m.acierFonce, -c * 0.03, 0, 0, 'Bague de serrage du bandage');
        for (let i = 0; i < 8; i++) { const [y, z] = polaire(0.62, i * 45); ajout(G, new THREE.CylinderGeometry(0.04, 0.04, 0.05, 6).rotateZ(-Math.PI / 2), b.m.acier, -c * 0.07, y, z, 'Vis de serrage'); }
      }
      const pts = [[0.52, -0.25], [0.74, -0.25], [0.88, -0.21], [0.97, -0.12], [1.0, 0], [0.97, 0.12], [0.88, 0.21], [0.74, 0.25], [0.52, 0.25]]
        .map(([r, x]) => new THREE.Vector2(r, x));
      const m = b.charge(0x2b2f36, { side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
      const P = new THREE.Group();
      ajout(P, new THREE.LatheGeometry(pts, 56).rotateZ(-Math.PI / 2), m, 0, 0, 0, 'Bandage en caoutchouc (pneu)');
      ajout(P, new THREE.BoxGeometry(0.18, 0.02, 0.06), b.m.jaune, 0, 1.0, 0, 'Repère de rotation');
      b.mobile(P, auMilieu);
    }
  },
  broches: {
    g: 0.12,
    construire(b) {
      moyeu(b, b.A, -1, { rC: 0.36, lC: 0.5, rF: 0.75, eF: 0.16, nom: 'Plateau à broches' });
      moyeu(b, b.B, 1, { rC: 0.36, lC: 0.5, rF: 0.75, eF: 0.22, nom: 'Plateau à douilles' });
      const m = b.charge(0x30343a, { roughness: 0.85, metalness: 0 });
      for (let i = 0; i < 6; i++) {
        const [y, z] = polaire(0.52, i * 60);
        ajout(b.A, cylX(0.05, 0.3, 16), b.m.acier, 0.15, y, z, 'Broche (axe en acier)');
        ajout(b.A, cylX(0.1, 0.16, 20), m, 0.12, y, z, 'Douille en caoutchouc (pièce d\'usure)');
        ajout(b.A, new THREE.CylinderGeometry(0.08, 0.08, 0.05, 6).rotateZ(-Math.PI / 2), b.m.acier, -0.18, y, z, 'Écrou de broche');
        ajout(b.B, cylX(0.105, 0.01, 20), b.m.trou, -0.004, y, z, 'Alésage de douille');
      }
    }
  },
  lames: {
    g: 1.0,
    construire(b) {
      b.pont(0.08, 0.08);
      for (const [G, c] of [[b.A, -1], [b.B, 1]]) {
        moyeu(b, G, c, { rC: 0.34, lC: 0.5, rF: 0.66, eF: 0.1, nom: 'Moyeu' });
        for (let i = 0; i < 3; i++) { const [y, z] = polaire(0.52, i * 120); boulon(G, -c * 0.03, y, z, 0.16, b.m.acierFonce, 'Boulon moyeu → lames'); }
      }
      const m = b.charge(0xc9d3dc, { metalness: 0.9, roughness: 0.25 });
      for (const cote of ['A', 'B']) {
        const P = new THREE.Group();
        ajout(P, anneau(0.64, 0.38, 0.05, 6), m, 0, 0, 0, 'Paquet de lames inox (fléchit)');
        b.mobile(P, (o, c) => {
          const q0 = cote === 'A' ? c.qA : c.qB, p0 = cote === 'A' ? c.pA : c.pB, p1 = cote === 'A' ? c.SA : c.SB;
          o.position.lerpVectors(p0, p1, 0.5);
          o.quaternion.slerpQuaternions(q0, c.qS, 0.5).multiply(Rx(c.theta + Math.PI / 6));
        });
      }
      const S = new THREE.Group(), L0 = b.g - 0.16;
      const t = ajout(S, cylX(0.24, L0), b.m.acier, 0, 0, 0, 'Entretoise (spacer)');
      ajout(t, new THREE.BoxGeometry(L0 * 0.6, 0.03, 0.08), b.m.jaune, 0, 0.245, 0, 'Repère de rotation');
      const f1 = new THREE.Group(), f2 = new THREE.Group();
      for (const [f, s] of [[f1, 1], [f2, -1]]) {
        S.add(f);
        ajout(f, cylX(0.66, 0.08), b.m.acier, s * 0.04, 0, 0, 'Flasque d\'entretoise');
        for (let i = 0; i < 3; i++) { const [y, z] = polaire(0.52, i * 120 + 60); boulon(f, 0, y, z, 0.16, b.m.acierFonce, 'Boulon entretoise → lames'); }
      }
      S.userData = { etire: t, L0, bouts: [f1, f2] };
      b.mobile(S, surPont);
    }
  },
  denture: {
    g: 0.3,
    construire(b) {
      b.pont(-0.17, -0.17);
      const m = b.charge(0xb9c2cc, { metalness: 0.85, roughness: 0.3 });
      for (const [G, c] of [[b.A, -1], [b.B, 1]]) {
        moyeu(b, G, c, { rC: 0.4, lC: 0.45, rF: 0.44, eF: 0.34, mat: b.m.acier, nom: 'Moyeu à denture bombée' });
        for (let i = 0; i < 24; i++) {
          const a = i * 15, [y, z] = polaire(0.48, a);
          const d = ajout(G, new THREE.BoxGeometry(0.26, 0.1, 0.07), m, c * 0.17, y, z, 'Denture extérieure bombée');
          d.rotation.x = a * Math.PI / 180;
        }
      }
      const S = new THREE.Group(), L0 = b.g + 0.34;
      const etire = new THREE.Group(); S.add(etire);
      const cm = b.capot(0x7d8794);
      ajout(etire, anneau(0.76, 0.6, L0 + 0.24), cm, 0, 0, 0, 'Manchon à denture intérieure');
      for (let i = 0; i < 24; i++) {
        const a = i * 15 + 7.5, [y, z] = polaire(0.56, a);
        const d = ajout(etire, new THREE.BoxGeometry(L0 + 0.2, 0.09, 0.07), cm, 0, y, z, 'Denture intérieure du manchon');
        d.rotation.x = a * Math.PI / 180;
      }
      ajout(S, anneau(0.92, 0.74, 0.12), cm, 0, 0, 0, 'Brides boulonnées du manchon');
      for (let i = 0; i < 8; i++) { const [y, z] = polaire(0.84, i * 45 + 22.5); boulon(S, 0, y, z, 0.2, b.m.acierFonce, 'Boulon de bride'); }
      ajout(S, new THREE.BoxGeometry(0.4, 0.03, 0.09), b.m.jaune, 0, 0.92, 0, 'Repère de rotation');
      S.userData = { etire, L0 };
      b.mobile(S, surPont);
    }
  },
  chaine: {
    g: 0.12,
    construire(b) {
      for (const [G, c] of [[b.A, -1], [b.B, 1]]) {
        moyeu(b, G, c, { rC: 0.34, lC: 0.5, rF: 0.42, eF: 0.18, nom: 'Moyeu' });
        for (let i = 0; i < 16; i++) {
          const a = i * 22.5, [y, z] = polaire(0.47, a);
          const d = ajout(G, new THREE.BoxGeometry(0.16, 0.14, 0.1), b.m.acier, c * 0.09, y, z, 'Pignon (denture)');
          d.rotation.x = a * Math.PI / 180;
        }
      }
      const m = b.charge(0x5d6672, { metalness: 0.8, roughness: 0.35 });
      const C = new THREE.Group(), W = b.g + 0.36, R = 0.52;
      for (let i = 0; i < 16; i++) {
        const a = i * 22.5 + 11.25, [y, z] = polaire(R, a);
        ajout(C, cylX(0.045, W, 12), b.m.acier, 0, y, z, 'Rouleau de chaîne');
        const am = a + 11.25, [y2, z2] = polaire(R * Math.cos(Math.PI / 16), am);
        for (const x of [-W / 2, 0, W / 2]) {
          const p = ajout(C, new THREE.BoxGeometry(0.025, 0.1, 0.24), m, x, y2, z2, 'Maillon de chaîne double');
          p.rotation.x = am * Math.PI / 180;
        }
      }
      b.mobile(C, (o, c) => auMilieu(o, c));
      const cap = b.capot(0x9aa3ad), K = new THREE.Group();
      ajout(K, anneau(0.72, 0.66, W + 0.5), cap, 0, 0, 0, 'Carter étanche (graisse)');
      b.mobile(K, auMilieu);
    }
  },
  grille: {
    g: 0.12,
    construire(b) {
      const N = 36;
      for (const [G, c] of [[b.A, -1], [b.B, 1]]) {
        moyeu(b, G, c, { rC: 0.36, lC: 0.45, rF: 0.54, eF: 0.32, nom: 'Moyeu rainuré' });
        for (let i = 0; i < N; i++) {
          const a = i * 360 / N, [y, z] = polaire(0.6, a);
          const d = ajout(G, new THREE.BoxGeometry(0.32, 0.14, 0.06), b.m.fonte, c * 0.16, y, z, 'Dent du moyeu (rainures)');
          d.rotation.x = a * Math.PI / 180;
        }
      }
      const m = b.charge(0x2563eb, { metalness: 0.7, roughness: 0.35 });
      const Gr = new THREE.Group(), L = b.g + 0.58;
      for (let i = 0; i < N; i++) {
        const a = (i + 0.5) * 360 / N, [y, z] = polaire(0.6, a);
        const bar = ajout(Gr, new THREE.BoxGeometry(L, 0.15, 0.025), m, 0, y, z, 'Grille ressort en acier');
        bar.rotation.x = a * Math.PI / 180;
        const am = a + 180 / N, [y2, z2] = polaire(0.67, am);
        const p = ajout(Gr, new THREE.BoxGeometry(0.03, 0.03, 0.12), m, (i % 2 ? 1 : -1) * L / 2, y2, z2, 'Grille ressort en acier');
        p.rotation.x = am * Math.PI / 180;
      }
      b.mobile(Gr, (o, c) => auMilieu(o, c));
      const cap = b.capot(0x6b7480), K = new THREE.Group();
      ajout(K, anneau(0.82, 0.72, L + 0.3), cap, 0, 0, 0, 'Carter en 2 parties (graisse)');
      ajout(K, anneau(0.86, 0.8, 0.08), cap, 0, 0, 0, 'Joint de carter');
      b.mobile(K, auMilieu);
    }
  },
  oldham: {
    g: 0.34,
    construire(b) {
      for (const [G, c] of [[b.A, -1], [b.B, 1]]) {
        moyeu(b, G, c, { rC: 0.34, lC: 0.5, rF: 0.6, eF: 0.14, nom: 'Moyeu rainuré' });
        for (const s of [-1, 1]) {
          // rainure du moyeu A selon y local, du moyeu B selon z local (à 90°)
          const geo = c < 0 ? new THREE.BoxGeometry(0.09, 1.15, 0.12) : new THREE.BoxGeometry(0.09, 0.12, 1.15);
          ajout(G, geo, b.m.fonte, -c * 0.045, c < 0 ? 0 : s * 0.15, c < 0 ? s * 0.15 : 0, 'Bord de rainure du moyeu');
        }
      }
      const m = b.charge(0xe8e2d0, { roughness: 0.6, metalness: 0 });
      const D = new THREE.Group();
      ajout(D, cylX(0.6, 0.12), m, 0, 0, 0, 'Disque intermédiaire (croisillon)');
      ajout(D, new THREE.BoxGeometry(0.1, 1.1, 0.18), m, -0.11, 0, 0, 'Tenon côté moteur');
      ajout(D, new THREE.BoxGeometry(0.1, 0.18, 1.1), m, 0.11, 0, 0, 'Tenon côté machine (à 90°)');
      ajout(D, new THREE.BoxGeometry(0.12, 0.05, 0.05), b.m.jaune, 0, 0.0, 0.0, 'Centre du disque');
      b.mobile(D, (o, c) => {
        // le centre du disque est à l'intersection des deux rainures : cercle à 2× la vitesse
        const u = new THREE.Vector3(0, Math.cos(c.theta), Math.sin(c.theta));
        const d = c.pB.clone().sub(c.pA); d.x = 0;
        o.position.lerpVectors(c.pA, c.pB, 0.5);
        o.position.y = c.pA.y; o.position.z = c.pA.z;
        o.position.addScaledVector(u, d.dot(u));
        o.quaternion.slerpQuaternions(c.qA, c.qB, 0.5).multiply(Rx(c.theta));
      });
      // trajectoire du centre du disque
      const traj = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64), new THREE.MeshBasicMaterial({ color: 0xfacc15, depthTest: false, transparent: true }));
      traj.renderOrder = 11;
      b.mobile(traj, (o, c) => {
        const d = c.pB.clone().sub(c.pA); d.x = 0;
        const r = d.length() / 2;
        o.visible = r > 0.01;
        o.scale.set(Math.max(r, 0.001), Math.max(r, 0.001), 1);
        o.position.lerpVectors(c.pA, c.pB, 0.5);
        o.position.y = c.pA.y + d.y / 2; o.position.z = c.pA.z + d.z / 2;
        o.rotation.set(0, Math.PI / 2, 0);
      });
    }
  },
  cardan: {
    g: 0,
    construire(b) {
      const n = 'Fourche (chape)';
      for (const [G, c] of [[b.A, -1], [b.B, 1]]) {
        ajout(G, cylX(0.32, 0.5), b.m.acier, c * 0.75, 0, 0, n);
        ajout(G, new THREE.BoxGeometry(0.5, 0.03, 0.08), b.m.jaune, c * 0.75, 0.325, 0, 'Repère de rotation');
        const pinsY = c < 0;   // fourche A : axes selon y ; fourche B : selon z
        ajout(G, pinsY ? new THREE.BoxGeometry(0.12, 1.05, 0.36) : new THREE.BoxGeometry(0.12, 0.36, 1.05), b.m.acier, c * 0.5, 0, 0, n);
        for (const s of [-1, 1]) {
          const y = pinsY ? s * 0.46 : 0, z = pinsY ? 0 : s * 0.46;
          ajout(G, pinsY ? new THREE.BoxGeometry(0.5, 0.12, 0.3) : new THREE.BoxGeometry(0.5, 0.3, 0.12), b.m.acier, c * 0.25, y, z, n);
          const bol = pinsY ? new THREE.CylinderGeometry(0.13, 0.13, 0.14, 24) : new THREE.CylinderGeometry(0.13, 0.13, 0.14, 24).rotateX(Math.PI / 2);
          ajout(G, bol, b.m.acierFonce, 0, y, z, 'Roulement à aiguilles (cuvette)');
        }
      }
      const m = b.charge(0xc28a3a, { metalness: 0.8, roughness: 0.35 });
      const Cr = new THREE.Group();
      ajout(Cr, new THREE.BoxGeometry(0.24, 0.24, 0.24), m, 0, 0, 0, 'Croisillon');
      ajout(Cr, new THREE.CylinderGeometry(0.07, 0.07, 0.86, 16), m, 0, 0, 0, 'Croisillon');
      ajout(Cr, new THREE.CylinderGeometry(0.07, 0.07, 0.86, 16).rotateX(Math.PI / 2), m, 0, 0, 0, 'Croisillon');
      ajout(Cr, new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8).rotateZ(Math.PI / 4), b.m.jaune, 0.12, 0.1, 0.1, 'Graisseur');
      const base = new THREE.Matrix4();
      b.mobile(Cr, (o, c) => {
        o.position.lerpVectors(c.pA, c.pB, 0.5);
        base.makeBasis(new THREE.Vector3().crossVectors(c.c1, c.c2), c.c1, c.c2);
        o.quaternion.setFromRotationMatrix(base);
      });
    }
  },
  soufflet: {
    g: 0.7,
    construire(b) {
      for (const [G, c] of [[b.A, -1], [b.B, 1]]) {
        moyeu(b, G, c, { rC: 0.33, lC: 0.45, rF: 0.42, eF: 0.16, mat: b.m.acier, nom: 'Moyeu à serrage' });
        ajout(G, new THREE.BoxGeometry(0.06, 0.12, 0.32), b.m.acierFonce, c * 0.36, 0.3, 0, 'Vis de serrage (pince)');
      }
      const m = b.charge(0xcfd6dd, { metalness: 0.95, roughness: 0.2 });
      const N = 9, P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      const courbe = new THREE.CubicBezierCurve3(...P);
      for (let i = 0; i < N; i++) {
        const t = (i + 0.5) / N;
        const R = new THREE.Group();
        ajout(R, new THREE.TorusGeometry(0.37, 0.05, 10, 40).rotateY(Math.PI / 2), m, 0, 0, 0, 'Soufflet inox (ondulation)');
        if (i === 4) ajout(R, new THREE.BoxGeometry(0.05, 0.03, 0.09), b.m.jaune, 0, 0.42, 0, 'Repère de rotation');
        b.mobile(R, (o, c) => {
          if (i === 0) {
            const L = c.pA.distanceTo(c.pB) / 3;
            P[0].copy(c.pA); P[1].copy(c.pA).addScaledVector(c.dA, L);
            P[2].copy(c.pB).addScaledVector(c.dB, -L); P[3].copy(c.pB);
          }
          o.position.copy(courbe.getPoint(t));
          o.quaternion.setFromUnitVectors(X, courbe.getTangent(t)).multiply(Rx(c.theta));
        });
      }
    }
  }
};
