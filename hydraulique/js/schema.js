/* =====================================================================
   schema.js — Schéma hydraulique normalisé (symboles ISO 1219-1)
   ---------------------------------------------------------------------
   Le schéma est dessiné en SVG. Les conduites portent un identifiant
   (data-ligne) identique à celui de la simulation : leur couleur est
   mise à jour en direct (bleu / rouge / vert / gris), et la case active
   du distributeur est surlignée.
   ===================================================================== */

const COUL = { asp: '#1e88ff', hp: '#ff2d2d', ret: '#19c24a', repos: '#64748b' };

/* Le SVG complet. Coordonnées : 360 × 520, flux du bas vers le haut. */
export function svgSchema() {
  // Petits outils de dessin
  const ligne = (id, pts) => `<polyline data-ligne="${id}" points="${pts}" class="sc-l"/>`;
  const reservoir = (x, y) => `<path d="M${x - 16} ${y - 10} V${y} H${x + 16} V${y - 10}" class="sc-s"/>`;
  return `
<svg viewBox="0 0 360 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schéma hydraulique ISO 1219">
<style>
  .sc-s{fill:none;stroke:#0f172a;stroke-width:2}
  .sc-f{fill:#0f172a}
  .sc-l{fill:none;stroke:#64748b;stroke-width:3;stroke-linejoin:round;transition:stroke .2s}
  .sc-p{fill:none;stroke:#0f172a;stroke-width:1.5;stroke-dasharray:4 3}
  .sc-t{font:600 11px system-ui,Arial,sans-serif;fill:#0f172a}
  .sc-o{font:700 11px system-ui,Arial,sans-serif;fill:#b91c1c}
  .sc-case{fill:#fff;stroke:#0f172a;stroke-width:2;transition:fill .2s}
  .sc-case.actif{fill:#fde68a}
</style>

<!-- ======= Conduites (colorées en direct) ======= -->
${ligne('aspiration', '70,470 70,430')}
${ligne('refoulement', '70,394 70,330')}
${ligne('manometre', '70,330 30,330 30,300')}
${ligne('limiteurEntree', '70,330 164,330 164,316')}
${ligne('limiteurRetour', '164,262 164,248 214,248 214,270')}
${ligne('pression1', '70,330 70,300')}
${ligne('pression2', '70,262 70,240')}
${ligne('pression3', '70,200 70,180 150,180 150,166')}
${ligne('ligneA', '150,118 150,90 120,90 120,62')}
${ligne('ligneB', '180,118 180,90 208,90 208,62')}
${ligne('retour1', '180,166 180,180 260,180 260,226')}
${ligne('retour2', '260,262 260,300')}

<!-- ======= Réservoirs (bâche à l'air libre) ======= -->
${reservoir(70, 500)}
${reservoir(214, 282)}
${reservoir(260, 320)}

<!-- ======= Crépine : losange + trait pointillé ======= -->
<g transform="translate(70,486)">
  <path d="M0 -14 L12 0 L0 14 L-12 0 Z" class="sc-s"/><line x1="-12" y1="0" x2="12" y2="0" class="sc-p"/>
</g>
<line x1="70" y1="500" x2="70" y2="472" class="sc-s"/>
<text x="88" y="490" class="sc-t">Crépine</text>

<!-- ======= Pompe (cercle + triangle plein vers la sortie) + moteur ======= -->
<circle cx="70" cy="412" r="18" class="sc-s"/>
<path d="M70 394 L62 407 L78 407 Z" class="sc-f"/>
<line x1="88" y1="412" x2="108" y2="412" class="sc-s"/><line x1="88" y1="416" x2="108" y2="416" class="sc-s"/>
<circle cx="124" cy="414" r="16" class="sc-s"/><text x="119" y="419" class="sc-t">M</text>
<text x="146" y="410" class="sc-t">Pompe +</text><text x="146" y="423" class="sc-t">moteur</text>
<text x="76" y="388" class="sc-o">P</text>

<!-- ======= Manomètre ======= -->
<circle cx="30" cy="286" r="14" class="sc-s"/>
<line x1="21" y1="295" x2="40" y2="276" class="sc-s"/><path d="M40 276 L33 278 L38 283 Z" class="sc-f"/>
<text x="6" y="264" class="sc-t">Mano</text>

<!-- ======= Limiteur de pression (normalement fermé, ressort réglable, pilotage côté entrée) ======= -->
<rect x="150" y="262" width="28" height="54" class="sc-s"/>
<line x1="158" y1="308" x2="170" y2="272" class="sc-s"/><path d="M171 268 L164 276 L172 278 Z" class="sc-f"/>
<path d="M178 289 l4 -7 4 14 4 -14 4 14 4 -7" class="sc-s"/>
<line x1="180" y1="300" x2="198" y2="276" class="sc-s"/><path d="M200 273 L192 276 L197 281 Z" class="sc-f"/>
<path d="M164 322 H140 V289 H150" class="sc-p"/>
<text x="184" y="314" class="sc-t">Limiteur</text>

<!-- ======= Clapet anti-retour (bille + siège : passage vers le haut seulement) ======= -->
<circle cx="70" cy="286" r="8" class="sc-s"/>
<path d="M58 270 L70 290 L82 270" class="sc-s"/>
<line x1="70" y1="300" x2="70" y2="294" class="sc-s"/><line x1="70" y1="278" x2="70" y2="262" class="sc-s"/>
<text x="86" y="290" class="sc-t">Clapet</text>

<!-- ======= Régulateur de débit réglable ======= -->
<rect x="56" y="200" width="28" height="40" class="sc-s"/>
<path d="M64 206 Q72 220 64 234 M76 206 Q68 220 76 234" class="sc-s"/>
<line x1="56" y1="236" x2="86" y2="204" class="sc-s"/><path d="M86 204 L78 206 L84 212 Z" class="sc-f"/>
<text x="90" y="226" class="sc-t">Régulateur</text>

<!-- ======= Distributeur 4/3 centre tandem ======= -->
<g id="sc-dist">
  <rect id="sc-case-1" x="105" y="118" width="45" height="48" class="sc-case"/>
  <rect id="sc-case0" x="150" y="118" width="45" height="48" class="sc-case actif"/>
  <rect id="sc-case-m1" x="195" y="118" width="45" height="48" class="sc-case"/>
  <!-- Case gauche (sortie) : P→A, B→T -->
  <line x1="116" y1="162" x2="116" y2="124" class="sc-s"/><path d="M116 122 l-4 8 h8 z" class="sc-f"/>
  <line x1="140" y1="124" x2="140" y2="162" class="sc-s"/><path d="M140 164 l-4 -8 h8 z" class="sc-f"/>
  <!-- Case centrale (neutre tandem) : P→T, A et B bloqués -->
  <path d="M155 166 V152 H180 V166" class="sc-s"/>
  <line x1="155" y1="118" x2="155" y2="128" class="sc-s"/><line x1="150" y1="128" x2="160" y2="128" class="sc-s"/>
  <line x1="185" y1="118" x2="185" y2="128" class="sc-s"/><line x1="180" y1="128" x2="190" y2="128" class="sc-s"/>
  <!-- Case droite (rentrée) : P→B, A→T (croisées) -->
  <line x1="200" y1="162" x2="234" y2="122" class="sc-s"/><path d="M235 120 l-8 3 l5 5 z" class="sc-f"/>
  <line x1="200" y1="122" x2="234" y2="162" class="sc-s"/><path d="M235 164 l-8 -3 l5 -5 z" class="sc-f"/>
  <!-- Commande par levier (gauche) et ressorts de rappel (droite) -->
  <path d="M105 142 H92 M92 142 L84 128" class="sc-s"/>
  <path d="M240 142 l4 -8 4 16 4 -16 4 16 4 -8" class="sc-s"/>
</g>
<text x="146" y="116" class="sc-o">A</text><text x="184" y="116" class="sc-o">B</text>
<text x="144" y="176" class="sc-o" dy="10">P</text><text x="184" y="176" class="sc-o" dy="10">T</text>
<text x="96" y="112" class="sc-t">4/3</text>

<!-- ======= Vérin double effet ======= -->
<rect x="100" y="34" width="120" height="28" class="sc-s"/>
<line x1="128" y1="34" x2="128" y2="62" class="sc-s" style="stroke-width:5" id="sc-piston"/>
<line x1="128" y1="48" x2="256" y2="48" class="sc-s" style="stroke-width:4" id="sc-tige"/>
<text x="104" y="28" class="sc-t">Vérin double effet</text>
<text x="112" y="80" class="sc-o">A</text><text x="214" y="80" class="sc-o">B</text>

<!-- ======= Filtre de retour ======= -->
<g transform="translate(260,244)">
  <path d="M0 -18 L14 0 L0 18 L-14 0 Z" class="sc-s"/><line x1="-14" y1="0" x2="14" y2="0" class="sc-p"/>
</g>
<text x="278" y="248" class="sc-t">Filtre</text><text x="278" y="260" class="sc-t">retour</text>
<text x="266" y="196" class="sc-o">T</text>
</svg>`;
}

/* Mise à jour en direct des couleurs et de la case active */
export function majSchema(racine, sim) {
  if (!racine) return;
  const L = sim.res.lignes;
  racine.querySelectorAll('[data-ligne]').forEach(el => {
    const e = L[el.dataset.ligne];
    el.style.stroke = COUL[e ? e.type : 'repos'];
  });
  const d = sim.cmd.distributeur;
  const ids = { '1': 'sc-case-1', '0': 'sc-case0', '-1': 'sc-case-m1' };
  for (const [k, id] of Object.entries(ids)) {
    const el = racine.querySelector('#' + id);
    if (el) el.classList.toggle('actif', String(d) === k);
  }
  // Position du piston et de la tige dans le symbole du vérin
  const xp = 128 + sim.positionVerin * 84;
  const piston = racine.querySelector('#sc-piston');
  const tige = racine.querySelector('#sc-tige');
  if (piston) { piston.setAttribute('x1', xp); piston.setAttribute('x2', xp); }
  if (tige) { tige.setAttribute('x1', xp); tige.setAttribute('x2', xp + 128); }
}
