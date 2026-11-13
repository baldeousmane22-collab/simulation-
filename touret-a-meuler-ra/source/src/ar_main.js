// Touret à meuler — simulation 3D animée en RÉALITÉ AUGMENTÉE (WebXR, Chrome Android + ARCore)
// Sans AR : même simulation en 3D classique (doigt pour tourner, pincer pour zoomer).
import * as THREE from 'three';
import { Viewer } from './viewer.js';
import { touretScene } from './scene_touret.js';
import { PIECES } from './touret.js';
import { clipPlane } from './geo.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GrinderSound } from './realism.js';
import { DetailView, tagMeshes, pickPart } from './detail.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const box = $('v3d');
const v = new Viewer(box, { alpha: true, noLoop: true });
v.load(touretScene, { cut: false, explode: 0, mode: 'reel', labels: false });
const T = window.TOURET;
{ const pm = new THREE.PMREMGenerator(v.renderer); v.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; v.scene.environmentIntensity = 0.7; }
v.floor.visible = false;                       // l'établi reçoit les ombres
v.renderer.toneMappingExposure = 1.0;
const sound = new GrinderSound();
// ---------------------------------------------------------------- clic sur une pièce → vue de détail (loupe)
tagMeshes(T);
const detail = new DetailView(T);
window.DETAIL = detail;
{
  const dom = v.renderer.domElement; let down = null;
  dom.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  dom.addEventListener('pointerup', (e) => {
    if (!down || inAR) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
    if (moved > 6 || dt > 500) return;                       // c'était une rotation de la vue, pas un clic
    const key = pickPart(e, v.camera, v.root, dom);
    if (key) detail.show(key);
  });
  dom.addEventListener('pointermove', (e) => {
    if (inAR || e.buttons || e.pointerType !== 'mouse') return;
    dom.style.cursor = pickPart(e, v.camera, v.root, dom) ? 'pointer' : '';
  });
}
// rendu « studio » sur l'écran (pas en RA) : occlusion ambiante (ordinateur) + halo des étincelles
const strong = !(navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 820);
let composer = null, gtao = null;
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, v.camera));
  if (strong) { gtao = new GTAOPass(scene, v.camera, 2, 2); gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.5, thickness: 1.5, scale: 1.2 }); gtao.blendIntensity = 0.85; composer.addPass(gtao); }
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.35, 1.05));
  composer.addPass(new OutputPass());
  if (strong) { v.key.shadow.mapSize.set(4096, 4096); }
} catch (e) { composer = null; }
const sizeComposer = () => { if (!composer) return; const w = box.clientWidth || 640, h = box.clientHeight || 400; composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); composer.setSize(w, h); if (gtao) gtao.setSize(w, h); };
window.addEventListener('resize', sizeComposer); sizeComposer();
function fitCam() {
  if (inAR) return;
  const c = touretScene.cam, a = (box.clientWidth || 1) / (box.clientHeight || 1);
  const k = a < 1.3 ? Math.min(2.1, 1.0 / a) : 1;
  v.camera.position.set(c[3] + (c[0] - c[3]) * k, c[4] + (c[1] - c[4]) * k, c[5] + (c[2] - c[5]) * k);
  v.controls.target.set(c[3], c[4] + (a < 1 ? -1.5 : 0), c[5]); v.controls.maxDistance = 120; v.controls.update();
}
window.addEventListener('resize', () => fitCam());
const steps = touretScene.SEQ.steps.filter(s => !s.dup);
const renderer = v.renderer, scene = v.scene;
renderer.xr.enabled = true;

// ---------------------------------------------------------------- échelle réelle : meule Ø200 mm → rayon 5,4 unités = 0,10 m
const REAL = 0.10 / 5.4;
const FLOOR = 5.45;                       // dessous de l'établi (unités modèle)
const anchor = new THREE.Group(); anchor.visible = false;
let userScale = 1;

// clipping : plans définis dans le repère du modèle, recalculés dans le repère monde à chaque image
const CUT_LOCAL = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
const BASE_LOCAL = T.BASE.clone();
const _p = new THREE.Plane();

// ---------------------------------------------------------------- AR : réticule + ombre de contact
const reticle = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.085, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2a900 }));
reticle.matrixAutoUpdate = false; reticle.visible = false; scene.add(reticle);
const reticleDot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
reticle.add(reticleDot);
const arShadow = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.ShadowMaterial({ opacity: 0.4 }));
arShadow.rotation.x = -Math.PI / 2; arShadow.position.y = -FLOOR + 0.01; arShadow.receiveShadow = true;

let inAR = false, placed = false, moving = false, hitSource = null, session = null;

