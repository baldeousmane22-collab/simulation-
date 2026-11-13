/* =====================================================================
   scene3d.js — Engrenages animés en 3D (Three.js embarqué)
   ---------------------------------------------------------------------
   Les dents ont un vrai profil en développante de cercle (α = 20°),
   calculé à partir du module et du nombre de dents. Les roues sont
   synchronisées : les dents restent engrenées pendant la rotation.
   Unités de la scène : millimètres.
   ===================================================================== */

import * as THREE from '../vendor/three.min.js';
import { OrbitControls, RoomEnvironment } from '../vendor/three.min.js';
import { fmt } from './calculs.js';

const ALPHA = 20 * Math.PI / 180;
const inv = (a) => Math.tan(a) - a;
const COUL = { menant: 0xf59e0b, mene: 0x3b82f6, trois: 0x22c55e, quatre: 0xa855f7, gris: 0x7c8899, arbre: 0xcbd5e1 };

/* Contour d'une roue (extérieure) ou du « creux » d'une couronne (intérieure) */
export function contour(Z, m, interne = false, parFlanc = 7) {
  const r = m * Z / 2, rb = r * Math.cos(ALPHA);
  const rIn = interne ? r - m : r - 1.25 * m;
  const rOut = interne ? r + 1.25 * m : r + m;
  const psiP = Math.PI / (2 * Z), invP = inv(ALPHA);
  const psi = (rr) => Math.max(0.004, psiP + invP - inv(rr > rb ? Math.acos(rb / rr) : 0));
  const pts = [], pol = (rr, a) => pts.push(new THREE.Vector2(rr * Math.cos(a), rr * Math.sin(a)));
  const pasDent = 2 * Math.PI / Z;
  for (let k = 0; k < Z; k++) {
    const c = k * pasDent;
    for (let i = 0; i <= parFlanc; i++) { const rr = rIn + (rOut - rIn) * i / parFlanc; pol(rr, c - psi(rr)); }
    pol(rOut, c);
    for (let i = parFlanc; i >= 0; i--) { const rr = rIn + (rOut - rIn) * i / parFlanc; pol(rr, c + psi(rr)); }
    const a0 = c + psi(rIn), a1 = c + pasDent - psi(rIn);
    for (let j = 1; j < 4; j++) pol(rIn, a0 + (a1 - a0) * j / 4);
  }
  return pts;
}

function cercle(R, trou = false) {
  const p = new THREE.Path();
  p.absarc(0, 0, R, 0, Math.PI * 2, trou);
  return p;
}

/* Géométrie d'une roue dentée extrudée (droite, hélicoïdale ou conique) */
function roueGeom(Z, m, b, o = {}) {
  let shape;
  if (o.interne) {
    shape = new THREE.Shape();
    shape.absarc(0, 0, o.rExt, 0, Math.PI * 2, false);
    shape.holes.push(new THREE.Path(contour(Z, m, true)));
  } else {
    shape = new THREE.Shape(contour(Z, m));
    const rf = m * Z / 2 - 1.25 * m, al = o.alesage ?? Math.max(m * 1.6, rf * 0.28);
    shape.holes.push(cercle(al, true));
    if (o.allegements !== false && rf - al > 9 * m) {           // trous d'allègement : rendent la rotation visible
      const n = 5, rc = (rf + al) / 2, rt = Math.min((rf - al) * 0.27, rc * Math.sin(Math.PI / n) * 0.7);
      for (let k = 0; k < n; k++) {
        const p = new THREE.Path(), a = k * 2 * Math.PI / n + Math.PI / n;
        p.absarc(rc * Math.cos(a), rc * Math.sin(a), rt, 0, Math.PI * 2, true);
        shape.holes.push(p);
      }
    }
  }
  const tordu = o.twist || o.cone;
  const g = new THREE.ExtrudeGeometry(shape, { depth: b, bevelEnabled: false, steps: tordu ? 12 : 1, curveSegments: 32 });
  g.translate(0, 0, o.cone ? -b : -b / 2);
  if (tordu) {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i); const z = pos.getZ(i);
      if (o.twist) {
        const a = o.twist * z / b, c = Math.cos(a), s = Math.sin(a);
        [x, y] = [x * c - y * s, x * s + y * c];
      }
      if (o.cone) { const k = (o.cone + z) / o.cone; x *= k; y *= k; }
      pos.setXY(i, x, y);
    }
  }
  g.computeVertexNormals();
  return g;
}

