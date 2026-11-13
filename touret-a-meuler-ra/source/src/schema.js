// Schéma technique (SVG) d'une pièce du touret, généré à partir de ses vraies données de construction :
// profils relevés sur le dessin (pièces de révolution), cotes des écrous / rondelles, des vis et des roulements.
// Chaque « zone » repérée (A, B, C…) est reliée au modèle 3D : bande sur la pièce, ou sous-objets à éclairer.
import { PIECES } from './touret.js';

const MM = 0.10 / 5.4 * 1000;            // 1 unité du modèle ≈ 18,5 mm (meule Ø200 → rayon 5,4)
const U = px => (px - 950) / 100;         // abscisse du dessin (px) → unités du modèle
const mm = v => Math.round(v * MM);

// ---------------------------------------------------------------- données techniques
export const DESIGNATION = {
  1: 'Bâti en fonte (corps du touret)', 2: 'Arbre étagé porte-meule', 3: 'Roulement à une rangée de billes, contact radial',
  4: 'Roulement à une rangée de billes, contact radial', 5: 'Entretoise (bague d\'écartement)', 6: 'Rondelle frein à languettes (type MB)',
  7: 'Écrou à encoches (type KM, ISO 2982-2)', 8: 'Bague-logement du roulement 4', 9: 'Joint plat (papier fibre)', 10: 'Couvercle droit',
  11: 'Carter de protection (tôle)', 12: 'Poulie à 2 gorges trapézoïdales', 13: 'Tôle de protection', 14: 'Couvercle gauche',
  15: 'Meule plate abrasive', 16: 'Joint d\'étanchéité (feutre / lèvre)', 17: 'Flasque de serrage de meule', 18: 'Écrou à encoches (type KM)',
  19: 'Capuchon cache-écrou', 20: 'Vis à tête cylindrique à six pans creux (CHc)',
  rp: 'Rondelle frein à languettes (type MB)', rm: 'Rondelle frein à languettes (type MB)', em: 'Écrou à encoches (type KM)',
  cm: 'Capuchon cache-écrou', vg: 'Vis à tête cylindrique à six pans creux (CHc)', bc: 'Bague de centrage (réduction d\'alésage)',
};
export const FONCTION = {
  1: 'Porte les roulements et se fixe sur l\'établi.', 2: 'Transmet la rotation de la poulie à la meule.',
  3: 'Guide l\'arbre en rotation (côté meule).', 4: 'Guide l\'arbre en rotation (côté poulie) et l\'arrête axialement.',
  5: 'Maintient l\'écart entre les bagues intérieures des roulements 3 et 4.', 6: 'Empêche l\'écrou 7 de se desserrer.',
  7: 'Serre et arrête axialement la bague intérieure du roulement 4.', 8: 'Reçoit la bague extérieure du roulement 4 (épaulement C).',
  9: 'Rend étanche le joint entre le bâti et le couvercle 10.', 10: 'Ferme le bâti et arrête la bague extérieure du roulement 4 (D).',
  11: 'Protège l\'opérateur de la poulie et des courroies.', 12: 'Reçoit le mouvement du moteur par courroies.',
  13: 'Protège l\'opérateur (projection d\'éclats).', 14: 'Ferme le bâti côté meule.', 15: 'Outil d\'affûtage par abrasion.',
  16: 'Garde la graisse dans le palier et arrête les poussières.', 17: 'Serrent et entraînent la meule par adhérence.',
  18: 'Arrête la poulie sur l\'arbre.', 19: 'Protège l\'écrou et l\'opérateur.', 20: 'Fixe le couvercle sur le bâti.',
  rp: 'Empêche l\'écrou 18 de se desserrer.', rm: 'Empêche l\'écrou de meule de se desserrer.', em: 'Serre les flasques et la meule sur l\'arbre.',
  cm: 'Protège l\'écrou de meule.', vg: 'Fixe le couvercle gauche sur le bâti.', bc: 'Centre la meule sur l\'arbre.',
};

