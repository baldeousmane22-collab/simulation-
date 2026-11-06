// Vue de détail « loupe » : la pièce cliquée s'affiche en grand, tourne en continu,
// et peut passer en vue normale / vue éclatée / vue en coupe (section à côté).
// Réutilise three.js + OrbitControls (déjà dans le projet) et le vrai modèle 3D de la pièce :
// le groupe de la pièce est copié (clone) avec ses sous-composants et ses faces de coupe hachurées.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PIECES, ROT } from './touret.js';
import { clipPlane, lathe } from './geo.js';
import { buildSchema } from './schema.js';

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

// nom, numéro et infos d'une pièce à partir des données existantes (PIECES, ROT)
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

// clic dans la scène : premier point visible (non retiré par la coupe) appartenant à une pièce
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

// ---------------------------------------------------------------- sous-composants (vue éclatée), d'après la structure du modèle
// Renvoie [{ name, objs:[objets du modèle d'origine], dir:Vector3 (repère de la pièce), k:facteur de distance }]
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
export function subComponents(T, key) {
  const p = T.parts[key]; if (!p) return [];
  if (p.bearing) {                                     // roulement : bagues, cage, billes
    const b = p.bearing; const cageParts = [];
    b.cage.traverse(o => { if (o.isMesh && !b.balls.includes(o)) cageParts.push(o); });
    const u = [
      { name: 'Bague extérieure', objs: [b.outer], dir: X.clone(), k: 0.55 },
      { name: 'Bague intérieure', objs: [b.inner], dir: X.clone().negate(), k: 0.55 },
      { name: 'Cage', objs: cageParts, dir: X.clone().negate(), k: 0.18 },
    ];
    p.g.updateMatrixWorld(true); const c = new THREE.Vector3(); p.g.getWorldPosition(c);
    b.balls.forEach((ball, i) => {
      const w = ball.getWorldPosition(new THREE.Vector3()).sub(c); const d = new THREE.Vector3(0, w.y, w.z).normalize();
      u.push({ name: i === 0 ? `Billes (${b.balls.length})` : null, objs: [ball], dir: d, k: 0.32 });
    });
    return u;
  }
  if (key === '1' || key === 1) {                      // bâti : corps + 4 vis de fixation sur l'établi
    const body = [], bolts = {};
    p.g.traverse(o => {
      if (!o.isMesh || o.parent.userData.isCap) return;
      if (o.geometry.type === 'CylinderGeometry') { const id = o.position.x.toFixed(2) + '_' + o.position.z.toFixed(2); (bolts[id] = bolts[id] || []).push(o); }
      else body.push(o);
    });
    const u = [{ name: 'Corps du bâti (fonte)', objs: body, dir: new THREE.Vector3(), k: 0 }];
    Object.values(bolts).forEach((objs, i) => u.push({ name: i === 0 ? 'Vis de fixation sur l\'établi (4)' : null, objs, dir: Y.clone(), k: 0.5 }));
    return u;
  }
  if (key === '2' || key === 2) {                      // arbre : arbre + clavette de la poulie
    const shaft = [], keyM = [];
    p.g.traverse(o => { if (o.isMesh && !o.parent.userData.isCap) (o.geometry.type === 'BoxGeometry' ? keyM : shaft).push(o); });
    return [{ name: 'Arbre', objs: shaft, dir: new THREE.Vector3(), k: 0 }, { name: 'Clavette (poulie)', objs: keyM, dir: Y.clone(), k: 0.22 }];
  }
  return [];                                           // pièce monobloc
}

