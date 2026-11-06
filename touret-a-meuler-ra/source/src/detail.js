// Vue de détail « loupe » : la pièce cliquée apparaît en grand, au premier plan, et tourne en continu.
// Réutilise three.js + OrbitControls (déjà dans le projet) et le modèle 3D réel de la pièce (clone de son groupe).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PIECES, ROT } from './touret.js';

// pièces sans repère sur le dessin : noms affichés
export const EXTRA_NAMES = {
  rp: 'Rondelle frein (côté poulie)', rm: 'Rondelle frein (côté meule)', em: 'Écrou à encoches (côté meule)',
  cm: 'Capuchon (côté meule)', vg: 'Vis de fixation (gauche)', bc: 'Bague de centrage de la meule',
  '16b': "Joint d'étanchéité (droit)", '17b': 'Flasque de serrage (intérieur)',
};
const MATIERE = {
  1: 'Fonte peinte', 2: 'Acier usiné (rectifié aux portées)', 3: 'Acier à roulement', 4: 'Acier à roulement', 5: 'Acier', 6: 'Acier zingué',
  7: 'Acier bruni', 8: 'Acier', 9: 'Papier fibre', 10: 'Fonte peinte', 11: 'Tôle d\'acier', 12: 'Fonte', 13: 'Tôle d\'acier peinte',
  14: 'Fonte peinte', 15: 'Abrasif (corindon) aggloméré', 16: 'Caoutchouc', 17: 'Acier', 18: 'Acier bruni', 19: 'Tôle emboutie', 20: 'Acier bruni',
  rp: 'Acier zingué', rm: 'Acier zingué', em: 'Acier bruni', cm: 'Tôle emboutie', vg: 'Acier bruni', bc: 'Plastique',
};

// nom, numéro et infos d'une pièce à partir des données existantes (PIECES, ROT, REAL)
export function partInfo(T, key) {
  const p = T.parts[key]; if (!p) return null;
  const num = p.num || null;
  const name = EXTRA_NAMES[key] || (num && PIECES[num] ? PIECES[num][0] : String(key));
  const rot = num ? ROT.has(num) : !!p.rot;
  return { key, num, name, rot, matiere: MATIERE[key] || MATIERE[num] || '', color: num && PIECES[num] ? PIECES[num][1] : (p.col || 0x9aa4b1) };
}

// table maillage → clé de pièce (pour le clic dans la scène)
export function tagMeshes(T) {
  for (const [key, p] of Object.entries(T.parts)) p.g.traverse(o => { if (o.isMesh || o.isLine) o.userData.partKey = key; });
}

// clic dans la scène : premier point visible (non coupé par les plans de coupe) appartenant à une pièce
export function pickPart(event, camera, root, dom) {
  const r = dom.getBoundingClientRect();
  const ndc = new THREE.Vector2(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
  const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObject(root, true);
  let glass = null;                                   // pièce transparente (carter) : on regarde d'abord à travers
  for (const h of hits) {
    const o = h.object;
    if (!o.isMesh || !visibleChain(o)) continue;
    if (o.userData.isLabel || (o.parent && o.parent.userData.isLabel)) continue;
    const planes = o.material && o.material.clippingPlanes;
    if (planes && planes.some(pl => pl.distanceToPoint(h.point) < 0)) continue;   // partie retirée par la coupe
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && m.transparent && m.opacity < 0.5 && !m.map) { if (!glass && o.userData.partKey) glass = o.userData.partKey; continue; }
    return o.userData.partKey || glass;                                          // décor (établi) → pas de pièce
  }
  return glass;
}
function visibleChain(o) { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; }

