/* =====================================================================
   cours/cours.js — Cours « Les accouplements » (Brevet technique,
   mécanique). Un objet par chapitre : titre, icône, contenu HTML et
   bouton « Voir en 3D » (type d'accouplement et défaut à montrer).
   Le texte se modifie ici sans toucher au reste de l'appli.
   ===================================================================== */

const SVG_DEFAUTS = `
<svg viewBox="0 0 320 250" class="schema" role="img" aria-label="Les trois défauts d'alignement">
  <style>.a{stroke:#22c55e;stroke-width:3}.b{stroke:#f97316;stroke-width:3}.t{fill:#cbd5e1;font:12px sans-serif}.m{fill:#2f6fb3}.n{fill:#2e7d4f}</style>
  <text x="8" y="16" class="t">1. Aligné</text>
  <rect x="20" y="26" width="100" height="40" rx="6" class="m"/><rect x="200" y="26" width="100" height="40" rx="6" class="n"/>
  <line x1="10" y1="46" x2="310" y2="46" class="a" stroke-dasharray="6 4"/>
  <text x="8" y="96" class="t">2. Décalage parallèle (radial)</text>
  <rect x="20" y="106" width="100" height="40" rx="6" class="m"/><rect x="200" y="96" width="100" height="40" rx="6" class="n"/>
  <line x1="10" y1="126" x2="170" y2="126" class="a"/><line x1="150" y1="116" x2="310" y2="116" class="b"/>
  <text x="8" y="176" class="t">3. Désalignement angulaire</text>
  <rect x="20" y="186" width="100" height="40" rx="6" class="m"/>
  <g transform="rotate(-8 160 206)"><rect x="200" y="186" width="100" height="40" rx="6" class="n"/><line x1="150" y1="206" x2="310" y2="206" class="b"/></g>
  <line x1="10" y1="206" x2="170" y2="206" class="a"/>
</svg>`;

const SVG_COMPARATEUR = `
<svg viewBox="0 0 360 200" class="schema" role="img" aria-label="Mesure au comparateur radial et de face">
  <style>.t{fill:#cbd5e1;font:12px sans-serif}.h{fill:#6b7480}.c{fill:#facc15}.s{stroke:#94a3b8;stroke-width:3;fill:none}</style>
  <rect x="10" y="92" width="150" height="16" class="h"/><rect x="150" y="70" width="24" height="60" class="h"/>
  <rect x="180" y="58" width="24" height="84" class="h" style="fill:#2e7d4f"/><rect x="204" y="92" width="146" height="16" class="h" style="fill:#2e7d4f"/>
  <path d="M110 92 V34 H192" class="s"/><circle cx="192" cy="24" r="10" class="c"/><line x1="192" y1="34" x2="192" y2="58" stroke="#facc15" stroke-width="3"/>
  <path d="M110 108 V160 H150" class="s"/><circle cx="160" cy="160" r="10" class="c"/>
  <polyline points="160,150 160,137 180,137" fill="none" stroke="#facc15" stroke-width="3"/>
  <text x="210" y="22" class="t">comparateur RADIAL</text><text x="210" y="38" class="t">→ mesure le décalage</text>
  <text x="190" y="176" class="t">comparateur de FACE</text><text x="190" y="192" class="t">→ mesure l'angle</text>
  <text x="12" y="84" class="t">moyeu fixe (support)</text><text x="236" y="84" class="t">moyeu mesuré</text>
</svg>`;

