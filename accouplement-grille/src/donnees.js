// Textes pédagogiques (modifiables par le formateur)
// Accouplement à ressort serpentin (grille) — type « T10 » : carter en deux demi-coquilles à plan de joint horizontal.
// Valeurs d'exemple pour la formation : les vraies valeurs sont dans la notice du fabricant (tableaux par taille).

export const PIECES = [
  { n: 1, id: 'moteur', court: 'Moteur', nom: 'Moteur électrique (machine menante)', mat: '315 kW – 1485 tr/min (exemple)', role: 'Entraîne le moyeu côté moteur par son arbre claveté.' },
  { n: 2, id: 'moyeuA', court: 'Moyeu moteur', nom: 'Moyeu côté moteur', mat: 'Acier forgé, rainures rectifiées', role: 'Claveté sur l\'arbre du moteur. Ses rainures axiales reçoivent une moitié de chaque barreau de la grille.' },
  { n: 3, id: 'moyeuB', court: 'Moyeu réducteur', nom: 'Moyeu côté réducteur', mat: 'Acier forgé, rainures rectifiées', role: 'Claveté sur l\'arbre d\'entrée (arbre rapide) du réducteur. Il reçoit l\'autre moitié des barreaux.' },
  { n: 4, id: 'grille', court: 'Grille', nom: 'Grille (ressort serpentin) en 6 segments', mat: 'Acier à ressort trempé, grenaillé', role: 'Transmet le couple d\'un moyeu à l\'autre en fléchissant. Elle amortit les chocs et accepte de petits défauts d\'alignement. C\'est la pièce d\'usure.' },
  { n: 5, id: 'carterH', court: 'Demi-carter haut', nom: 'Demi-carter supérieur', mat: 'Alliage d\'aluminium moulé', role: 'Enferme la grille et la graisse, et empêche les segments de s\'échapper sous la force centrifuge.' },
  { n: 6, id: 'carterB', court: 'Demi-carter bas', nom: 'Demi-carter inférieur', mat: 'Alliage d\'aluminium moulé', role: 'Seconde moitié du carter, boulonnée sur la première au plan de joint.' },
  { n: 7, id: 'vis', court: 'Boulons', nom: 'Boulons du carter (8)', mat: 'Acier classe 8.8 + écrous freinés', role: 'Serrent les deux demi-carters. Serrage au couple prescrit, en croix.' },
  { n: 8, id: 'jointPlat', court: 'Joint plat', nom: 'Joints du plan de joint', mat: 'Papier / élastomère', role: 'Rendent étanche le plan de joint des deux demi-carters.' },
  { n: 9, id: 'joints', court: 'Joints', nom: 'Joints à lèvres (×2)', mat: 'Élastomère NBR', role: 'Glissés sur les moyeux, ils ferment le carter et gardent la graisse.' },
  { n: 10, id: 'bouchons', court: 'Bouchons', nom: 'Bouchons de graissage (×2)', mat: 'Acier', role: 'Permettent de remplir et de compléter la graisse sans démonter.' },
  { n: 11, id: 'graisse', court: 'Graisse', nom: 'Graisse pour accouplement', mat: 'Graisse spéciale accouplements (NLGI 1 environ)', role: 'Lubrifie le contact grille / rainures. Sans graisse, la grille et les dents s\'usent très vite.' },
  { n: 12, id: 'arbres', court: 'Arbres', nom: 'Arbres et clavettes', mat: 'Acier C45 / 42CrMo4', role: 'Arbre du moteur et arbre d\'entrée du réducteur ; les clavettes transmettent le couple aux moyeux.' },
  { n: 13, id: 'machine', court: 'Réducteur', nom: 'Réducteur à renvoi d\'angle (machine entraînée)', mat: 'Carter en fonte à ailettes, rapport ≈ 20', role: 'Reçoit le couple du moteur par l\'accouplement sur son arbre rapide, et entraîne le convoyeur par son arbre de sortie lent. Son arbre d\'entrée doit être parfaitement aligné avec celui du moteur.' }
];

