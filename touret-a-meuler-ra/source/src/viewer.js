// Generic interactive 3D viewer: renderer, studio, orbit controls, toolbar
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { clipPlane } from './geo.js';

export function gradientTex(top, bottom) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Viewer {
  constructor(container, opts = {}) {
    this.container = container;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!opts.alpha, preserveDrawingBuffer: !!opts.capture });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.capture ? 1 : 2));
    r.localClippingEnabled = true;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(r.domElement);
    r.domElement.style.touchAction = 'none';
    Object.assign(r.domElement.style, { position: 'absolute', left: '0', top: '0' });
    const s = this.scene = new THREE.Scene();
    s.background = gradientTex('#1b3556', '#0b1626');
    const pm = new THREE.PMREMGenerator(r);
    const es = new THREE.Scene();
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#9fb3c9'); gr.addColorStop(0.55, '#3d4a5a'); gr.addColorStop(1, '#151b24');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 256); g.fillStyle = '#fff'; g.fillRect(60, 40, 120, 40); g.fillRect(330, 30, 140, 30);
    const et = new THREE.CanvasTexture(c); et.mapping = THREE.EquirectangularReflectionMapping; et.colorSpace = THREE.SRGBColorSpace;
    es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: et, side: THREE.BackSide })));
    s.environment = pm.fromScene(es, 0.02).texture;
    s.add(new THREE.HemisphereLight(0xdfe9ff, 0x1a2230, 0.6));
    const key = this.key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(6, 12, 9); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, far: 60 });
    key.shadow.bias = -0.0005; s.add(key);
    const rim = new THREE.DirectionalLight(0x9cc4ff, 1.0); rim.position.set(-8, 4, -6); s.add(rim);
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.35 }));
    this.floor.rotation.x = -Math.PI / 2; this.floor.receiveShadow = true; s.add(this.floor);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
    const head = new THREE.PointLight(0xffffff, 1.6, 0, 0); this.camera.add(head); s.add(this.camera);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.zoomSpeed = 0.9; this.controls.rotateSpeed = 0.8;
    this.root = new THREE.Group(); s.add(this.root);
    this.P = { t: 0, speed: 1, playing: true, cut: false, explode: 0, labels: true, mode: null };
    this.clock = new THREE.Clock();
    this.resize(); window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(container);
    if (!opts.capture && !opts.noLoop) { const loop = () => { this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }
  resize() {
    const w = this.container.clientWidth || 640, h = this.container.clientHeight || 400;
    this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  clear() {
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    this.scene.remove(this.root); this.root = new THREE.Group(); this.scene.add(this.root);
  }
  load(def, preset = {}) {
    this.clear();
    this.def = def;
    this.P = Object.assign({ t: 0, speed: 1, playing: true, cut: !!def.cut, explode: def.explode0 || 0, labels: true, mode: def.mode0 || null }, preset);
    this.floor.position.y = def.floorY || 0;
    this.scene.background = def.bg ? gradientTex(def.bg[0], def.bg[1]) : gradientTex('#1b3556', '#0b1626');
    this.floor.material.opacity = def.bg ? 0.18 : 0.35;
    this.inst = def.build(this.root, this.P, this);
    this.resetView();
    this.applyState();
  }
  resetView() {
    const c = this.inst.cam || this.def.cam;
    this.camera.position.set(c[0], c[1], c[2]); this.controls.target.set(c[3], c[4], c[5]);
    this.controls.minDistance = (this.def.minD || 2); this.controls.maxDistance = (this.def.maxD || 60);
    this.controls.update();
  }
  applyState() {
    clipPlane.constant = this.P.cut ? 0 : 1e4;
    this.root.traverse(o => {
      if (o.userData.isCap) o.visible = this.P.cut;
      if (o.userData.isLabel) o.visible = this.P.labels && (o.userData.show !== false);
    });
    if (this.inst.onState) this.inst.onState(this.P);
  }
  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (this.P.playing) this.P.t += dt * this.P.speed;
    this.controls.update();
    this.inst && this.inst.update(this.P.t, this.P);
    this.renderer.render(this.scene, this.camera);
  }
  renderAt(t, w, h) {   // for video capture
    this.P.t = t; this.inst.update(t, this.P); this.renderer.render(this.scene, this.camera);
  }
}