// zones repérées par pièce (x en px du dessin, r en unités) — les autres pièces reçoivent des zones automatiques
const ZONES = {
  2: [
    { label: 'Portée de la meule', x: [80, 350], r: [0.6, 0.72] },
    { label: 'Portée du joint 16', x: [350, 493], r: [1.0, 1.12] },
    { label: 'Épaulement E (appui du roulement 3)', x: [493, 533], r: [1.13, 1.3] },
    { label: 'Portée du roulement 3', x: [533, 653], r: [1.05, 1.15] },
    { label: 'Portée du roulement 4', x: [1097, 1203], r: [1.0, 1.1] },
    { label: 'Filetage de l\'écrou 7', x: [1203, 1300], r: [0.8, 0.88] },
    { label: 'Portée de la poulie + rainure de clavette', x: [1507, 1700], r: [0.5, 0.6] },
  ],
  12: [
    { label: 'Gorge trapézoïdale 1', x: [1447, 1543], r: [1.85, 2.6] },
    { label: 'Gorge trapézoïdale 2', x: [1573, 1667], r: [1.85, 2.6] },
    { label: 'Alésage + rainure de clavette', x: [1420, 1700], r: [0.56, 0.7] },
  ],
  15: [
    { label: 'Périphérie de travail', x: [223, 293], r: [5.1, 5.42] },
    { label: 'Flancs (serrés par les flasques)', x: [223, 293], r: [1.0, 2.5], face: true },
    { label: 'Alésage (bague de centrage)', x: [223, 293], r: [0.76, 0.86] },
  ],
  1: [
    { label: 'Alésage du roulement 3', x: [463, 715], r: [2.6, 2.7] },
    { label: 'Chambre de graisse', x: [740, 1045], r: [2.78, 2.9] },
    { label: 'Logement de la bague 8', x: [1057, 1283], r: [2.58, 2.68] },
    { label: 'Semelle (fixation sur l\'établi)', x: [430, 1393], r: [3.1, 3.3], under: true },
  ],
  5: [
    { label: 'Face d\'appui F (roulement 3)', x: [653, 668], r: [1.13, 1.35] },
    { label: 'Face d\'appui G (roulement 4)', x: [1082, 1097], r: [1.13, 1.35] },
  ],
  8: [
    { label: 'Logement du roulement 4', x: [1097, 1283], r: [2.3, 2.4] },
    { label: 'Épaulement C', x: [1057, 1097], r: [2.05, 2.35] },
  ],
  10: [
    { label: 'Appui D sur le roulement 4', x: [1203, 1220], r: [1.55, 2.32] },
    { label: 'Logement du joint 16', x: [1317, 1363], r: [1.15, 1.25] },
    { label: 'Fixation par les vis 20', x: [1290, 1393], r: [3.4, 4.0] },
  ],
  14: [
    { label: 'Logement du joint 16', x: [407, 460], r: [1.5, 1.62] },
    { label: 'Centrage dans le bâti', x: [447, 507], r: [2.55, 2.65] },
  ],
};

// ---------------------------------------------------------------- outils de géométrie
function envelope(polys) {          // pour chaque intervalle en x : rayon extérieur et rayon intérieur (profil de révolution)
  const xs = [...new Set(polys.flatMap(p => p.map(q => q[0])))].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const xm = (xs[i] + xs[i + 1]) / 2; const rs = [];
    for (const p of polys) for (let j = 0; j < p.length; j++) {
      const a = p[j], b = p[(j + 1) % p.length];
      if ((a[0] - xm) * (b[0] - xm) < 0) rs.push(a[1] + (b[1] - a[1]) * (xm - a[0]) / (b[0] - a[0]));
    }
    if (rs.length) out.push({ x0: xs[i], x1: xs[i + 1], R: Math.max(...rs), r: Math.min(...rs) });
  }
  return out;
}
const f = n => Math.round(n * 10) / 10;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------------------------------------------------------------- dessin SVG
class Sheet {
  constructor() { this.parts = []; this.zr = []; }
  add(s) { this.parts.push(s); }
}