function cremaillereGeom(m, longueur, b) {
  const p = Math.PI * m, ta = Math.tan(ALPHA), n = Math.ceil(longueur / p);
  const s = new THREE.Shape(), x0 = -n * p / 2, bas = -1.25 * m - 3.5 * m;
  s.moveTo(x0, bas);
  for (let k = 0; k < n; k++) {
    const xc = x0 + (k + 0.5) * p;                         // centre de la dent
    const wPied = p / 4 + 1.25 * m * ta, wTete = p / 4 - m * ta;
    s.lineTo(xc - p / 2, -1.25 * m);
    s.lineTo(xc - wPied, -1.25 * m);
    s.lineTo(xc - wTete, m);
    s.lineTo(xc + wTete, m);
    s.lineTo(xc + wPied, -1.25 * m);
  }
  s.lineTo(-x0, -1.25 * m);
  s.lineTo(-x0, bas);
  const g = new THREE.ExtrudeGeometry(s, { depth: b, bevelEnabled: false });
  g.translate(0, 0, -b / 2);
  return g;
}

/* Filet de vis sans fin : trapèze balayé le long d'une hélice (axe local z) */
function filetGeom(m, d1, Zf, longueur) {
  const px = Math.PI * m, pz = px * Zf, ta = Math.tan(ALPHA);
  const rf = d1 / 2 - 1.25 * m, ra = d1 / 2 + m;
  const wP = px / 4 + 1.25 * m * ta, wT = px / 4 - m * ta;
  const prof = [[-wP, rf * 0.98], [-wT, ra], [wT, ra], [wP, rf * 0.98]];
  const tours = longueur / pz, S = Math.ceil(tours * 48);
  const pos = [], idx = [];
  for (let f = 0; f < Zf; f++) {
    for (let e = 0; e < 4; e++) {                           // 4 faces du trapèze
      const A = prof[e], B = prof[(e + 1) % 4], base = pos.length / 3;
      for (let i = 0; i <= S; i++) {
        const t = -Math.PI * tours + 2 * Math.PI * tours * i / S;
        const z0 = t * pz / (2 * Math.PI) + f * px, c = Math.cos(t), sn = Math.sin(t);
        for (const P of [A, B]) pos.push(P[1] * c, P[1] * sn, z0 + P[0]);
        if (i < S) { const q = base + i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* Flèche courbe indiquant le sens de rotation */
function flecheCourbe(R, ep, coul) {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: coul, emissive: coul, emissiveIntensity: 0.45, roughness: 0.5 });
  const arc = 1.25 * Math.PI;
  const tore = new THREE.Mesh(new THREE.TorusGeometry(R, ep, 8, 40, arc), mat);
  const pointe = new THREE.Mesh(new THREE.ConeGeometry(ep * 2.6, ep * 6, 14), mat);
  pointe.position.set(R * Math.cos(arc), R * Math.sin(arc), 0);
  pointe.rotation.z = arc;                                  // le cône pointe selon +y local → tangente CCW
  g.add(tore, pointe);
  return g;
}

export class Scene3D {
  constructor(canvas, calqueEtiquettes, surToucher) {
    this.canvas = canvas;
    this.calque = calqueEtiquettes;
    this.surToucher = surToucher;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMappingExposure = 0.85;
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
    const sol = new THREE.DirectionalLight(0xffffff, 1.5);
    sol.position.set(1, 2, 3);
    this.camera.add(sol);                                   // lumière qui suit la caméra : toujours bien éclairé
    this.scene.add(this.camera);
    this.racine = new THREE.Group();
    this.scene.add(this.racine);
    this.etiquettes = [];
    this.angle = 0;
    this.vitesse = 1;
    this.pause = false;
    this.montrerEtiq = true;
    this.temps = 0;
    this._tactile();
    this._redim();
    new ResizeObserver(() => this._redim()).observe(canvas.parentElement);
    let t0 = performance.now();
    const boucle = (t) => {
      const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
      if (!this.pause && this.maj) { this.temps += dt * this.vitesse; this.maj(this.temps); }
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
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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
    const hit = ray.intersectObjects(this.racine.children, true).find(h => h.object.userData.info || h.object.parent?.userData.info);
    const info = hit ? (hit.object.userData.info || hit.object.parent.userData.info) : null;
    this.surToucher?.(info);
  }

  _mat(c) { return new THREE.MeshStandardMaterial({ color: c, metalness: 0.55, roughness: 0.38, side: THREE.DoubleSide }); }

  /* Une roue : pivot fixe (position / orientation) + groupe tournant (axe z local) */
  _roue(Z, m, b, coul, info, o = {}) {
    const pivot = new THREE.Group(), rot = new THREE.Group();
    pivot.add(rot);
    const mesh = new THREE.Mesh(roueGeom(Z, m, b, o), this._mat(coul));
    mesh.userData.info = info;
    rot.add(mesh);
    if (!o.interne && o.arbre !== false) {
      const rf = m * Z / 2 - 1.25 * m, al = o.alesage ?? Math.max(m * 1.6, rf * 0.28);
      const Larb = o.longArbre ?? b * 3.2;
      const arbre = new THREE.Mesh(new THREE.CylinderGeometry(al, al, Larb, 28), this._mat(COUL.arbre));
      arbre.rotation.x = Math.PI / 2;
      arbre.position.z = o.decalArbre ?? (o.cone ? -b / 2 : -Larb / 2 + b / 2 + m);
      arbre.userData.info = { titre: 'Arbre', texte: 'Arbre lié en rotation à la roue (clavette).' };
      const clav = new THREE.Mesh(new THREE.BoxGeometry(al * 0.5, al * 0.5, Larb * 0.9), this._mat(0x64748b));
      clav.position.set(0, al, arbre.position.z);
      rot.add(arbre, clav);
    }
    this.racine.add(pivot);
    return { pivot, rot, mesh, Z, m, b };
  }

  _fleche(roue, R, z, coul) {
    const f = flecheCourbe(R, Math.max(R * 0.04, 0.6), coul);
    f.position.z = z;
    roue.pivot.add(f);
    roue.fleche = f;
  }
  _sens(roue, s) { if (roue.fleche) roue.fleche.scale.x = s >= 0 ? 1 : -1; }

  _etiq(objet, local, texte, classe = '') {
    const el = document.createElement('div');
    el.className = 'etiq3d ' + classe;
    el.textContent = texte;
    this.calque.appendChild(el);
    this.etiquettes.push({ el, objet, local: local.clone() });
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

  _vider() {
    this.racine.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.racine.clear();
    for (const e of this.etiquettes) e.el.remove();
    this.etiquettes = [];
  }

  recentrer(auto = true) {
    const box = new THREE.Box3().setFromObject(this.racine);
    const c = box.getCenter(new THREE.Vector3()), R = box.getSize(new THREE.Vector3()).length() / 2 || 50;
    const fv = this.camera.fov * Math.PI / 180, fh = 2 * Math.atan(Math.tan(fv / 2) * this.camera.aspect);
    const dist = R / Math.sin(Math.min(fv, fh) / 2) * 0.92;
    const dir = this.vueDir || new THREE.Vector3(0.5, 0.55, 1);
    this.controls.target.copy(c);
    this.camera.position.copy(c).addScaledVector(dir.clone().normalize(), dist);
    this.controls.minDistance = R * 0.3;
    this.controls.maxDistance = dist * 4;
    this.camera.near = Math.max(0.5, dist / 200); this.camera.far = dist * 20;
    this.camera.updateProjectionMatrix();
    if (auto) this.controls.update();
  }

  /* ---------- Construction de chaque type ---------- */
  construire(type, v, calc, garderVue) {
    const ancienne = garderVue ? { pos: this.camera.position.clone(), cible: this.controls.target.clone() } : null;
    this._vider();
    this.maj = null;
    const f = this['_' + type];
    if (f) f.call(this, v, calc.res);
    this.recentrer();
    if (ancienne && this._typePrec === type) {
      // garde l'orientation choisie par l'utilisateur, ajuste seulement la distance
      const nouv = this.camera.position.distanceTo(this.controls.target);
      const dir = ancienne.pos.clone().sub(ancienne.cible).normalize();
      this.camera.position.copy(this.controls.target).addScaledVector(dir, nouv);
    }
    this._typePrec = type;
    if (this.maj) this.maj(this.temps);
  }

  _paire(v, res, type) {
    const m = v.m, heli = type === 'helicoidale', mt = res.mt || m;
    const b = 8 * m, r1 = mt * v.Z1 / 2, r2 = mt * v.Z2 / 2;
    const tw1 = heli ? b * Math.tan(res.betaRad) / r1 : 0, tw2 = heli ? -b * Math.tan(res.betaRad) / r2 : 0;
    const g1 = this._roue(v.Z1, mt, b, COUL.menant, { titre: `Pignon menant Z1 = ${v.Z1}`, texte: `d1 = ${fmt(2 * r1, 1)} mm. Il reçoit le mouvement du moteur.` }, { twist: tw1 });
    const inter = type === 'interieur';
    let g2;
    if (inter) {
      g2 = this._roue(v.Z2, mt, b, COUL.gris, { titre: `Couronne Z2 = ${v.Z2}`, texte: 'Denture taillée à l\'intérieur. Le pignon et la couronne tournent dans le même sens.' }, { interne: true, rExt: r2 + 4.5 * m });
      g1.pivot.position.x = -(r2 - r1);                       // pignon à gauche du centre de la couronne
    } else {
      g2 = this._roue(v.Z2, mt, b, COUL.mene, { titre: `Roue menée Z2 = ${v.Z2}`, texte: `d2 = ${fmt(2 * r2, 1)} mm. Elle tourne en sens inverse du pignon.` }, { twist: tw2 });
      g2.pivot.position.x = res.a;
    }
    this._fleche(g1, r1 * 0.6, b / 2 + m, COUL.menant);
    this._fleche(g2, inter ? r2 + 2.2 * m : r2 * 0.6, b / 2 + m, inter ? 0xe2e8f0 : COUL.mene);
    this._etiq(g1.pivot, new THREE.Vector3(0, r1 + 2 * m, b / 2), `Z1 = ${v.Z1} · ${Math.round(v.n1)} tr/min`, 'menant');
    this._etiq(g2.pivot, new THREE.Vector3(0, inter ? -(r2 + 5 * m) : r2 + 2 * m, b / 2), `Z2 = ${v.Z2} · ${fmt(res.n2, 1)} tr/min`, inter ? '' : 'mene');
    const k = v.Z1 / v.Z2;
    this.maj = (t) => {
      g1.rot.rotation.z = t;
      g2.rot.rotation.z = inter ? Math.PI + (t - Math.PI) * k : Math.PI + Math.PI / v.Z2 - t * k;
    };
    this._sens(g1, 1); this._sens(g2, inter ? 1 : -1);
  }
  _droite(v, res) { this._paire(v, res, 'droite'); }
  _helicoidale(v, res) { this._paire(v, res, 'helicoidale'); }
  _interieur(v, res) { this._paire(v, res, 'interieur'); }

  _cremaillere(v, res) {
    const m = v.m, b = 8 * m, r = m * v.Z1 / 2;
    const g1 = this._roue(v.Z1, m, b, COUL.menant, { titre: `Pignon Z = ${v.Z1}`, texte: `d = ${fmt(2 * r, 1)} mm. Un tour fait avancer la crémaillère de π·d = ${fmt(Math.PI * 2 * r, 1)} mm.` });
    const Lr = Math.max(2 * Math.PI * r * 1.6, 30 * m);
    const g = cremaillereGeom(m, Lr, b);
    const crem = new THREE.Mesh(g, this._mat(COUL.mene));
    crem.userData.info = { titre: 'Crémaillère', texte: 'Roue de rayon infini : les flancs sont droits, inclinés de 20°. Transforme la rotation en translation.' };
    const piv = new THREE.Group(); piv.position.y = -r; piv.add(crem); this.racine.add(piv);
    this._fleche(g1, r * 0.6, b / 2 + m, COUL.menant);
    // flèche droite de translation
    const fl = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: COUL.mene, emissive: COUL.mene, emissiveIntensity: 0.5 });
    const tige = new THREE.Mesh(new THREE.CylinderGeometry(m * 0.35, m * 0.35, 10 * m, 12), mat); tige.rotation.z = Math.PI / 2;
    const pte = new THREE.Mesh(new THREE.ConeGeometry(m, 3 * m, 14), mat); pte.rotation.z = -Math.PI / 2; pte.position.x = 6 * m;
    fl.add(tige, pte); fl.position.set(0, -r - 8 * m, b / 2 + m); this.racine.add(fl);
    const p = Math.PI * m, nDents = Math.floor(Lr / p);
    const course = (nDents * p - 2 * Math.PI * r) / 2;      // reste visible devant le pignon
    const Th = Math.max(course, p) / r;
    this._etiq(g1.pivot, new THREE.Vector3(0, r + 2 * m, b / 2), `Pignon Z = ${v.Z1} · ${Math.round(v.n1)} tr/min`, 'menant');
    this._etiq(piv, new THREE.Vector3(0, -6.5 * m, b / 2), `Crémaillère · V = ${fmt(res.vit, 3)} m/s`, 'mene');
    const periode = 4 * Th;
    this.maj = (t) => {
      const u = ((t % periode) + periode) % periode;
      const th = u < 2 * Th ? u - Th : 3 * Th - u;            // aller-retour à vitesse constante
      const s = u < 2 * Th ? 1 : -1;
      g1.rot.rotation.z = th - Math.PI / 2;
      crem.position.x = th * r;
      this._sens(g1, s);
      fl.scale.x = s;
    };
    // dent du pignon vers le bas (angle −π/2) ↔ creux de la crémaillère en x = 0
    if (Math.ceil(Lr / p) % 2) crem.geometry.translate(p / 2, 0, 0);
  }

  _conique(v, res) {
    const m = v.m, R1 = m * v.Z1 / 2, R2 = m * v.Z2 / 2, f = 0.28;
    const b1 = f * R2, b2 = f * R1;
    const g1 = this._roue(v.Z1, m, b1, COUL.menant, { titre: `Pignon conique Z1 = ${v.Z1}`, texte: `δ1 = ${fmt(res.delta1 * 180 / Math.PI, 1)}°. Les sommets des deux cônes primitifs sont confondus.` },
      { cone: R2, allegements: false, longArbre: R2 * 0.9, decalArbre: R2 * 0.35 });
    g1.mesh.position.z = R2;
    g1.rot.children.filter(o => o !== g1.mesh).forEach(o => { o.position.z += R2; });
    const g2 = this._roue(v.Z2, m, b2, COUL.mene, { titre: `Roue conique Z2 = ${v.Z2}`, texte: 'Renvoi d\'angle à 90°. La roue et le pignon ont le même module au grand diamètre.' },
      { cone: R1, allegements: false, longArbre: R1 * 0.9, decalArbre: R1 * 0.35 });
    g2.mesh.position.z = R1;
    g2.rot.children.filter(o => o !== g2.mesh).forEach(o => { o.position.z += R1; });
    g2.pivot.rotation.y = Math.PI / 2;                          // axe z local → x du monde
    this._fleche(g1, R1 * 0.45, R2 + m, COUL.menant);
    this._fleche(g2, R2 * 0.45, R1 + m, COUL.mene);
    this._etiq(g1.pivot, new THREE.Vector3(0, R1 + 2 * m, R2), `Z1 = ${v.Z1} · ${Math.round(v.n1)} tr/min`, 'menant');
    this._etiq(g2.pivot, new THREE.Vector3(0, R2 + 2 * m, R1), `Z2 = ${v.Z2} · ${fmt(res.n2, 1)} tr/min`, 'mene');
    const k = v.Z1 / v.Z2;
    this._sens(g1, 1); this._sens(g2, -1);
    this.maj = (t) => { g1.rot.rotation.z = t; g2.rot.rotation.z = Math.PI + Math.PI / v.Z2 - t * k; };
    this.vueDir = new THREE.Vector3(1, 0.8, 1);
  }

  _vis(v, res) {
    const m = v.m, d1 = res.d1, r2 = res.d2 / 2, b2 = Math.min(0.75 * d1, 12 * m);
    const roue = this._roue(v.Z2, m, b2, COUL.mene, { titre: `Roue Z2 = ${v.Z2}`, texte: `Dentée en hélice (inclinaison γ = ${fmt(res.gam * 180 / Math.PI, 1)}°) pour épouser le filet de la vis.` },
      { twist: b2 * Math.tan(res.gam) / r2 });
    const L = Math.max(d1 * 2.6, 10 * Math.PI * m);
    const piv = new THREE.Group(), rot = new THREE.Group();
    piv.add(rot); piv.position.y = res.a; piv.rotation.y = Math.PI / 2; this.racine.add(piv);
    const mt = this._mat(COUL.menant);
    const noyau = new THREE.Mesh(new THREE.CylinderGeometry(d1 / 2 - 1.25 * m, d1 / 2 - 1.25 * m, L, 40), mt);
    noyau.rotation.x = Math.PI / 2;
    const filet = new THREE.Mesh(filetGeom(m, d1, v.Zf, L - Math.PI * m * v.Zf * 0.6), mt);
    const info = { titre: `Vis sans fin à ${v.Zf} filet${v.Zf > 1 ? 's' : ''}`, texte: `d1 = ${fmt(d1, 1)} mm. Un tour de vis fait tourner la roue de ${v.Zf} dent${v.Zf > 1 ? 's' : ''}.` };
    noyau.userData.info = filet.userData.info = info;
    const ar = new THREE.Mesh(new THREE.CylinderGeometry(d1 * 0.22, d1 * 0.22, L * 1.7, 24), this._mat(COUL.arbre));
    ar.rotation.x = Math.PI / 2;
    rot.add(noyau, filet, ar);
    const vis = { pivot: piv, rot };
    this._fleche(vis, d1 * 0.62, L / 2 + 2 * m, COUL.menant);
    this._fleche(roue, r2 * 0.6, b2 / 2 + m, COUL.mene);
    this._etiq(piv, new THREE.Vector3(0, -(d1 / 2 + 3 * m), -L * 0.45), `Vis Zf = ${v.Zf} · ${Math.round(v.n1)} tr/min`, 'menant');
    this._etiq(roue.pivot, new THREE.Vector3(0, -(r2 + 3 * m), b2 / 2), `Roue Z2 = ${v.Z2} · ${fmt(res.n2, 1)} tr/min`, 'mene');
    this._sens(vis, 1); this._sens(roue, 1);
    const px = res.px, pz = res.pz;
    const vitVis = 3;                                           // la vis tourne plus vite pour bien voir la roue avancer
    this.maj = (t) => {
      const th = t * vitVis;
      rot.rotation.z = th;
      roue.rot.rotation.z = Math.PI / 2 + ((Math.PI / 2 + th) * pz / (2 * Math.PI) - px / 2) / r2;
    };
    this.vueDir = new THREE.Vector3(0.9, 0.5, 1);
  }

  _train(v, res) {
    const m = v.m, b = 7 * m, gap = 2 * m;
    const r1 = m * v.Z1 / 2, r2 = m * v.Z2 / 2, r3 = m * v.Z3 / 2, r4 = m * v.Z4 / 2;
    const g1 = this._roue(v.Z1, m, b, COUL.menant, { titre: `Z1 = ${v.Z1} (menant)`, texte: 'Pignon de l\'arbre d\'entrée.' }, { longArbre: 3 * b + gap, decalArbre: -b });
    const g2 = this._roue(v.Z2, m, b, COUL.mene, { titre: `Z2 = ${v.Z2} (mené)`, texte: 'Roue de l\'arbre intermédiaire.' }, { longArbre: 2 * b + 2 * gap + b, decalArbre: b / 2 + gap / 2 });
    const g3 = this._roue(v.Z3, m, b, COUL.trois, { titre: `Z3 = ${v.Z3} (menant)`, texte: 'Pignon claveté sur l\'arbre intermédiaire : il tourne avec Z2 (n3 = n2).' }, { arbre: false });
    const g4 = this._roue(v.Z4, m, b, COUL.quatre, { titre: `Z4 = ${v.Z4} (mené)`, texte: 'Roue de l\'arbre de sortie.' }, { longArbre: 3 * b + gap, decalArbre: b + gap });
    const gam = -0.9;                                         // direction arbre intermédiaire → arbre de sortie
    g2.pivot.position.x = res.a12;
    g3.pivot.position.set(res.a12, 0, b + gap);
    g4.pivot.position.set(res.a12 + res.a34 * Math.cos(gam), res.a34 * Math.sin(gam), b + gap);
    this._fleche(g1, r1 * 0.6, b / 2 + m, COUL.menant);
    this._fleche(g2, Math.min(r2 - 2.5 * m, Math.max(r2 * 0.7, r3 + 2.5 * m)), b / 2 + m * 0.6, COUL.mene);
    this._fleche(g4, r4 * 0.6, b / 2 + m, COUL.quatre);
    this._etiq(g1.pivot, new THREE.Vector3(0, r1 + 2 * m, 0), `Z1 = ${v.Z1} · ${Math.round(v.n1)} tr/min`, 'menant');
    this._etiq(g2.pivot, new THREE.Vector3(0, r2 + 2 * m, 0), `Z2 = ${v.Z2} · ${fmt(res.n2, 1)} tr/min`, 'mene');
    this._etiq(g3.pivot, new THREE.Vector3(-r3 * 0.2, -r3 * 0.9, b / 2), `Z3 = ${v.Z3}`, 'trois');
    this._etiq(g4.pivot, new THREE.Vector3(r4 * 0.3, -(r4 + 2 * m), b / 2), `Z4 = ${v.Z4} · ${fmt(res.n4, 1)} tr/min`, 'quatre');
    this._sens(g1, 1); this._sens(g2, -1); this._sens(g4, 1);
    const k12 = v.Z1 / v.Z2, k34 = v.Z3 / v.Z4;
    this.maj = (t) => {
      g1.rot.rotation.z = t;
      const t2 = Math.PI + Math.PI / v.Z2 - t * k12;
      g2.rot.rotation.z = t2; g3.rot.rotation.z = t2;
      g4.rot.rotation.z = gam + Math.PI + Math.PI / v.Z4 - (t2 - gam) * k34;
    };
    this.vueDir = new THREE.Vector3(0.5, 0.35, 1);
  }

  _epicycloidal(v, res) {
    const m = v.m, b = 7 * m, Zs = v.Zs, Zp = v.Zp, Zc = res.Zc;
    const rs = m * Zs / 2, rp = m * Zp / 2, rc = m * Zc / 2, a = rs + rp;
    const sol = this._roue(Zs, m, b, COUL.menant, { titre: `Planétaire (soleil) Zs = ${Zs}`, texte: 'Entrée du mouvement.' }, { allegements: false, longArbre: 4 * b, decalArbre: 1.5 * b });
    const cour = this._roue(Zc, m, b, COUL.gris, { titre: `Couronne Zc = ${Zc} (fixe)`, texte: 'Couronne à denture intérieure, bloquée sur le carter.' }, { interne: true, rExt: rc + 4 * m });
    const ps = new THREE.Group(); this.racine.add(ps);
    const plat = new THREE.Shape(); plat.absarc(0, 0, a + rp * 0.55, 0, Math.PI * 2, false);
    const platG = new THREE.ExtrudeGeometry(plat, { depth: m * 1.5, bevelEnabled: false, curveSegments: 48 });
    const plateau = new THREE.Mesh(platG, this._mat(0x15803d));
    plateau.position.z = -b / 2 - 2.2 * m;
    plateau.userData.info = { titre: 'Porte-satellites (sortie)', texte: 'Il porte les axes des satellites et tourne lentement : c\'est l\'arbre de sortie.' };
    const arbreS = new THREE.Mesh(new THREE.CylinderGeometry(rs * 0.45, rs * 0.45, 4 * b, 28), this._mat(COUL.arbre));
    arbreS.rotation.x = Math.PI / 2; arbreS.position.z = plateau.position.z - 2 * b;
    const clav = new THREE.Mesh(new THREE.BoxGeometry(rs * 0.2, rs * 0.2, 3.6 * b), this._mat(0x64748b));
    clav.position.set(0, rs * 0.45, arbreS.position.z);
    ps.add(plateau, arbreS, clav);
    sol.pivot.position.z = 0;
    sol.rot.children.forEach(o => { if (o !== sol.mesh) o.position.z = b * 1.6; });   // arbre d'entrée vers l'avant
    const sats = [];
    for (let k = 0; k < 3; k++) {
      const gk = k * 2 * Math.PI / 3;
      const s = this._roue(Zp, m, b, COUL.mene, { titre: `Satellite Zp = ${Zp}`, texte: 'Il engrène à la fois avec le planétaire et la couronne, et tourne sur son axe porté par le porte-satellites.' },
        { alesage: rp * 0.3, allegements: false, longArbre: 2 * m + b, decalArbre: -m * 1.5 });
      this.racine.remove(s.pivot); ps.add(s.pivot);
      s.pivot.position.set(a * Math.cos(gk), a * Math.sin(gk), 0);
      sats.push({ s, gk });
    }
    this._fleche(sol, rs * 0.55, b / 2 + m, COUL.menant);
    const fps = flecheCourbe(rc + 2 * m, m * 0.6, COUL.trois); fps.position.z = -b / 2 - 2.5 * m; fps.rotation.y = Math.PI; fps.scale.x = -1;
    this.racine.add(fps);
    this._etiq(sol.pivot, new THREE.Vector3(0, 0, b * 1.2), `Planétaire Zs = ${Zs} · ${Math.round(v.n1)} tr/min`, 'menant');
    this._etiq(cour.pivot, new THREE.Vector3(0, rc + 5.5 * m, 0), `Couronne fixe Zc = ${Zc}`);
    this._etiq(ps, new THREE.Vector3(0, -(rc + 6 * m), -b), `Porte-satellites · ${fmt(res.nps, 1)} tr/min`, 'trois');
    this._etiq(sats[0].s.pivot, new THREE.Vector3(0, 0, b / 2 + m), `Satellite Zp = ${Zp}`, 'mene');
    const kps = Zs / (Zs + Zc);
    // phase de la couronne calculée pour le satellite n°1 (les autres suivent si (Zs + Zc)/3 est entier)
    const g0 = 0, thP0 = g0 + Math.PI + Math.PI / Zp;
    cour.rot.rotation.z = g0 + (thP0 - g0) * Zp / Zc;
    this._sens(sol, 1);
    this.maj = (t) => {
      const ths = t, phi = t * kps;
      sol.rot.rotation.z = ths;
      ps.rotation.z = phi;
      const rel = ths - phi;
      for (const { s, gk } of sats) s.rot.rotation.z = gk + Math.PI + Math.PI / Zp - (rel - gk) * Zs / Zp;
    };
    this.vueDir = new THREE.Vector3(0.3, 0.4, 1);
  }
}