export const MONTAGE = [
  { t: 'Départ : arbres nus', d: 'Moteur consigné (cadenas). Les arbres et alésages sont propres, sans bavure ; les clavettes sont ajustées.' },
  { t: '1. Glisser les joints sur les arbres', d: 'Les deux joints à lèvres sont enfilés AVANT les moyeux, lèvre tournée vers l\'intérieur du carter. Après, c\'est trop tard !' },
  { t: '2. Monter les moyeux', d: 'Moyeux montés sur les arbres avec leur clavette (chauffés vers 120 °C s\'ils sont frettés, jamais au chalumeau en un point). Face du moyeu au ras du bout d\'arbre.' },
  { t: '3. Régler l\'écartement', d: 'Approcher les machines et régler le jeu entre les faces des moyeux avec une cale d\'épaisseur : 4 mm dans cet exemple (valeur du tableau du fabricant).' },
  { t: '4. Aligner', d: 'Contrôler au comparateur ou au laser l\'alignement parallèle et angulaire, puis caler les pattes du moteur (le réducteur, plus lourd, sert de référence). Exemple de tolérance de montage : 0,20 mm et 0,10°.' },
  { t: '5. Graisser les rainures', d: 'Remplir les rainures des deux moyeux de graisse pour accouplement.' },
  { t: '6. Poser les segments de grille', d: 'Placer les segments un par un, tous dans le même sens, en les enfonçant au maillet en caoutchouc. Ne jamais frapper avec un marteau en acier.' },
  { t: '7. Garnir de graisse', d: 'Remplir les espaces entre barreaux et autour de la grille avec la graisse.' },
  { t: '8. Fermer le carter', d: 'Poser les joints plats, approcher les deux demi-carters, enfiler les joints à lèvres dans leurs logements, puis serrer les boulons en croix au couple prescrit.' },
  { t: '9. Compléter la graisse et contrôler', d: 'Remplir par un bouchon jusqu\'à ce que la graisse sorte par l\'autre, revisser. Retirer les outils, protecteur en place, déconsigner. Prêt à démarrer.' }
];

export const COURS_HTML = `
<h3>Principe</h3>
<p>Les deux moyeux portent sur leur pourtour des <b>rainures axiales</b>. Une <b>grille en acier à ressort</b>, pliée en serpentin, est posée dans les rainures des deux moyeux à la fois. Placé entre le moteur et le réducteur, il transmet le couple : moyeu moteur → barreaux de la grille → moyeu réducteur. Les barreaux travaillent en <b>flexion</b>, comme des lames de ressort.</p>
<h3>Raideur progressive</h3>
<p>Les flancs des rainures sont <b>courbes</b> : la rainure est étroite côté extérieur et s'élargit vers le jeu entre les moyeux.</p>
<ul>
<li>À faible charge, le barreau ne touche les dents que loin du jeu : grande portée → <b>accouplement souple</b>.</li>
<li>Quand le couple augmente, le contact se rapproche du jeu : la portée raccourcit → <b>accouplement de plus en plus raide</b>.</li>
</ul>
<p>Résultat : il amortit bien les chocs et les vibrations de torsion, sans devenir trop mou à pleine charge.</p>
<h3>Ce qu'il accepte (valeurs d'exemple)</h3>
<ul>
<li>Désalignement parallèle : 0,20 mm au montage, 0,50 mm maximum en service ;</li>
<li>Désalignement angulaire : 0,10° au montage, 0,25° maximum en service ;</li>
<li>Écartement des moyeux : 4 mm ± 0,8 mm.</li>
</ul>
<p>Plus l'alignement est bon, plus la grille et les rainures durent longtemps. Les vraies valeurs sont dans le tableau du fabricant pour chaque taille.</p>
<h3>Calcul du couple</h3>
<p><b>C = 9550 × P / n</b>. Pour 315 kW à 1485 tr/min : C = 9550 × 315 / 1485 ≈ 2 026 N·m. Ici, l'accouplement (couple nominal 4 000 N·m) a un facteur de service de 4 000 / 2 026 ≈ 2.</p>
<h3>Entretien</h3>
<ul>
<li>Regraisser selon le planning (souvent une fois par an en service normal, plus souvent en ambiance chaude ou poussiéreuse).</li>
<li>Contrôler les fuites de graisse aux joints et au plan de joint.</li>
<li>À chaque arrêt programmé : vérifier l'alignement et l'usure de la grille (barreaux amincis, marqués, fissurés).</li>
<li>Remplacer toujours la grille complète (tous les segments) et les joints.</li>
</ul>
<h3>Sécurité</h3>
<p>Consigner le moteur avant toute intervention. Ne jamais faire tourner l'accouplement sans protecteur. En cas de rupture, la grille peut être projetée : le carter et le protecteur la retiennent.</p>`;