// ---------------------------------------------------------------- la fenêtre de détail
export class DetailView {
  constructor(T, opts = {}) {
    this.T = T; this.onOpen = opts.onOpen; this.onClose = opts.onClose;
    this.el = document.getElementById('detail');
    this.box = this.el.querySelector('.dv-canvas');
    this.title = this.el.querySelector('#dv-title');
    this.badge = this.el.querySelector('.dv-badge');
    this.sub = this.el.querySelector('.dv-sub');
    this.btnPlay = this.el.querySelector('#dv-play');
    this.btnClose = this.el.querySelector('#dv-close');
    this.open = false; this.spinning = true; this.renderer = null; this.lastFocus = null;

    this.btnPlay.addEventListener('click', () => this.setSpin(!this.spinning));
    this.btnClose.addEventListener('click', () => this.close());
    this.el.querySelector('.dv-backdrop').addEventListener('click', () => this.close());
    this.el.querySelector('#dv-reset').addEventListener('click', () => this.frame());
    this.el.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('keydown', (e) => { if (this.open && !this.el.contains(e.target)) this.onKey(e); });
  }
  ensureRenderer() {
    if (this.renderer) return;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    this.box.appendChild(r.domElement); r.domElement.style.touchAction = 'none';
    r.domElement.setAttribute('aria-hidden', 'true');
    const s = this.scene = new THREE.Scene();
    s.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.8;
    s.add(new THREE.HemisphereLight(0xffffff, 0x334050, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(4, 6, 5); s.add(key);
    const rim = new THREE.DirectionalLight(0xa9c8ff, 0.9); rim.position.set(-5, 2, -4); s.add(rim);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.01, 200);
    const c = this.controls = new OrbitControls(this.camera, r.domElement);
    c.enableDamping = true; c.dampingFactor = 0.08; c.enablePan = false; c.autoRotateSpeed = 4.0;
    this.holder = new THREE.Group(); s.add(this.holder);
    new ResizeObserver(() => this.resize()).observe(this.box);
  }
  resize() {
    if (!this.renderer) return;
    const w = this.box.clientWidth || 300, h = this.box.clientHeight || 300;
    this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  // copie du vrai modèle de la pièce : sans coupe, sans hachures, toutes ses sous-pièces visibles
  buildClone(p) {
    const src = p.g; const clone = src.clone(true);
    const drop = []; this.mats = [];
    clone.traverse(o => {
      if (o.userData.isCap || o.userData.isLabel) { drop.push(o); return; }
      o.visible = true;
      if (o.material) {
        const mm = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
          const c = m.clone(); c.clippingPlanes = null; c.clipShadows = false;
          if (c.emissive) c.emissive.setRGB(0, 0, 0);
          if (c.transparent && c.opacity < 0.5 && !c.map) c.opacity = 0.55;       // carter : un peu plus visible seul
          this.mats.push(c); return c;
        });
        o.material = Array.isArray(o.material) ? mm : mm[0];
      }
    });
    drop.forEach(o => o.parent && o.parent.remove(o));
    clone.position.set(0, 0, 0); clone.rotation.set(0, 0, 0); clone.scale.set(1, 1, 1);
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone); const ctr = box.getCenter(new THREE.Vector3());
    clone.position.sub(ctr);
    this.radius = Math.max(0.2, box.getSize(new THREE.Vector3()).length() / 2);
    return clone;
  }
  frame() {
    const R = this.radius, a = Math.min(1, this.camera.aspect), d = R / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 0.82 / Math.max(0.55, a);
    this.camera.position.set(d * 0.55, d * 0.35, d * 0.78); this.camera.near = d / 100; this.camera.far = d * 10; this.camera.updateProjectionMatrix();
    this.controls.target.set(0, 0, 0); this.controls.minDistance = d * 0.35; this.controls.maxDistance = d * 3; this.controls.update();
  }
  show(key) {
    const p = this.T.parts[key]; if (!p) return;
    const info = partInfo(this.T, key);
    this.ensureRenderer(); this.clear();
    const clone = this.buildClone(p);
    // la pièce tourne aussi sur son propre axe si elle tourne dans la machine (l'axe de l'arbre = X)
    this.inner = clone; this.axisSpin = info.rot ? 0.6 : 0;
    this.holder.add(clone);
    this.title.textContent = info.name;
    this.badge.textContent = info.num ? String(info.num) : '—';
    this.badge.style.background = '#' + new THREE.Color(info.color).getHexString();
    this.badge.title = info.num ? `Repère ${info.num}` : 'Sans repère sur le dessin';
    this.sub.textContent = [info.num ? `Repère ${info.num}` : 'Sans repère sur le dessin', info.matiere, info.rot ? 'Tourne avec l\'arbre' : 'Pièce fixe'].filter(Boolean).join(' · ');
    if (!this.open) { this.lastFocus = document.activeElement; this.el.hidden = false; requestAnimationFrame(() => this.el.classList.add('show')); }
    this.open = true; this.resize(); this.frame(); this.setSpin(true);
    const clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.1);
      if (this.spinning && this.axisSpin) this.inner.rotation.x += dt * this.axisSpin * Math.PI * 2;
      this.controls.update(dt); this.renderer.render(this.scene, this.camera);
    });
    this.btnClose.focus();
    if (this.onOpen) this.onOpen(key);
  }
  setSpin(on) {
    this.spinning = on; if (this.controls) { this.controls.autoRotate = on; if (!on && this.controls._sphericalDelta) this.controls._sphericalDelta.set(0, 0, 0); }   // arrêt net
    this.btnPlay.textContent = on ? '⏸ Pause' : '▶ Lecture';
    this.btnPlay.setAttribute('aria-pressed', String(!on));
  }
  clear() {
    if (this.inner) { this.holder.remove(this.inner); this.inner = null; }
    (this.mats || []).forEach(m => m.dispose()); this.mats = [];
  }
  close() {
    if (!this.open) return;
    this.open = false; this.el.classList.remove('show');
    if (this.renderer) this.renderer.setAnimationLoop(null);
    setTimeout(() => { if (!this.open) { this.el.hidden = true; this.clear(); } }, 220);
    if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus();
    if (this.onClose) this.onClose();
  }
  onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    else if (e.key === ' ' && e.target !== this.btnPlay) { e.preventDefault(); this.setSpin(!this.spinning); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); this.holder.rotation.y += (e.key === 'ArrowLeft' ? -1 : 1) * 0.2; }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this.holder.rotation.x += (e.key === 'ArrowUp' ? -1 : 1) * 0.2; }
    else if (e.key === 'Tab') {                         // focus maintenu dans la fenêtre
      const f = [...this.el.querySelectorAll('button')]; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }
}
