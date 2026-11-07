/* =====================================================================
   app.js — Simulation 2D de la chaîne de broyage
   Culbuteur → trémie → alimentateur à tabliers (miettes → chaîne racleuse)
   → broyeur à rouleaux → convoyeur à bande CV301.
   Vue zoomable (molette, pincement), déplaçable (souris, doigt).
   ===================================================================== */
'use strict';
(() => {
  const D = window.DONNEES, M = D.machines;
  const $ = (id) => document.getElementById(id);

  // ---------- Monde (unités : 1 u = 2 cm) ----------
  const W = 1920, H = 900, VIS = 50, GRAV = 900;
  const SOL = 310;
  const CUL = { x: 260, y: 240, R: 140 };
  const TREM = { xh1: 105, xh2: 430, yh: 400, xb1: 190, xb2: 370, yb: 560 };
  const AL = { x1: 160, x2: 840, y: 595, r: 22, P: 30 };
  const AL_HAUT = AL.y - AL.r;                       // dessus des tabliers
  const RA = { x1: 150, x2: 750, y: 690, r: 16, xd1: 705, xd2: 735, fond: 710 };
  const BR = { x1: 840, x2: 1020, y1: 600, y2: 745, ry: 650, rx1: 895, rx2: 955, R: 30 };
  const CV = { x1: 660, y1: 850, x2: 1660, y2: 580, rq: 18, rt: 26 };
  const CV_A = Math.atan2((CV.y2 - CV.rt) - (CV.y1 - CV.rq), CV.x2 - CV.x1); // pente (négative)
  const yBande = (x) => (CV.y1 - CV.rq) + (x - CV.x1) * Math.tan(CV_A);
  const yRetour = (x) => (CV.y1 + CV.rq) + (x - CV.x1) * ((CV.y2 + CV.rt) - (CV.y1 + CV.rq)) / (CV.x2 - CV.x1);
  const CAPA = 200, WAGON = 80, MBLOC = 0.19; // MBLOC : masse d'un bloc (t), trémie accélérée ×3

  // ---------- État ----------
  const etat = {
    freq: 40, pause: false, etiq: true, vit: 1,
    stock: 120, wagons: 0, expedie: 0, miettes: 0,
    offA: 0, offR: 0, offB: 0, angR: 0, angMot: 0,
    bro: { file: [], acc: 0 }, accA: 0, accM: 0,
    seq: null, msg: '', msgT: 0, au: false
  };
  const mach = {};
  for (const id of D.ordre) mach[id] = { cmd: false, ramp: 0, defaut: null, info: '' };
  const cul = { th: 0, phase: 'attente', t: 0, charge: 1, bride: 0, alpha: 1 };
  let parts = [];

  // ---------- Vitesses (m/s) ----------
  const vAlimNom = () => { const m = M.alim; return Math.PI * m.D * (m.moteur.n * etat.freq / 50 / m.i) / 60; };
  const vRacNom = () => Math.PI * M.racleuse.D * (M.racleuse.moteur.n / M.racleuse.i) / 60;
  const vBandeNom = () => Math.PI * M.cv301.D * (M.cv301.moteur.n / M.cv301.i) / 60;
  const nRouleaux = () => M.broyeur.moteur.n / M.broyeur.i;
  const wCul = () => (M.culbuteur.moteur.n / M.culbuteur.i) * M.culbuteur.z1 / M.culbuteur.z2 * 2 * Math.PI / 60;
  const fr = (x, d) => x.toFixed(d).replace('.', ',');
  const debit = () => 3600 * vAlimNom() * M.alim.b * M.alim.h * M.alim.rho * M.alim.phi;

  // ---------- Messages ----------
  function message(t) { etat.msg = t; etat.msgT = 5; const a = $('alerte'); a.textContent = t; a.hidden = false; }

  // ---------- Commande des machines ----------
  const tempsRampe = { culbuteur: 1.5, alim: 2, racleuse: 1.5, broyeur: 4, cv301: 4 };
  const enMarche = (id) => mach[id].cmd && mach[id].ramp > 0.95;
  function demarrer(id) {
    const m = mach[id];
    if (m.defaut) { message(`${M[id].court} : défaut à réarmer (${m.defaut}).`); return false; }
    if (etat.au) { message("Arrêt d'urgence enclenché : réarmez-le d'abord."); return false; }
    const bloque = M[id].aval.find(a => !enMarche(a));
    if (bloque) { message(`Démarrage refusé : ${M[bloque].court} (en aval) doit tourner avant ${M[id].court}.`); return false; }
    m.cmd = true; return true;
  }
  function arreter(id) { mach[id].cmd = false; }
  function defaut(id, txt) { mach[id].defaut = txt; mach[id].cmd = false; message(`⚠ ${M[id].court} : ${txt}`); majCommandes(); }

  function asservissements() {
    for (const id of D.ordre) {
      const m = mach[id];
      if (!m.cmd) continue;
      const a = M[id].aval.find(x => !mach[x].cmd);
      if (a) { m.cmd = false; message(`${M[id].court} arrêté par asservissement : ${M[a].court} est à l'arrêt.`); etat.seq = null; }
    }
  }

  // Séquences automatiques
  function seqDemarrage() {
    if (etat.au) { message("Réarmez l'arrêt d'urgence."); return; }
    etat.seq = { type: 'dem', liste: [...D.ordre].reverse(), t: 0 };
    message('🔔 Avertisseur de démarrage : ne pas rester près des machines.');
  }
  function seqArret() { etat.seq = { type: 'arr', liste: [...D.ordre], t: 0 }; message('Arrêt séquentiel : de l\'amont vers l\'aval, avec vidange.'); }
  function vide(id) {
    if (id === 'culbuteur') return cul.th < 0.01;
    if (id === 'alim') return true; // la matière reste sur les tabliers
    if (id === 'racleuse') return !parts.some(p => p.st === 'raclage' || (p.st === 'chute' && p.cible === 'auge'));
    if (id === 'broyeur') return etat.bro.file.length === 0 && !parts.some(p => p.st === 'chute' && p.cible === 'broyeur');
    if (id === 'cv301') return !parts.some(p => p.st === 'bande' || (p.st === 'chute' && p.cible === 'bande'));
    return true;
  }
  function majSequence(dt) {
    const s = etat.seq; if (!s) return;
    s.t += dt;
    const id = s.liste[0];
    if (!id) { etat.seq = null; message(s.type === 'dem' ? 'Ligne en marche.' : 'Ligne arrêtée.'); return; }
    if (s.type === 'dem') {
      if (s.t < 1.2) return;
      if (!mach[id].cmd) { if (!demarrer(id)) { etat.seq = null; return; } }
      if (enMarche(id)) { s.liste.shift(); s.t = 0; }
    } else {
      if (mach[id].cmd && (id === 'culbuteur' || s.t > 0.8)) { arreter(id); s.t = 0; return; }
      if (mach[id].ramp < 0.02 && (vide(id) || s.t > 25) && !(id === 'culbuteur' && cul.th > 0.01)) {
        const suivant = s.liste[1];
        if (suivant && !vide(suivant) && s.t < 25) return; // attendre la vidange de la machine suivante
        s.liste.shift(); s.t = 0;
      }
    }
  }

  function majMachines(dt) {
    asservissements();
    for (const id of D.ordre) {
      const m = mach[id];
      let veut = m.cmd;
      if (id === 'culbuteur' && !m.cmd && !etat.au && cul.th > 0.001) veut = true; // retour en position
      if (veut) m.ramp = Math.min(1, m.ramp + dt / tempsRampe[id]);
      else m.ramp = Math.max(0, m.ramp - dt / (etat.au ? 0.4 : 1.2));
    }
  }

  // ---------- Cycle du culbuteur ----------
  const TH_MAX = 160 * Math.PI / 180;
  function cycleCulbuteur(dt) {
    const m = mach.culbuteur, w = wCul() * m.ramp;
    cul.t += dt;
    const retourSeul = !m.cmd;
    if (retourSeul && cul.th > 0 && !etat.au) {
      if (cul.phase !== 'retour') { cul.phase = 'retour'; }
    }
    switch (cul.phase) {
      case 'attente':
        m.info = 'Wagon plein en position';
        if (!m.cmd || m.ramp < 0.9) { if (!m.cmd) m.info = 'À l\'arrêt'; break; }
        if (etat.stock > CAPA - WAGON * 0.6) { m.info = 'Attente : trémie pleine'; break; }
        cul.phase = 'bridage'; cul.t = 0; break;
      case 'bridage':
        m.info = 'Bridage du wagon';
        cul.bride = Math.min(1, cul.t / 1.2);
        if (cul.t > 1.3) { cul.phase = 'rotation'; cul.t = 0; }
        break;
      case 'rotation':
        m.info = 'Rotation (vidage)';
        cul.th = Math.min(TH_MAX, cul.th + w * dt);
        if (cul.th >= TH_MAX) { cul.phase = 'vidage'; cul.t = 0; }
        break;
      case 'vidage':
        m.info = 'Vidage dans la trémie';
        if (cul.charge <= 0 && cul.t > 1.5) { cul.phase = 'retour'; cul.t = 0; }
        break;
      case 'retour':
        m.info = retourSeul ? 'Retour en position' : 'Retour du culbuteur';
        cul.th = Math.max(0, cul.th - w * dt);
        if (cul.th <= 0) { cul.phase = 'debridage'; cul.t = 0; }
        break;
      case 'debridage':
        m.info = 'Débridage';
        cul.bride = Math.max(0, 1 - cul.t / 1.2);
        if (cul.t > 1.3) {
          if (cul.charge < 0.5) { cul.phase = 'echange'; cul.t = 0; etat.wagons++; } else { cul.phase = 'attente'; cul.t = 0; }
        }
        break;
      case 'echange':
        m.info = 'Wagon vide sorti, wagon plein entré';
        cul.alpha = Math.abs(1 - cul.t / 1.2);
        if (cul.t > 2.4) { cul.alpha = 1; cul.charge = 1; cul.phase = 'attente'; cul.t = 0; }
        break;
    }
    // déversement : la bauxite sort dès que le wagon dépasse ~95°
    if (cul.th > 1.65 && cul.charge > 0) {
      const q = 0.22 * dt * (cul.th / TH_MAX);
      cul.charge = Math.max(0, cul.charge - q);
      etat.accW = (etat.accW || 0) + q * 140;
      while (etat.accW >= 1) {
        etat.accW -= 1;
        const u = (Math.random() - 0.5) * 170, c = Math.cos(cul.th), s = Math.sin(cul.th);
        const lx = u, ly = -42;
        nouvelle({ x: CUL.x + lx * c - ly * s, y: CUL.y + lx * s + ly * c, vx: (Math.random() - 0.5) * 30, vy: 20,
          r: 3 + Math.random() * 5, st: 'chute', cible: 'tremie', m: WAGON / 140 });
      }
    }
  }

  // ---------- Particules ----------
  const COUL_BLOC = ['#8b3a1a', '#9c4221', '#7c2d12', '#a0522d', '#b45309', '#92400e'];
  const COUL_MIETTE = ['#d97706', '#f59e0b', '#ea8a2a'];
  function forme() {
    const n = 6 + (Math.random() * 3 | 0), f = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 0.7 + Math.random() * 0.35; f.push(Math.cos(a) * k, Math.sin(a) * k); }
    return f;
  }
  function nouvelle(p) {
    if (parts.length > 1400) return null;
    p.f = forme(); p.a = Math.random() * 6.3;
    p.c = p.c || COUL_BLOC[Math.random() * COUL_BLOC.length | 0];
    parts.push(p); return p;
  }
  const surfaceTremie = () => TREM.yb - (etat.stock / CAPA) * (TREM.yb - TREM.yh);

  function alimente(dt, vA) {
    if (vA <= 0) return;
    if (etat.stock <= 0.2) { if (mach.alim.cmd) mach.alim.info = 'Trémie vide !'; return; }
    etat.accA += (vA / 2) * dt;           // 3 couches de blocs tous les 6 u
    while (etat.accA >= 1) {
      etat.accA -= 1;
      etat.stock = Math.max(0, etat.stock - MBLOC);
      const r = 3 + Math.random() * 5;
      nouvelle({ x: TREM.xb2 - 4 - Math.random() * 6, y: AL_HAUT - 6 - r * 0.6 - Math.random() * 24, r, st: 'tablier', m: MBLOC });
    }
  }

  // Les miettes passent entre les tabliers là où il y a de la matière
  function miettes(dt, vA, occ) {
    if (vA <= 0) return;
    etat.accM += dt * 9 * Math.min(1, vA / (0.28 * VIS) + 0.3) * mach.alim.ramp;
    let essais = 0;
    while (etat.accM >= 1 && essais++ < 20) {
      const L = AL.x2 - AL.x1, k = Math.random() * (L / AL.P) | 0;
      const gx = AL.x1 + ((etat.offA + k * AL.P) % L + L) % L;
      if (gx < TREM.xb1 || gx > AL.x2 - 10) continue;
      const couvert = gx < TREM.xb2 ? etat.stock > 0.2 : occ[(gx / 10) | 0] > 0;
      if (!couvert) continue;
      etat.accM -= 1;
      nouvelle({ x: gx, y: AL_HAUT + 3, vx: 0, vy: 15, r: 1.2 + Math.random() * 1.2, st: 'chute', cible: 'auge', m: 0.01, miette: true,
        c: COUL_MIETTE[Math.random() * 3 | 0] });
    }
    if (etat.accM > 3) etat.accM = 3;
  }

  function broyeur(dt) {
    const b = etat.bro, m = mach.broyeur;
    if (b.file.length > 26 && m.cmd) defaut('broyeur', 'surcharge, le coupleur hydraulique patine');
    if (m.ramp < 0.3 || !b.file.length) return;
    b.acc += dt * 9 * m.ramp;
    while (b.acc >= 1 && b.file.length) {
      b.acc -= 1;
      const mb = b.file.shift();
      for (let i = 0; i < 3; i++) {
        nouvelle({ x: (BR.rx1 + BR.rx2) / 2 + (Math.random() - 0.5) * 14, y: BR.ry + BR.R + 6, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 30,
          r: 1.8 + Math.random() * 2.4, st: 'chute', cible: 'bande', m: mb / 3 });
      }
    }
    if (!b.file.length) b.acc = 0;
  }

  function majParticules(dt, vA, vR, vB) {
    const cosB = Math.cos(CV_A), sinB = Math.sin(CV_A);
    const surf = surfaceTremie();
    const garde = [];
    for (const p of parts) {
      let gardee = true;
      if (p.st === 'chute') {
        p.vy += GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        switch (p.cible) {
          case 'tremie':
            if (p.y >= surf - 2 && p.x > TREM.xh1 && p.x < TREM.xh2) { etat.stock = Math.min(CAPA, etat.stock + p.m); gardee = false; }
            break;
          case 'broyeur':
            if (p.x < BR.x1 + 10) p.x = BR.x1 + 10;
            if (p.y >= BR.y1 + 22) { etat.bro.file.push(p.m); gardee = false; }
            break;
          case 'auge':
            if (p.y >= RA.fond - p.r) { p.st = 'raclage'; p.y = RA.fond - p.r - Math.random() * 3; p.xd = RA.xd1 + Math.random() * (RA.xd2 - RA.xd1); etat.miettes++; }
            break;
          case 'bande': {
            const yb = yBande(p.x) - p.r * 0.8;
            if (p.y >= yb) { p.st = 'bande'; p.h = Math.random() * 4; p.y = yb - p.h; }
            break;
          }
          case 'sortie':
            if (p.y > 790 || p.x > CV.x2 + 80) { etat.expedie += p.m; gardee = false; }
            break;
        }
        if (p.y > H + 40) gardee = false;
      } else if (p.st === 'tablier') {
        p.x += vA * dt;
        if (p.x > AL.x2 + 6) { p.st = 'chute'; p.vx = vA + 25 + Math.random() * 25; p.vy = -5; p.cible = 'broyeur'; }
      } else if (p.st === 'raclage') {
        p.x += vR * dt;
        if (p.x >= p.xd) { p.st = 'chute'; p.vx = vR * 0.5; p.vy = 0; p.cible = 'bande'; }
      } else if (p.st === 'bande') {
        p.x += vB * cosB * dt; p.y = yBande(p.x) - p.r * 0.8 - p.h;
        if (p.x >= CV.x2) { p.st = 'chute'; p.vx = vB * cosB; p.vy = vB * sinB; p.cible = 'sortie'; }
      }
      if (gardee) garde.push(p);
    }
    parts = garde;
  }

  // ---------- Pas de simulation ----------
  function pas(dt) {
    majSequence(dt);
    majMachines(dt);
    const vA = vAlimNom() * VIS * mach.alim.ramp;
    const vR = vRacNom() * VIS * mach.racleuse.ramp;
    const vB = vBandeNom() * VIS * mach.cv301.ramp;
    etat.offA += vA * dt; etat.offR += vR * dt; etat.offB += vB * dt;
    etat.angR += nRouleaux() * 2 * Math.PI / 60 * mach.broyeur.ramp * dt;
    etat.angMot += dt * 12;
    cycleCulbuteur(dt);
    // occupation des tabliers (cases de 10 u)
    const occ = new Uint16Array(W / 10 | 0);
    for (const p of parts) if (p.st === 'tablier') occ[(p.x / 10) | 0]++;
    alimente(dt, vA);
    miettes(dt, vA, occ);
    broyeur(dt);
    majParticules(dt, vA, vR, vB);
    for (const id of D.ordre) if (id !== 'culbuteur') {
      const m = mach[id];
      if (!(id === 'alim' && m.cmd && etat.stock <= 0.2)) m.info = m.defaut ? 'Défaut : ' + m.defaut : m.cmd ? (m.ramp < 0.95 ? 'Démarrage…' : 'En marche') : (m.ramp > 0 ? 'Ralentissement…' : 'À l\'arrêt');
    }
    if (mach.culbuteur.defaut) mach.culbuteur.info = 'Défaut : ' + mach.culbuteur.defaut;
    if (etat.msgT > 0) { etat.msgT -= dt; if (etat.msgT <= 0) $('alerte').hidden = true; }
  }

  // =====================================================================
  //  DESSIN
  // =====================================================================
  const cv = $('canvas'), ctx = cv.getContext('2d');
  const cam = { s: 1, x: 0, y: 0 };
  let cw = 0, ch = 0, dpr = 1, sFit = 1;

  function redim() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cw = Math.max(1, r.width); ch = Math.max(1, r.height);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const ancien = sFit;
    sFit = Math.min(cw / W, ch / (H - 40));
    if (!redim.fait || Math.abs(cam.s - ancien) < 1e-6) recentrer();
    redim.fait = true;
  }
  function recentrer() {
    cam.s = sFit; cam.x = (cw - W * sFit) / 2; cam.y = (ch - (H - 40) * sFit) / 2 - 20 * sFit;
    if (cw < 700) { cam.s = sFit * 1.8; cam.x = cw / 2 - 640 * cam.s; cam.y = ch / 2 - 500 * cam.s; } // téléphone : vue rapprochée
  }
  const versEcran = (x, y) => [x * cam.s + cam.x, y * cam.s + cam.y];
  const versMonde = (x, y) => [(x - cam.x) / cam.s, (y - cam.y) / cam.s];

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function degV(y1, y2, c1, c2) { const g = ctx.createLinearGradient(0, y1, 0, y2); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; }

  function engrenage(x, y, r, n, ang, ht, coul, trait = '#1e293b') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, da = Math.PI * 2 / n;
      ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      ctx.lineTo(Math.cos(a0 + da * 0.25) * (r + ht), Math.sin(a0 + da * 0.25) * (r + ht));
      ctx.lineTo(Math.cos(a0 + da * 0.5) * (r + ht), Math.sin(a0 + da * 0.5) * (r + ht));
      ctx.lineTo(Math.cos(a0 + da * 0.75) * r, Math.sin(a0 + da * 0.75) * r);
    }
    ctx.closePath(); ctx.fillStyle = coul; ctx.fill(); ctx.strokeStyle = trait; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fillStyle = '#334155'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(r * 0.6, 0); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  // moteur électrique (vue de côté) : carcasse à ailettes + capot ventilateur
  function moteur(x, y, w, h, tourne, sens = 1) {
    ctx.save();
    ctx.fillStyle = degV(y, y + h, '#3b82f6', '#1e3a8a'); rr(x, y, w * 0.78, h, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const yy = y + h * i / 6; ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + w * 0.78 - 3, yy); ctx.stroke(); }
    const cx = sens > 0 ? x + w * 0.78 : x;
    ctx.fillStyle = '#1e40af'; rr(sens > 0 ? cx : cx - w * 0.22, y + h * 0.1, w * 0.22, h * 0.8, 5); ctx.fill();
    ctx.fillStyle = '#0f172a'; rr(x + w * 0.28, y - 6, w * 0.22, 6, 2); ctx.fill(); // boîte à bornes
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.min(h * 0.5, 16)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('M', x + w * 0.39, y + h / 2 + 1);
    if (tourne > 0.02) { // ventilateur qui tourne
      const fx = sens > 0 ? cx + w * 0.11 : cx - w * 0.11, fy = y + h / 2;
      ctx.strokeStyle = 'rgba(147,197,253,.8)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { const a = etat.angMot * 3 * tourne + i * 2.09; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy + Math.sin(a) * h * 0.35); ctx.stroke(); }
    }
    ctx.restore();
  }
  function reducteur(x, y, w, h, n1, n2) {
    ctx.save();
    ctx.fillStyle = degV(y, y + h, '#64748b', '#334155'); rr(x, y, w, h, 5); ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + h * 0.5); ctx.lineTo(x + w, y + h * 0.5); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
    // engrenages visibles (carter découpé)
    ctx.globalAlpha = 0.9;
    engrenage(x + w * 0.3, y + h * 0.5, Math.min(w, h) * 0.12, 10, n1, 3, '#cbd5e1');
    engrenage(x + w * 0.66, y + h * 0.5, Math.min(w, h) * 0.26, 22, -n2, 3, '#e2e8f0');
    ctx.restore();
  }
  function accouplement(x, y, h) {
    ctx.fillStyle = '#eab308'; rr(x, y - h / 2, 10, h, 2); ctx.fill();
    ctx.strokeStyle = '#713f12'; ctx.lineWidth = 1; ctx.stroke();
  }
  function coupleur(x, y, w, h) {
    ctx.save(); ctx.fillStyle = degV(y - h / 2, y + h / 2, '#f59e0b', '#b45309');
    ctx.beginPath(); ctx.ellipse(x + w / 2, y, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  }
  function arbre(x1, y1, x2, y2) { ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function bloc(p) {
    const f = p.f, r = p.r;
    ctx.beginPath(); ctx.moveTo(p.x + f[0] * r, p.y + f[1] * r);
    for (let i = 2; i < f.length; i += 2) ctx.lineTo(p.x + f[i] * r, p.y + f[i + 1] * r);
    ctx.closePath(); ctx.fillStyle = p.c; ctx.fill();
  }

  function decor() {
    ctx.fillStyle = degV(0, H, '#0e1a33', '#0a1222'); ctx.fillRect(-2000, -2000, W + 4000, H + 4000);
    // sol et fosse
    ctx.fillStyle = '#1c2537';
    ctx.fillRect(-2000, SOL + 16, 2000 + 85, 2000);
    ctx.fillRect(450, SOL + 16, W + 2000, 2000);
    ctx.fillStyle = '#273248'; ctx.fillRect(-2000, SOL + 8, 2085, 8); ctx.fillRect(450, SOL + 8, W + 2000, 8);
    ctx.fillStyle = '#151d2e'; ctx.fillRect(85, SOL + 16, 365, 2000);
    ctx.fillStyle = '#121a2a'; ctx.fillRect(85, 880, W, 2000);
    // grille légère
    ctx.strokeStyle = 'rgba(148,163,184,.05)'; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SOL + 8); ctx.stroke(); }
    ctx.fillStyle = 'rgba(148,163,184,.35)'; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('± 0,00 (niveau du sol)', 470, SOL + 2);
  }

  function dessinCulbuteur() {
    const m = mach.culbuteur, th = cul.th;
    // rails d'accès
    ctx.fillStyle = '#475569'; ctx.fillRect(-2000, SOL, 2000 + 112, 8); ctx.fillRect(408, SOL, 50, 8);
    // galets porteurs
    for (const a of [Math.PI * 0.62, Math.PI * 0.38]) {
      const gx = CUL.x + Math.cos(a) * (CUL.R + 14), gy = CUL.y + Math.sin(a) * (CUL.R + 14);
      ctx.fillStyle = '#334155'; ctx.fillRect(gx - 14, gy, 28, 40);
      engrenage(gx, gy, 10, 8, -th * 14, 0.01, '#94a3b8');
    }
    ctx.save(); ctx.translate(CUL.x, CUL.y); ctx.rotate(th);
    // anneau + couronne dentée
    engrenage(0, 0, CUL.R + 4, 100, 0, 6, '#64748b');
    ctx.beginPath(); ctx.arc(0, 0, CUL.R - 4, 0, Math.PI * 2); ctx.fillStyle = '#0f1a30'; ctx.fill();
    ctx.strokeStyle = '#eab308'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, CUL.R - 6, 0, Math.PI * 2); ctx.stroke();
    // bâti intérieur, plateforme et rails
    ctx.fillStyle = '#475569'; ctx.fillRect(-CUL.R + 12, 70, (CUL.R - 12) * 2, 10);
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(-60, 64, 12, 6); ctx.fillRect(48, 64, 12, 6);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-CUL.R + 20, 75); ctx.lineTo(-115, -70); ctx.moveTo(CUL.R - 20, 75); ctx.lineTo(115, -70); ctx.stroke();
    // wagon
    ctx.globalAlpha = cul.alpha;
    ctx.fillStyle = '#1f2937'; ctx.fillRect(-80, 50, 160, 10);
    for (const wx of [-54, 54]) { ctx.beginPath(); ctx.arc(wx, 58, 9, 0, Math.PI * 2); ctx.fillStyle = '#111827'; ctx.fill(); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = degV(-45, 50, '#4b5563', '#374151'); ctx.fillRect(-96, -45, 192, 95);
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2; ctx.strokeRect(-96, -45, 192, 95);
    for (const rx of [-48, 0, 48]) { ctx.beginPath(); ctx.moveTo(rx, -45); ctx.lineTo(rx, 50); ctx.stroke(); }
    const chW = cul.phase === 'echange' && cul.t > 1.2 ? 1 : cul.charge;   // wagon plein qui entre
    if (chW > 0) { // chargement
      const hc = 95 * chW;
      ctx.save(); ctx.beginPath(); ctx.rect(-92, -60, 184, 106); ctx.clip();
      ctx.fillStyle = '#8b3a1a';
      ctx.beginPath(); ctx.moveTo(-92, 46); ctx.lineTo(-92, 46 - hc + 10); ctx.quadraticCurveTo(0, 46 - hc - 22, 92, 46 - hc + 10); ctx.lineTo(92, 46); ctx.fill();
      ctx.fillStyle = '#a0522d';
      for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(-84 + i * 13, 46 - hc + 6 - Math.sin(i / 13 * Math.PI) * 14, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // brides de serrage
    const by = -70 + cul.bride * 18;
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-110, by - 6, 40, 10); ctx.fillRect(70, by - 6, 40, 10);
    ctx.fillStyle = '#ca8a04'; ctx.fillRect(-94, -96, 8, by + 90); ctx.fillRect(86, -96, 8, by + 90);
    ctx.restore();
    // entraînement : pignon + réducteur + frein + moteur
    const px = CUL.x + CUL.R + 10 + 18, py = CUL.y;
    ctx.fillStyle = '#273248'; ctx.fillRect(445, 268, 190, SOL - 268 + 8);
    engrenage(px, py, 16, 17 / 2 | 0, -th * (200 / 17), 5, '#cbd5e1');
    arbre(px, py, 460, py);
    reducteur(458, 210, 70, 58, etat.angMot * m.ramp, th * 1.4);
    arbre(528, py, 560, py);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(534, py - 16, 6, 32); // frein à disque
    accouplement(548, py, 24);
    moteur(562, 222, 72, 36, m.ramp);
  }

  function dessinTremie() {
    const t = TREM;
    // matière (niveau)
    const sy = surfaceTremie();
    ctx.save();
    ctx.beginPath(); ctx.moveTo(t.xh1, t.yh); ctx.lineTo(t.xh2, t.yh); ctx.lineTo(t.xb2, t.yb); ctx.lineTo(t.xb2, AL_HAUT - 2); ctx.lineTo(t.xb1, AL_HAUT - 2); ctx.lineTo(t.xb1, t.yb); ctx.closePath(); ctx.clip();
    if (etat.stock > 0.2) {
      ctx.fillStyle = degV(sy, AL_HAUT, '#9c4221', '#6b2a12');
      ctx.beginPath(); ctx.moveTo(0, AL_HAUT);
      for (let x = t.xh1; x <= t.xh2; x += 10) ctx.lineTo(x, sy + Math.sin(x * 0.07) * 3 + Math.abs(x - 270) * 0.06);
      ctx.lineTo(t.xh2, AL_HAUT); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(160,82,45,.8)';
      for (let x = t.xh1 + 6; x < t.xh2; x += 14) { ctx.beginPath(); ctx.arc(x, sy + 5 + Math.abs(x - 270) * 0.06 + (x * 7 % 5), 3.5, 0, 6.3); ctx.fill(); }
    }
    ctx.restore();
    // parois
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 7; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(t.xh1 - 15, t.yh - 10); ctx.lineTo(t.xh1, t.yh); ctx.lineTo(t.xb1, t.yb); ctx.lineTo(t.xb1, AL_HAUT - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t.xh2 + 15, t.yh - 10); ctx.lineTo(t.xh2, t.yh); ctx.lineTo(t.xb2, t.yb); ctx.lineTo(t.xb2, AL_HAUT - 34); ctx.stroke();
    // porte de réglage de la hauteur de couche
    ctx.fillStyle = '#eab308'; ctx.fillRect(t.xb2 - 3, t.yb - 2, 7, AL_HAUT - 34 - t.yb + 4);
    // jupes (bavettes) latérales
    ctx.fillStyle = 'rgba(100,116,139,.28)'; ctx.fillRect(t.xb2, AL_HAUT - 40, 330, 38);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.strokeRect(t.xb2, AL_HAUT - 40, 330, 38);
  }

  function dessinAlimentateur() {
    const a = AL, m = mach.alim, L = a.x2 - a.x1, top = AL_HAUT, bas = a.y + a.r;
    // longerons
    ctx.fillStyle = '#334155'; ctx.fillRect(a.x1, a.y - 6, L, 12);
    for (let x = a.x1 + 40; x < a.x2; x += 70) { engrenage(x, a.y - 4, 5, 6, -etat.offA / 5, 0.01, '#64748b'); engrenage(x + 35, a.y + 9, 5, 6, etat.offA / 5, 0.01, '#64748b'); }
    // tabliers brin supérieur (vers la droite) et brin inférieur (retour)
    const n = Math.ceil(L / a.P);
    for (let k = 0; k < n; k++) {
      const x = a.x1 + ((etat.offA + k * a.P) % L + L) % L;
      if (x + a.P - 3 <= a.x2) {
        ctx.fillStyle = degV(top, top + 9, '#9ca3af', '#4b5563'); ctx.fillRect(x + 1.5, top, a.P - 3, 9);
        ctx.fillStyle = '#6b7280'; ctx.fillRect(x + a.P - 6, top - 4, 3, 5);       // rebord du tablier
      }
      const xr = a.x2 - ((etat.offA + k * a.P) % L + L) % L;
      if (xr - a.P + 3 >= a.x1) { ctx.fillStyle = '#4b5563'; ctx.fillRect(xr - a.P + 1.5, bas - 9, a.P - 3, 9); }
    }
    // roues à chaîne (barbotins) de queue et de tête
    engrenage(a.x1, a.y, a.r - 4, 8, etat.offA / (a.r), 5, '#94a3b8');
    engrenage(a.x2, a.y, a.r - 4, 8, etat.offA / (a.r), 5, '#94a3b8');
    // tendeur à vis (queue)
    ctx.fillStyle = '#eab308'; ctx.fillRect(a.x1 - 40, a.y - 3, 22, 6);
    // entraînement de tête : moteur + accouplement + réducteur + chaîne de transmission
    ctx.fillStyle = '#273248'; ctx.fillRect(730, 521, 115, 6);
    const ox = 828, oy = 496;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.setLineDash([5, 3]); ctx.lineDashOffset = -etat.offA * 3;
    ctx.beginPath(); ctx.moveTo(ox - 9, oy); ctx.lineTo(a.x2 - 13, a.y); ctx.moveTo(ox + 9, oy); ctx.lineTo(a.x2 + 13, a.y); ctx.stroke(); ctx.setLineDash([]);
    reducteur(790, 470, 62, 50, etat.angMot * m.ramp, etat.offA / 10);
    engrenage(ox, oy, 7, 9, etat.offA / 8, 3, '#e2e8f0');
    engrenage(a.x2, a.y, 11, 12, etat.offA / 8, 3, '#e2e8f0');
    accouplement(778, 495, 20);
    moteur(716, 480, 62, 30, m.ramp, -1);
    // variateur (armoire)
    ctx.fillStyle = '#1e293b'; rr(650, 450, 46, 60, 4); ctx.fill(); ctx.strokeStyle = '#475569'; ctx.stroke();
    ctx.fillStyle = '#22c55e'; ctx.fillRect(656, 458, 34, 14);
    ctx.fillStyle = '#052e16'; ctx.font = 'bold 10px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${(etat.freq * m.ramp).toFixed(0)} Hz`, 673, 465.5);
    ctx.fillStyle = '#94a3b8'; ctx.font = '9px system-ui'; ctx.fillText('VARIATEUR', 673, 488);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(696, 496); ctx.lineTo(716, 494); ctx.stroke();
  }

  function dessinRacleuse() {
    const r = RA, L = r.x2 - r.x1, m = mach.racleuse;
    // auge
    ctx.fillStyle = 'rgba(30,41,59,.9)'; ctx.fillRect(r.x1 - 25, 648, L + 45, r.fond - 648 + 4);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(r.x1 - 25, 648); ctx.lineTo(r.x1 - 25, r.fond + 2); ctx.lineTo(r.xd1, r.fond + 2); ctx.moveTo(r.xd2, r.fond + 2); ctx.lineTo(r.x2 + 20, r.fond + 2); ctx.lineTo(r.x2 + 20, 648); ctx.stroke();
    // goulotte de vidange vers CV301
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(r.xd1, r.fond + 2); ctx.lineTo(r.xd1 + 2, yBande(r.xd1) - 14); ctx.moveTo(r.xd2, r.fond + 2); ctx.lineTo(r.xd2 + 4, yBande(r.xd2) - 14); ctx.stroke();
    // chaîne
    const yh = r.y - r.r + 2, yb = r.y + r.r - 2;
    ctx.strokeStyle = '#a1a1aa'; ctx.lineWidth = 3; ctx.setLineDash([7, 3]);
    ctx.lineDashOffset = etat.offR; ctx.beginPath(); ctx.moveTo(r.x2, yh); ctx.lineTo(r.x1, yh); ctx.stroke();
    ctx.lineDashOffset = -etat.offR; ctx.beginPath(); ctx.moveTo(r.x1, yb); ctx.lineTo(r.x2, yb); ctx.stroke();
    ctx.setLineDash([]);
    // raclettes
    const pas = 40, n = Math.ceil(L / pas);
    ctx.fillStyle = '#eab308';
    for (let k = 0; k < n; k++) {
      const d = ((etat.offR + k * pas) % L + L) % L;
      ctx.fillRect(r.x1 + d - 2, yb - 5, 4, r.fond - yb + 4);
      ctx.fillRect(r.x2 - d - 2, yh - 8, 4, 12);
    }
    engrenage(r.x1, r.y, r.r - 4, 7, -etat.offR / r.r, 4, '#94a3b8');
    engrenage(r.x2, r.y, r.r - 4, 7, -etat.offR / r.r, 4, '#94a3b8');
    // entraînement de tête : réducteur + accouplement + moteur
    ctx.fillStyle = '#273248'; ctx.fillRect(755, 752, 75, 5);
    arbre(r.x2, r.y, 760, 735);
    reducteur(752, 720, 34, 32, etat.angMot * m.ramp, etat.offR / 6);
    accouplement(788, 736, 16);
    moteur(800, 724, 34, 24, m.ramp);
  }

  function dessinBroyeur() {
    const b = BR, m = mach.broyeur;
    // trémie d'entrée et carter
    ctx.fillStyle = 'rgba(51,65,85,.55)';
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y1); ctx.lineTo(b.x2 - 25, b.ry - 10); ctx.lineTo(b.x2 - 25, b.y2); ctx.lineTo(b.x1 + 25, b.y2); ctx.lineTo(b.x1 + 25, b.ry - 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#eab308'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(b.x1 - 6, b.y1 - 8); ctx.lineTo(b.x1, b.y1); ctx.lineTo(b.x1 + 25, b.ry - 10); ctx.lineTo(b.x1 + 25, b.y2);
    ctx.moveTo(b.x2 + 6, b.y1 - 8); ctx.lineTo(b.x2, b.y1); ctx.lineTo(b.x2 - 25, b.ry - 10); ctx.lineTo(b.x2 - 25, b.y2); ctx.stroke();
    // matière en attente dans la trémie du broyeur
    const nf = etat.bro.file.length;
    if (nf) {
      const hf = Math.min(46, nf * 1.8);
      ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.ellipse((b.rx1 + b.rx2) / 2, b.ry - b.R - 2, 48, hf / 2 + 4, 0, Math.PI, 0); ctx.fill();
    }
    // rouleaux dentés contrarotatifs
    engrenage(b.rx1, b.ry, b.R - 6, 10, etat.angR, 8, '#9ca3af');
    engrenage(b.rx2, b.ry, b.R - 6, 10, -etat.angR + 0.3, 8, '#9ca3af');
    // deux entraînements indépendants : un moteur + coupleur + réducteur par rouleau (module)
    // module 2 (rouleau droit)
    arbre(b.rx2, b.ry, 1032, b.ry);
    ctx.fillStyle = '#273248'; ctx.fillRect(1028, 677, 190, 6);
    reducteur(1030, 624, 60, 52, etat.angMot * m.ramp, -etat.angR);
    arbre(1090, b.ry, 1142, b.ry);
    coupleur(1098, b.ry, 38, 36);
    moteur(1142, 632, 72, 38, m.ramp);
    // module 1 (rouleau gauche) : chaîne placée au-dessus
    ctx.save(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.setLineDash([7, 4]); // arbre côté opposé (pointillé)
    ctx.beginPath(); ctx.moveTo(b.rx1, b.ry); ctx.lineTo(b.rx1, 562); ctx.lineTo(1032, 562); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#273248'; ctx.fillRect(1028, 589, 190, 6);
    reducteur(1030, 536, 60, 52, etat.angMot * m.ramp, etat.angR);
    arbre(1090, 562, 1142, 562);
    coupleur(1098, 562, 38, 36);
    moteur(1142, 544, 72, 38, m.ramp);
    ctx.fillStyle = '#fde68a'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('M1', 1222, 563); ctx.fillText('M2', 1222, 651);
  }

  function dessinCV301() {
    const c = CV, m = mach.cv301;
    const xa = c.x1, xb = c.x2;
    // charpente
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
    for (let x = xa + 60; x < xb; x += 160) { ctx.beginPath(); ctx.moveTo(x, yBande(x) + 6); ctx.lineTo(x, Math.min(880, yRetour(x) + 60)); ctx.stroke(); }
    // rouleaux porteurs (auges) et de retour
    for (let x = xa + 30; x < xb - 10; x += 40) { ctx.beginPath(); ctx.arc(x, yBande(x) + 6, 5, 0, 6.3); ctx.fillStyle = '#475569'; ctx.fill(); }
    // brin de retour (avec tendeur à contrepoids)
    const tx = 1480, ty = 790;
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(xa, yRetour(xa)); ctx.lineTo(1440, yRetour(1440)); ctx.lineTo(tx - 12, ty); ctx.lineTo(tx + 12, ty); ctx.lineTo(1520, yRetour(1520)); ctx.lineTo(xb, yRetour(xb)); ctx.stroke();
    for (let x = xa + 90; x < xb - 30; x += 160) if (x < 1420 || x > 1540) { ctx.beginPath(); ctx.arc(x, yRetour(x) + 6, 5, 0, 6.3); ctx.fillStyle = '#475569'; ctx.fill(); }
    engrenage(1440, yRetour(1440), 8, 8, etat.offB / 8, 0.01, '#64748b');
    engrenage(1520, yRetour(1520), 8, 8, etat.offB / 8, 0.01, '#64748b');
    engrenage(tx, ty, 13, 10, -etat.offB / 13, 0.01, '#64748b');
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 8, ty); ctx.lineTo(tx - 8, ty + 25); ctx.moveTo(tx + 8, ty); ctx.lineTo(tx + 8, ty + 25); ctx.stroke();
    ctx.fillStyle = '#52525b'; rr(tx - 22, ty + 25, 44, 40, 3); ctx.fill();
    ctx.fillStyle = '#eab308'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('kg', tx, ty + 45);
    // brin porteur avec marques de mouvement
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(xa, yBande(xa)); ctx.lineTo(xb, yBande(xb)); ctx.stroke();
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; ctx.setLineDash([3, 22]); ctx.lineDashOffset = -etat.offB;
    ctx.beginPath(); ctx.moveTo(xa, yBande(xa) - 1); ctx.lineTo(xb, yBande(xb) - 1); ctx.stroke(); ctx.setLineDash([]);
    // tambours
    engrenage(xa, c.y1, c.rq - 3, 10, etat.offB / c.rq, 0.01, '#9ca3af');
    engrenage(xb, c.y2, c.rt - 3, 12, etat.offB / c.rt, 0.01, '#9ca3af');
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(xa, c.y1, c.rq, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(xb, c.y2, c.rt, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    // tendeur à vis de queue
    ctx.fillStyle = '#eab308'; ctx.fillRect(xa - 45, c.y1 - 3, 22, 6);
    // goulotte de tête
    ctx.fillStyle = 'rgba(51,65,85,.6)'; ctx.fillRect(xb + 6, 548, 82, 240);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.strokeRect(xb + 6, 548, 82, 240);
    // entraînement de tête
    ctx.fillStyle = '#273248'; ctx.fillRect(1752, 607, 170, 6);
    arbre(xb, c.y2, 1760, c.y2);
    ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(1752, c.y2, 9, 0, 6.3); ctx.fill(); // antidévireur
    reducteur(1762, 555, 58, 52, etat.angMot * m.ramp, etat.offB / 26);
    coupleur(1824, c.y2, 30, 30);
    moteur(1856, 562, 62, 36, m.ramp);
  }

  function etiquette(txt, wx, wy, coul = '#e2e8f0', bord = '#475569') {
    const [x, y] = versEcran(wx, wy), petit = cw < 700;
    ctx.font = `600 ${petit ? 11 : 12}px system-ui`; const w = ctx.measureText(txt).width + 12, hh = petit ? 18 : 20;
    ctx.fillStyle = 'rgba(15,23,42,.86)'; rr(x - w / 2, y - hh / 2, w, hh, 6); ctx.fill();
    ctx.strokeStyle = bord; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = coul; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 0.5);
  }
  function fleche(x1, y1, x2, y2, coul) {
    ctx.strokeStyle = coul; ctx.fillStyle = coul; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 10 * Math.cos(a - 0.45), y2 - 10 * Math.sin(a - 0.45)); ctx.lineTo(x2 - 10 * Math.cos(a + 0.45), y2 - 10 * Math.sin(a + 0.45)); ctx.fill();
  }

  function dessin() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * cam.x, dpr * cam.y);
    decor();
    dessinCV301();
    dessinRacleuse();
    dessinAlimentateur();
    dessinBroyeur();
    for (const p of parts) bloc(p);
    dessinTremie();
    dessinCulbuteur();
    if (sel) { const z = ZONES[sel]; ctx.strokeStyle = 'rgba(245,158,11,.8)'; ctx.lineWidth = 2 / cam.s; ctx.setLineDash([8 / cam.s, 5 / cam.s]); ctx.strokeRect(z[0], z[1], z[2] - z[0], z[3] - z[1]); ctx.setLineDash([]); }
    // sens de déplacement
    if (mach.alim.ramp > 0.05) fleche(440, 625, 520, 625, '#22c55e');
    if (mach.racleuse.ramp > 0.05) fleche(380, 724, 460, 724, '#22c55e');
    if (mach.cv301.ramp > 0.05) fleche(1250, yBande(1250) - 30, 1330, yBande(1330) - 30, '#22c55e');

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (etat.etiq) {
      const vA = vAlimNom() * mach.alim.ramp, vR = vRacNom() * mach.racleuse.ramp, vB = vBandeNom() * mach.cv301.ramp;
      const detail = cam.s > 0.45;
      etiquette(`Culbuteur · ${(cul.th * 180 / Math.PI).toFixed(0)}°`, CUL.x, 70, '#fde68a', '#f59e0b');
      if (detail) etiquette(`Trémie ${etat.stock.toFixed(0)} t`, 280, 530);
      etiquette(`Alimentateur à tabliers · ${fr(vA, 2)} m/s`, 580, 440, '#fde68a', '#f59e0b');
      if (detail) etiquette('Miettes entre les tabliers ↓', 560, 636, '#fdba74', '#ea580c');
      etiquette(`Chaîne racleuse · ${fr(vR, 2)} m/s`, 420, 762, '#fde68a', '#f59e0b');
      etiquette(`Broyeur (2 moteurs) · ${(nRouleaux() * mach.broyeur.ramp).toFixed(0)} tr/min`, 1130, 510, '#fde68a', '#f59e0b');
      etiquette(`Convoyeur CV301 · ${fr(vB, 2)} m/s`, 1250, 765, '#fde68a', '#f59e0b');
      if (detail) etiquette('Vers stockage', 1708, 810);
      if (cam.s > 0.75) {
        etiquette('Moteur', 598, 205); etiquette('Réducteur', 493, 198); etiquette('Pignon / couronne', 430, 292);
        etiquette('Variateur', 673, 438); etiquette('Moteur', 747, 466); etiquette('Réducteur', 821, 458); etiquette('Chaîne de transmission', 905, 540);
        etiquette('Moteur', 817, 714); etiquette('Réducteur', 769, 708); etiquette('Coupleur hydraulique', 1117, 700); etiquette('Moteur 2', 1178, 618); etiquette('Réducteur 2', 1060, 612); etiquette('Moteur 1', 1178, 530); etiquette('Réducteur 1', 1060, 524);
        etiquette('Tendeur à contrepoids', 1480, 870); etiquette('Antidévireur', 1752, 530); etiquette('Tambour de tête', 1640, 625); etiquette('Tambour de queue', 660, 885);
        etiquette('Raclettes', 600, 676); etiquette('Rouleaux dentés', 925, 720);
      }
    }
  }

  // =====================================================================
  //  Schéma de la chaîne cinématique (onglet)
  // =====================================================================
  const sc = $('schema'), sx = sc.getContext('2d');
  let choixSchema = 'culbuteur', tS = 0, sens = 1;
  function dessinSchema(dt) {
    const m = M[choixSchema], mm = mach[choixSchema], el = m.chaine;
    tS += dt * mm.ramp;
    const hv = m.double ? 280 : 230; if (sc.height !== hv) sc.height = hv;
    const w = sc.width, h = sc.height, n = el.length, pas = (w - 20) / n, yT = m.double ? 50 : 0;
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, w, h);
    sx.fillStyle = '#0b1220'; sx.fillRect(0, 0, w, h);
    const corps = (yA) => {
    // arbre continu : rapide avant le réducteur, lent après
    const iRed = el.findIndex(e => e.t === 'reducteur');
    for (let k = 0; k < n - 1; k++) {
      const x1 = 10 + pas * (k + 0.5), x2 = 10 + pas * (k + 1.5), rapide = k < iRed;
      sx.strokeStyle = '#cbd5e1'; sx.lineWidth = rapide ? 4 : 7; sx.beginPath(); sx.moveTo(x1, yA); sx.lineTo(x2, yA); sx.stroke();
      sx.strokeStyle = rapide ? '#ef4444' : '#3b82f6'; sx.lineWidth = rapide ? 4 : 7; sx.setLineDash([3, 9]); sx.lineDashOffset = -tS * (rapide ? 60 : 8);
      sx.beginPath(); sx.moveTo(x1, yA); sx.lineTo(x2, yA); sx.stroke(); sx.setLineDash([]);
    }
    el.forEach((e, k) => {
      const cx = 10 + pas * (k + 0.5), bw = Math.min(56, pas - 8);
      sx.save();
      switch (e.t) {
        case 'variateur':
          sx.fillStyle = '#1e293b'; sx.fillRect(cx - bw / 2, yA - 34, bw, 60); sx.strokeStyle = '#475569'; sx.strokeRect(cx - bw / 2, yA - 34, bw, 60);
          sx.fillStyle = '#22c55e'; sx.fillRect(cx - bw / 2 + 5, yA - 28, bw - 10, 14);
          sx.fillStyle = '#052e16'; sx.font = 'bold 10px monospace'; sx.textAlign = 'center'; sx.fillText(`${(etat.freq * mm.ramp).toFixed(0)} Hz`, cx, yA - 17);
          break;
        case 'moteur':
          sx.fillStyle = '#2563eb'; sx.fillRect(cx - bw / 2, yA - 22, bw * 0.8, 44); sx.fillStyle = '#1e40af'; sx.fillRect(cx - bw / 2 + bw * 0.8, yA - 18, bw * 0.2, 36);
          sx.fillStyle = '#fff'; sx.font = 'bold 15px system-ui'; sx.textAlign = 'center'; sx.fillText('M', cx - bw * 0.1, yA + 5);
          break;
        case 'frein':
          sx.fillStyle = '#ef4444'; sx.fillRect(cx - 4, yA - 26, 8, 52); sx.fillStyle = '#7f1d1d'; sx.fillRect(cx - 10, yA - 32, 20, 10);
          break;
        case 'accouplement':
          sx.fillStyle = '#eab308'; sx.fillRect(cx - 12, yA - 15, 10, 30); sx.fillRect(cx + 2, yA - 15, 10, 30);
          sx.fillStyle = '#1f2937'; sx.fillRect(cx - 2, yA - 11, 4, 22);
          break;
        case 'coupleur':
          sx.fillStyle = '#f59e0b'; sx.beginPath(); sx.ellipse(cx, yA, bw / 2.2, 24, 0, 0, 6.3); sx.fill();
          sx.strokeStyle = '#78350f'; sx.stroke();
          break;
        case 'reducteur': {
          sx.fillStyle = '#475569'; sx.fillRect(cx - bw / 2, yA - 34, bw, 68); sx.strokeStyle = '#94a3b8'; sx.strokeRect(cx - bw / 2, yA - 34, bw, 68);
          sx.restore(); sx.save();
          gear(sx, cx - bw * 0.18, yA - 12, 7, 9, tS * 6, '#e2e8f0');
          gear(sx, cx + bw * 0.08, yA + 8, 16, 22, -tS * 6 * 9 / 22, '#cbd5e1');
          break;
        }
        case 'antidevireur':
          sx.fillStyle = '#a855f7'; sx.beginPath(); sx.arc(cx, yA, 16, 0, 6.3); sx.fill(); sx.fillStyle = '#0b1220'; sx.beginPath(); sx.arc(cx, yA, 7, 0, 6.3); sx.fill();
          sx.fillStyle = '#fff'; sx.font = '10px system-ui'; sx.textAlign = 'center'; sx.fillText('⟳ seul', cx, yA - 22);
          break;
        case 'pignon':
          gear(sx, cx, yA, 13, 12, -tS * 0.8, '#e2e8f0');
          break;
        case 'couronne':
          sx.restore(); sx.save();
          sx.beginPath(); sx.rect(cx - pas / 2 - 6, 30, pas + 6, 150); sx.clip();
          gear(sx, cx + 70, yA, 82, 90, tS * 0.8 * 12 / 90, '#94a3b8');
          break;
        case 'barbotin':
          gear(sx, cx, yA, 18, 9, tS * 0.25, '#94a3b8');
          break;
        case 'tabliers': case 'raclettes': {
          const off = tS * 4 % 16;
          sx.strokeStyle = '#a1a1aa'; sx.lineWidth = 3; sx.beginPath(); sx.moveTo(cx - pas / 2, yA - 18); sx.lineTo(cx + pas / 2, yA - 18); sx.stroke();
          sx.fillStyle = e.t === 'tabliers' ? '#9ca3af' : '#eab308';
          for (let x = cx - pas / 2 - 16 + off; x < cx + pas / 2 - 8; x += 16) if (x > cx - pas / 2) sx.fillRect(x, yA - 26, e.t === 'tabliers' ? 13 : 4, e.t === 'tabliers' ? 7 : 16);
          sx.fillStyle = '#fff'; sx.font = '13px system-ui'; sx.textAlign = 'center'; sx.fillText('→', cx, yA - 34);
          break;
        }
        case 'synchro':
          gear(sx, cx, yA - 15, 13, 14, tS, '#e2e8f0'); gear(sx, cx, yA + 15, 13, 14, -tS + 0.22, '#cbd5e1');
          break;
        case 'rouleaux':
          gear(sx, cx - 13, yA, 13, 9, tS, '#9ca3af'); gear(sx, cx + 13, yA, 13, 9, -tS + 0.3, '#9ca3af');
          break;
        case 'rouleau':
          gear(sx, cx, yA, 20, 10, sens * tS, '#9ca3af', 7);
          sx.fillStyle = '#fff'; sx.font = '16px system-ui'; sx.textAlign = 'center'; sx.fillText(sens > 0 ? '↻' : '↺', cx, yA - 34);
          break;
        case 'tambour':
          gear(sx, cx, yA, 22, 14, tS, '#9ca3af', 0.01);
          sx.strokeStyle = '#111827'; sx.lineWidth = 5; sx.beginPath(); sx.arc(cx, yA, 25, -Math.PI / 2, Math.PI / 2, true); sx.stroke();
          break;
      }
      sx.restore();
    });
    };
    if (m.double) {               // deux chaînes identiques : une par rouleau (module)
      [[70, 'Module 1 · rouleau gauche'], [146, 'Module 2 · rouleau droit']].forEach(([yr, nom], r) => {
        sens = r ? -1 : 1; corps(yr);
        sx.fillStyle = '#fde68a'; sx.font = 'bold 10px system-ui'; sx.textAlign = 'left'; sx.fillText(nom, 6, yr - 38);
      });
      sens = 1;
    } else corps(92);
    el.forEach((e, k) => {
      const cx = 10 + pas * (k + 0.5);
      sx.fillStyle = '#fde68a'; sx.font = `bold ${pas < 80 ? 10 : 11}px system-ui`; sx.textAlign = 'center'; sx.textBaseline = 'alphabetic';
      ligneTexte(e.l, cx, 160 + yT, pas - 2, 12);
      sx.fillStyle = '#94a3b8'; sx.font = '10px system-ui';
      ligneTexte(e.d, cx, 190 + yT, pas - 2, 11);
    });
    sx.fillStyle = '#ef4444'; sx.font = '10px system-ui'; sx.textAlign = 'left'; sx.fillText('━ arbre rapide (avant réducteur)', 10, 18);
    sx.fillStyle = '#3b82f6'; sx.fillText('━ arbre lent, couple élevé', 200, 18);
  }
  function ligneTexte(t, x, y, lmax, lh) {
    while (t.split(' ').some(m => sx.measureText(m).width > lmax) && parseFloat(sx.font.match(/(\d+(\.\d+)?)px/)[1]) > 7) {
      sx.font = sx.font.replace(/(\d+(\.\d+)?)px/, (_, n) => (parseFloat(n) - 0.5) + 'px');
    }
    const mots = t.split(' '); let l = '', yy = y;
    for (const m of mots) { const essai = l ? l + ' ' + m : m; if (sx.measureText(essai).width > lmax && l) { sx.fillText(l, x, yy); l = m; yy += lh; } else l = essai; }
    if (l) sx.fillText(l, x, yy);
  }
  function gear(c, x, y, r, n, ang, coul, ht) {
    const h = ht !== undefined ? ht : Math.max(2.5, r * 0.18);
    c.save(); c.translate(x, y); c.rotate(ang); c.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, da = Math.PI * 2 / n;
      c.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      c.lineTo(Math.cos(a0 + da * 0.25) * (r + h), Math.sin(a0 + da * 0.25) * (r + h));
      c.lineTo(Math.cos(a0 + da * 0.5) * (r + h), Math.sin(a0 + da * 0.5) * (r + h));
      c.lineTo(Math.cos(a0 + da * 0.75) * r, Math.sin(a0 + da * 0.75) * r);
    }
    c.closePath(); c.fillStyle = coul; c.fill(); c.strokeStyle = '#1e293b'; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.3, 0, 6.3); c.fillStyle = '#334155'; c.fill();
    c.beginPath(); c.moveTo(-r * 0.7, 0); c.lineTo(r * 0.7, 0); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2; c.stroke();
    c.restore();
  }

  function majFiche() {
    const m = M[choixSchema];
    const v = (t) => String(t).replace(/(\d)\.(\d)/g, '$1,$2');
    const lignes = m.calc(m, etat).map(([g, f, an, r]) => [g, f, v(an), v(r)]).map(([g, f, an, r]) => `<tr><td>${g}<div class="f">${f}</div><div class="f" style="color:#94a3b8">${an}</div></td><td class="r">${r}</td></tr>`).join('');
    $('fiche').innerHTML = `<p><b>${m.nom}</b> — ${m.role}</p>
      <table class="tab"><tr><th>Grandeur</th><th>Résultat</th></tr>${lignes}</table>
      <h3>À retenir / maintenance</h3><ul>${m.points.map(p => `<li>${p}</li>`).join('')}</ul>`;
    document.querySelectorAll('#choix button').forEach(b => b.classList.toggle('actif', b.dataset.m === choixSchema));
  }

  // =====================================================================
  //  Interface
  // =====================================================================
  const ZONES = {
    culbuteur: [95, 60, 640, 330], alim: [140, 470, 860, 625], racleuse: [120, 645, 840, 760],
    broyeur: [835, 500, 1240, 750], cv301: [630, 540, 1920, 890]
  };
  let sel = null;

  function construireCommandes() {
    $('machines').innerHTML = D.ordre.map(id => `
      <div class="machine" data-m="${id}">
        <span class="voyant" id="vy-${id}"></span><span class="nom">${M[id].court}</span>
        <button type="button" class="on" data-a="marche">Marche</button><button type="button" class="off" data-a="arret">Arrêt</button>
        <span class="etat" id="et-${id}"></span>
      </div>`).join('') + `
      <h3>Simuler un défaut</h3>
      <div class="seq">
        <button type="button" class="btn" data-d="racleuse">Thermique chaîne racleuse</button>
        <button type="button" class="btn" data-d="broyeur">Bloc trop dur au broyeur</button>
        <button type="button" class="btn" data-d="cv301">Tirette d'arrêt CV301</button>
        <button type="button" class="btn" id="b-rearmer">Réarmer les défauts</button>
      </div>`;
    $('machines').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.d) {
        const t = { racleuse: 'déclenchement du relais thermique', broyeur: 'surcharge, le coupleur hydraulique patine', cv301: 'tirette d\'arrêt d\'urgence actionnée' }[b.dataset.d];
        defaut(b.dataset.d, t); return;
      }
      if (b.id === 'b-rearmer') { for (const id of D.ordre) mach[id].defaut = null; etat.au = false; message('Défauts réarmés : vous pouvez redémarrer (de l\'aval vers l\'amont).'); majCommandes(); return; }
      const id = b.closest('.machine')?.dataset.m; if (!id) return;
      etat.seq = null;
      if (b.dataset.a === 'marche') demarrer(id); else arreter(id);
      majCommandes();
    });
    $('choix').innerHTML = D.ordre.map(id => `<button type="button" data-m="${id}">${M[id].court}</button>`).join('');
    $('choix').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { choixSchema = b.dataset.m; majFiche(); } });
  }
  function majCommandes() {
    for (const id of D.ordre) {
      const m = mach[id], v = $('vy-' + id);
      v.className = 'voyant' + (m.defaut ? ' defaut' : m.ramp > 0.95 && m.cmd ? ' marche' : m.ramp > 0.01 ? ' rampe' : '');
      $('et-' + id).textContent = m.info;
    }
    const vA = vAlimNom() * mach.alim.ramp;
    $('mesures').innerHTML = [
      ['Trémie', `${etat.stock.toFixed(0)} t (${(etat.stock / CAPA * 100).toFixed(0)} %)`],
      ['Wagons vidés', etat.wagons],
      ['Débit alimentateur', `${(debit() * mach.alim.ramp).toFixed(0)} t/h`],
      ['Vitesse tabliers', `${fr(vA, 3)} m/s`],
      ['Miettes récupérées', etat.miettes],
      ['Expédié par CV301', `${fr(etat.expedie, 1)} t`]
    ].map(([a, b]) => `<div>${a}<b>${b}</b></div>`).join('');
    $('b-au').textContent = etat.au ? '↺ Réarmer l\'arrêt d\'urgence' : '⛔ Arrêt d\'urgence';
  }

  let score = 0, rep = 0;
  $('quiz').addEventListener('click', (e) => {
    if (e.target.id === 'b-quiz') { construireCours(); return; }
    const b = e.target.closest('.question button'); if (!b) return;
    const bloc = b.parentElement; if (bloc.dataset.fait) return;
    bloc.dataset.fait = 1; rep++;
    const it = D.quiz[+bloc.dataset.i], j = +b.dataset.j;
    if (j === it.b) score++; else b.classList.add('faux');
    bloc.querySelectorAll('button')[it.b].classList.add('bon');
    $('score').textContent = `Score : ${score} / ${rep}` + (rep === D.quiz.length ? ` — ${score >= 8 ? 'Très bien !' : 'Relisez l\'onglet Cours.'}` : '');
  });
  function construireCours() {
    $('cours').innerHTML = D.cours + '<p class="note">Valeurs d\'exemple pédagogique. Le remplissage de la trémie est accéléré (×3) pour la démonstration.</p>';
    const q = $('quiz'); score = 0; rep = 0;
    q.innerHTML = D.quiz.map((it, i) => `<div class="question" data-i="${i}"><p>${i + 1}. ${it.q}</p>${it.r.map((r, j) => `<button type="button" data-j="${j}">${r}</button>`).join('')}</div>`).join('') +
      `<div class="score" id="score"></div><button type="button" class="btn" id="b-quiz">Recommencer</button>`;
  }

  // onglets
  $('onglets').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#onglets button').forEach(x => x.classList.toggle('actif', x === b));
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('actif', p.id === 'p-' + b.dataset.p));
    if (b.dataset.p === 'cinematique') majFiche();
  });
  $('b-demarrer').onclick = seqDemarrage;
  $('b-arreter').onclick = seqArret;
  $('b-au').onclick = () => {
    if (etat.au) { etat.au = false; message('Arrêt d\'urgence réarmé.'); }
    else { etat.au = true; etat.seq = null; for (const id of D.ordre) mach[id].cmd = false; message('⛔ ARRÊT D\'URGENCE : toutes les machines sont arrêtées, culbuteur freiné.'); }
    majCommandes();
  };
  $('freq').oninput = (e) => { etat.freq = +e.target.value; $('v-freq').textContent = etat.freq + ' Hz'; if (choixSchema === 'alim') majFiche(); };
  $('vitesse').oninput = (e) => { etat.vit = +e.target.value; };
  $('b-pause').onclick = (e) => { etat.pause = !etat.pause; e.currentTarget.textContent = etat.pause ? '▶' : '⏸'; };
  $('b-etiq').onclick = (e) => { etat.etiq = !etat.etiq; e.currentTarget.setAttribute('aria-pressed', etat.etiq); };
  $('b-centre').onclick = () => { if (vue === '3d' && window.VUE3D) window.VUE3D.recentrer(); else recentrer(); };
  // ---------- Vue 3D / 2D ----------
  let vue = '2d';
  function changerVue(v) {
    if (v === '3d' && !window.VUE3D) v = '2d';
    vue = v;
    cv.hidden = v !== '2d'; $('canvas3d').hidden = v !== '3d'; $('etiq3d').hidden = v !== '3d';
    $('b-vue').textContent = v === '3d' ? '2D' : '3D';
    $('aide').textContent = v === '3d' ? '1 doigt : tourner · 2 doigts : zoomer / déplacer · toucher une machine : sa fiche'
      : '1 doigt : déplacer · 2 doigts : zoomer · toucher une machine : sa chaîne cinématique';
    if (v === '2d') { redim(); recentrer(); } else window.VUE3D.redim();
  }
  $('b-vue').onclick = () => changerVue(vue === '3d' ? '2d' : '3d');
  // état partagé avec la vue 3D (scene3d.js)
  window.BROYAGE = {
    etat, mach, cul, parts: () => parts, choisir, changerVue, yBande, yRetour,
    avancer(s) { for (let i = 0; i < s * 50; i++) pas(0.02); },
    GEO: { W, H, SOL, CUL, TREM, AL, AL_HAUT, RA, BR, CV, CV_A, CAPA },
    sel: () => sel,
    libelles() {
      const vA = vAlimNom() * mach.alim.ramp, vR = vRacNom() * mach.racleuse.ramp, vB = vBandeNom() * mach.cv301.ramp;
      return [
        [`Culbuteur · ${(cul.th * 180 / Math.PI).toFixed(0)}°`, CUL.x, 70, 1],
        [`Trémie ${etat.stock.toFixed(0)} t`, 280, 470, 0],
        [`Alimentateur à tabliers · ${fr(vA, 2)} m/s`, 520, 520, 1],
        ['Miettes entre les tabliers ↓', 560, 636, 2],
        [`Chaîne racleuse · ${fr(vR, 2)} m/s`, 420, 740, 1],
        [`Broyeur (2 moteurs) · ${(nRouleaux() * mach.broyeur.ramp).toFixed(0)} tr/min`, 930, 590, 1],
        [`Convoyeur CV301 · ${fr(vB, 2)} m/s`, 1250, 690, 1],
        ['Vers stockage', 1708, 800, 0]
      ];
    }
  };
  $('b-plein').onclick = (e) => {
    const on = !document.body.classList.contains('plein');
    document.body.classList.toggle('plein', on); e.currentTarget.textContent = on ? '✕' : '⛶';
    try { if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); else if (!on && document.fullscreenElement) document.exitFullscreen(); } catch (_) { /* rien */ }
    setTimeout(redim, 60);
  };
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('plein')) { document.body.classList.remove('plein'); $('b-plein').textContent = '⛶'; setTimeout(redim, 60); } });

  // ---------- Zoom / déplacement (souris, doigts) ----------
  const ptrs = new Map(); let geste = null, tap = null;
  const sMin = () => sFit * 0.7, sMax = () => sFit * 9;
  function zoomer(f, ex, ey) {
    const ns = Math.min(sMax(), Math.max(sMin(), cam.s * f)); f = ns / cam.s;
    cam.x = ex - (ex - cam.x) * f; cam.y = ey - (ey - cam.y) * f; cam.s = ns;
  }
  const posLoc = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, posLoc(e));
    if (ptrs.size === 1) tap = { p: posLoc(e), t: performance.now() }; else tap = null;
    geste = null;
  });
  cv.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const ancien = ptrs.get(e.pointerId), nv = posLoc(e);
    if (ptrs.size === 1) {
      cam.x += nv[0] - ancien[0]; cam.y += nv[1] - ancien[1];
      if (tap && Math.hypot(nv[0] - tap.p[0], nv[1] - tap.p[1]) > 8) tap = null;
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d0 = Math.hypot(a[0] - b[0], a[1] - b[1]), m0 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      ptrs.set(e.pointerId, nv);
      const [c, d] = [...ptrs.values()];
      const d1 = Math.hypot(c[0] - d[0], c[1] - d[1]), m1 = [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2];
      cam.x += m1[0] - m0[0]; cam.y += m1[1] - m0[1];
      if (d0 > 5) zoomer(d1 / d0, m1[0], m1[1]);
      return;
    }
    ptrs.set(e.pointerId, nv);
  });
  const fin = (e) => {
    if (tap && ptrs.size === 1 && performance.now() - tap.t < 400) toucher(tap.p[0], tap.p[1]);
    ptrs.delete(e.pointerId); tap = null; void geste;
  };
  cv.addEventListener('pointerup', fin);
  cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); tap = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = posLoc(e); zoomer(Math.exp(-Math.max(-150, Math.min(150, e.deltaY)) * 0.0015), x, y); }, { passive: false });
  cv.addEventListener('dblclick', recentrer);

  function toucher(ex, ey) {
    const [x, y] = versMonde(ex, ey);
    const ordreTest = ['racleuse', 'broyeur', 'alim', 'culbuteur', 'cv301'];
    choisir(ordreTest.find(k => { const z = ZONES[k]; return x >= z[0] && x <= z[2] && y >= z[1] && y <= z[3]; }));
  }
  function choisir(id) {
    const info = $('info');
    if (!id) { sel = null; info.hidden = true; return; }
    sel = id; choixSchema = id; majFiche();
    if (vue === '3d' && window.VUE3D) window.VUE3D.cibler(id);
    const m = M[id];
    info.innerHTML = `<b>${m.nom}</b>${m.role}<br><span style="color:#94a3b8">${m.chaine.map(c => c.l).join(' → ')}</span>
      <br><button type="button" class="btn" id="b-voir" style="margin:6px 0 0">Voir la chaîne cinématique</button>`;
    info.hidden = false;
    $('b-voir').onclick = () => { document.querySelector('#onglets button[data-p="cinematique"]').click(); info.hidden = true; };
  }

  // ---------- Boucle ----------
  let tPrec = performance.now(), tUi = 0;
  function boucle(t) {
    let dt = Math.min(0.05, (t - tPrec) / 1000); tPrec = t;
    if (!etat.pause) {
      dt *= etat.vit;
      const n = Math.ceil(dt / 0.02);
      for (let i = 0; i < n; i++) pas(dt / n);
    }
    if (vue === '2d') dessin(); else if (window.VUE3D) window.VUE3D.rendre(dt);
    if ($('p-cinematique').classList.contains('actif')) dessinSchema(etat.pause ? 0 : dt);
    tUi += dt;
    if (tUi > 0.25) { tUi = 0; majCommandes(); }
    requestAnimationFrame(boucle);
  }

  construireCommandes();
  construireCours();
  changerVue('2d'); // la vue 3D s'active dès que scene3d.js est chargé
  new ResizeObserver(redim).observe(cv);
  redim();
  majCommandes();
  majFiche();
  requestAnimationFrame(boucle);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
