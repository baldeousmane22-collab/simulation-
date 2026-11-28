// Textes pédagogiques (modifiables par le formateur)
export const PIECES = [
  { n: 1, id: 'moteur', court: 'Moteur', nom: 'Moteur électrique asynchrone', mat: '110 kW – 1480 tr/min, carcasse en fonte', role: 'Entraîne l\'arbre creux et la roue intérieure (roue pompe). Grâce au coupleur, il démarre presque à vide.' },
  { n: 2, id: 'arbreCreux', court: 'Arbre creux', nom: 'Arbre creux (moyeu)', mat: 'Acier, alésage claveté', role: 'Emmanché et claveté sur le bout d\'arbre du moteur ; il porte la roue intérieure et les roulements de la roue extérieure.' },
  { n: 3, id: 'pompe', court: 'Roue pompe', nom: 'Roue intérieure = roue pompe', mat: 'Alliage léger moulé, aubes radiales', role: 'Tourne à la vitesse du moteur. Ses aubes projettent l\'huile vers l\'extérieur (force centrifuge) et lui donnent de l\'énergie.' },
  { n: 4, id: 'turbine', court: 'Roue turbine', nom: 'Roue extérieure = roue turbine', mat: 'Alliage léger moulé, aubes radiales', role: 'Reçoit le jet d\'huile sur ses aubes et entraîne la machine. Elle tourne toujours un peu moins vite que la pompe : c\'est le glissement.' },
  { n: 5, id: 'coquille', court: 'Coquille', nom: 'Coquille (couvercle)', mat: 'Alliage léger moulé', role: 'Boulonnée sur la roue extérieure, elle enferme la roue pompe et l\'huile. Elle tourne avec la roue turbine.' },
  { n: 6, id: 'bouchon', court: 'Bouchon rempl.', nom: 'Bouchon de remplissage', mat: 'Acier, avec joint d\'étanchéité', role: 'Sert à remplir et à contrôler le niveau d\'huile, le coupleur étant tourné à l\'angle prescrit.' },
  { n: 7, id: 'fusibles', court: 'Bouchons fusibles', nom: 'Bouchons fusibles (×2)', mat: 'Laiton, âme en alliage fusible 140 °C', role: 'Sécurité thermique : si l\'huile dépasse 140 °C, l\'alliage fond, l\'huile est éjectée et le coupleur ne transmet plus de couple.' },
  { n: 8, id: 'joints', court: 'Roulements/joints', nom: 'Roulements et joints à lèvres', mat: 'Acier / élastomère NBR ou FKM', role: 'Guident la roue extérieure sur l\'arbre creux et gardent l\'huile dans le coupleur.' },
  { n: 9, id: 'elastique', court: 'Acc. élastique', nom: 'Accouplement élastique', mat: 'Fonte, tampons en caoutchouc', role: 'Relie la roue extérieure à l\'arbre du réducteur et accepte un petit désalignement.' },
  { n: 10, id: 'reducteur', court: 'Réducteur', nom: 'Réducteur (machine entraînée)', mat: 'Carter en fonte', role: 'Reçoit le couple de sortie du coupleur et entraîne le tambour du convoyeur.' },
  { n: 11, id: 'huile', court: 'Huile', nom: 'Huile de fonctionnement', mat: 'Huile minérale hydraulique HLP ISO VG 32', role: 'Transmet le couple sans contact métallique entre pompe et turbine. Sa quantité règle le couple maximal du coupleur.' },
  { n: 12, id: 'vis', court: 'Vis', nom: 'Vis d\'assemblage coquille / roue', mat: 'Acier classe 8.8', role: 'Assemblent la coquille sur la roue extérieure ; un joint torique assure l\'étanchéité du plan de joint.' }
];

