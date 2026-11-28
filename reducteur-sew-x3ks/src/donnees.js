// Textes pédagogiques (modifiables par le formateur)
// Réducteur SEW-Eurodrive X3KS230 : 3 trains (1 couple conique + 2 trains cylindriques hélicoïdaux), arbre de sortie plein.

// Nombre de dents retenu pour la simulation (rapport total 20,08 comme sur la plaque).
export const DENTS = { z1: 13, z2: 33, z3: 17, z4: 46, z5: 26, z6: 76 };

export const PIECES = [
  { n: 1, id: 'moteur', court: 'Moteur', nom: 'Moteur électrique asynchrone', mat: '4 pôles – 1500 tr/min (1475 en charge)', role: 'Fournit la puissance (472 kW nominal côté réducteur). Il est relié à l\'arbre d\'entrée par l\'accouplement.' },
  { n: 2, id: 'accEntree', court: 'Acc. entrée', nom: 'Accouplement d\'entrée', mat: 'Acier / fonte, éléments élastiques', role: 'Transmet le couple du moteur à l\'arbre rapide et accepte un léger défaut d\'alignement.' },
  { n: 3, id: 'ventilateur', court: 'Ventilateur', nom: 'Ventilateur et capot', mat: 'Hélice sur l\'arbre d\'entrée, capot en tôle', role: 'Souffle l\'air sur les ailettes du carter pour évacuer la chaleur (« Ventilateur 1 » sur la plaque).' },
  { n: 4, id: 'arbre1', court: 'Arbre d\'entrée', nom: 'Arbre d\'entrée (rapide) + pignon conique', mat: 'Acier 18CrNiMo7-6 cémenté-trempé, denture rectifiée', role: 'Tourne à 1475 tr/min. Le pignon conique (z = 13) attaque la roue conique : c\'est le renvoi d\'angle à 90°.' },
  { n: 5, id: 'arbre2', court: 'Arbre 2', nom: 'Arbre intermédiaire 1 : roue conique + pignon hélicoïdal', mat: 'Acier cémenté-trempé', role: 'Roue conique z = 33 (1er train) et pignon z = 17 (2e train). Vitesse ≈ 581 tr/min.' },
  { n: 6, id: 'arbre3', court: 'Arbre 3', nom: 'Arbre intermédiaire 2 : roue + pignon hélicoïdaux', mat: 'Acier cémenté-trempé', role: 'Roue z = 46 (2e train) et pignon z = 26 (3e train). Vitesse ≈ 215 tr/min.' },
  { n: 7, id: 'arbre4', court: 'Arbre sortie', nom: 'Arbre de sortie plein + grande roue', mat: 'Acier forgé, roue z = 76 frettée et clavetée', role: 'Tourne lentement (≈ 73 tr/min) avec un très grand couple (≈ 59 000 N·m). « S » dans X3KS = arbre de sortie plein.' },
  { n: 8, id: 'roulements', court: 'Roulements', nom: 'Roulements', mat: 'Roulements à rouleaux coniques et à rouleaux cylindriques', role: 'Portent chaque arbre et reprennent les efforts radiaux et axiaux (poussée des dentures hélicoïdales et conique).' },
  { n: 9, id: 'carterInf', court: 'Carter inf.', nom: 'Carter inférieur (bac à huile)', mat: 'Fonte grise EN-GJL, ailettes de refroidissement', role: 'Contient le bain d\'huile et porte les pattes de fixation. Le plan de joint passe par l\'axe des arbres.' },
  { n: 10, id: 'carterSup', court: 'Carter sup.', nom: 'Carter supérieur (couvercle)', mat: 'Fonte grise, ailettes, anneaux de levage', role: 'Ferme le réducteur, reçoit la trappe de visite et le reniflard. Démontable pour inspecter les dentures.' },
  { n: 11, id: 'couvercles', court: 'Couvercles', nom: 'Couvercles de paliers et joints', mat: 'Fonte, joints à lèvres / labyrinthes', role: 'Ferment les logements des roulements et assurent l\'étanchéité autour des arbres.' },
  { n: 12, id: 'visite', court: 'Trappe', nom: 'Trappe de visite et reniflard', mat: 'Tôle boulonnée, reniflard à filtre', role: 'La trappe permet de contrôler les dentures sans tout démonter ; le reniflard laisse respirer le carter (dilatation de l\'air).' },
  { n: 13, id: 'niveau', court: 'Niveau', nom: 'Voyant de niveau d\'huile', mat: 'Verre / tube transparent', role: 'Contrôle du niveau, réducteur À L\'ARRÊT et huile reposée.' },
  { n: 14, id: 'vidange', court: 'Vidange', nom: 'Bouchon / robinet de vidange', mat: 'Acier', role: 'Point bas pour vidanger l\'huile, de préférence chaude.' },
  { n: 15, id: 'huile', court: 'Huile', nom: 'Bain d\'huile (barbotage)', mat: 'Huile synthétique ISO VG 320 (plaque : « 320 Huile Synth. »)', role: 'Les roues plongent dans l\'huile et la projettent partout : lubrification des dentures et des roulements, et évacuation de la chaleur.' },
  { n: 16, id: 'accSortie', court: 'Acc. sortie', nom: 'Accouplement de sortie (vers la machine)', mat: 'Acier forgé', role: 'Transmet le grand couple de sortie à la machine entraînée (tambour, broyeur…).' },
  { n: 17, id: 'plaque', court: 'Plaque', nom: 'Plaque signalétique SEW-Eurodrive', mat: 'Inox riveté', role: 'Donne le type, le rapport, les puissances, couples, vitesses, l\'huile et la position de montage. Voir l\'onglet « Plaque ».' }
];

