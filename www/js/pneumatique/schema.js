/* =====================================================================
   pneumatique/schema.js — Schéma pneumatique normalisé (ISO 1219-1)
   ---------------------------------------------------------------------
   Le schéma est dessiné en SVG. Les conduites portent un identifiant
   (data-ligne) identique à celui de la simulation : leur couleur est
   mise à jour en direct (bleu = air comprimé, vert = échappement,
   gris = à l'atmosphère). La case active du distributeur est surlignée,
   la tige du vérin suit sa position et les capteurs actionnés s'allument.
   Repérage des orifices : ISO 5599 (1 alimentation, 2 / 4 utilisations,
   3 / 5 échappements, 12 / 14 pilotages).
   ===================================================================== */

const COUL = { pression: '#1e88ff', echap: '#19c24a', repos: '#64748b' };

/* Le SVG complet. Coordonnées : 380 × 520, production d'air en bas, vérin en haut. */
export function svgSchema() {
  const ligne = (id, pts, cls = 'sc-l') => `<polyline data-ligne="${id}" points="${pts}" class="${cls}"/>`;
  // Clapet anti-retour (bille dans un siège en V) : passage vers le haut seulement
  const clapet = (x, y) => `<circle cx="${x}" cy="${y - 4}" r="5" class="sc-s"/><path d="M${x - 8} ${y - 12} L${x} ${y + 2} L${x + 8} ${y - 12}" class="sc-s"/>`;
  // Étrangleur réglable (deux arcs + flèche oblique)
  const etrangleur = (x, y) => `<path d="M${x - 7} ${y - 12} Q${x} ${y} ${x - 7} ${y + 12} M${x + 7} ${y - 12} Q${x} ${y} ${x + 7} ${y + 12}" class="sc-s"/>
    <line x1="${x - 12}" y1="${y + 12}" x2="${x + 12}" y2="${y - 12}" class="sc-s"/><path d="M${x + 13} ${y - 13} l-8 2 l6 6 z" class="sc-f"/>`;
  // Régleur de débit unidirectionnel (étrangleur + clapet en parallèle, encadré)
  const regleur = (x, y, nom) => `
    <rect x="${x - 16}" y="${y - 24}" width="46" height="48" class="sc-p"/>
    ${etrangleur(x, y)}
    <path d="M${x} ${y - 20} H${x + 18} V${y + 20} H${x}" class="sc-s"/>
    ${clapet(x + 18, y + 2)}
    <text x="${x + 34}" y="${y + 4}" class="sc-t">${nom}</text>`;
  // Silencieux (rectangle hachuré sous un échappement)
  const silencieux = (x, y) => `<path d="M${x - 7} ${y} h14 l-3 12 h-8 z" class="sc-s"/><line x1="${x - 4}" y1="${y + 4}" x2="${x + 4}" y2="${y + 4}" class="sc-s"/><line x1="${x - 3}" y1="${y + 8}" x2="${x + 3}" y2="${y + 8}" class="sc-s"/>`;
  // Capteur 3/2 à galet, normalement fermé : case gauche = actionné (1 → 2), case droite = repos (2 → 3)
  const capteur = (x, y, id, nom) => `
    <g id="${id}" class="sc-capt">
      <rect x="${x}" y="${y}" width="26" height="24" class="sc-case"/>
      <rect x="${x + 26}" y="${y}" width="26" height="24" class="sc-case"/>
      <line x1="${x + 8}" y1="${y + 24}" x2="${x + 13}" y2="${y + 3}" class="sc-s"/><path d="M${x + 13} ${y + 1} l-4 6 h7 z" class="sc-f"/>
      <line x1="${x + 20}" y1="${y + 24}" x2="${x + 20}" y2="${y + 17}" class="sc-s"/><line x1="${x + 16}" y1="${y + 17}" x2="${x + 24}" y2="${y + 17}" class="sc-s"/>
      <line x1="${x + 39}" y1="${y}" x2="${x + 46}" y2="${y + 21}" class="sc-s"/><path d="M${x + 47} ${y + 23} l-1 -7 -6 2 z" class="sc-f"/>
      <line x1="${x + 34}" y1="${y + 24}" x2="${x + 34}" y2="${y + 17}" class="sc-s"/><line x1="${x + 30}" y1="${y + 17}" x2="${x + 38}" y2="${y + 17}" class="sc-s"/>
      <line x1="${x}" y1="${y + 12}" x2="${x - 6}" y2="${y + 12}" class="sc-s"/><circle cx="${x - 10}" cy="${y + 12}" r="4" class="sc-s"/>
      <path d="M${x + 52} ${y + 12} l2 -5 3 10 3 -10 3 10 2 -5" class="sc-s"/>
      <path d="M${x + 46} ${y + 24} v4 l-4 5 h8 l-4 -5" class="sc-s"/>
    </g>
    <text x="${x + 8}" y="${y - 4}" class="sc-o">${nom}</text>`;
  // Une case de distributeur (5 orifices, largeur 74) : décalages des orifices
  const O = { 4: 18, 2: 56, 5: 10, 1: 37, 3: 64 };
  const fleche = (x1, y1, x2, y2) => {
    const a = Math.atan2(y2 - y1, x2 - x1), c = Math.cos(a), s = Math.sin(a);
    const p = (l, w) => `${(x2 - c * l - s * w).toFixed(1)} ${(y2 - s * l + c * w).toFixed(1)}`;
    return `<line x1="${x1}" y1="${y1}" x2="${(x2 - c * 4).toFixed(1)}" y2="${(y2 - s * 4).toFixed(1)}" class="sc-s"/><path d="M${x2} ${y2} L${p(8, 4)} L${p(8, -4)} Z" class="sc-f"/>`;
  };
  const bouche = (x, y) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 9}" class="sc-s"/><line x1="${x - 5}" y1="${y - 9}" x2="${x + 5}" y2="${y - 9}" class="sc-s"/>`;
  const X14 = 122, X12 = 196, YH = 260, YB = 300;
  return `
<svg viewBox="0 0 390 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schéma pneumatique ISO 1219">
<style>
  .sc-s{fill:none;stroke:#0f172a;stroke-width:2}
  .sc-f{fill:#0f172a}
  .sc-l{fill:none;stroke:#64748b;stroke-width:3;stroke-linejoin:round;transition:stroke .2s}
  .sc-lp{fill:none;stroke:#64748b;stroke-width:2;stroke-dasharray:5 3;stroke-linejoin:round;transition:stroke .2s}
  .sc-p{fill:none;stroke:#0f172a;stroke-width:1.5;stroke-dasharray:4 3}
  .sc-t{font:600 11px system-ui,Arial,sans-serif;fill:#0f172a}
  .sc-o{font:700 11px system-ui,Arial,sans-serif;fill:#b91c1c}
  .sc-n{font:700 9px system-ui,Arial,sans-serif;fill:#475569}
  .sc-case{fill:#fff;stroke:#0f172a;stroke-width:2;transition:fill .2s}
  .sc-case.actif{fill:#fde68a}
  .sc-capt.actif .sc-case:first-child{fill:#bbf7d0}
</style>

<!-- ======= Conduites (colorées en direct) ======= -->
${ligne('cuve', '46,458 46,436')}
${ligne('alim', '46,384 46,366 108,366 108,396 125,396')}
${ligne('alim', '151,396 168,396')}
${ligne('reseau', '328,396 354,396 354,330 233,330 233,300')}
${ligne('reseau', '233,330 52,330 52,286', 'sc-lp')}
${ligne('reseau', '354,330 354,286', 'sc-lp')}
${ligne('ligneA', '214,260 214,226 112,226 112,90')}
${ligne('ligneB', '252,260 252,214 232,214 232,90')}
${ligne('pilote14', '57,262 57,246 90,246 90,280 104,280', 'sc-lp')}
${ligne('pilote12', '359,262 359,246 304,246 304,280 288,280', 'sc-lp')}

<!-- ======= Compresseur (triangle creux = air) + moteur ======= -->
<circle cx="46" cy="474" r="16" class="sc-s"/>
<path d="M46 458 L38 471 L54 471 Z" class="sc-s"/>
<line x1="62" y1="472" x2="80" y2="472" class="sc-s"/><line x1="62" y1="476" x2="80" y2="476" class="sc-s"/>
<circle cx="95" cy="474" r="14" class="sc-s"/><text x="90" y="479" class="sc-t">M</text>
<text x="118" y="478" class="sc-t">Compresseur</text><text x="118" y="491" class="sc-t">+ pressostat 6 → 8 bar</text>

<!-- ======= Cuve (réservoir d'air) + manomètre + soupape + purge ======= -->
<rect x="30" y="384" width="32" height="52" rx="12" class="sc-s"/>
<text x="66" y="428" class="sc-t">Cuve</text>
<g transform="translate(14,400)"><circle r="9" class="sc-s"/><line x1="-6" y1="6" x2="6" y2="-6" class="sc-s"/><path d="M6 -6 l-6 1 l5 5 z" class="sc-f"/></g>
<line x1="23" y1="400" x2="30" y2="400" class="sc-s"/>
<rect x="66" y="388" width="14" height="22" class="sc-s"/><line x1="70" y1="406" x2="78" y2="392" class="sc-s"/>
<line x1="62" y1="404" x2="66" y2="404" class="sc-s"/><text x="64" y="384" class="sc-n">10 bar</text>

<!-- ======= Vanne d'arrivée 3/2 à commande manuelle (fermée = échappement) ======= -->
<g transform="translate(138,409) rotate(90)">
  <rect id="psc-vanne-o" x="-26" y="-13" width="26" height="26" class="sc-case actif"/>
  <rect id="psc-vanne-f" x="0" y="-13" width="26" height="26" class="sc-case"/>
  ${fleche(-13, 13, -13, -13)}
  <line x1="13" y1="13" x2="13" y2="6" class="sc-s"/><line x1="9" y1="6" x2="17" y2="6" class="sc-s"/>
  ${fleche(9, -13, 20, 13)}
  <path d="M-26 0 H-34 M-34 0 L-40 -8" class="sc-s"/>
  <path d="M26 0 l3 -5 3 10 3 -10 3 10 2 -5" class="sc-s"/>
  <path d="M20 13 v4 l-4 5 h8 l-4 -5" class="sc-s"/>
</g>
<text x="92" y="456" class="sc-t">Vanne 3/2</text>

<!-- ======= Filtre à purge manuelle ======= -->
<g transform="translate(182,396)">
  <path d="M0 -14 L14 0 L0 14 L-14 0 Z" class="sc-s"/><line x1="0" y1="-14" x2="0" y2="14" class="sc-p"/>
  <path d="M0 14 V19 M-5 19 L0 25 L5 19 Z" class="sc-s"/>
</g>
<line x1="196" y1="396" x2="212" y2="396" class="sc-s"/>
<text x="168" y="436" class="sc-t">Filtre</text>

<!-- ======= Régulateur de pression à décharge + manomètre ======= -->
<rect x="212" y="380" width="32" height="32" class="sc-s"/>
${fleche(222, 410, 222, 383)}
<line x1="234" y1="383" x2="234" y2="392" class="sc-s"/><line x1="230" y1="392" x2="238" y2="392" class="sc-s"/>
<path d="M228 380 l3 -5 3 10 3 -10 3 10 2 -5" class="sc-s" transform="rotate(90 236 378)"/>
<line x1="212" y1="414" x2="246" y2="378" class="sc-s"/><path d="M248 376 l-8 3 l5 5 z" class="sc-f"/>
<path d="M244 404 H252 V418 H222 V412" class="sc-p"/>
<line x1="244" y1="396" x2="300" y2="396" class="sc-s"/>
<g transform="translate(270,374)"><circle r="9" class="sc-s"/><line x1="-6" y1="6" x2="6" y2="-6" class="sc-s"/><path d="M6 -6 l-6 1 l5 5 z" class="sc-f"/></g>
<line x1="270" y1="383" x2="270" y2="396" class="sc-s"/>
<text x="206" y="436" class="sc-t">Régulateur</text>

<!-- ======= Lubrificateur ======= -->
<g transform="translate(314,396)">
  <path d="M0 -14 L14 0 L0 14 L-14 0 Z" class="sc-s"/><line x1="0" y1="-14" x2="0" y2="14" class="sc-s"/>
  <path d="M-4 -4 L0 4 L4 -4" class="sc-s"/>
</g>
<text x="296" y="426" class="sc-t">Lubrif.</text>
<text x="172" y="462" class="sc-n">unité de conditionnement FRL</text>

<!-- ======= Distributeur 5/2 bistable, pilotage pneumatique 14 / 12 ======= -->
<rect id="psc-case14" x="${X14}" y="${YH}" width="74" height="40" class="sc-case"/>
<rect id="psc-case12" x="${X12}" y="${YH}" width="74" height="40" class="sc-case actif"/>
<!-- Case 14 : 1 → 4 et 2 → 3, 5 bouché -->
${fleche(X14 + O[1], YB, X14 + O[4], YH)}
${fleche(X14 + O[2], YH, X14 + O[3], YB)}
${bouche(X14 + O[5], YB)}
<!-- Case 12 (position dessinée) : 1 → 2 et 4 → 5, 3 bouché -->
${fleche(X12 + O[1], YB, X12 + O[2], YH)}
${fleche(X12 + O[4], YH, X12 + O[5], YB)}
${bouche(X12 + O[3], YB)}
<!-- Pilotages pneumatiques (triangles creux) -->
<path d="M${X14} 280 h-8 M104 272 v16 l10 -8 z" class="sc-s"/>
<path d="M${X12 + 74} 280 h8 M288 272 v16 l-10 -8 z" class="sc-s"/>
<text x="${X12 + O[4] - 12}" y="256" class="sc-o">4</text><text x="${X12 + O[2] + 4}" y="256" class="sc-o">2</text>
<text x="${X12 + O[5] - 19}" y="318" class="sc-o">5</text><text x="${X12 + O[1] + 4}" y="318" class="sc-o">1</text><text x="${X12 + O[3] + 10}" y="318" class="sc-o">3</text>
<text x="96" y="300" class="sc-o">14</text><text x="282" y="300" class="sc-o">12</text>
<text x="124" y="252" class="sc-t">1V1 5/2</text>
<line x1="${X12 + O[5]}" y1="${YB}" x2="${X12 + O[5]}" y2="308" class="sc-s"/>${silencieux(X12 + O[5], 308)}
<line x1="${X12 + O[3]}" y1="${YB}" x2="${X12 + O[3]}" y2="308" class="sc-s"/>${silencieux(X12 + O[3], 308)}

<!-- ======= Capteurs de fin de course 3/2 à galet ======= -->
${capteur(18, 262, 'psc-1s1', '1S1')}
${capteur(320, 262, 'psc-1s2', '1S2')}

<!-- ======= Régleurs de débit unidirectionnels (au refoulement) ======= -->
${regleur(112, 158, '1V2')}
${regleur(232, 158, '1V3')}

<!-- ======= Vérin double effet (1A) ======= -->
<rect x="100" y="52" width="144" height="38" class="sc-s"/>
<line x1="126" y1="52" x2="126" y2="90" class="sc-s" style="stroke-width:5" id="psc-piston"/>
<line x1="126" y1="71" x2="270" y2="71" class="sc-s" style="stroke-width:4" id="psc-tige"/>
<text x="104" y="46" class="sc-t">Vérin double effet 1A</text>
<text x="100" y="104" class="sc-o">A</text><text x="238" y="104" class="sc-o">B</text>
<!-- Repères des capteurs sur la course -->
<line x1="270" y1="80" x2="270" y2="94" class="sc-s"/><text x="260" y="108" class="sc-o">1S1</text>
<line x1="362" y1="80" x2="362" y2="94" class="sc-s"/><text x="350" y="108" class="sc-o">1S2</text>
<text x="290" y="62" class="sc-n">charge</text>
</svg>`;
}

