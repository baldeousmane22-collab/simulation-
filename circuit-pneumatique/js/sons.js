/* =====================================================================
   sons.js — Bruitages du banc pneumatique (Web Audio)
   ---------------------------------------------------------------------
   Tous les sons sont synthétisés (aucun fichier à télécharger) :
   - compresseur : ronflement du moteur + cognement du piston ;
   - souffle d'échappement (silencieux) proportionnel au débit, plus sourd
     quand les silencieux sont colmatés ; échappement rapide plus violent ;
   - sifflement aigu d'une fuite, souffle de la soupape de sûreté ;
   - « clac » du distributeur qui bascule et chocs de fin de course.
   Le navigateur n'autorise le son qu'après un geste de l'utilisateur :
   activer() doit être appelé depuis un clic.
   ===================================================================== */

export class SonsPneumatiques {
  constructor() {
    this.actif = false;
    this.ctx = null;
  }

  /* Crée le graphe audio (au premier clic) */
  _creer() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();
    this.ctx = ctx;
    this.maitre = ctx.createGain();
    this.maitre.gain.value = 0.7;
    this.maitre.connect(ctx.destination);
    // Bruit blanc (2 s, en boucle)
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.bufBruit = buf;
    const bruit = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
    const voie = (source, filtres) => {
      const g = ctx.createGain(); g.gain.value = 0;
      let n = source;
      for (const f of filtres) { n.connect(f); n = f; }
      n.connect(g); g.connect(this.maitre);
      return g;
    };
    const filtre = (type, freq, q = 0.8) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; };
    // Souffle d'échappement (bande moyenne), son filtre est réglé selon l'état des silencieux
    this.filtreEchap = filtre('bandpass', 2600, 0.6);
    this.gEchap = voie(bruit(), [this.filtreEchap]);
    // Fuite : sifflement aigu
    this.gFuite = voie(bruit(), [filtre('highpass', 5500, 0.7), filtre('peaking', 7500, 4)]);
    // Soupape : souffle puissant
    this.gSoupape = voie(bruit(), [filtre('bandpass', 1500, 0.5)]);
    // Compresseur : moteur (dent de scie grave) + souffle sourd, modulés par le piston
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 48; osc.start();
    this.oscMoteur = osc;
    this.gMoteur = voie(osc, [filtre('lowpass', 380, 0.7)]);
    this.gCoups = voie(bruit(), [filtre('lowpass', 500, 0.7)]);
    return true;
  }

  /* Active ou coupe le son ; à appeler depuis un geste de l'utilisateur */
  activer(oui) {
    this.actif = oui;
    if (oui && !this.ctx && !this._creer()) { this.actif = false; return false; }
    if (this.ctx) {
      if (oui) this.ctx.resume(); else this.ctx.suspend();
    }
    return this.actif;
  }
  pause() { if (this.ctx && this.actif) this.ctx.suspend(); }
  reprendre() { if (this.ctx && this.actif) this.ctx.resume(); }

  /* Bruit bref (claquement), fréquence centrale et force 0 à 1 */
  _clac(freq, force) {
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.bufBruit;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, force), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    s.connect(f); f.connect(g); g.connect(this.maitre);
    s.start(t, Math.random()); s.stop(t + 0.12);
  }

  /* Mise à jour (≈ 60 fois par seconde) */
  maj(sim) {
    if (!this.actif || !this.ctx) return;
    const r = sim.res, t = this.ctx.currentTime, lisse = 0.06;
    const regle = (g, v) => g.gain.setTargetAtTime(v, t, lisse);
    // Échappements : silencieux 3 et 5, échappement rapide, bouton, vanne
    // Débits sortants seulement (une chambre en dépression aspire de l'air : débit négatif)
    const pos = (x) => (x > 0 && Number.isFinite(x) ? x : 0);
    const echap = pos(r.qEchap3) + pos(r.qEchap5) + pos(r.qBoutonEchap) + pos(r.qVanne) * 0.5;
    const sale = sim.pannes.silencieux;
    this.filtreEchap.frequency.setTargetAtTime(sale ? 700 : 2600, t, 0.1);
    regle(this.gEchap, Math.min(0.5, Math.sqrt(echap / 400) * (sale ? 0.35 : 0.45) + Math.sqrt(pos(r.qEchapRapide) / 300) * 0.6));
    regle(this.gFuite, r.qFuite > 1 ? Math.min(0.12, 0.04 + r.qFuite / 600) : 0);
    regle(this.gSoupape, r.qSoupape > 1 ? Math.min(0.5, 0.15 + r.qSoupape / 500) : 0);
    // Compresseur
    const tourne = sim.compresseurTourne;
    this._vitComp = (this._vitComp || 0) + ((tourne ? 1 : 0) - (this._vitComp || 0)) * 0.03;
    const vc = this._vitComp;
    this.oscMoteur.frequency.setTargetAtTime(20 + 30 * vc, t, 0.1);
    regle(this.gMoteur, 0.22 * vc);
    const coup = Math.pow(Math.max(0, Math.sin(sim.temps * 2 * Math.PI * 24 * vc)), 8);
    regle(this.gCoups, 0.5 * vc * (0.25 + 0.75 * coup));
    // Événements : bascule du distributeur, chocs de fin de course
    if (r.commute) this._clac(2800, 0.35);
    if (r.choc1 > 0.02) this._clac(420, Math.min(0.9, r.choc1 * 4));
    if (r.choc2 > 0.05) this._clac(900, Math.min(0.9, r.choc2 * 1.2));
  }
}