export const PLAQUE = [
  ['Type', 'X3KS230/HT/…', 'X = série industrielle SEW · 3 = trois trains · K = renvoi d\'angle à couple conique (Kegel) · S = arbre de sortie plein · 230 = taille · la suite (HT/…) : position et options, voir la notice.'],
  ['N°', '01.7764444101.0…', 'Numéro de série : à donner à SEW pour commander une pièce.'],
  ['i', '20,08', 'Rapport de réduction total : n1 / n2 = 1475 / 20,08 ≈ 73 tr/min.'],
  ['PK1 [kW]', '472', 'Puissance à l\'entrée prévue pour cette application.'],
  ['MK2 [N·m]', '58 100 / 59 278', 'Couple sur l\'arbre de sortie. 9550 × 472 / 73 × 0,96 ≈ 59 280 N·m (rendement ≈ 96 %).'],
  ['n1 [tr/min]', '1500 / 1475', 'Vitesse d\'entrée = vitesse du moteur (1500 synchrone, 1475 en charge).'],
  ['n2 [tr/min]', '75 / 73', 'Vitesse de sortie.'],
  ['Fs', '1,82', 'Facteur de service : le réducteur peut transmettre 1,82 fois la puissance demandée (≈ 860 kW de capacité).'],
  ['PM [kW]', '520', 'Puissance limite inscrite par SEW (à confirmer dans la notice du réducteur).'],
  ['Ta [°C]', '0…35', 'Plage de température ambiante prévue.'],
  ['Position', 'M1 F1', 'Position de montage (horizontale) : elle fixe le niveau d\'huile et l\'emplacement des bouchons.'],
  ['Refroidissement', 'Ventilateur 1', 'Ventilateur monté sur l\'arbre d\'entrée.'],
  ['Huile', '… 320 Huile Synth.', 'Huile synthétique de viscosité ISO VG 320 (nom exact partiellement lisible : voir la plaque réelle).'],
  ['Poids [kg]', '344…', 'Chiffre partiellement lisible sur la photo : lire la plaque réelle avant toute manutention.']
];