// ---------------------------------------------------------------- copie d'une pièce (pour la loupe)
// mode 'main' : sans coupe ; mode 'section' : coupée par le plan z = 0 de la pièce, faces de coupe hachurées gardées
function cloneMap(src, dst, map = new Map()) {
  map.set(src, dst);
  for (let i = 0; i < src.children.length; i++) cloneMap(src.children[i], dst.children[i], map);
  return map;
}
function makeClone(p, mode, mats) {
  const src = p.g; const clone = src.clone(true); const map = cloneMap(src, clone);
  clone.position.set(0, 0, 0); clone.rotation.set(0, 0, 0); clone.scale.set(1, 1, 1);
  const drop = [];
  clone.traverse(o => {
    const cap = o.userData.isCap || (o.parent && o.parent.userData.isCap);
    if (o.userData.isLabel || (cap && mode === 'main')) { if (o.userData.isLabel || o.userData.isCap) drop.push(o); return; }
    o.visible = true;
    if (o.material) {
      const conv = (m) => { const c = m.clone(); c.userData.srcPlanes = m.clippingPlanes || null; c.userData.cap = !!cap; if (c.emissive) c.emissive.setRGB(0, 0, 0);
        if (c.transparent && c.opacity < 0.5 && !c.map) c.opacity = 0.55; mats.push(c); return c; };
      o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    }
  });
  drop.forEach(o => o.parent && o.parent.remove(o));
  clone.updateMatrixWorld(true);
  const box = new THREE.Box3();
  clone.traverse(o => { if (o.isMesh && !(o.parent && o.parent.userData.isCap)) box.expandByObject(o); });
  const ctr = box.getCenter(new THREE.Vector3());
  clone.position.copy(ctr).negate(); clone.updateMatrixWorld(true);
  return { clone, map, box, ctr, radius: Math.max(0.2, box.getSize(new THREE.Vector3()).length() / 2) };
}
// plans de coupe des matériaux : la coupe générale de la scène est enlevée (vue principale) ou remplacée par le plan de section ;
// les autres plans (semelle plate du bâti) sont recalés sur la copie
function setPlanes(mats, offset, secPlane) {
  for (const m of mats) {
    const out = [];
    for (const pl of (m.userData.srcPlanes || [])) { if (pl === clipPlane) continue; out.push(pl.clone().translate(offset)); }
    if (secPlane && !m.userData.cap) out.push(secPlane);
    m.clippingPlanes = out.length ? out : null; m.clipShadows = false; m.needsUpdate = true;
  }
}

const ease = (u) => u * u * (3 - 2 * u);
const AMBER = new THREE.Color(0xf2a900);
const Ux = (px) => (px - 950) / 100;

// éléments 3D d'une zone (sur une copie) : bande translucide (zone axiale), encoches, ou sous-objets à éclairer
function zoneMeshes(z, clone, map, p, plane) {
  const bandMat = () => new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: plane ? [plane] : null });
  const out = { meshes: [], objs: [] };
  if (z.x && z.r) {
    const r0 = Math.max(0.01, z.r[0] - 0.03), r1 = z.r[1] + 0.03;
    const m = lathe([[r0, Ux(z.x[0])], [r1, Ux(z.x[0])], [r1, Ux(z.x[1])], [r0, Ux(z.x[1])], [r0, Ux(z.x[0])]], bandMat(), 96);
    m.rotation.z = -Math.PI / 2; m.userData.band = true; m.visible = false; m.renderOrder = 5;
    const g = new THREE.Group(); g.add(m); g.userData.band = true;
    // la bande suit la pièce si elle tourne sur elle-même (même groupe que le modèle)
    clone.add(g); out.meshes.push(m);
  }
  if (z.notch && p.lock) {
    const k = p.lock, w = Ux(k.xb) - Ux(k.xa), rm = k.R - k.nd / 2;
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, k.nd + 0.06, 2 * k.nw + 0.06), bandMat());
      const h = new THREE.Group(); h.rotation.x = a; b.position.set((Ux(k.xa) + Ux(k.xb)) / 2, rm, 0); b.userData.band = true; b.visible = false; h.add(b); h.userData.band = true;
      const sp = map.get(p.spin) || clone; sp.add(h); out.meshes.push(b);
    }
  }
  if (z.objs) z.objs.forEach(o => { const c = map.get(o); if (c) c.traverse(q => { if (q.isMesh) out.objs.push(q); }); });
  if (z.all) clone.traverse(q => { if (q.isMesh && !q.userData.band) out.objs.push(q); });
  return out;
}