export const PANNES_HTML = `
<table>
<tr><th>Symptôme</th><th>Causes possibles</th><th>Que faire</th></tr>
<tr><td>Usure rapide de la grille (barreaux amincis, brillants)</td><td>Désalignement, manque de graisse, graisse inadaptée</td><td>Réaligner, regraisser avec la bonne graisse, changer la grille</td></tr>
<tr><td>Fuite de graisse</td><td>Joints à lèvres usés ou mal posés, joint plat abîmé, boulons desserrés</td><td>Changer les joints, resserrer au couple, regraisser</td></tr>
<tr><td>Échauffement du carter</td><td>Manque de graisse, désalignement important</td><td>Arrêter, contrôler graisse et alignement</td></tr>
<tr><td>Vibration, bruit au rythme de la rotation</td><td>Désalignement, jeu dans les rainures (usure), pattes desserrées</td><td>Mesure vibratoire, contrôle d'alignement, inspection</td></tr>
<tr><td>Grille cassée</td><td>Surcharge brutale (blocage de la machine), fatigue après usure, désalignement fort</td><td>Trouver la cause (bourrage, blocage), changer la grille complète, vérifier les rainures</td></tr>
<tr><td>Rainures des moyeux usées en escalier</td><td>Longue marche sans graisse ou désaligné</td><td>Changer les moyeux (une grille neuve s'userait vite)</td></tr>
<tr><td>Moyeu qui glisse sur l'arbre</td><td>Clavette mal ajustée, serrage insuffisant</td><td>Contrôler l'ajustement, remplacer clavette / moyeu</td></tr>
</table>`;

export const QUIZ = [
  { q: 'Par quoi passe le couple dans cet accouplement ?', r: ['Par la graisse', 'Par les barreaux de la grille qui fléchissent', 'Par le carter'], b: 1, e: 'Les barreaux de la grille s\'appuient sur les dents des deux moyeux : ils travaillent en flexion.' },
  { q: 'Pourquoi les rainures ont-elles des flancs courbes ?', r: ['Pour faire joli', 'Pour obtenir une raideur progressive', 'Pour faciliter l\'usinage'], b: 1, e: 'Quand le couple augmente, la portée du barreau raccourcit : l\'accouplement devient plus raide.' },
  { q: 'Que faut-il enfiler sur les arbres AVANT les moyeux ?', r: ['Les joints à lèvres', 'La grille', 'Les boulons'], b: 0, e: 'Les joints ne passent pas par-dessus les moyeux une fois ceux-ci montés.' },
  { q: 'Avec quoi enfonce-t-on les segments de grille ?', r: ['Un marteau en acier', 'Un maillet en caoutchouc', 'Une presse hydraulique'], b: 1, e: 'Un marteau en acier marque et fragilise l\'acier à ressort.' },
  { q: 'Couple pour 315 kW à 1485 tr/min ?', r: ['≈ 212 N·m', '≈ 2 026 N·m', '≈ 20 260 N·m'], b: 1, e: 'C = 9550 × 315 / 1485 ≈ 2 026 N·m.' },
  { q: 'Que provoque un manque de graisse ?', r: ['Rien', 'Usure rapide de la grille et des rainures, échauffement', 'Une meilleure transmission'], b: 1, e: 'Le contact métal sur métal s\'use très vite et chauffe.' },
  { q: 'On change une grille usée. On remplace…', r: ['Seulement le segment cassé', 'Tous les segments et les joints', 'Seulement la graisse'], b: 1, e: 'On remplace toujours la grille complète et les joints, puis on regraisse.' },
  { q: 'Le désalignement angulaire de service maximum (exemple) est…', r: ['0,25°', '2,5°', '25°'], b: 0, e: 'Un accouplement à grille tolère de petits défauts seulement ; au montage on vise beaucoup mieux (0,10°).' },
  { q: 'Que se passe-t-il si le convoyeur se bloque net derrière le réducteur ?', r: ['Le moteur s\'arrête doucement', 'Le pic de couple peut casser la grille', 'La graisse protège tout'], b: 1, e: 'L\'énergie de rotation du moteur se décharge dans la grille : le pic de couple dépasse largement le couple nominal.' },
  { q: 'Que fait-on avant d\'ouvrir le carter ?', r: ['On ralentit le moteur', 'On consigne le moteur', 'On enlève les bouchons'], b: 1, e: 'Toujours consigner (cadenas) : personne ne doit pouvoir démarrer pendant l\'intervention.' }
];