export const COURS_HTML = `
<h3>À quoi sert un coupleur hydraulique ?</h3>
<p>Placé entre le moteur et la machine (convoyeur, broyeur, pompe…), il transmet le couple <b>par l'huile</b>, sans contact entre les roues. Il permet :</p>
<ul>
<li>un <b>démarrage du moteur presque à vide</b> (le couple transmis croît comme le carré de la vitesse) : moins de pointe de courant ;</li>
<li>une <b>mise en vitesse progressive</b> de la bande chargée ;</li>
<li>une <b>limitation du couple</b> : en cas de blocage, le coupleur glisse au lieu de casser ;</li>
<li>l'<b>amortissement</b> des à-coups et des vibrations de torsion.</li>
</ul>
<h3>Fonctionnement</h3>
<ol>
<li>La <b>roue pompe</b> (côté moteur) projette l'huile vers l'extérieur par force centrifuge.</li>
<li>L'huile traverse vers la <b>roue turbine</b>, frappe ses aubes et lui cède son énergie.</li>
<li>Elle revient vers le centre de la turbine puis repart dans la pompe : c'est le <b>tourbillon torique</b> (visible en coupe).</li>
</ol>
<p>Le couple ne passe que s'il existe une différence de vitesse : le <b>glissement</b> <i>s = (n<sub>pompe</sub> − n<sub>turbine</sub>) / n<sub>pompe</sub></i>, de 2 à 5 % en régime normal. La puissance perdue <i>P = C × ω × s</i> chauffe l'huile.</p>
<h3>Le remplissage : le réglage le plus important</h3>
<p>Dans un coupleur à <b>remplissage constant</b> (type T), c'est la quantité d'huile qui fixe le couple maximal :</p>
<ul>
<li><b>Trop peu d'huile</b> : glissement élevé, échauffement, fusion du bouchon fusible, la bande démarre mal ;</li>
<li><b>Trop d'huile</b> : couple de démarrage trop fort (moteur et bande sollicités), pression interne élevée, fuites. Il faut <b>toujours laisser de l'air</b> pour la dilatation de l'huile (jamais plus de 80 % environ).</li>
</ul>
<h3>Procédure de remplissage (type T)</h3>
<ol>
<li>Arrêter, <b>consigner</b> le moteur, laisser refroidir (l'huile chaude est sous pression).</li>
<li>Tourner le coupleur à la main pour amener le <b>bouchon de remplissage en haut</b>.</li>
<li>Dévisser le bouchon et verser l'<b>huile prescrite, propre, filtrée</b> (entonnoir avec tamis).</li>
<li>Tourner le coupleur jusqu'au <b>repère de contrôle</b> (angle donné par la notice selon le remplissage) : l'huile doit <b>affleurer au bord du trou</b>. Trop d'huile → elle s'écoule ; pas d'huile → compléter.</li>
<li>Remettre le bouchon avec un <b>joint neuf</b>, serrer au couple prescrit.</li>
<li>Déconsigner, démarrer et contrôler : absence de fuite, température, temps de démarrage.</li>
</ol>
<p class="note">Dans la simulation : capacité utile ≈ 16,4 L, remplissage prescrit ≈ 11,2 L (68 %). Le repère de contrôle se calcule : le trou est à 235 mm de l'axe ; l'huile y affleure quand la hauteur du trou égale le niveau d'huile.</p>
<h3>Huile</h3>
<p>Huile minérale hydraulique HL / HLP, viscosité ISO VG 32 (selon la notice), propre. Ne jamais mélanger avec de l'eau ni avec une huile d'une autre nature. Les coupleurs type TW, eux, fonctionnent à l'eau.</p>
<h3>Sécurité</h3>
<ul>
<li>Jamais d'intervention coupleur en rotation : consignation obligatoire.</li>
<li>Attendre le refroidissement : risque de projection d'huile chaude à l'ouverture.</li>
<li>Remplacer un bouchon fusible fondu <b>par un bouchon de même température</b> ; ne jamais le remplacer par un bouchon plein.</li>
<li>Remettre le carter de protection avant la remise en marche.</li>
</ul>`;