function setCut(on) { v.P.cut = on; v.applyState(); syncUI(); }

function enterARScene() {
  inAR = true; placed = false; moving = true;
  scene.background = null; v.floor.visible = false; T.decor.visible = false;
  scene.remove(v.root); anchor.add(v.root); v.root.position.set(0, FLOOR, 0); v.root.add(arShadow);
  scene.add(anchor); anchor.visible = false;
  v.key.target = anchor; scene.add(v.key.target);
  document.body.classList.add('ar');
  setHint('Visez une table ou le sol, puis touchez l\'écran pour poser le touret.');
}
function leaveARScene() {
  inAR = false; placed = false; reticle.visible = false;
  anchor.remove(v.root); scene.remove(anchor); scene.add(v.root); v.root.position.set(0, 0, 0); v.root.remove(arShadow);
  v.floor.visible = false; T.decor.visible = true;
  v.key.target = new THREE.Object3D(); v.key.position.set(6, 12, 9); v.key.shadow.bias = -0.0005;
  Object.assign(v.key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 0.5, far: 60 }); v.key.shadow.camera.updateProjectionMatrix();
  clipPlane.normal.set(0, 0, -1); clipPlane.constant = v.P.cut ? 0 : 1e4; T.BASE.copy(BASE_LOCAL);
  document.body.classList.remove('ar');
  restoreBg(); setHint(''); fitCam();
}
let bgSaved = scene.background;
function restoreBg() { scene.background = bgSaved; }

// appli Android (APK) : la RA WebXR n'existe pas dans la fenêtre de l'appli → Chrome
const IN_APK = !!(window.Capacitor && (window.Capacitor.isNativePlatform ? window.Capacitor.isNativePlatform() : true));
const WEB_URL = 'https://baldeousmane22-collab.github.io/simulation-/touret-a-meuler-ra/';
const CAM_HELP = '<ol style="margin:6px 0 0 18px;padding:0;text-align:left">'
  + '<li>Ouvrez les <b>Paramètres</b> du téléphone → <b>Applications</b> → <b>' + (IN_APK ? 'Touret RA' : 'Chrome') + '</b> → <b>Autorisations</b>.</li>'
  + '<li>Touchez <b>Appareil photo</b> (Caméra) → <b>Autoriser</b> (ou « Autoriser seulement si l\'appli est en cours d\'utilisation »).</li>'
  + (IN_APK ? '' : '<li>Dans Chrome : touchez l\'icône à gauche de l\'adresse (cadenas ou réglages) → <b>Autorisations</b> → <b>Caméra</b> → <b>Autoriser</b>.</li>')
  + '<li>Revenez ici, rechargez la page puis touchez de nouveau « 👓 Réalité augmentée ».</li></ol>';
function cameraDenied() {
  showNote('<b>La caméra est refusée : la réalité augmentée ne peut pas démarrer.</b><br>Pour l\'autoriser dans les paramètres du téléphone :' + CAM_HELP);
}
function showNote(html) {
  const n = $('arnote'); n.innerHTML = html + '<br><small>(toucher ce message pour le fermer)</small>'; n.classList.add('show');
  n.onclick = (e) => { if (e.target.tagName !== 'A') n.classList.remove('show'); };
}
async function cameraState() {
  try { const r = await navigator.permissions.query({ name: 'camera' }); return r.state; } catch (e) { return 'unknown'; }
}
async function startAR() {
  if (IN_APK) return showNote('<b>La réalité augmentée s\'ouvre dans Google Chrome.</b><br>La fenêtre de l\'appli ne permet pas la RA. Touchez le lien : <a href="' + WEB_URL + '" target="_blank" rel="noopener" style="color:#8a4b00;font-weight:bold">ouvrir le touret dans Chrome</a>, puis « 👓 Réalité augmentée » et autorisez la caméra.<br>Si la caméra a été refusée :' + CAM_HELP.replace('Touret RA', 'Chrome'));
  if (!navigator.xr) return arUnavailable();
  if (await cameraState() === 'denied') return cameraDenied();
  let ok = false; try { ok = await navigator.xr.isSessionSupported('immersive-ar'); } catch (e) { ok = false; }
  if (!ok) return arUnavailable();
  bgSaved = scene.background;
  try {
    session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'local-floor'], domOverlay: { root: $('overlay') } });
  } catch (e) {
    const m = String(e && e.message || e);
    if ((e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) || /denied|permission|refus/i.test(m) || await cameraState() === 'denied') return cameraDenied();
    return arUnavailable(m);
  }
  renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(session);
  enterARScene();
  const viewerSpace = await session.requestReferenceSpace('viewer');
  hitSource = await session.requestHitTestSource({ space: viewerSpace });
  session.addEventListener('select', onSelect);
  session.addEventListener('end', () => { hitSource = null; session = null; leaveARScene(); syncUI(); });
  syncUI();
}
function arUnavailable(msg) {
  let framed = false; try { framed = window.top !== window; } catch (e) { framed = true; }
  if (framed) { showNote('<b>La réalité augmentée est bloquée dans cette fenêtre.</b><br>Ouvrez la version publiée sur votre site <b>github.io</b> (dossier « touret-a-meuler-ra ») dans <b>Google Chrome</b> sur votre téléphone Android. La simulation 3D animée marche ici.'); return; }
  if (/denied|permission|refus/i.test(msg || '')) return cameraDenied();
  showNote('<b>Réalité augmentée non disponible ici.</b><br>Ouvrez ce lien dans <b>Google Chrome</b> sur un téléphone Android compatible ARCore (« Services Google Play pour la RA » installés). Vérifiez aussi que la caméra est autorisée :' + CAM_HELP + (msg ? '<small>' + msg.replace(/[<>&]/g, '') + '</small>' : ''));
}

