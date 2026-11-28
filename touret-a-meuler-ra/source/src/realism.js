// Réalisme : textures procédurales (acier tourné, peinture fonte, bois), décor d'atelier, étiquette de meule, son.
import * as THREE from 'three';

let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function canvasTex(w, h, draw, repeat = [1, 1], srgb = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
// stries de tournage : lignes fines perpendiculaires à l'axe (le long de v pour un LatheGeometry)
export const turned = canvasTex(8, 512, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y++) { const v = 110 + rnd() * 40 + (y % 3 === 0 ? 25 : 0); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, w, 1); }
}, [1, 6]);
// rugosité « acier usiné » (légères variations)
export const brushedRough = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) { const v = 60 + rnd() * 90; g.strokeStyle = `rgba(${v},${v},${v},0.35)`; g.beginPath(); const y = rnd() * h; g.moveTo(0, y); g.lineTo(w, y + (rnd() - 0.5) * 4); g.stroke(); }
}, [2, 2]);
// peinture sur fonte : « peau d'orange »
export const paintBump = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const r = 1 + rnd() * 3.5, v = 100 + rnd() * 70; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 7); g.fill(); }
}, [3, 3]);
// bois de l'établi
export const woodTex = canvasTex(1024, 256, (g, w, h) => {
  g.fillStyle = '#8a6a45'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) { const v = (Math.sin(y * 0.09) + Math.sin(y * 0.031 + 1.3)) * 10; g.fillStyle = `rgba(${60 + v},${40 + v},${20},0.18)`; g.fillRect(0, y, w, 1 + rnd() * 2); }
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(70,45,20,${0.15 + rnd() * 0.25})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const y = rnd() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6); g.stroke(); }
  for (let x = 0; x < w; x += 128) { g.fillStyle = 'rgba(40,25,10,0.5)'; g.fillRect(x, 0, 2, h); }       // joints des lattes
}, [1, 1], true);
// sol béton
export const concreteTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#8d8f8e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 12000; i++) { const v = 100 + rnd() * 80; g.fillStyle = `rgba(${v},${v},${v - 4},0.35)`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
  for (let i = 0; i < 25; i++) { g.fillStyle = `rgba(60,60,58,${0.04 + rnd() * 0.06})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 20 + rnd() * 70, 0, 7); g.fill(); }
}, [8, 8], true);

// matériau selon la famille
export function finish(m, kind) {
  m.bumpMap = null; m.roughnessMap = null; m.bumpScale = 0;
  if (kind === 'turned') { m.bumpMap = turned; m.bumpScale = 0.6; m.roughnessMap = brushedRough; }
  else if (kind === 'paint') { m.bumpMap = paintBump; m.bumpScale = 0.12; }
  else if (kind === 'oxide') { m.roughnessMap = brushedRough; m.bumpMap = paintBump; m.bumpScale = 0.15; }
  m.needsUpdate = true;
}

// étiquette (buvard) imprimée sur les faces de la meule : rend la rotation visible
export function wheelLabel(r0, r1) {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const cx = S / 2, R1 = S / 2, R0 = S / 2 * r0 / r1;
  g.fillStyle = '#e8e2d0'; g.beginPath(); g.arc(cx, cx, R1, 0, 7); g.arc(cx, cx, R0, 0, 7, true); g.fill();
  g.strokeStyle = '#2b5fa8'; g.lineWidth = 10; g.beginPath(); g.arc(cx, cx, R1 - 12, 0, 7); g.stroke();
  g.fillStyle = '#c0392b'; g.beginPath(); g.arc(cx, cx, R1 - 30, -0.35, 0.35); g.arc(cx, cx, R0 + 16, 0.35, -0.35, true); g.fill();
  const txt = ['A 60 M V', 'Ø 200 × 25 × 32', '35 m/s', '3 340 tr/min max'];
  g.font = `bold ${Math.round((R1 - R0) * 0.34)}px Arial, sans-serif`; g.fillStyle = '#1d2733'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const rm = (R1 + R0) / 2;
  txt.forEach((t, k) => {
    const a0 = 0.6 + k * 1.42; let a = a0 - g.measureText(t).width / rm / 2;
    for (const ch of t) { const w = g.measureText(ch).width; a += w / rm / 2; g.save(); g.translate(cx + Math.cos(a) * rm, cx + Math.sin(a) * rm); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore(); a += w / rm / 2; }
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// son : moteur + sifflement de la meule + meulage (WebAudio, démarré par un clic)
export class GrinderSound {
  constructor() { this.ctx = null; this.on = true; }
  init() {
    if (this.ctx) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C(); const out = this.out = ctx.createGain(); out.gain.value = 0; out.connect(ctx.destination);
    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 100;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; const hg = ctx.createGain(); hg.gain.value = 0.18;
    hum.connect(lp).connect(hg).connect(out); hum.start();
    const whine = this.whine = ctx.createOscillator(); whine.type = 'triangle'; whine.frequency.value = 50; const wg = ctx.createGain(); wg.gain.value = 0.05; whine.connect(wg).connect(out); whine.start();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const nz = ctx.createBufferSource(); nz.buffer = buf; nz.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.8;
    const ng = this.grind = ctx.createGain(); ng.gain.value = 0; nz.connect(bp).connect(ng).connect(out); nz.start();
  }
  update(speed01, grinding) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.out.gain.setTargetAtTime(this.on ? 0.55 * speed01 : 0, t, 0.08);
    this.whine.frequency.setTargetAtTime(40 + 260 * speed01, t, 0.1);
    this.grind.gain.setTargetAtTime(grinding ? 0.25 + 0.08 * Math.random() : 0, t, 0.05);
  }
}

// même étiquette « vue en rotation rapide » : anneaux flous (couleurs moyennées)
export function wheelLabelBlur(r0, r1) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const cx = S / 2, R1 = S / 2, R0 = S / 2 * r0 / r1;
  const ring = (a, b, col) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cx, a, 0, 7); g.arc(cx, cx, b, 0, 7, true); g.fill(); };
  ring(R1, R0, '#d9d2c2'); ring(R1 - 6, R1 - 18, 'rgba(43,95,168,0.75)');
  ring(R1 - 30, R0 + 16, 'rgba(160,140,130,0.35)');
  const rm = (R1 + R0) / 2, h = (R1 - R0) * 0.17; ring(rm + h, rm - h, 'rgba(70,74,80,0.35)');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
