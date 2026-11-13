/* =====================================================================
   sons.js — Sons du banc (Web Audio) : ronronnement du moteur,
   sifflement de la pompe (fréquence d'engrènement, plus fort sous
   pression), souffle du limiteur ouvert, crépitement de cavitation.
   ===================================================================== */
export class Sons {
  constructor() { this.actif = false; this.ctx = null; }

  _creer() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC(); this.ctx = ctx;
    const maitre = ctx.createGain(); maitre.gain.value = 0.5; maitre.connect(ctx.destination); this.maitre = maitre;
    const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; };
    const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(maitre); return g; };
    // moteur : 100 Hz (2 × 50 Hz) + harmonique
    this.gMoteur = gain(0); osc('sine', 100).connect(this.gMoteur); osc('triangle', 200).connect(this.gMoteur);
    // pompe : 10 dents × 24 tr/s ≈ 242 Hz
    this.gPompe = gain(0); this.oPompe = osc('sawtooth', 242);
    const fp = ctx.createBiquadFilter(); fp.type = 'lowpass'; fp.frequency.value = 900;
    this.oPompe.connect(fp); fp.connect(this.gPompe);
    // bruit blanc pour le limiteur et la cavitation
    const tampon = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = tampon.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const bruit = ctx.createBufferSource(); bruit.buffer = tampon; bruit.loop = true; bruit.start();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.8;
    this.gLim = gain(0); bruit.connect(bp); bp.connect(this.gLim);
    const bc = ctx.createBiquadFilter(); bc.type = 'highpass'; bc.frequency.value = 1500;
    this.gCav = gain(0); bruit.connect(bc); bc.connect(this.gCav);
    return true;
  }

  activer(on) {
    this.actif = on;
    if (on && !this.ctx && !this._creer()) { this.actif = false; return; }
    if (this.ctx) (on ? this.ctx.resume() : this.ctx.suspend()).catch(() => {});
  }
  reveiller() { if (this.actif && this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }

  maj(m, dt) {
    if (!this.actif || !this.ctx) return;
    const t = this.ctx.currentTime, k = m.n / 1450;
    const lisse = (param, v) => param.setTargetAtTime(v, t, 0.05);
    lisse(this.gMoteur.gain, 0.07 * k);
    lisse(this.oPompe.frequency, 10 * m.n / 60 || 1);
    lisse(this.gPompe.gain, k * (0.012 + 0.05 * Math.min(Math.max(m.pP, 0) / 160, 1)));
    lisse(this.gLim.gain, Math.min(m.qLim / 14, 1) * 0.12 * k);
    lisse(this.gCav.gain, m.cavitation && k > 0.1 ? 0.06 * (0.5 + Math.random()) : 0);
  }
}