export const COURS_HTML = `
<h3>Rôle du réducteur</h3>
<p>Le moteur tourne vite (1475 tr/min) avec un couple faible. La machine a besoin d'une vitesse lente (73 tr/min) avec un très grand couple. Le réducteur <b>divise la vitesse</b> et <b>multiplie le couple</b> par le même rapport (aux pertes près).</p>
<h3>Les trois trains du X3KS230</h3>
<ol>
<li><b>1er train : couple conique</b> pignon z = 13 / roue z = 33, i₁ = 2,54. Il fait tourner le mouvement de 90° (renvoi d'angle).</li>
<li><b>2e train : engrenage cylindrique hélicoïdal</b> z = 17 / 46, i₂ = 2,71.</li>
<li><b>3e train : engrenage cylindrique hélicoïdal</b> z = 26 / 76, i₃ = 2,92.</li>
</ol>
<p>Rapport total : <b>i = i₁ × i₂ × i₃ = 2,54 × 2,71 × 2,92 ≈ 20,08</b>. (Nombres de dents choisis pour la formation ; seuls le rapport total et les vitesses viennent de la plaque.)</p>
<h3>Calculs à savoir faire</h3>
<ul>
<li>Vitesse de sortie : <b>n₂ = n₁ / i</b> = 1475 / 20,08 = 73,5 tr/min.</li>
<li>Couple d'entrée : <b>C₁ = 9550 × P / n₁</b> = 9550 × 472 / 1475 = 3 056 N·m.</li>
<li>Couple de sortie : <b>C₂ = C₁ × i × η</b> = 3 056 × 20,08 × 0,96 ≈ 58 900 N·m.</li>
<li>Pertes : P × (1 − η) ≈ 472 × 0,04 ≈ 19 kW transformés en chaleur dans l'huile.</li>
</ul>
<h3>Sens de rotation</h3>
<p>Chaque engrenage extérieur <b>inverse</b> le sens. Le couple conique change l'axe de 90°. Inverser deux phases du moteur inverse tout. Si un <b>antidévireur</b> est monté, il ne faut jamais faire tourner le moteur dans le sens interdit.</p>
<h3>Lubrification</h3>
<p>Lubrification par <b>barbotage</b> : les roues plongent dans le bain d'huile et l'éclaboussent sur les dentures et les roulements. Le niveau se contrôle <b>à l'arrêt</b>, réducteur horizontal, au voyant. Huile prescrite : synthétique ISO VG 320.</p>
<h3>Refroidissement</h3>
<p>La chaleur des pertes (≈ 19 kW à pleine charge) passe de l'huile au carter puis à l'air. Le <b>ventilateur</b> souffle sur les <b>ailettes</b> : elles doivent rester propres (la poussière de bauxite isole et fait chauffer).</p>
<h3>Entretien courant</h3>
<ul>
<li>Chaque poste : bruit, vibration, température du carter (normal &lt; 80–90 °C), fuites, niveau d'huile.</li>
<li>Régulièrement : nettoyer les ailettes et le capot du ventilateur, contrôler le reniflard, serrage des pattes.</li>
<li>Vidange selon la notice SEW (huile synthétique : souvent toutes les 10 000 à 20 000 h environ selon la température) et analyse d'huile.</li>
<li>Toujours <b>consigner</b> le moteur avant d'ouvrir une trappe ou un couvercle.</li>
</ul>`;