// ---------------------------------------------------------------- la fenêtre de détail
export class DetailView {
  constructor(T, opts = {}) {
    this.T = T; this.onOpen = opts.onOpen; this.onClose = opts.onClose;
    this.el = document.getElementById('detail');
    const q = (s) => this.el.querySelector(s);
    this.box = q('.dv-3d'); this.schemaEl = q('.dv-schema'); this.note = q('.dv-note'); this.zoneTag = q('.dv-zone');
    this.title = q('#dv-title'); this.badge = q('.dv-badge'); this.sub = q('.dv-sub');
    this.btnPlay = q('#dv-play'); this.btnClose = q('#dv-close');
    this.modeBtns = [...this.el.querySelectorAll('[data-mode]')];
    this.open = false; this.spinning = true; this.renderer = null; this.lastFocus = null;
    this.mode = 'normal'; this.e = 0; this.hot = null; this.pinned = null;

    this.btnPlay.addEventListener('click', () => this.setSpin(!this.spinning));
    this.btnClose.addEventListener('click', () => this.close());
    q('#dv-close2').addEventListener('click', () => this.close());
    q('.dv-backdrop').addEventListener('click', () => this.close());
    this.modeBtns.forEach(b => b.addEventListener('click', () => this.setMode(b.dataset.mode)));
    this.el.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('keydown', (e) => { if (this.open && !this.el.contains(e.target)) this.onKey(e); });
    // schéma → modèle : survol et clic sur les repères (bulles, légende, zones du dessin)
    const zOf = (e) => { const g = e.target.closest && e.target.closest('[data-z]'); return g ? g.dataset.z : null; };
    this.schemaEl.addEventListener('pointerover', (e) => { const z = zOf(e); if (z && e.pointerType === 'mouse') this.highlight(z); });
    this.schemaEl.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse') this.highlight(this.pinned); });
    this.schemaEl.addEventListener('click', (e) => { const z = zOf(e); this.pin(z && z !== this.pinned ? z : null); });
    this.schemaEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const z = zOf(e); if (z) { e.preventDefault(); e.stopPropagation(); this.pin(z !== this.pinned ? z : null); } } });
  }
  ensureRenderer() {
    if (this.renderer) return;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.localClippingEnabled = true;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    this.box.insertBefore(r.domElement, this.box.firstChild); r.domElement.style.touchAction = 'none'; r.domElement.setAttribute('aria-hidden', 'true');
    const s = this.scene = new THREE.Scene();
    s.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.8;
    s.add(new THREE.HemisphereLight(0xffffff, 0x334050, 0.7));
    const k = new THREE.DirectionalLight(0xffffff, 2.0); k.position.set(4, 6, 5); s.add(k);
    const rim = new THREE.DirectionalLight(0xa9c8ff, 0.9); rim.position.set(-5, 2, -4); s.add(rim);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.01, 200);
    const c = this.controls = new OrbitControls(this.camera, r.domElement);
    c.enableDamping = true; c.dampingFactor = 0.08; c.enablePan = false; c.autoRotateSpeed = 2.2;   // lent : ~27 s par tour
    this.holder = new THREE.Group(); s.add(this.holder);
    new ResizeObserver(() => this.resize()).observe(this.box);
    // modèle → schéma : survol (souris) et toucher / clic court
    const dom = r.domElement; let down = null;
    dom.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !e.buttons) this.highlight(this.zoneAt(e) || this.pinned); });
    dom.addEventListener('pointerleave', () => this.highlight(this.pinned));
    dom.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    dom.addEventListener('pointerup', (e) => { if (!down) return; const mv = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (mv < 6) { const z = this.zoneAt(e); this.pin(z && z !== this.pinned ? z : null); } });
  }
  resize() {
    if (!this.renderer) return;
    const w = this.box.clientWidth || 300, h = this.box.clientHeight || 300;
    this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.W = w; this.H = h;
  }
  frame() {
    const a = Math.min(1, (this.W || 1) / (this.H || 1)), R = this.R * (this.mode === 'eclatee' ? 1.45 : 1);
    const d = R / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 0.95 / Math.max(0.55, a);
    const dir = this.mode === 'coupe' ? new THREE.Vector3(0.7, 0.4, 1) : new THREE.Vector3(0.55, 0.35, 0.78);
    this.camera.position.copy(dir.normalize().multiplyScalar(d)); this.camera.near = d / 100; this.camera.far = d * 10; this.camera.updateProjectionMatrix();
    this.controls.target.set(0, 0, 0); this.controls.minDistance = d * 0.3; this.controls.maxDistance = d * 3; this.controls.update();
  }
  show(key) {
    const p = this.T.parts[key]; if (!p) return;
    const info = partInfo(this.T, key);
    this.ensureRenderer(); this.clear(); this.key = key;
    // 1) le vrai modèle (sans coupe) et ses sous-composants pour la vue éclatée
    this.mats = [];
    const A = makeClone(p, 'main', this.mats); setPlanes(this.mats, A.clone.position, null);
    this.inner = A.clone; this.R = A.radius; this.holder.add(A.clone);
    this.units = [];
    const subs = subComponents(this.T, key);
    for (const u of subs) for (const o of u.objs) {
      const c = A.map.get(o); if (!c) continue;
      const base = c.position.clone();
      const wt = c.getWorldPosition(new THREE.Vector3()).add(u.dir.clone().multiplyScalar(u.k * A.radius * 2));
      this.units.push({ obj: c, base, target: c.parent.worldToLocal(wt) });
    }
    this.subNames = subs.map(u => u.name).filter(Boolean);
    // 2) la même pièce coupée par le plan de l'axe (vue en coupe), faces coupées hachurées
    this.matsS = [];
    const B = makeClone(p, 'section', this.matsS);
    const sec = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0).translate(B.clone.position);
    setPlanes(this.matsS, B.clone.position, sec);
    B.clone.traverse(o => { if (o.isMesh && o.geometry.type === 'SphereGeometry') { const w = o.getWorldPosition(new THREE.Vector3()); o.visible = sec.distanceToPoint(w) >= -0.02; } });
    this.innerS = B.clone; B.clone.visible = false; this.holder.add(B.clone);
    // 3) schéma technique + liaison des zones repérées avec les deux modèles
    const S = buildSchema(this.T, key, info);
    this.schemaEl.innerHTML = S.svg;
    this.zones = S.zones.map(z => ({ ...z, A: zoneMeshes(z, A.clone, A.map, p, null), B: zoneMeshes(z, B.clone, B.map, p, sec) }));
    this.zonesById = Object.fromEntries(this.zones.map(z => [z.id, z]));
    // 4) textes
    this.title.textContent = info.name;
    this.badge.textContent = info.num ? String(info.num) : '—';
    this.badge.style.background = '#' + new THREE.Color(info.color).getHexString();
    this.badge.title = info.num ? `Repère ${info.num}` : 'Sans repère sur le dessin';
    this.sub.textContent = [info.num ? `Repère ${info.num}` : 'Sans repère sur le dessin', info.matiere, info.rot ? 'Tourne avec l\'arbre' : 'Pièce fixe'].filter(Boolean).join(' · ');
    this.axisSpin = info.rot ? 0.25 : 0;
    if (!this.open) { this.lastFocus = document.activeElement; this.el.hidden = false; requestAnimationFrame(() => this.el.classList.add('show')); }
    this.open = true; this.resize();
    this.e = 0; this.pinned = null; this.hot = null; this.highlight(null);
    this.setMode('normal', true); this.frame(); this.setSpin(true);
    const clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.tick(Math.min(clock.getDelta(), 0.1)));
    this.btnClose.focus();
    if (this.onOpen) this.onOpen(key);
  }
  tick(dt) {
    const eT = this.mode === 'eclatee' ? 1 : 0;
    this.e += (eT - this.e) * Math.min(1, dt * 2.6);
    const k = ease(Math.max(0, Math.min(1, this.e)));
    for (const u of this.units) u.obj.position.lerpVectors(u.base, u.target, k);
    if (this.spinning && this.axisSpin && this.mode !== 'coupe') this.inner.rotation.x += dt * this.axisSpin * Math.PI * 2;
    if (this.hot) { const v = 0.45 + 0.25 * Math.sin(performance.now() / 160); this.hotObjs.forEach(m => m.material.emissive && m.material.emissive.copy(AMBER).multiplyScalar(v)); }
    this.controls.update(dt); this.renderer.render(this.scene, this.camera);
  }
  // zone sous le pointeur, sur le modèle visible
  zoneAt(e) {
    if (!this.zones || !this.zones.length) return null;
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const clone = this.mode === 'coupe' ? this.innerS : this.inner, side = this.mode === 'coupe' ? 'B' : 'A';
    const hits = ray.intersectObject(clone, true).filter(h => h.object.isMesh && !h.object.userData.band && visibleChain(h.object)
      && !(h.object.material.clippingPlanes || []).some(pl => pl.distanceToPoint(h.point) < 0));
    if (!hits.length) return null;
    const h = hits[0];
    for (const z of this.zones) if (z[side].objs.includes(h.object) && !z.all) return z.id;
    const l = clone.worldToLocal(h.point.clone()); const px = l.x * 100 + 950, rr = Math.hypot(l.y, l.z);
    let best = null, area = Infinity;
    for (const z of this.zones) {
      if (z.notch && this.T.parts[this.key].lock) { const k = this.T.parts[this.key].lock; if (Math.abs(rr - (k.R - k.nd)) < 0.05) return z.id; continue; }
      if (!z.x || !z.r) continue;
      if (px < Math.min(...z.x) - 3 || px > Math.max(...z.x) + 3 || rr < z.r[0] - 0.12 || rr > z.r[1] + 0.12) continue;
      const a = Math.abs(z.x[1] - z.x[0]) * (z.r[1] - z.r[0]); if (a < area) { area = a; best = z.id; }
    }
    if (best) return best;
    const all = this.zones.find(z => z.all); return all ? all.id : null;
  }
  pin(id) { this.pinned = id; this.highlight(id); }
  highlight(id) {
    if (id === this.hot) return;
    // éteindre l'ancienne zone
    if (this.hot && this.zonesById[this.hot]) { const z = this.zonesById[this.hot]; [...z.A.meshes, ...z.B.meshes].forEach(m => m.visible = false); }
    (this.hotObjs || []).forEach(m => m.material.emissive && m.material.emissive.setRGB(0, 0, 0)); this.hotObjs = [];
    this.schemaEl.querySelectorAll('.hot').forEach(n => n.classList.remove('hot'));
    this.hot = id || null;
    const z = id && this.zonesById ? this.zonesById[id] : null;
    if (!z) { this.zoneTag.hidden = true; return; }
    [...z.A.meshes, ...z.B.meshes].forEach(m => m.visible = true);
    this.hotObjs = [...z.A.objs, ...z.B.objs];
    this.schemaEl.querySelectorAll(`[data-z="${id}"]`).forEach(n => n.classList.add('hot'));
    this.zoneTag.hidden = false; this.zoneTag.innerHTML = `<b>${z.id}</b> ${z.label}`;
  }
  setMode(m, silent) {
    this.mode = m; this.el.classList.toggle('coupe', m === 'coupe');
    this.modeBtns.forEach(b => { const on = b.dataset.mode === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    if (this.inner) { this.inner.visible = m !== 'coupe'; this.innerS.visible = m === 'coupe'; }
    let txt = '';
    if (m === 'eclatee') txt = this.subNames && this.subNames.length > 1 ? 'Sous-composants : ' + this.subNames.join(' · ')
      : 'Pièce monobloc : elle est faite d\'une seule pièce, il n\'y a pas de sous-composants à séparer. Utilisez la vue en coupe pour voir son intérieur.';
    else if (m === 'coupe') txt = 'Vue en coupe par le plan de l\'axe : les faces coupées sont hachurées, l\'intérieur est visible.';
    this.note.textContent = txt; this.note.hidden = !txt;
    if (!silent && this.R) this.frame();
  }
  setSpin(on) {
    this.spinning = on;
    if (this.controls) { this.controls.autoRotate = on; if (!on && this.controls._sphericalDelta) this.controls._sphericalDelta.set(0, 0, 0); }   // arrêt net
    this.btnPlay.textContent = on ? '⏸ Rotation : pause' : '▶ Rotation : lecture';
    this.btnPlay.setAttribute('aria-pressed', String(!on));
  }
  clear() {
    this.highlight(null);
    if (this.inner) { this.holder.remove(this.inner); this.inner = null; }
    if (this.innerS) { this.holder.remove(this.innerS); this.innerS = null; }
    (this.zones || []).forEach(z => [...z.A.meshes, ...z.B.meshes].forEach(m => { m.geometry.dispose(); m.material.dispose(); }));
    [...(this.mats || []), ...(this.matsS || [])].forEach(m => m.dispose()); this.mats = []; this.matsS = []; this.units = []; this.zones = []; this.zonesById = {};
  }
  close() {
    if (!this.open) return;
    this.open = false; this.el.classList.remove('show');
    if (this.renderer) this.renderer.setAnimationLoop(null);
    setTimeout(() => { if (!this.open) { this.el.hidden = true; this.clear(); this.schemaEl.innerHTML = ''; } }, 220);
    if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus();
    if (this.onClose) this.onClose();
  }
  onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    else if (e.key === ' ' && e.target === document.body || (e.key === ' ' && e.target.id === 'dv-close')) { e.preventDefault(); this.setSpin(!this.spinning); }
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && this.controls._rotateLeft) { e.preventDefault(); this.controls._rotateLeft((e.key === 'ArrowLeft' ? -1 : 1) * 0.2); }
    else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && this.controls._rotateUp) { e.preventDefault(); this.controls._rotateUp((e.key === 'ArrowUp' ? -1 : 1) * 0.15); }
    else if (e.key === '1' || e.key === '2' || e.key === '3') this.setMode(['normal', 'eclatee', 'coupe'][+e.key - 1]);
    else if (e.key === 'Tab') {                         // focus maintenu dans la fenêtre
      const f = [...this.el.querySelectorAll('button, [tabindex="0"]')]; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }
}