export const PANNES_HTML = `
<table>
<tr><th>Symptôme</th><th>Causes probables</th><th>Remèdes</th></tr>
<tr><td><b>Bouchon fusible fondu, huile projetée</b></td><td>Remplissage insuffisant ; surcharge ou blocage de la machine ; démarrages trop fréquents ; mauvaise huile</td><td>Supprimer la cause, monter un bouchon fusible neuf de même température, refaire le plein à la quantité prescrite</td></tr>
<tr><td><b>Démarrage trop long, la bande peine</b></td><td>Manque d'huile (fuite) ; charge trop forte</td><td>Contrôler le niveau au repère, rechercher la fuite, compléter</td></tr>
<tr><td><b>Démarrage brutal, moteur qui disjoncte</b></td><td>Trop d'huile (couple de démarrage trop fort)</td><td>Ramener au remplissage prescrit (contrôle au repère)</td></tr>
<tr><td><b>Fuite au bouchon ou au plan de joint</b></td><td>Joint usé ou réutilisé, serrage insuffisant, surpression (trop d'huile)</td><td>Joint neuf, serrage au couple, contrôler le remplissage</td></tr>
<tr><td><b>Fuite à l'arbre</b></td><td>Joint à lèvres usé, portée d'arbre rayée</td><td>Remplacer le joint, contrôler la portée</td></tr>
<tr><td><b>Échauffement anormal</b></td><td>Glissement élevé : sous-remplissage ou surcharge ; mauvaise ventilation (carter obstrué)</td><td>Contrôler remplissage et charge, dégager le carter</td></tr>
<tr><td><b>Vibrations</b></td><td>Désalignement moteur / réducteur ; balourd (huile répartie, roue abîmée) ; tampons élastiques usés</td><td>Réaligner, remplacer les tampons, contrôler les roulements</td></tr>
<tr><td><b>Bruit de roulement</b></td><td>Roulements usés, huile polluée</td><td>Remplacer les roulements, vidanger</td></tr>
</table>
<p class="note">Essayez dans l'onglet Marche : remplissage à 40 % avec 100 % de charge, ou « Bloquer le convoyeur ».</p>`;

export const QUIZ = [
  { q: 'Par quoi le couple est-il transmis dans un coupleur hydraulique ?', r: ['Par des disques de friction', 'Par l\'huile qui circule entre la roue pompe et la roue turbine', 'Par des engrenages'], ok: 1, e: 'Il n\'y a aucun contact mécanique entre les deux roues.' },
  { q: 'Quelle roue est reliée au moteur dans ce coupleur ?', r: ['La roue intérieure (pompe)', 'La roue extérieure (turbine)', 'La coquille'], ok: 0, e: 'Entraînement par la roue intérieure : la roue extérieure et la coquille entraînent la machine.' },
  { q: 'Le glissement normal en régime établi est d\'environ :', r: ['0 %', '2 à 5 %', '30 %'], ok: 1, e: 'Sans glissement, aucun couple ne serait transmis.' },
  { q: 'Que se passe-t-il si le coupleur manque d\'huile ?', r: ['Rien', 'Glissement élevé, échauffement, le bouchon fusible peut fondre', 'Le couple de démarrage augmente'], ok: 1, e: 'Moins d\'huile = moins de couple transmissible.' },
  { q: 'Pourquoi ne faut-il jamais remplir le coupleur à 100 % ?', r: ['Pour économiser l\'huile', 'Il faut garder de l\'air pour la dilatation de l\'huile chaude (sinon surpression)', 'Pour qu\'il tourne plus vite'], ok: 1, e: 'Remplissage maximal ≈ 80 % de la capacité.' },
  { q: 'Pour remplir, on place d\'abord le bouchon de remplissage :', r: ['En bas', 'En haut', 'N\'importe où'], ok: 1, e: 'Bouchon en haut, on verse l\'huile sans qu\'elle ressorte.' },
  { q: 'Comment contrôle-t-on la bonne quantité d\'huile ?', r: ['On regarde un voyant', 'On tourne le coupleur jusqu\'au repère de contrôle : l\'huile doit affleurer au bord du trou', 'On pèse le coupleur'], ok: 1, e: 'L\'angle de contrôle dépend du remplissage prescrit (notice).' },
  { q: 'Un bouchon fusible a fondu. On le remplace par :', r: ['Un bouchon plein en acier', 'Un bouchon fusible de même température', 'Un bouchon fusible de température plus élevée'], ok: 1, e: 'Un bouchon plein supprimerait la sécurité : risque d\'éclatement ou d\'incendie.' },
  { q: 'Quelle huile utilise-t-on généralement ?', r: ['Huile hydraulique minérale HLP ISO VG 32', 'Graisse', 'Huile moteur 20W50 usagée'], ok: 0, e: 'Toujours suivre la notice du constructeur.' },
  { q: 'Avant d\'ouvrir le bouchon de remplissage, il faut :', r: ['Laisser tourner pour bien voir', 'Consigner le moteur et attendre que le coupleur refroidisse', 'Chauffer l\'huile'], ok: 1, e: 'Huile chaude sous pression : risque de brûlure.' }
];
