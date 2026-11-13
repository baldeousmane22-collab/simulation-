/* =====================================================================
   courbes.js — Courbes caractéristiques en SVG, mises à jour en direct
   ---------------------------------------------------------------------
   Graphique 1 : H(Q) de la pompe à la vitesse actuelle (et à 50 Hz en
   gris), courbe du réseau, point de fonctionnement et rendement.
   Graphique 2 : NPSH requis et NPSH disponible (zone de cavitation).
   ===================================================================== */

import { CARAC, hauteurPompe, puissancePompe, npshRequis } from './simulation.js';

const W = 360, X0 = 44, X1 = 320, QMAX = 40;
const G1 = { y0: 20, y1: 210, max: 40 };     // hauteur (m)
const G2 = { y0: 262, y1: 372, max: 12 };    // NPSH (m)
const qx = (q) => X0 + (q / QMAX) * (X1 - X0);
const gy = (g, v) => g.y1 - (Math.max(0, Math.min(g.max, v)) / g.max) * (g.y1 - g.y0);
// Sans bornage : les courbes sont découpées au cadre (clip-path)
const gyLibre = (g, v) => g.y1 - (Math.max(-1, Math.min(g.max * 1.5, v)) / g.max) * (g.y1 - g.y0);

export function svgCourbes() {
  let grille = '';
  for (let q = 0; q <= QMAX; q += 5) {
    grille += `<line x1="${qx(q)}" y1="${G1.y0}" x2="${qx(q)}" y2="${G1.y1}" class="cb-g"/><line x1="${qx(q)}" y1="${G2.y0}" x2="${qx(q)}" y2="${G2.y1}" class="cb-g"/>`;
    grille += `<text x="${qx(q)}" y="${G1.y1 + 14}" class="cb-t" text-anchor="middle">${q}</text><text x="${qx(q)}" y="${G2.y1 + 14}" class="cb-t" text-anchor="middle">${q}</text>`;
  }
  for (let h = 0; h <= G1.max; h += 5) grille += `<line x1="${X0}" y1="${gy(G1, h)}" x2="${X1}" y2="${gy(G1, h)}" class="cb-g"/><text x="${X0 - 5}" y="${gy(G1, h) + 4}" class="cb-t" text-anchor="end">${h}</text>`;
  for (let r = 0; r <= 100; r += 20) grille += `<text x="${X1 + 5}" y="${gy(G1, r * 0.4) + 4}" class="cb-t cb-eta">${r}</text>`;
  for (let h = 0; h <= G2.max; h += 3) grille += `<line x1="${X0}" y1="${gy(G2, h)}" x2="${X1}" y2="${gy(G2, h)}" class="cb-g"/><text x="${X0 - 5}" y="${gy(G2, h) + 4}" class="cb-t" text-anchor="end">${h}</text>`;
  return `
<svg viewBox="0 0 ${W} 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Courbes caractéristiques de la pompe">
<style>
  .cb-g{stroke:#e2e8f0;stroke-width:1}
  .cb-a{stroke:#0f172a;stroke-width:1.5;fill:none}
  .cb-t{font:600 10px system-ui,Arial,sans-serif;fill:#475569}
  .cb-tt{font:700 11px system-ui,Arial,sans-serif;fill:#0f172a}
  .cb-eta{fill:#15803d}
  .cb-c{fill:none;stroke-width:2.5;stroke-linejoin:round}
</style>
<clipPath id="cb-clip1"><rect x="${X0}" y="${G1.y0}" width="${X1 - X0}" height="${G1.y1 - G1.y0}"/></clipPath>
<clipPath id="cb-clip2"><rect x="${X0}" y="${G2.y0}" width="${X1 - X0}" height="${G2.y1 - G2.y0}"/></clipPath>
${grille}
<rect x="${X0}" y="${G1.y0}" width="${X1 - X0}" height="${G1.y1 - G1.y0}" class="cb-a"/>
<rect x="${X0}" y="${G2.y0}" width="${X1 - X0}" height="${G2.y1 - G2.y0}" class="cb-a"/>
<text x="${X0}" y="13" class="cb-tt">H (m)</text><text x="${X1}" y="13" class="cb-tt cb-eta" text-anchor="end">η (%)</text>
<text x="${X1}" y="${G1.y1 + 28}" class="cb-tt" text-anchor="end">Q (m³/h)</text>
<text x="${X0}" y="${G2.y0 - 8}" class="cb-tt">NPSH (m)</text>
<text x="${X1}" y="${G2.y1 + 28}" class="cb-tt" text-anchor="end">Q (m³/h)</text>
<path id="cb-nom" clip-path="url(#cb-clip1)" class="cb-c" stroke="#cbd5e1" stroke-dasharray="5 4"/>
<path id="cb-pompe" clip-path="url(#cb-clip1)" class="cb-c" stroke="#2563eb"/>
<path id="cb-reseau" clip-path="url(#cb-clip1)" class="cb-c" stroke="#ea580c"/>
<path id="cb-eta" clip-path="url(#cb-clip1)" class="cb-c" stroke="#16a34a" stroke-width="2"/>
<line id="cb-vq" class="cb-a" stroke-dasharray="3 3" stroke="#dc2626"/>
<line id="cb-vh" class="cb-a" stroke-dasharray="3 3" stroke="#dc2626"/>
<circle id="cb-pt" r="6" fill="#dc2626" stroke="#fff" stroke-width="2"/>
<text id="cb-lib" class="cb-tt" fill="#dc2626"></text>
<path id="cb-cav" clip-path="url(#cb-clip2)" fill="rgba(220,38,38,.14)"/>
<path id="cb-npshr" clip-path="url(#cb-clip2)" class="cb-c" stroke="#7c3aed"/>
<path id="cb-npsha" clip-path="url(#cb-clip2)" class="cb-c" stroke="#0891b2"/>
<circle id="cb-pt2" r="5" fill="#dc2626" stroke="#fff" stroke-width="2"/>
</svg>`;
}