export const PANNES_HTML = `
<table>
<tr><th>Symptôme</th><th>Causes possibles</th><th>Que faire</th></tr>
<tr><td>Carter trop chaud (&gt; 90 °C)</td><td>Ailettes encrassées, ventilateur cassé, niveau trop haut ou trop bas, surcharge, huile usée</td><td>Nettoyer, vérifier le ventilateur, corriger le niveau, contrôler l'intensité moteur, analyser/vidanger l'huile</td></tr>
<tr><td>Bruit régulier (sifflement, grondement)</td><td>Usure ou piqûres des dentures, roulement abîmé, jeu incorrect</td><td>Mesure vibratoire, inspection par la trappe de visite, analyse d'huile (particules)</td></tr>
<tr><td>Cognement périodique</td><td>Dent cassée ou écaillée, corps étranger</td><td>Arrêter, consigner, inspecter les dentures</td></tr>
<tr><td>Vibration élevée</td><td>Désalignement moteur/réducteur ou machine, pattes desserrées, accouplement usé, roulement</td><td>Contrôler le serrage, réaligner (laser), changer les éléments élastiques</td></tr>
<tr><td>Fuite d'huile à un arbre</td><td>Joint à lèvres usé, arbre rayé, reniflard bouché (surpression), niveau trop haut</td><td>Nettoyer le reniflard, changer le joint (bague d'usure si arbre marqué)</td></tr>
<tr><td>Fuite au plan de joint / couvercle</td><td>Pâte d'étanchéité vieillie, vis desserrées</td><td>Resserrer au couple, refaire l'étanchéité</td></tr>
<tr><td>Huile mousseuse ou laiteuse</td><td>Eau dans l'huile, mélange d'huiles incompatibles (synthétique PG ≠ minérale)</td><td>Vidanger, rincer, ne jamais mélanger les huiles</td></tr>
<tr><td>Particules métalliques sur le bouchon magnétique</td><td>Début d'usure dentures ou roulements</td><td>Analyse d'huile, surveillance vibratoire rapprochée</td></tr>
</table>`;

export const QUIZ = [
  { q: 'Que signifie la lettre K dans X3KS230 ?', r: ['Renvoi d\'angle à couple conique', 'Réducteur à vis sans fin', 'Réducteur à arbre creux'], b: 0, e: 'K = Kegel (conique) : le 1er train est un couple conique qui tourne le mouvement de 90°.' },
  { q: 'Combien de trains d\'engrenages a ce réducteur ?', r: ['2', '3', '4'], b: 1, e: 'Le chiffre 3 : un train conique + deux trains cylindriques.' },
  { q: 'n1 = 1475 tr/min et i = 20,08. Vitesse de sortie ?', r: ['≈ 29 600 tr/min', '≈ 73 tr/min', '≈ 147 tr/min'], b: 1, e: 'n2 = n1 / i = 1475 / 20,08 ≈ 73 tr/min.' },
  { q: 'Le couple de sortie est-il plus grand ou plus petit que le couple d\'entrée ?', r: ['Plus petit', 'Égal', 'Environ 19 fois plus grand'], b: 2, e: 'C2 = C1 × i × η = C1 × 20,08 × 0,96 ≈ 19,3 × C1.' },
  { q: 'Que veut dire Fs = 1,82 ?', r: ['Le réducteur peut transmettre 1,82 fois la puissance demandée', 'Le rendement est de 82 %', 'Il faut 1,82 L d\'huile'], b: 0, e: 'Le facteur de service est une marge de capacité pour les chocs et les heures de marche.' },
  { q: 'Quand contrôle-t-on le niveau d\'huile ?', r: ['En marche, à pleine charge', 'À l\'arrêt, huile reposée, au voyant', 'Jamais, c\'est étanche'], b: 1, e: 'En marche, l\'huile est projetée partout : le niveau lu serait faux.' },
  { q: 'Pourquoi le carter a-t-il des ailettes ?', r: ['Pour le décor', 'Pour augmenter la surface d\'échange et refroidir', 'Pour le rendre plus léger'], b: 1, e: 'Les ailettes et le ventilateur évacuent la chaleur des pertes (≈ 4 %).' },
  { q: 'Deux roues cylindriques extérieures qui engrènent tournent…', r: ['dans le même sens', 'en sens inverse', 'cela dépend de l\'huile'], b: 1, e: 'Chaque engrenage extérieur inverse le sens de rotation.' },
  { q: 'Le reniflard est bouché. Conséquence probable ?', r: ['Surpression et fuites aux joints', 'Le rapport change', 'Le moteur tourne plus vite'], b: 0, e: 'L\'air chaud ne peut plus sortir : la pression pousse l\'huile à travers les joints.' },
  { q: 'Peut-on compléter une huile synthétique avec n\'importe quelle huile minérale ?', r: ['Oui', 'Non, il faut la même huile (ou une huile compatible validée)', 'Oui si elle est plus épaisse'], b: 1, e: 'Certaines huiles synthétiques (PG) sont incompatibles avec les minérales : mousse, dépôts, joints abîmés.' }
];