const _cam = new THREE.Vector3();
function onSelect() {
  if (!inAR || !reticle.visible || !moving) return;
  anchor.position.setFromMatrixPosition(reticle.matrix);
  // le touret fait face à l'utilisateur
  renderer.xr.getCamera().getWorldPosition(_cam);
  anchor.rotation.set(0, Math.atan2(_cam.x - anchor.position.x, _cam.z - anchor.position.z), 0);
  applyScale(); anchor.visible = true; placed = true; moving = false; reticle.visible = false;
  setHint('Un doigt : tourner · Deux doigts : agrandir / réduire. Utilisez les boutons pour animer.');
  setTimeout(() => setHint(''), 5000);
}
function applyScale() {
  const s = REAL * userScale; anchor.scale.setScalar(s);
  const k = v.key.shadow.camera; Object.assign(k, { left: -16 * s, right: 16 * s, top: 16 * s, bottom: -16 * s, near: 0.01, far: 40 * s + 2 });
  k.updateProjectionMatrix(); v.key.shadow.bias = -0.0002;
  $('scaleval').textContent = '×' + userScale.toFixed(userScale < 2 ? 1 : 0);
}

// ---------------------------------------------------------------- gestes en AR (sur la couche DOM)
const ov = $('overlay');
let g0 = null;
ov.addEventListener('touchstart', (e) => {
  if (!inAR || !placed || e.target.closest('.ui')) return;
  if (e.touches.length === 1) g0 = { x: e.touches[0].clientX, ry: anchor.rotation.y };
  else if (e.touches.length === 2) g0 = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), s: userScale };
}, { passive: true });
ov.addEventListener('touchmove', (e) => {
  if (!g0 || !inAR) return;
  if (e.touches.length === 1 && g0.x !== undefined) anchor.rotation.y = g0.ry + (e.touches[0].clientX - g0.x) * 0.012;
  else if (e.touches.length === 2 && g0.d) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    userScale = Math.max(0.5, Math.min(6, g0.s * d / g0.d)); applyScale();
  }
}, { passive: true });
ov.addEventListener('touchend', () => { g0 = null; }, { passive: true });
// les boutons ne doivent pas déclencher le « select » XR
document.querySelectorAll('.ui').forEach(el => el.addEventListener('beforexrselect', (e) => e.preventDefault()));

// ---------------------------------------------------------------- boucle d'animation (3D et AR)
const clock = new THREE.Clock();
renderer.setAnimationLoop((time, frame) => {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (typeof detail !== 'undefined' && detail.open && !inAR) return;   // écran principal figé derrière la loupe (fluidité mobile)
  if (v.P.playing) v.P.t += dt * v.P.speed;
  if (v.P.seqOn) {
    if (v.P.playing) v.P.seqFixed += dt * SEQ_RATE;
    if (v.P.seqFixed > touretScene.SEQ.end + 2) stopSeq();
  }
  glowActive();
  if (inAR) {
    if (frame && hitSource && moving) {
      const ref = renderer.xr.getReferenceSpace();
      const hits = frame.getHitTestResults(hitSource);
      if (hits.length) { const pose = hits[0].getPose(ref); reticle.visible = true; reticle.matrix.fromArray(pose.transform.matrix); }
      else reticle.visible = false;
    }
    anchor.updateMatrixWorld(true);
    const m = v.root.matrixWorld;
    clipPlane.copy(_p.copy(CUT_LOCAL).applyMatrix4(m)); if (!v.P.cut) clipPlane.constant = 1e4;
    T.BASE.copy(_p.copy(BASE_LOCAL).applyMatrix4(m));
    const ap = anchor.position; v.key.position.set(ap.x + 0.15, ap.y + 0.6, ap.z + 0.25);
  } else {
    v.controls.update();
  }
  v.inst.update(v.P.t, v.P);
  if (composer && !inAR) { if (gtao) gtao.enabled = !v.P.cut && v.P.explode < 0.02; composer.render(); }
  else renderer.render(scene, v.camera);
  updateCaption();
  sound.update(v.P.playing ? (v.P.omega01 || 0) : 0, v.P.grinding && v.P.playing);
});