// Renvoie { svg, zones } ; zones : [{ id, letter, label, x, r, objs?, notch?, faceOnly? }]
export function buildSchema(T, key, info) {
  const p = T.parts[key];
  const W = 640, H = 600, top = 92, dh = 300;                  // zone de dessin : y de 92 à 392
  const sh = new Sheet(); let zones = []; let views = '', note = '';
  const box = { x0: 40, x1: W - 40, y0: top, y1: top + dh };
  const L = (s) => sh.add(s);

  // transformation unités → SVG pour une vue (bornes en unités)
  const fit = (xmin, xmax, rmax, area) => {
    const k = Math.min((area.x1 - area.x0 - 70) / Math.max(0.01, xmax - xmin), (area.y1 - area.y0 - 56) / Math.max(0.01, 2 * rmax));
    const cx = (area.x0 + area.x1) / 2 - (xmin + xmax) / 2 * k, ay = (area.y0 + area.y1) / 2;
    return { k, X: x => f(cx + x * k), Y: r => f(ay - r * k), ay, xmin, xmax, rmax, area };
  };
  const axis = (t, x0, x1) => L(`<line class="ax" x1="${f(x0)}" y1="${t.ay}" x2="${f(x1)}" y2="${t.ay}"/>`);
  const poly = (t, pts, cls, z, sgn = 1) => L(`<polygon class="${cls}"${z ? ` data-z="${z}"` : ''} points="${pts.map(([x, r]) => t.X(x) + ',' + t.Y(sgn * r)).join(' ')}"/>`);
  const dimH = (t, x0, x1, y, txt) => L(`<g class="dim"><line x1="${t.X(x0)}" y1="${y}" x2="${t.X(x1)}" y2="${y}" marker-start="url(#ar)" marker-end="url(#ar)"/><line class="ext" x1="${t.X(x0)}" y1="${y - 6}" x2="${t.X(x0)}" y2="${y + 6}"/><line class="ext" x1="${t.X(x1)}" y1="${y - 6}" x2="${t.X(x1)}" y2="${y + 6}"/><text x="${f((t.X(x0) + t.X(x1)) / 2)}" y="${y - 5}" text-anchor="middle">${txt}</text></g>`);
  const dimV = (t, x, r0, r1, txt) => L(`<g class="dim"><line x1="${x}" y1="${t.Y(r0)}" x2="${x}" y2="${t.Y(r1)}" marker-start="url(#ar)" marker-end="url(#ar)"/><text transform="translate(${x - 5},${f((t.Y(r0) + t.Y(r1)) / 2)}) rotate(-90)" text-anchor="middle">${txt}</text></g>`);
  const zoneRect = (t, z, x0, x1, r0, r1, sgn = 1) => L(`<rect class="zr" data-z="${z}" x="${f(Math.min(t.X(x0), t.X(x1)))}" y="${f(Math.min(t.Y(sgn * r0), t.Y(sgn * r1)))}" width="${f(Math.abs(t.X(x1) - t.X(x0)) + 0.01)}" height="${f(Math.abs(t.Y(r1) - t.Y(r0)) + 0.01)}"/>`);
  const anchors = {};                                           // point d'attache de la ligne de repère (SVG)

  // ---- pièces de révolution : demi-coupe (moitié haute coupée et hachurée, moitié basse en vue extérieure)
  if (p.prof) {
    const pts = p.prof.map(([px, r]) => [U(px), r]);
    const solid = Math.min(...pts.map(q => q[1])) < 0.01;      // arbre plein : non coupé (convention)
    const env = envelope([pts]);
    const xmin = Math.min(...pts.map(q => q[0])), xmax = Math.max(...pts.map(q => q[0])), rmax = Math.max(...pts.map(q => q[1]));
    const base = key === '1' || key === 1;
    const t = fit(xmin, xmax, rmax, box);
    const hatchCls = key === '15' || key === 15 ? 'sec grain' : 'sec';
    if (!solid) poly(t, pts, hatchCls, null, 1);
    // vue extérieure (et moitié haute si arbre plein)
    const halves = solid ? [1, -1] : [-1];
    for (const s of halves) {
      let d = '';
      env.forEach((e, i) => { const R = base && s < 0 ? Math.min(e.R, 3.25) : e.R; d += (i ? ' L' : 'M') + t.X(e.x0) + ',' + t.Y(s * R) + ' L' + t.X(e.x1) + ',' + t.Y(s * R); });
      L(`<path class="vis" d="${d}"/>`);
      env.forEach((e, i) => { const nx = env[i + 1]; if (!nx || Math.abs(nx.R - e.R) < 0.01) return; let RR = Math.max(nx.R, e.R); if (base && s < 0) RR = Math.min(RR, 3.25); L(`<line class="vis" x1="${t.X(e.x1)}" y1="${t.ay}" x2="${t.X(e.x1)}" y2="${t.Y(s * RR)}"/>`); });
      L(`<line class="vis" x1="${t.X(xmin)}" y1="${t.ay}" x2="${t.X(xmin)}" y2="${t.Y(s * env[0].R)}"/><line class="vis" x1="${t.X(xmax)}" y1="${t.ay}" x2="${t.X(xmax)}" y2="${t.Y(s * env[env.length - 1].R)}"/>`);
      if (!solid && s < 0) { let h = ''; env.forEach((e, i) => { h += (i ? ' L' : 'M') + t.X(e.x0) + ',' + t.Y(-e.r) + ' L' + t.X(e.x1) + ',' + t.Y(-e.r); }); L(`<path class="hid" d="${h}"/>`); }
    }
    if (base) {   // semelle et patins du bâti
      L(`<rect class="vis" x="${t.X(U(430))}" y="${t.Y(-2.55)}" width="${f(t.X(U(1393)) - t.X(U(430)))}" height="${f(t.Y(-3.25) - t.Y(-2.55))}"/>`);
      for (const [a, b] of [[440, 687], [1027, 1385]]) L(`<rect class="vis" x="${t.X(U(a))}" y="${t.Y(-3.25)}" width="${f(t.X(U(b)) - t.X(U(a)))}" height="${f(t.Y(-3.58) - t.Y(-3.25))}"/>`);
    }
    axis(t, t.X(xmin) - 18, t.X(xmax) + 18);
    // cotes (≈ mm)
    dimH(t, xmin, xmax, f(t.Y(-(base ? 3.58 : rmax)) + 26), `L ≈ ${mm(xmax - xmin)}`);
    dimV(t, f(t.X(xmax) + 34), -rmax, rmax, `Ø${mm(2 * rmax)}`);
    const bore = !solid ? Math.min(...env.map(e => e.r)) : 0;
    if (bore > 0.05) dimV(t, f(t.X(xmin) - 26), -bore, bore, `Ø${mm(2 * bore)}`);
    // zones
    const list = ZONES[key] || autoZones(pts, env, solid, xmin, xmax, rmax);
    zones = list.map((z, i) => ({ ...z, id: String.fromCharCode(65 + i), letter: String.fromCharCode(65 + i) }));
    for (const z of zones) {
      const x0 = U(z.x[0]), x1 = U(z.x[1]);
      if (z.under) { zoneRect(t, z.id, x0, x1, z.r[0], 3.58, -1); anchors[z.id] = [f((t.X(x0) + t.X(x1)) / 2), t.Y(-3.4)]; continue; }
      zoneRect(t, z.id, x0, x1, z.r[0], z.r[1]); anchors[z.id] = [f((t.X(x0) + t.X(x1)) / 2), t.Y((z.r[0] + z.r[1]) / 2)];
    }
    views = solid ? 'Vue extérieure (arbre plein : non coupé)' : 'Demi-coupe par le plan de l\'axe';
  }
  // ---- roulement : coupe complète (bagues hachurées, billes, cage)
  else if (p.bearing) {
    const b = p.bearing; const B = b.B;
    const t = fit(-B * 0.9, B * 0.9, b.D / 2, { x0: box.x0 + 120, x1: box.x1 - 120, y0: box.y0, y1: box.y1 });
    const ring = (prof, z) => { for (const s of [1, -1]) poly(t, prof.map(([r, y]) => [y, r]), 'sec', z, s); };
    ring(b.profOuter, 'A'); ring(b.profInner, 'B');
    for (const s of [1, -1]) {
      L(`<circle class="ball" data-z="C" cx="${t.X(0)}" cy="${t.Y(s * b.Dp / 2)}" r="${f(b.Db / 2 * t.k)}"/>`);
      L(`<path class="cage" data-z="D" d="M${t.X(-b.Db * 0.42)},${t.Y(s * (b.Dp / 2 + b.Db * 0.18))} L${t.X(-b.Db * 0.42)},${t.Y(s * (b.Dp / 2 - b.Db * 0.18))} M${t.X(b.Db * 0.42)},${t.Y(s * (b.Dp / 2 + b.Db * 0.18))} L${t.X(b.Db * 0.42)},${t.Y(s * (b.Dp / 2 - b.Db * 0.18))}"/>`);
    }
    axis(t, t.X(-B) - 20, t.X(B) + 20);
    dimH(t, -B / 2, B / 2, f(t.Y(-b.D / 2) + 26), `B ≈ ${mm(B)}`);
    dimV(t, f(t.X(B / 2) + 40), -b.D / 2, b.D / 2, `D ≈ Ø${mm(b.D)}`);
    dimV(t, f(t.X(-B / 2) - 30), -b.d / 2, b.d / 2, `d ≈ Ø${mm(b.d)}`);
    const cage = []; b.cage.traverse(o => { if (o.isMesh && !b.balls.includes(o)) cage.push(o); });
    zones = [
      { id: 'A', letter: 'A', label: 'Bague extérieure (montée avec jeu dans le bâti)', objs: [b.outer] },
      { id: 'B', letter: 'B', label: 'Bague intérieure (montée serrée sur l\'arbre)', objs: [b.inner] },
      { id: 'C', letter: 'C', label: `Billes (${b.balls.length})`, objs: b.balls },
      { id: 'D', letter: 'D', label: 'Cage (garde l\'écart entre les billes)', objs: cage },
    ];
    const yA = t.Y(b.D / 2 - (b.D - b.Dp - b.Db) / 4), yB = t.Y(b.d / 2 + (b.Dp - b.d - b.Db) / 4);
    Object.assign(anchors, { A: [t.X(-B * 0.25), yA], B: [t.X(B * 0.25), yB], C: [t.X(0), t.Y(b.Dp / 2)], D: [t.X(b.Db * 0.42), t.Y(b.Dp / 2 - b.Db * 0.1)] });
    views = 'Coupe par le plan de l\'axe';
  }
  // ---- écrou à encoches / rondelle frein : vue de face + coupe
  else if (p.lock) {
    const k = p.lock, nut = k.kind === 'nut';
    const R = nut ? k.R : k.Rw, ri = k.ri, Rout = nut ? k.R : Math.max(k.Rw, k.lugR || 0);
    const xa = U(nut ? k.xa : k.w0), xb = U(nut ? k.xb : k.w1), w = Math.abs(xb - xa);
    const face = { x0: box.x0, x1: box.x0 + 330, y0: box.y0, y1: box.y1 }, side = { x0: box.x0 + 330, x1: box.x1, y0: box.y0, y1: box.y1 };
    const tf = fit(-Rout, Rout, Rout, face), cx = tf.X(0), cy = tf.ay, kk = tf.k;
    const P = (a, r) => [f(cx + Math.cos(a) * r * kk), f(cy - Math.sin(a) * r * kk)];
    if (nut) {
      let d = ''; const steps = 192;
      for (let i = 0; i <= steps; i++) { const a = i / steps * Math.PI * 2; let rr = R; for (const c of [Math.PI / 2, 0, -Math.PI / 2, Math.PI]) { const da = Math.atan2(Math.sin(a - c), Math.cos(a - c)); if (Math.abs(da) * R < k.nw) rr = R - k.nd; } const q = P(a, rr); d += (i ? ' L' : 'M') + q[0] + ',' + q[1]; }
      L(`<path class="face" d="${d} Z"/><circle class="vis" cx="${cx}" cy="${cy}" r="${f(ri * kk)}"/><circle class="thin" cx="${cx}" cy="${cy}" r="${f((ri + 0.04) * kk)}" stroke-dasharray="none"/>`);
      for (const c of [Math.PI / 2, 0, -Math.PI / 2, Math.PI]) { const a0 = c - k.nw / R, a1 = c + k.nw / R; const q = [P(a0, R), P(a0, R - k.nd), P(a1, R - k.nd), P(a1, R)]; L(`<polygon class="zs" data-z="A" points="${q.map(v => v.join(',')).join(' ')}"/>`); }
      L(`<circle class="zs ring" data-z="B" cx="${cx}" cy="${cy}" r="${f(ri * kk)}"/>`);
      anchors.A = P(Math.PI / 2, R - k.nd / 2); anchors.B = P(-Math.PI / 4, ri);
    } else {
      L(`<circle class="face" cx="${cx}" cy="${cy}" r="${f(R * kk)}"/><circle class="hole" cx="${cx}" cy="${cy}" r="${f(ri * kk)}"/>`);
      const tab = (a, r0, r1, wd, z) => { const n = [Math.cos(a), -Math.sin(a)], tg = [-n[1], n[0]]; const c0 = [cx + n[0] * r0 * kk, cy + n[1] * r0 * kk], c1 = [cx + n[0] * r1 * kk, cy + n[1] * r1 * kk]; const hw = wd / 2 * kk;
        L(`<polygon class="zs tab" data-z="${z}" points="${[[c0[0] + tg[0] * hw, c0[1] + tg[1] * hw], [c1[0] + tg[0] * hw, c1[1] + tg[1] * hw], [c1[0] - tg[0] * hw, c1[1] - tg[1] * hw], [c0[0] - tg[0] * hw, c0[1] - tg[1] * hw]].map(v => v.map(f).join(',')).join(' ')}"/>`); };
      tab(-Math.PI / 2, ri, ri - 0.13, 0.22, 'A');
      tab(Math.PI / 2, k.R - k.nd, R + 0.06, 0.28, 'B');
      if (k.lugR) for (let i = 0; i < 6; i++) tab(i * Math.PI / 3 + Math.PI / 6, R - 0.02, k.lugR, 0.24, 'C');
      anchors.A = P(-Math.PI / 2, ri - 0.07); anchors.B = P(Math.PI / 2, R); if (k.lugR) anchors.C = P(Math.PI / 6, (R + k.lugR) / 2);
    }
    L(`<line class="ax" x1="${f(cx - (Rout + 0.3) * kk)}" y1="${cy}" x2="${f(cx + (Rout + 0.3) * kk)}" y2="${cy}"/><line class="ax" x1="${cx}" y1="${f(cy - (Rout + 0.3) * kk)}" x2="${cx}" y2="${f(cy + (Rout + 0.3) * kk)}"/>`);
    L(`<text class="vt" x="${cx}" y="${box.y1 + 4}" text-anchor="middle">Vue de face</text>`);
    // coupe
    const ts = fit(-w * 2.2, w * 2.2, Rout, side);
    const top = nut ? R - k.nd : R;
    poly(ts, [[-w / 2, ri], [w / 2, ri], [w / 2, top], [-w / 2, top]], 'sec', nut ? null : 'D');
    poly(ts, [[-w / 2, ri], [w / 2, ri], [w / 2, R], [-w / 2, R]], 'sec', nut ? null : 'D', -1);
    if (!nut) { const dir = Math.sign(U(k.xe) - xa) || 1; L(`<polygon class="zs tab" data-z="B" points="${[[-w / 2, top], [w / 2, top], [w / 2 + dir * w * 2.4, top], [w / 2 + dir * w * 2.4, top + w], [-w / 2, top + w]].map(([x, r]) => ts.X(x) + ',' + ts.Y(r)).join(' ')}"/>`); }
    axis(ts, ts.X(-w * 2) , ts.X(w * 2));
    if (nut) { L(`<line class="zs" data-z="C" x1="${ts.X(-w / 2)}" y1="${ts.Y(top)}" x2="${ts.X(-w / 2)}" y2="${ts.Y(-R)}"/>`); anchors.C = [ts.X(-w / 2), ts.Y(-R * 0.6)];
      for (let i = 0; i < 5; i++) L(`<line class="thin" x1="${f(ts.X(-w / 2) + i * (ts.X(w / 2) - ts.X(-w / 2)) / 5)}" y1="${ts.Y(ri)}" x2="${f(ts.X(-w / 2) + (i + 0.6) * (ts.X(w / 2) - ts.X(-w / 2)) / 5)}" y2="${ts.Y(ri + 0.05)}"/>`); }
    else anchors.D = [ts.X(0), ts.Y(-(R + ri) / 2)];
    L(`<text class="vt" x="${ts.X(0)}" y="${box.y1 + 4}" text-anchor="middle">Coupe</text>`);
    dimV(ts, f(ts.X(w / 2) + 28 + (nut ? 0 : w * 2.4 * ts.k)), -R, R, `Ø${mm(2 * R)}`);
    dimH(ts, -w / 2, w / 2, f(ts.Y(-R) + 24), `e ≈ ${mm(w) || 1}`);
    zones = nut ? [
      { id: 'A', letter: 'A', label: 'Encoches (×4) pour la clé à ergot', notch: true },
      { id: 'B', letter: 'B', label: 'Taraudage (vissé sur l\'arbre)', x: [k.xa, k.xb], r: [k.ri - 0.02, k.ri + 0.08] },
      { id: 'C', letter: 'C', label: 'Face d\'appui sur la rondelle frein', x: [k.xa, k.xa + 4], r: [k.ri, k.R] },
    ] : [
      { id: 'A', letter: 'A', label: 'Languette intérieure (dans la rainure de l\'arbre)', objs: [k.tabIn] },
      { id: 'B', letter: 'B', label: 'Languette rabattue dans une encoche de l\'écrou', objs: [k.bent] },
      ...(k.lugR ? [{ id: 'C', letter: 'C', label: 'Languettes extérieures (à rabattre)', objs: k.lugs }] : []),
      { id: 'D', letter: 'D', label: 'Disque d\'appui', x: [k.w0, k.w1], r: [k.ri, k.Rw] },
    ];
    views = 'Vue de face et coupe';
  }
  // ---- vis CHc : vue de côté + vue de dessus de la tête
  else if (p.screw) {
    const s = p.screw; const len = s.len, hl = s.headL, hr = s.headR, br = s.bodyR;
    const side = { x0: box.x0, x1: box.x0 + 400, y0: box.y0, y1: box.y1 }, face = { x0: box.x0 + 400, x1: box.x1, y0: box.y0, y1: box.y1 };
    const t = fit(-hl, len, hr, side);
    L(`<rect class="face" data-z="A" x="${t.X(-hl)}" y="${t.Y(hr)}" width="${f(hl * t.k)}" height="${f(2 * hr * t.k)}"/>`);
    L(`<rect class="hid" x="${t.X(-hl)}" y="${t.Y(s.hexR)}" width="${f(hl * 0.6 * t.k)}" height="${f(2 * s.hexR * t.k)}"/>`);
    L(`<rect class="face" data-z="B" x="${t.X(0)}" y="${t.Y(br)}" width="${f(len * t.k)}" height="${f(2 * br * t.k)}"/>`);
    L(`<line class="thin" x1="${t.X(len * 0.35)}" y1="${t.Y(br * 0.8)}" x2="${t.X(len)}" y2="${t.Y(br * 0.8)}"/><line class="thin" x1="${t.X(len * 0.35)}" y1="${t.Y(-br * 0.8)}" x2="${t.X(len)}" y2="${t.Y(-br * 0.8)}"/><line class="vis" x1="${t.X(len * 0.35)}" y1="${t.Y(br)}" x2="${t.X(len * 0.35)}" y2="${t.Y(-br)}"/>`);
    axis(t, t.X(-hl) - 14, t.X(len) + 14);
    dimH(t, 0, len, f(t.Y(-hr) + 26), `L ≈ ${mm(len)}`); dimV(t, f(t.X(len) + 24), -br, br, `M${mm(2 * br)}`);
    const tf = fit(-hr, hr, hr, face); const cx = tf.X(0), cy = tf.ay;
    const hex = [...Array(6)].map((_, i) => [f(cx + Math.cos(i * Math.PI / 3) * s.hexR * tf.k * 1.1), f(cy + Math.sin(i * Math.PI / 3) * s.hexR * tf.k * 1.1)]);
    L(`<circle class="face" data-z="A" cx="${cx}" cy="${cy}" r="${f(hr * tf.k)}"/><polygon class="zs" data-z="C" points="${hex.map(v => v.join(',')).join(' ')}"/>`);
    L(`<text class="vt" x="${f((side.x0 + side.x1) / 2)}" y="${box.y1 + 4}" text-anchor="middle">Vue de côté</text><text class="vt" x="${cx}" y="${box.y1 + 4}" text-anchor="middle">Vue de la tête</text>`);
    zones = [
      { id: 'A', letter: 'A', label: 'Tête cylindrique', objs: [s.head] },
      { id: 'B', letter: 'B', label: 'Tige filetée', objs: [s.body] },
      { id: 'C', letter: 'C', label: 'Empreinte six pans creux (clé mâle)', objs: [s.head] },
    ];
    Object.assign(anchors, { A: [t.X(-hl / 2), t.Y(hr * 0.6)], B: [t.X(len * 0.6), t.Y(br)], C: [cx + 3, cy - 3] });
    views = 'Vue de côté et vue de la tête';
  }
  // ---- sans données de construction : représentation symbolique (carter)
  else {
    const t = fit(-4, 4, 3.2, { x0: box.x0 + 40, x1: box.x1 - 40, y0: box.y0, y1: box.y1 });
    L(`<path class="face" data-z="A" d="M${t.X(-3.6)},${t.ay} L${t.X(-3.6)},${t.Y(3.05)} L${t.X(3.4)},${t.Y(3.05)} Q${t.X(3.65)},${t.Y(3.05)} ${t.X(3.65)},${t.Y(2.8)} L${t.X(3.65)},${t.Y(-0.5)}"/>`);
    L(`<line class="zs" data-z="B" x1="${t.X(3.65)}" y1="${t.Y(3.0)}" x2="${t.X(3.65)}" y2="${t.Y(-0.5)}"/>`);
    axis(t, t.X(-4), t.X(4));
    dimH(t, -3.6, 3.65, f(t.ay + 30), `L ≈ ${mm(7.25)}`); dimV(t, f(t.X(3.65) + 30), 0, 3.05, `R ${mm(3.05)}`);
    zones = [{ id: 'A', letter: 'A', label: 'Enveloppe (demi-cylindre en tôle)', all: true }, { id: 'B', letter: 'B', label: 'Flasque d\'extrémité', all: true }];
    Object.assign(anchors, { A: [t.X(0), t.Y(3.05)], B: [t.X(3.65), t.Y(1.2)] });
    views = 'Représentation symbolique (vue de côté)'; note = 'Schéma symbolique : pas de profil relevé pour cette pièce.';
  }

  // ---- lignes de repère + bulles (rangée au-dessus du dessin)
  const n = zones.length, gap = (W - 80) / Math.max(1, n);
  const order = zones.map(z => z.id).sort((a, b) => ((anchors[a] || [0])[0] - (anchors[b] || [0])[0]));
  let bub = '';
  order.forEach((id, i) => {
    const a = anchors[id] || [W / 2, top + 40]; const bx = f(40 + gap * (i + 0.5)), by = top - 22;
    bub += `<g class="bub" data-z="${id}" tabindex="0" role="button" aria-label="Repère ${id} : ${esc(zones.find(z => z.id === id).label)}"><line class="lead" x1="${bx}" y1="${by + 13}" x2="${a[0]}" y2="${a[1]}"/><circle class="dot" cx="${a[0]}" cy="${a[1]}" r="3"/><circle class="bc" cx="${bx}" cy="${by}" r="13"/><text x="${bx}" y="${by + 5}" text-anchor="middle">${id}</text></g>`;
  });

  // ---- cartouche
  const qty = Object.values(T.parts).filter(q => info.num && q.num === info.num).length || 1;
  const col = '#' + (info.num && PIECES[info.num] ? PIECES[info.num][1] : (p.col || 0x9aa4b1)).toString(16).padStart(6, '0');
  const cy = top + dh + 26;
  const legend = zones.map((z, i) => `<g class="leg" data-z="${z.id}" tabindex="0" role="button" transform="translate(30,${cy + 20 + i * 22})"><rect x="-6" y="-14" width="${W - 60}" height="20" rx="6" class="lr"/><circle cx="6" cy="-4" r="8" class="bc s"/><text x="6" y="0" text-anchor="middle" class="lt">${z.id}</text><text x="20" y="0" class="ll">${esc(z.label)}</text></g>`).join('');
  const lh = n * 22 + 16;
  const tb = cy + lh + 10;
  const svg = `<svg viewBox="0 0 ${W} ${tb + 112}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schéma technique : ${esc(info.name)}">
<defs>
<pattern id="hz" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="${col}" fill-opacity="0.18"/><line x1="0" y1="0" x2="0" y2="8" stroke="#1d2733" stroke-width="1.1"/></pattern>
<pattern id="gr" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#e9e3d3"/><circle cx="1.5" cy="1.5" r="0.8" fill="#5c5446"/><circle cx="4.5" cy="4" r="0.6" fill="#5c5446"/></pattern>
<marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="#1d2733"/></marker>
</defs>
<rect x="6" y="6" width="${W - 12}" height="${tb + 100}" class="frame"/>
<text x="20" y="34" class="ttl">${info.num ? 'Repère ' + info.num + ' — ' : ''}${esc(info.name)}</text>
<text x="20" y="54" class="sub">${esc(views)}${note ? ' · ' + esc(note) : ''} · cotes ≈ mm (relevées sur le dessin)</text>
${sh.parts.join('\n')}
${bub}
<text x="20" y="${cy + 2}" class="h">Repères</text>
${legend}
<g transform="translate(14,${tb})" class="tbk">
<rect width="${W - 28}" height="90"/><line x1="0" y1="30" x2="${W - 28}" y2="30"/><line x1="0" y1="60" x2="${W - 28}" y2="60"/><line x1="80" y1="0" x2="80" y2="60"/><line x1="${W - 168}" y1="0" x2="${W - 168}" y2="60"/><line x1="${W - 98}" y1="0" x2="${W - 98}" y2="30"/>
<text x="8" y="20" class="k">Repère</text><text x="40" y="49" text-anchor="middle" class="v big" fill="${col}">${info.num || '—'}</text>
<text x="88" y="20" class="k">Désignation</text><text x="88" y="49" class="v">${esc(DESIGNATION[key] || DESIGNATION[info.num] || info.name)}</text>
<text x="${W - 160}" y="20" class="k">Qté</text><text x="${W - 130}" y="21" class="v">${qty}</text>
<text x="${W - 90}" y="20" class="k">Unité</text><text x="${W - 50}" y="21" class="v">mm</text>
<text x="${W - 160}" y="49" class="v">${esc(info.matiere || '—')}</text>
<text x="8" y="80" class="k">Fonction :</text><text x="80" y="80" class="v sm">${esc(FONCTION[key] || FONCTION[info.num] || '')}</text>
</g>
</svg>`;
  return { svg, zones };
}

// zones automatiques d'une pièce de révolution (alésage, contour extérieur, faces)
function autoZones(pts, env, solid, xmin, xmax, rmax) {
  const px = x => x * 100 + 950;
  const z = [{ label: 'Diamètre extérieur', x: [px(xmin), px(xmax)], r: [rmax - 0.08, rmax + 0.02] }];
  const bore = solid ? 0 : Math.min(...env.map(e => e.r));
  if (bore > 0.05) z.push({ label: 'Alésage', x: [px(xmin), px(xmax)], r: [bore - 0.02, bore + 0.08] });
  z.push({ label: 'Face d\'appui', x: [px(xmin), px(xmin) + Math.max(3, (px(xmax) - px(xmin)) * 0.12)], r: [Math.max(bore, 0.05), rmax] });
  return z;
}