export const CHAPITRES = [
  {
    titre: "Définition et rôle", ico: '📖', voir: { type: 'crabots', defaut: 'aligne' },
    html: `
<p>Un <b>accouplement</b> est un organe de transmission qui <b>relie deux arbres placés bout à bout</b>
(par exemple l'arbre d'un moteur et l'arbre d'une pompe) pour transmettre une <b>puissance</b>, c'est-à-dire
un <b>couple</b> et une <b>vitesse de rotation</b>.</p>
<div class="encadre"><b>Arbre menant</b> : celui qui entraîne (moteur).<br><b>Arbre mené</b> : celui qui est entraîné (pompe, réducteur, ventilateur…).</div>
<h4>Fonctions d'un accouplement</h4>
<ul>
  <li><b>Transmettre le couple</b> sans glissement (même vitesse à l'entrée et à la sortie, sauf coupleur hydraulique).</li>
  <li><b>Compenser les défauts d'alignement</b> entre les deux arbres (accouplements flexibles).</li>
  <li><b>Amortir les chocs et les vibrations</b> (accouplements élastiques).</li>
  <li><b>Permettre le démontage</b> d'une des machines sans démonter l'autre.</li>
  <li>Parfois : <b>isoler électriquement</b>, <b>limiter le couple</b> (limiteur), <b>désaccoupler</b> (embrayage).</li>
</ul>
<div class="attention">⚠️ À ne pas confondre : un <b>accouplement</b> relie deux arbres en permanence ;
un <b>embrayage</b> permet d'accoupler ou de séparer les arbres en marche.</div>
<h4>Vocabulaire</h4>
<ul>
  <li><b>Moyeu</b> (demi-accouplement) : partie fixée sur chaque arbre par <b>clavette</b>, cannelures ou frettage.</li>
  <li><b>Élément intermédiaire</b> : étoile, pneu, douilles, lames, grille, chaîne… qui transmet le couple d'un moyeu à l'autre.</li>
  <li><b>Carter / protecteur</b> : capot de sécurité obligatoire autour des pièces tournantes.</li>
</ul>`
  },
  {
    titre: "Pourquoi les arbres ne sont jamais parfaitement alignés", ico: '📐', voir: { type: 'pneu', defaut: 'combine' },
    html: `
<p>Même après un montage soigné, les deux arbres ne restent pas parfaitement dans le prolongement l'un de l'autre :</p>
<ul>
  <li><b>Erreurs de montage</b> : cales mal choisies, mauvais serrage, socle pas plan.</li>
  <li><b>Dilatation thermique</b> : une pompe d'eau chaude ou un moteur chaud « monte » de quelques dixièmes de mm.</li>
  <li><b>Tassement</b> du massif en béton, du châssis.</li>
  <li><b>Déformations</b> sous les efforts (tuyauteries qui tirent sur la pompe, pied boiteux).</li>
  <li><b>Usure</b> des paliers et des roulements.</li>
</ul>
<p>C'est pourquoi on utilise le plus souvent des <b>accouplements flexibles</b> qui acceptent de petits défauts…
<b>mais seulement dans les limites (tolérances) données par le constructeur</b>.</p>
<div class="retenir">À RETENIR : un accouplement flexible <b>n'est pas une excuse</b> pour mal aligner. Plus l'alignement est bon, plus les roulements, les joints et l'accouplement durent longtemps.</div>`
  },
  {
    titre: "Classification des accouplements", ico: '🗂️', voir: { type: 'plateaux', defaut: 'aligne' },
    html: `
<table class="tab-cours">
  <tr><th>Famille</th><th>Exemples</th><th>Défauts admis</th></tr>
  <tr><td><b>Rigides</b></td><td>à plateaux, à manchon, à coquilles</td><td>aucun</td></tr>
  <tr><td><b>Élastiques</b> (élément souple en caoutchouc ou polyuréthane)</td><td>à crabots (étoile), à pneu, à broches et douilles</td><td>petits à grands, amortissent les chocs</td></tr>
  <tr><td><b>Métalliques flexibles</b></td><td>à lames, à denture, à chaîne, à grille, à soufflet</td><td>petits à moyens, peu ou pas d'amortissement</td></tr>
  <tr><td><b>Articulés</b> (mobiles)</td><td>joint de Oldham, joint de cardan, joints homocinétiques</td><td>grand décalage (Oldham) ou grand angle (cardan)</td></tr>
  <tr><td><b>Hydrauliques</b></td><td>coupleur hydraulique (à huile)</td><td>démarrage progressif, glissement</td></tr>
</table>
<p>Dans l'appli, l'onglet <b>Comparer</b> donne les tolérances indicatives de chaque type.</p>`
  },
  {
    titre: "Les accouplements rigides", ico: '⚙️', voir: { type: 'plateaux', defaut: 'radial' },
    html: `
<p>Ils font des deux arbres <b>un seul arbre</b>. Ils transmettent de gros couples, sans jeu, mais <b>n'acceptent aucun désalignement</b>.</p>
<h4>À plateaux</h4>
<p>Deux plateaux clavetés, centrés par un <b>emboîtement</b>, serrés par des <b>boulons ajustés</b> qui travaillent au cisaillement.</p>
<h4>À manchon (douille)</h4>
<p>Un manchon en acier enfile les deux bouts d'arbre ; clavette et vis de pression. Très compact, mais il faut déplacer une machine pour le démonter.</p>
<div class="attention">⚠️ Avec un accouplement rigide, un défaut d'alignement <b>fait fléchir les arbres</b> à chaque tour :
roulements chauds, vibrations, et à la longue <b>rupture par fatigue</b> de l'arbre.</div>
<p><b>Emploi</b> : lignes d'arbres, machines montées sur un même bâti très rigide, faibles vitesses.</p>`
  },
  {
    titre: "Les accouplements élastiques", ico: '✳️', voir: { type: 'crabots', defaut: 'radial' },
    html: `
<p>Le couple passe à travers un <b>élément en élastomère</b> (caoutchouc, polyuréthane) qui se déforme :
il <b>amortit les chocs</b> et <b>absorbe de petits désalignements</b>.</p>
<h4>À crabots (à étoile)</h4>
<p>Deux moyeux à griffes avec une étoile entre les griffes. Si l'étoile casse, les griffes continuent d'entraîner (sécurité).
Signe d'usure : <b>poudre noire</b> autour de l'accouplement.</p>
<h4>À pneu (bandage)</h4>
<p>Un bandage en caoutchouc serré entre deux flasques. <b>Accepte les plus grands défauts</b> (plusieurs mm et degrés).
Le bandage fendu se change sans déplacer les machines.</p>
<h4>À broches et douilles</h4>
<p>Des broches d'un plateau entrent dans des douilles en caoutchouc de l'autre plateau. Robuste ; les douilles s'usent (jeu, choc au démarrage).</p>
<div class="retenir">À RETENIR : les élastomères craignent la <b>chaleur</b>, les <b>huiles</b> et le <b>soleil (ozone)</b>. Un élément qui chauffe = alignement à vérifier.</div>`
  },
  {
    titre: "Les accouplements métalliques flexibles", ico: '💿', voir: { type: 'lames', defaut: 'combine' },
    html: `
<p>Toutes les pièces sont en acier : ils supportent <b>hautes vitesses</b> et <b>hautes températures</b>, mais amortissent peu.</p>
<ul>
  <li><b>À lames (disques)</b> : paquets de lames inox qui fléchissent. Avec <b>2 paquets + une entretoise</b>, ils acceptent un décalage.
    Sans graissage ni usure, mais <b>rupture des lames par fatigue</b> si le désalignement est trop fort.</li>
  <li><b>À denture</b> : moyeux à denture bombée dans un manchon à denture intérieure. Très gros couples. <b>Graissage obligatoire.</b></li>
  <li><b>À chaîne double</b> : deux pignons et une chaîne duplex. Simple, démontage rapide ; carter et graisse obligatoires.</li>
  <li><b>À grille</b> : une grille ressort passe dans les rainures des deux moyeux. Amortit les chocs ; <b>graissée</b>.</li>
  <li><b>À soufflet</b> : soufflet inox, zéro jeu, très précis (servomoteurs, codeurs) ; faibles couples.</li>
</ul>
<div class="retenir">Graissage obligatoire : <b>denture, grille, chaîne</b> (et cardan). Sans graissage : lames, soufflet, élastiques.</div>`
  },
  {
    titre: "Les accouplements articulés : Oldham et cardan", ico: '✚', voir: { type: 'cardan', defaut: 'angulaire' },
    html: `
<h4>Joint de Oldham</h4>
<p>Un disque central avec deux tenons à 90° glisse dans les rainures des deux moyeux.
Il accepte un <b>grand décalage parallèle</b> mais presque <b>aucun angle</b>. Le centre du disque décrit un cercle
(diamètre = décalage) à <b>2 fois la vitesse</b> de l'arbre. La vitesse de sortie reste constante (homocinétique).</p>
<h4>Joint de cardan</h4>
<p>Deux fourches reliées par un <b>croisillon</b> monté sur roulements à aiguilles. Il transmet entre deux arbres qui se coupent avec un <b>grand angle</b> (jusqu'à 25° à 45°).</p>
<div class="attention">⚠️ Un cardan seul <b>n'est pas homocinétique</b> : si l'arbre d'entrée tourne régulièrement,
la vitesse de sortie oscille entre ω·cos β et ω / cos β, <b>2 fois par tour</b>.</div>
<p>Pour obtenir une vitesse de sortie régulière, on monte <b>2 cardans</b> avec :</p>
<ul><li>des <b>angles égaux</b> aux deux cardans ;</li><li>les <b>fourches de l'arbre intermédiaire dans le même plan</b> (en phase).</li></ul>
<p>Exemple : β = 20° → cos 20° = 0,94 : la vitesse varie de 94 % à 106 % de la vitesse d'entrée.</p>`
  },
  {
    titre: "Les défauts d'alignement", ico: '⤡', voir: { type: 'crabots', defaut: 'combine' },
    html: `
${SVG_DEFAUTS}
<ul>
  <li><b>Décalage parallèle (radial)</b> : les axes sont parallèles mais décalés. Il se mesure en <b>mm</b>.</li>
  <li><b>Désalignement angulaire</b> : les axes se coupent avec un angle ; les faces des moyeux ne sont pas parallèles.
    Il se mesure en <b>degrés</b> ou en <b>mm pour 100 mm</b> de diamètre.</li>
  <li><b>Désalignement combiné</b> : les deux à la fois, en vertical et en horizontal (cas réel).</li>
  <li><b>Écart axial incorrect</b> : la distance entre les faces des moyeux n'est pas la cote du constructeur.</li>
</ul>
<h4>Conséquences</h4>
<table class="tab-cours">
  <tr><th>Défaut</th><th>Vibration typique</th><th>Autres signes</th></tr>
  <tr><td>Décalage parallèle</td><td><b>radiale à 2×</b> la vitesse</td><td>élément chaud, roulements côté accouplement</td></tr>
  <tr><td>Angulaire</td><td><b>axiale à 1×</b></td><td>poussée axiale, butées chaudes</td></tr>
  <tr><td>Écart axial</td><td>faible</td><td>élément écrasé ou mal engagé</td></tr>
</table>
<p>Résultat : usure rapide de l'accouplement, <b>roulements</b> et <b>garnitures</b> détruits, consommation d'énergie en plus, bruit.</p>`
  },
  {
    titre: "Contrôle et méthode d'alignement", ico: '📏', voir: { type: 'broches', defaut: 'angulaire' },
    html: `
<h4>Outils</h4>
<ul>
  <li><b>Règle et jauge d'épaisseur</b> : contrôle rapide (précision ≈ 0,1 mm).</li>
  <li><b>Comparateurs</b> (radial et de face) sur un support fixé à un moyeu : précision 0,01 mm.</li>
  <li><b>Appareil laser</b> : rapide, calcule les cales automatiquement.</li>
</ul>
${SVG_COMPARATEUR}
<h4>Méthode (machine à déplacer = moteur)</h4>
<ol>
  <li><b>Consigner</b> la machine (cadenas, étiquette), déposer le carter de protection.</li>
  <li>Nettoyer les pattes et le socle, contrôler le <b>pied boiteux</b> (≤ 0,05 mm) et le corriger.</li>
  <li>Mesurer à <b>12 h, 3 h, 6 h, 9 h</b> en tournant les deux arbres ensemble. Validité : 12 h + 6 h = 3 h + 9 h.</li>
  <li><b>Vertical</b> : corriger l'<b>angle</b> (différence de cales entre pattes avant et arrière) puis la <b>hauteur</b> (même cale sous les 4 pattes).</li>
  <li><b>Horizontal</b> : déplacer le moteur avec les <b>vis de poussée</b>.</li>
  <li>Serrer les pattes en <b>croix</b>, refaire une mesure de contrôle, remonter le carter, déconsigner.</li>
</ol>
<div class="retenir">Lecture comparateur : le décalage vaut la <b>moitié</b> de la variation lue sur un demi-tour au comparateur radial.<br>
Exemple : 12 h = 0, 6 h = +0,40 mm → décalage = 0,40 / 2 = <b>0,20 mm</b>.</div>`
  },
  {
    titre: "Choisir un accouplement", ico: '🧮', voir: { type: 'grille', defaut: 'aligne' },
    html: `
<h4>Critères de choix</h4>
<ul>
  <li>Le <b>couple</b> à transmettre et la <b>vitesse</b> maximale.</li>
  <li>Le type de machine : chocs (concasseur) ou marche régulière (ventilateur) → <b>coefficient de service K</b>.</li>
  <li>Les <b>désalignements</b> prévisibles, la place disponible, l'entretien possible, la température, le prix.</li>
  <li>Les <b>diamètres d'arbre</b> (alésages possibles des moyeux).</li>
</ul>
<h4>Calcul du couple</h4>
<div class="encadre">C (N·m) = P / ω  avec ω = 2π·n / 60<br>soit en pratique : <b>C = 9550 × P(kW) / n(tr/min)</b><br>
Couple de choix : <b>C<sub>choix</sub> = K × C</b> (K ≈ 1 à 1,5 machines régulières, 2 à 3 machines à chocs)</div>
<h4>Exemple</h4>
<p>Moteur 15 kW à 1460 tr/min entraînant une pompe centrifuge (K = 1,5).</p>
<p>C = 9550 × 15 / 1460 = <b>98 N·m</b> → C<sub>choix</sub> = 1,5 × 98 = <b>147 N·m</b>.<br>
On choisit dans le catalogue un accouplement dont le <b>couple nominal ≥ 147 N·m</b> et qui accepte le diamètre des deux arbres.</p>`
  },
  {
    titre: "Montage, entretien et sécurité", ico: '🔧', voir: { type: 'denture', defaut: 'axial' },
    html: `
<h4>Montage</h4>
<ul>
  <li>Moyeux montés <b>sans coups de marteau</b> (chauffage du moyeu ou presse) pour ne pas abîmer les roulements.</li>
  <li>Respecter l'<b>écart entre les faces</b> donné par le constructeur.</li>
  <li>Serrer vis et boulons au <b>couple de serrage</b> prescrit (clé dynamométrique).</li>
  <li>Aligner, puis contrôler à nouveau après quelques jours de marche (machine chaude).</li>
</ul>
<h4>Entretien préventif</h4>
<ul>
  <li>Contrôle visuel : fissures, poudre noire, élément déformé, boulons desserrés.</li>
  <li>Graissage des accouplements à denture, à grille, à chaîne et des cardans.</li>
  <li>Mesures de vibrations et de température ; contrôle d'alignement périodique.</li>
</ul>
<div class="attention">⚠️ SÉCURITÉ : ne jamais faire tourner une machine <b>sans carter de protection</b>.
Toujours <b>consigner</b> (couper, cadenasser, vérifier l'absence d'énergie) avant d'intervenir sur un accouplement.</div>`
  },
  {
    titre: "Résumé et exercices", ico: '📝', voir: { type: 'oldham', defaut: 'radial' },
    html: `
<div class="retenir"><ul>
  <li>Un accouplement relie deux arbres bout à bout et transmet le couple.</li>
  <li>Rigide = aucun défaut admis ; élastique = amortit ; métallique flexible = hautes vitesses ; articulé = grands défauts.</li>
  <li>3 défauts : décalage parallèle (mm), angulaire (°), écart axial (mm).</li>
  <li>Décalage → vibration radiale 2× ; angle → vibration axiale 1×.</li>
  <li>Ordre d'alignement : pied boiteux → vertical (angle puis hauteur) → horizontal → serrage → contrôle.</li>
  <li>C = 9550 × P / n, puis × K.</li>
</ul></div>
<h4>Exercices</h4>
<ol class="exos">
  <li>Citez 4 fonctions d'un accouplement.
    <details><summary>Correction</summary>Transmettre le couple, compenser les défauts d'alignement, amortir les chocs, permettre le démontage (aussi : isoler électriquement, limiter le couple).</details></li>
  <li>Pourquoi ne monte-t-on pas un accouplement rigide entre un moteur et une pompe sur deux socles séparés ?
    <details><summary>Correction</summary>Les deux machines ne peuvent pas rester parfaitement alignées (dilatation, tassement) ; le rigide n'accepte aucun défaut : flexion des arbres, roulements détruits.</details></li>
  <li>Un moteur de 7,5 kW tourne à 1450 tr/min et entraîne un concasseur (K = 2,5). Calculez le couple de choix.
    <details><summary>Correction</summary>C = 9550 × 7,5 / 1450 = 49,4 N·m ; C<sub>choix</sub> = 2,5 × 49,4 ≈ <b>124 N·m</b>.</details></li>
  <li>Au comparateur radial on lit 0 à 12 h et −0,30 mm à 6 h. Quel est le décalage vertical ?
    <details><summary>Correction</summary>0,30 / 2 = <b>0,15 mm</b> (le signe indique le sens : moteur trop haut ou trop bas selon le montage du comparateur).</details></li>
  <li>Un spectre montre une forte vibration axiale à 1×. Quel défaut soupçonnez-vous ?
    <details><summary>Correction</summary>Un <b>désalignement angulaire</b>.</details></li>
  <li>Un cardan travaille avec β = 30°. Entre quelles valeurs varie la vitesse de sortie si l'entrée tourne à 1000 tr/min ?
    <details><summary>Correction</summary>cos 30° = 0,866 : de 1000 × 0,866 = <b>866 tr/min</b> à 1000 / 0,866 = <b>1155 tr/min</b>.</details></li>
  <li>Quels accouplements doivent être graissés ?
    <details><summary>Correction</summary>À denture, à grille, à chaîne, et les joints de cardan.</details></li>
</ol>
<p>Pour s'entraîner encore : le <b>Quiz</b> de l'appli (14 questions).</p>`
  }
];