// ---------------------------------------------------------------- interface
function setHint(t) { $('hint').textContent = t; $('hint').classList.toggle('show', !!t); }
function updateCaption() {
  const cap = $('cap');
  if (v.P.seqOn) {
    const a = v.P.seqActive, el = v.P.seqFixed || 0;
    cap.textContent = a ? `Étape ${steps.indexOf(a) + 1}/${steps.length} : ${a.name}` : (el < 1 ? 'Montage pas à pas : on part du bâti 1' : cap.textContent);
    cap.classList.add('show');
  } else if (v.P.sparks) { cap.textContent = v.P.grinding ? 'En marche : affûtage d\'une pièce sur la meule' : (v.P.cut ? 'En marche (vue en coupe)' : 'Démarrage : la meule prend sa vitesse…'); cap.classList.add('show'); }
  else cap.classList.remove('show');
}
function syncUI() {
  $('ar').textContent = inAR ? '✖ Quitter la RA' : '👓 Réalité augmentée';
  $('cut').classList.toggle('on', v.P.cut);
  $('col').textContent = v.P.mode === 'reel' ? '🎨 Couleurs par pièce' : '⚙ Aspect réel';
  $('col').classList.toggle('on', v.P.mode !== 'reel');
  $('lab').classList.toggle('on', v.P.labels);
  $('spk').classList.toggle('on', !!v.P.sparks);
  $('seq').classList.toggle('on', !!v.P.seqOn);
  $('seqnav').style.display = v.P.seqOn ? 'inline-flex' : 'none';
  $('play').textContent = v.P.playing ? '⏸' : '▶';
  $('scalebox').style.display = inAR ? '' : 'none';
  $('move').style.display = inAR ? '' : 'none';
}
v.P.onSeqEnd = () => syncUI();
// montage lent : 1 étape ≈ 2,5 s (vitesse réglable), pièce en cours éclairée, étape précédente / suivante
let SEQ_RATE = 0.28;
function stopSeq() { v.P.seqOn = false; v.P.seqFixed = null; glowKey = null; clearGlow(); syncUI(); }
let glowKey = null, glowMats = [];
function clearGlow() { glowMats.forEach(m => m.emissive && m.emissive.setRGB(0, 0, 0)); glowMats = []; }
function glowActive() {
  const a = v.P.seqOn ? v.P.seqActive : null; const k = a ? a.k : null;
  if (k !== glowKey) { clearGlow(); glowKey = k;
    if (k) { const p = T.parts[k]; if (p) p.g.traverse(o => { if (o.isMesh && o.material && o.material.emissive && !o.parent.userData.isCap) glowMats.push(o.material); }); } }
  if (glowMats.length) { const val = 0.18 + 0.12 * Math.sin(performance.now() / 180); glowMats.forEach(m => m.emissive.setRGB(val, val * 0.55, 0)); }
}
const goStep = (d) => {
  if (!v.P.seqOn) return; const s = v.P.seqFixed;
  let i = steps.findIndex(st => st.t0 > s + 0.01) - 1; if (i < -1) i = steps.length - 1;
  const j = Math.max(0, Math.min(steps.length - 1, (d > 0 ? i + 1 : i - 1)));
  v.P.seqFixed = steps[j].t0 + 0.001;
};
$('sprev').onclick = () => goStep(-1);
$('snext').onclick = () => goStep(1);
$('srate').oninput = (e) => { SEQ_RATE = +e.target.value / 100; };
$('ar').onclick = () => { if (session) session.end(); else startAR(); };
$('seq').onclick = () => {
  if (v.P.seqOn) { stopSeq(); return; }
  v.P.explode = 0; $('exp').value = 0; v.P.sparks = false; if (!v.P.cut) setCut(true);
  v.P.seqOn = true; v.P.seqFixed = 0; v.P.playing = true; syncUI();
};
$('spk').onclick = () => {
  sound.init(); if (sound.ctx && sound.ctx.state === 'suspended') sound.ctx.resume();
  v.P.sparks = !v.P.sparks; if (v.P.seqOn) stopSeq();
  if (v.P.sparks) { v.P.explode = 0; $('exp').value = 0; v.P.playing = true; setCut(false); }
  syncUI();
};
$('cut').onclick = () => setCut(!v.P.cut);
$('snd').onclick = () => { sound.on = !sound.on; $('snd').textContent = sound.on ? '🔊' : '🔇'; };
$('col').onclick = () => { v.P.mode = v.P.mode === 'reel' ? 'piece' : 'reel'; v.applyState(); syncUI(); };
$('lab').onclick = () => { v.P.labels = !v.P.labels; v.applyState(); syncUI(); };
$('play').onclick = () => { v.P.playing = !v.P.playing; syncUI(); };
$('exp').oninput = (e) => { v.P.explode = e.target.value / 100; if (v.P.seqOn) stopSeq(); syncUI(); };
$('move').onclick = () => { moving = true; anchor.visible = false; setHint('Visez une surface puis touchez l\'écran pour reposer le touret.'); };
$('sminus').onclick = () => { userScale = Math.max(0.5, userScale / 1.5); applyScale(); };
$('splus').onclick = () => { userScale = Math.min(6, userScale * 1.5); applyScale(); };
$('reset').onclick = () => { if (!inAR) fitCam(); v.P.explode = 0; $('exp').value = 0; syncUI(); };