const chemin = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

export function majCourbes(racine, sim) {
  if (!racine || !racine.firstElementChild) return;
  const q = (s) => racine.querySelector(s);
  const n = Math.max(sim.n, 0.001), pn = sim.pannes;
  const usure = pn.roue ? 0.82 : 1, sens = pn.sens ? -1 : 1;
  const pompe = [], nom = [], reseau = [], eta = [], npshr = [], npsha = [];
  const k = sim.kReseau();
  for (let Q = 0; Q <= QMAX; Q += 0.5) {
    const h = hauteurPompe(Q, n, usure, sens);
    if (h > 0) pompe.push([qx(Q), gy(G1, h)]);
    const hn = hauteurPompe(Q, 1);
    if (hn > 0) nom.push([qx(Q), gy(G1, hn)]);
    reseau.push([qx(Q), gyLibre(G1, CARAC.H_GEO + k * Q * Q)]);
    if (h > 0 && sim.n > 0.05) {
      const e = (1000 * 9.81 * Q / 3600 * h / 1000) / puissancePompe(Q, n);
      eta.push([qx(Q), gy(G1, Math.min(1, e) * 40)]);
    }
    npshr.push([qx(Q), gyLibre(G2, npshRequis(Q, sim.n > 0.05 ? n : 1))]);
    npsha.push([qx(Q), gyLibre(G2, sim.npshDisponible(Q))]);
  }
  q('#cb-pompe').setAttribute('d', pompe.length > 1 ? chemin(pompe) : '');
  q('#cb-nom').setAttribute('d', chemin(nom));
  q('#cb-reseau').setAttribute('d', chemin(reseau));
  q('#cb-eta').setAttribute('d', eta.length > 1 ? chemin(eta) : '');
  q('#cb-npshr').setAttribute('d', chemin(npshr));
  q('#cb-npsha').setAttribute('d', chemin(npsha));
  // Zone de cavitation : là où le NPSH disponible est sous le NPSH requis
  const zone = [];
  for (let i = 0; i < npshr.length; i++) if (npsha[i][1] > npshr[i][1]) zone.push(i);
  q('#cb-cav').setAttribute('d', zone.length > 1
    ? chemin([[npshr[zone[0]][0], gy(G2, 0)], ...zone.map(i => npshr[i]), [npshr[zone[zone.length - 1]][0], gy(G2, 0)]]) + ' Z' : '');
  // Point de fonctionnement
  const x = qx(Math.min(QMAX, sim.Q)), y = gy(G1, sim.H);
  const visible = sim.n > 0.05;
  for (const id of ['#cb-pt', '#cb-vq', '#cb-vh', '#cb-lib', '#cb-pt2']) q(id).style.display = visible ? '' : 'none';
  q('#cb-pt').setAttribute('cx', x); q('#cb-pt').setAttribute('cy', y);
  q('#cb-vq').setAttribute('x1', x); q('#cb-vq').setAttribute('x2', x); q('#cb-vq').setAttribute('y1', y); q('#cb-vq').setAttribute('y2', G1.y1);
  q('#cb-vh').setAttribute('x1', X0); q('#cb-vh').setAttribute('x2', x); q('#cb-vh').setAttribute('y1', y); q('#cb-vh').setAttribute('y2', y);
  const lib = q('#cb-lib');
  lib.setAttribute('x', Math.min(x + 8, X1 - 92)); lib.setAttribute('y', Math.max(G1.y0 + 12, y - 10));
  lib.textContent = `${sim.Q.toFixed(1).replace('.', ',')} m³/h · ${sim.H.toFixed(1).replace('.', ',')} m`;
  q('#cb-pt2').setAttribute('cx', x); q('#cb-pt2').setAttribute('cy', gy(G2, sim.res.npshReq));
}