/* Mise à jour en direct des couleurs, de la case active et de la tige */
export function majSchema(racine, sim) {
  if (!racine) return;
  const L = sim.res.lignes;
  racine.querySelectorAll('[data-ligne]').forEach(el => {
    const e = L[el.dataset.ligne];
    el.style.stroke = COUL[e ? e.type : 'repos'];
  });
  const q = (s) => racine.querySelector(s);
  q('#psc-case14')?.classList.toggle('actif', sim.dist > 0);
  q('#psc-case12')?.classList.toggle('actif', sim.dist < 0);
  q('#psc-vanne-o')?.classList.toggle('actif', sim.cmd.vanne);
  q('#psc-vanne-f')?.classList.toggle('actif', !sim.cmd.vanne);
  q('#psc-1s1')?.classList.toggle('actif', sim.res.capteur1);
  q('#psc-1s2')?.classList.toggle('actif', sim.res.capteur2);
  // Position du piston et de la tige (course de 80 px sur le symbole)
  const xp = 126 + sim.position * 92;   // tige : 270 (rentrée) → 362 (sortie)
  const piston = q('#psc-piston'), tige = q('#psc-tige');
  if (piston) { piston.setAttribute('x1', xp); piston.setAttribute('x2', xp); }
  if (tige) { tige.setAttribute('x1', xp); tige.setAttribute('x2', xp + 144); }
}