// nomenclature (pièce touchée → clignote)
const list = $('nomen');
Object.entries(PIECES).forEach(([n, [name, col]]) => {
  const b = document.createElement('button'); b.className = 'chip';
  const dark = [2, 15, 19, 11, 20].includes(+n);
  b.innerHTML = `<span class="sw" style="background:#${col.toString(16).padStart(6, '0')};color:${dark ? '#0f2741' : '#fff'}">${n}</span>${name}`;
  b.onclick = () => { flash(+n, name); if (!inAR) detail.show(+n); };
  list.appendChild(b);
});
function flash(n, name) {
  const p = T.parts[n]; if (!p) return;
  const mats = []; p.g.traverse(o => { if (o.isMesh && o.material && o.material.emissive && !o.parent.userData.isCap) mats.push(o.material); });
  const t0 = performance.now();
  const step = () => { const k = (performance.now() - t0) / 1600; const val = k < 1 ? 0.6 * Math.abs(Math.sin(k * Math.PI * 3)) : 0; mats.forEach(m => m.emissive.setRGB(val, val * 0.35, 0)); if (k < 1) requestAnimationFrame(step); };
  step();
  setHint(`${n} — ${name}`); setTimeout(() => setHint(''), 2200);
}
$('nomtoggle').onclick = () => $('nompanel').classList.toggle('open');

// la RA est-elle possible sur cet appareil ?
(async () => {
  let ok = false; try { ok = !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')); } catch (e) {}
  $('ar').classList.toggle('pulse', ok);
  if (!ok) $('ar').title = 'Réalité augmentée : Chrome sur Android avec ARCore';
})();
syncUI(); fitCam();
window.V = v;
// test hors appareil : simule la pose du touret dans une pièce (#artest)
if (location.hash === '#artest') {
  enterARScene(); scene.background = new THREE.Color(0x8a8f96);
  anchor.position.set(0, -0.35, -0.75); anchor.rotation.y = 0.5; applyScale(); anchor.visible = true; placed = true; moving = false;
  const fakeRender = () => {
    inAR = false;  // pas de session XR : on rend avec la caméra normale, mais on garde les calculs de plans
  };
  v.camera.near = 0.01; v.camera.fov = 60; v.camera.position.set(0, 0, 0); v.camera.lookAt(0, -0.3, -0.75); v.camera.updateProjectionMatrix();
  v.controls.enabled = false;
  window.AR_TEST = (t, opts = {}) => {
    Object.assign(v.P, opts); v.applyState();
    anchor.updateMatrixWorld(true); const m = v.root.matrixWorld;
    clipPlane.copy(_p.copy(CUT_LOCAL).applyMatrix4(m)); if (!v.P.cut) clipPlane.constant = 1e4;
    T.BASE.copy(_p.copy(BASE_LOCAL).applyMatrix4(m));
    const ap = anchor.position; v.key.position.set(ap.x + 0.15, ap.y + 0.6, ap.z + 0.25);
    v.inst.update(t, v.P); renderer.render(scene, v.camera);
  };
  renderer.setAnimationLoop(null);
}
