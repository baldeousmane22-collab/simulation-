// Textes pédagogiques (modifiables par le formateur)
export const PIECES = [
  { n: 1, id: 'arbre', court: 'Arbre', nom: 'Bout d\'arbre du tambour (Ø230)', mat: 'Acier, portée usinée', role: 'Arbre du tambour de tête du convoyeur. C\'est lui que l\'antidévireur empêche de tourner à l\'envers.' },
  { n: 2, id: 'clavette', court: 'Clavette', nom: 'Clavette parallèle', mat: 'Acier', role: 'Lie en rotation l\'arbre et la bague intérieure : tout le couple de retenue passe par elle.' },
  { n: 3, id: 'bagueInt', court: 'Bague int.', nom: 'Bague intérieure', mat: 'Acier trempé, piste rectifiée', role: 'Tourne avec l\'arbre. Sa surface extérieure est la piste intérieure des cames.' },
  { n: 4, id: 'cames', court: 'Cames', nom: 'Cames de coincement (sprags)', mat: 'Acier trempé à cœur', role: 'Petites pièces inclinées entre les deux bagues. Sens libre : elles se couchent et glissent. Sens inverse : elles se redressent et se coincent.' },
  { n: 5, id: 'cage', court: 'Cage', nom: 'Cage et ressorts annulaires', mat: 'Laiton / acier à ressort', role: 'La cage garde les cames à égale distance ; le ressort les maintient en léger contact pour un blocage immédiat.' },
  { n: 6, id: 'bagueExt', court: 'Bague ext.', nom: 'Bague extérieure (corps)', mat: 'Acier, piste trempée', role: 'Reste immobile. Reçoit l\'effort des cames et le transmet aux flasques puis au bras de réaction.' },
  { n: 7, id: 'roulement', court: 'Roulement', nom: 'Roulements à billes (×2)', mat: 'Acier à roulement', role: 'Centrent la bague extérieure sur la bague intérieure : le jeu des cames reste régulier tout autour.' },
  { n: 8, id: 'flasque', court: 'Flasque', nom: 'Flasques / couvercles (×2)', mat: 'Acier ou fonte, peint', role: 'Ferment le carter, portent les roulements et les joints. Le flasque avant porte le bouchon de niveau.' },
  { n: 9, id: 'joint', court: 'Joint', nom: 'Joints d\'étanchéité (×2)', mat: 'Élastomère', role: 'Gardent l\'huile à l\'intérieur et empêchent la poussière de bauxite et l\'eau d\'entrer.' },
  { n: 10, id: 'bras', court: 'Bras', nom: 'Bras de réaction', mat: 'Tôle d\'acier épaisse', role: 'Empêche le corps de tourner. Son extrémité s\'appuie sur la butée du châssis, avec du jeu : il ne doit jamais être bridé.' },
  { n: 11, id: 'vis', court: 'Vis', nom: 'Vis d\'assemblage (×12)', mat: 'Acier haute résistance', role: 'Serrent ensemble les flasques, la bague extérieure et le bras. Serrage au couple, en croix.' },
  { n: 12, id: 'plaque', court: 'Plaque d\'arrêt', nom: 'Plaque d\'arrêt en bout d\'arbre', mat: 'Acier', role: 'Empêche l\'antidévireur de glisser le long de l\'arbre.' },
  { n: 13, id: 'bouchons', court: 'Bouchons', nom: 'Bouchons : remplissage / reniflard, vidange', mat: 'Laiton / acier', role: 'En haut : remplissage et mise à l\'air (reniflard). En bas : vidange. Le niveau se contrôle sur le flasque.' },
  { n: 14, id: 'butee', court: 'Butée', nom: 'Butée du bras (sur le châssis)', mat: 'Acier soudé', role: 'Reprend l\'effort du bras. Jeu en haut, en bas et sur les côtés pour laisser le bras libre de suivre l\'arbre.' },
  { n: 15, id: 'huile', court: 'Huile', nom: 'Huile Mobil DTE Heavy Medium', mat: '2 quarts US ≈ 1,9 litre (ISO VG 68)', role: 'Lubrifie les cames, les pistes et les roulements. Sans extrême-pression (EP) : le coincement a besoin de frottement.' }
];

export const PLAQUE_HTML = `
<h3>Lecture de la plaque signalétique</h3>
<table>
<tr><th>Sur la plaque</th><th>Valeur</th><th>Signification</th></tr>
<tr><td>RINGSPANN BACKSTOP</td><td>—</td><td>Antidévireur (backstop) du fabricant Ringspann.</td></tr>
<tr><td>SIZE</td><td>FRHD 1200</td><td>Série FRHD, taille 1200 : antidévireur lent à bras de réaction, monté sur l'arbre du tambour.</td></tr>
<tr><td>RATING</td><td>290 000 lb-ft</td><td>Couple nominal de retenue : 290 000 × 1,356 ≈ <b>393 000 N·m (393 kN·m)</b>.</td></tr>
<tr><td>BORE</td><td>230 MM</td><td>Alésage : diamètre de l'arbre à recevoir, 230 mm.</td></tr>
<tr><td>SERIAL NO.</td><td>563428</td><td>Numéro de série : à donner pour toute commande de pièces.</td></tr>
<tr><td>PART NO.</td><td>4821-320002-…</td><td>Référence de l'appareil (à relever sur la plaque, en partie effacée).</td></tr>
<tr><td>OIL TYPE</td><td>Mobil DTE Heavy Medium</td><td>Huile minérale de circulation, classe ISO VG 68, sans additif extrême-pression.</td></tr>
<tr><td>OIL QTY.</td><td>2 QT</td><td>2 quarts US = 2 × 0,946 ≈ <b>1,9 litre</b>.</td></tr>
<tr><td>BULLETIN</td><td>E08.746</td><td>Notice de montage et d'entretien du constructeur : c'est elle qui fait foi.</td></tr>
</table>
<h3>Conversions utiles</h3>
<ul><li>1 lb-ft = 1,356 N·m</li><li>1 quart US = 0,946 L</li>
<li>Effort sur la butée : F = C ÷ L. Dans cette simulation L = 1,2 m (longueur d'exemple du bras) : à 393 kN·m, F ≈ 328 kN, soit environ 33 tonnes.</li></ul>
<p class="note">Les dimensions intérieures de la 3D sont reconstituées pour la formation : seul le bulletin E08.746 donne les cotes, les couples de serrage et les intervalles d'entretien exacts.</p>`;

export const COURS_HTML = `
<h3>1. À quoi sert un antidévireur ?</h3>
<p>Sur un convoyeur incliné, quand le moteur s'arrête avec la bande chargée, le poids de la matière tire la bande vers le bas. Sans retenue, la bande <b>dévire</b> : elle repart en arrière, accélère et déverse la matière au pied du convoyeur (bourrage, bande déchirée, danger pour le personnel).</p>
<p>L'antidévireur est une <b>roue libre</b> : il laisse l'arbre tourner dans le sens de marche et le bloque aussitôt dans l'autre sens, sans commande ni énergie.</p>
<h3>2. Principe des cames</h3>
<ul>
<li>Entre la bague intérieure (qui tourne) et la bague extérieure (fixe) sont placées des cames inclinées.</li>
<li>La came est plus longue dans une diagonale que la distance entre les deux pistes.</li>
<li><b>Sens libre</b> : le frottement de la bague intérieure couche les cames ; elles glissent sur le film d'huile.</li>
<li><b>Sens inverse</b> : le frottement redresse les cames ; elles se coincent (arc-boutement) et l'arbre s'arrête après un recul de quelques degrés seulement.</li>
</ul>
<p>Regardez-le dans la vue <b>Cames</b>, en vitesse lente, puis appuyez sur « Arrêt (bande chargée) ».</p>
<h3>3. Chemin de l'effort au blocage</h3>
<p>Bande → tambour → arbre → clavette → bague intérieure → cames → bague extérieure → flasques et vis → bras de réaction → butée → châssis.</p>
<h3>4. Montage : les points à respecter</h3>
<ol>
<li><b>Vérifier le sens libre</b> (flèche sur l'appareil) avant de l'enfiler sur l'arbre : monté à l'envers, il bloque la marche avant.</li>
<li>Arbre et clavette propres, sans bavure ; monter sans frapper sur la bague extérieure ni sur les flasques.</li>
<li>Arrêter l'appareil en bout d'arbre (plaque d'arrêt).</li>
<li><b>Bras de réaction libre</b> dans sa butée : jeu en haut, en bas et sur les côtés. Un bras bridé force sur les roulements et les détruit.</li>
<li>Remplir d'huile jusqu'au niveau (ici 2 quarts ≈ 1,9 L de Mobil DTE Heavy Medium).</li>
<li>Premier essai du moteur par brèves impulsions pour contrôler le sens de rotation.</li>
</ol>
<h3>5. Entretien</h3>
<ul>
<li>Contrôler le niveau d'huile et l'absence de fuite aux joints.</li>
<li>Vidanger selon le bulletin du constructeur ; plus souvent en ambiance poussiéreuse et chaude.</li>
<li>Reniflard propre, non bouché.</li>
<li>Surveiller la température et le bruit en marche, le jeu du bras, le serrage des vis.</li>
<li><b>Jamais d'huile ni de graisse avec additifs EP</b>, bisulfure de molybdène ou graphite : les cames glisseraient.</li>
</ul>
<h3>6. Sécurité</h3>
<p class="msg a">Une bande chargée retenue par l'antidévireur contient une grande énergie. Avant de démonter le bras, la butée ou l'antidévireur : consigner le convoyeur, puis <b>vider la bande ou la brider</b>. Ne jamais desserrer le bras tant que la charge est dessus.</p>`;

export const PANNES_HTML = `
<h3>Pannes courantes → causes → solutions</h3>
<table>
<tr><th>Constat</th><th>Causes probables</th><th>Que faire</th></tr>
<tr><td>La bande recule à l'arrêt (dévirage)</td><td>Cames ou pistes usées ; huile avec additifs EP ou graisse ; ressort de cage cassé ; surcharge</td><td>Consigner, vider ou brider la bande ; vidanger avec la bonne huile ; remplacer l'antidévireur ou sa cage à cames</td></tr>
<tr><td>Échauffement en marche</td><td>Manque d'huile ou huile trop visqueuse ; bras de réaction bridé ; roulement abîmé</td><td>Rétablir le niveau avec l'huile prescrite ; redonner le jeu du bras ; contrôler les roulements</td></tr>
<tr><td>Fuite d'huile</td><td>Joint usé ou monté à l'envers ; portée rayée ; reniflard bouché (surpression) ; trop d'huile</td><td>Remplacer le joint ; nettoyer le reniflard ; remettre au niveau</td></tr>
<tr><td>Bruit, claquement au blocage</td><td>Jeu excessif dans la butée ; clavette matée ; vis desserrées</td><td>Régler la butée (garder un petit jeu) ; changer la clavette ; resserrer au couple</td></tr>
<tr><td>Le convoyeur ne démarre pas, le moteur force</td><td>Antidévireur monté à l'envers ; moteur câblé en sens inverse</td><td>Arrêt immédiat ; vérifier la flèche de sens libre et le sens du moteur</td></tr>
<tr><td>Huile laiteuse ou chargée de poussière</td><td>Entrée d'eau ou de bauxite par un joint ou le reniflard</td><td>Vidanger, rincer, remplacer joints et reniflard</td></tr>
<tr><td>Bras ou butée déformés, fissurés</td><td>Surcharge ; chocs au blocage ; bras bridé</td><td>Remplacer ; rechercher la cause de la surcharge avant la remise en service</td></tr>
</table>`;

export const QUIZ = [
  { q: 'Quel est le rôle de l\'antidévireur sur un convoyeur incliné ?', r: ['Freiner la bande en marche', 'Empêcher la bande chargée de repartir en arrière à l\'arrêt', 'Tendre la bande'], ok: 1, e: 'C\'est une roue libre : libre dans le sens de marche, bloquée dans l\'autre sens.' },
  { q: 'En marche avant, que font les cames ?', r: ['Elles se couchent et glissent sur le film d\'huile', 'Elles se coincent', 'Elles tournent avec l\'arbre'], ok: 0, e: 'Aucun couple n\'est transmis en roue libre.' },
  { q: 'La plaque indique 290 000 lb-ft. Cela fait environ :', r: ['39 kN·m', '393 kN·m', '2 900 kN·m'], ok: 1, e: '290 000 × 1,356 ≈ 393 000 N·m.' },
  { q: 'Quelle quantité d\'huile indique la plaque (2 QT) ?', r: ['Environ 1,9 litre', '2 litres exactement', 'Environ 7,6 litres'], ok: 0, e: '1 quart US = 0,946 L.' },
  { q: 'Pourquoi ne faut-il pas d\'huile avec additifs extrême-pression (EP) ?', r: ['Elle coûte trop cher', 'Elle attaque les joints', 'Elle réduit le frottement : les cames peuvent glisser au lieu de se coincer'], ok: 2, e: 'Le coincement des cames repose sur le frottement.' },
  { q: 'Comment doit être monté le bras de réaction dans sa butée ?', r: ['Bridé fermement par des boulons', 'Libre, avec du jeu en haut, en bas et sur les côtés', 'Soudé au châssis'], ok: 1, e: 'Bridé, il impose des efforts aux roulements à chaque tour.' },
  { q: 'Quelle pièce transmet le couple de l\'arbre à la bague intérieure ?', r: ['La clavette', 'Le joint', 'La plaque d\'arrêt'], ok: 0, e: 'La plaque d\'arrêt ne fait que l\'arrêt axial.' },
  { q: 'Avant de démonter l\'antidévireur d\'un convoyeur chargé, il faut :', r: ['Seulement couper le moteur', 'Consigner, puis vider ou brider la bande', 'Desserrer le bras doucement'], ok: 1, e: 'La bande chargée repartirait en arrière dès que la retenue est supprimée.' },
  { q: 'Le convoyeur neuf ne démarre pas et le moteur force. Cause la plus probable ?', r: ['Antidévireur monté à l\'envers ou moteur en sens inverse', 'Trop d\'huile', 'Bras trop long'], ok: 0, e: 'Toujours vérifier la flèche de sens libre avant montage.' },
  { q: 'Avec C = 240 kN·m et un bras de 1,2 m, l\'effort sur la butée vaut :', r: ['288 kN', '200 kN', '24 kN'], ok: 1, e: 'F = C ÷ L = 240 ÷ 1,2 = 200 kN (environ 20 tonnes).' }
];

// Montage / démontage pas à pas. pieces = clés des groupes posés à cette étape.
export const MONTAGE = {
  prepM: '<b>Préparation.</b> Convoyeur consigné, bande vidée ou bridée. Pièces propres, sans bavure ni rouille ; huile, joints neufs et clé dynamométrique prêts. Vérifier l\'état des pistes et des cames.',
  prepD: '<b>Avant de démonter.</b> Consigner le convoyeur, puis <b>vider la bande ou la brider</b> : l\'antidévireur retient peut-être la charge. Vérifier que le bras n\'est plus en appui sur la butée, puis vidanger l\'huile.',
  etapes: [
    { t: 'Corps (bague extérieure) et bouchons', m: 'Poser la bague extérieure à plat sur l\'établi, piste propre. Monter le bouchon de vidange et le reniflard.', d: 'Déposer les bouchons. Contrôler la piste extérieure : ni empreinte, ni écaillage. Nettoyer et ranger.' },
    { t: 'Flasque arrière, roulement et joint', m: 'Monter le roulement et le joint neuf (lèvre vers l\'huile) dans le flasque arrière, puis présenter le flasque contre le corps avec sa pâte à joint.', d: 'Déposer le flasque arrière avec son roulement et son joint. Extraire le roulement à la presse ou à l\'extracteur, jamais au marteau.' },
    { t: 'Bague intérieure', m: 'Engager la bague intérieure dans le roulement arrière, bien dans l\'axe, sans rayer la piste.', d: 'Sortir la bague intérieure. Contrôler la piste et la rainure de clavette.' },
    { t: 'Cage et cames', m: 'Glisser la cage garnie de ses cames entre les deux pistes. <b>Vérifier le sens d\'inclinaison des cames</b> : il fixe le sens libre. Huiler légèrement.', d: 'Sortir la cage à cames en la tenant bien droite. Repérer son sens. Contrôler l\'usure des cames et les ressorts.' },
    { t: 'Roulement avant', m: 'Monter le roulement avant sur la bague intérieure, en poussant sur la bague intérieure du roulement.', d: 'Extraire le roulement avant à l\'extracteur.' },
    { t: 'Flasque avant et joint', m: 'Poser le flasque avant et son joint neuf. Aligner les trous de vis avec ceux du corps.', d: 'Déposer le flasque avant et son joint. Un joint démonté ne se remonte pas.' },
    { t: 'Bras de réaction et vis', m: 'Présenter le bras contre le flasque arrière, engager les 12 vis et serrer <b>en croix, au couple</b> du bulletin constructeur. Essayer à la main : libre dans un sens, bloqué dans l\'autre.', d: 'Desserrer les 12 vis en croix, les retirer, puis déposer le bras de réaction.' },
    { t: 'Clavette sur l\'arbre', m: 'Nettoyer le bout d\'arbre Ø230, le graisser légèrement et poser la clavette dans sa rainure, sans jeu latéral.', d: 'Retirer la clavette. Contrôler qu\'elle n\'est pas matée ; nettoyer et protéger le bout d\'arbre.' },
    { t: 'Antidévireur sur l\'arbre', m: '<b>Vérifier la flèche de sens libre</b> avant d\'engager. Enfiler l\'appareil sur l\'arbre en poussant sur la bague intérieure seulement, jamais sur le corps ni sur les flasques.', d: 'Élinguer l\'appareil, puis le tirer de l\'arbre à l\'extracteur en prenant appui sur la bague intérieure.' },
    { t: 'Plaque d\'arrêt', m: 'Monter la plaque d\'arrêt en bout d\'arbre et serrer ses vis : l\'appareil ne peut plus glisser.', d: 'Déposer la plaque d\'arrêt en bout d\'arbre.' },
    { t: 'Bras dans la butée, huile, essai', m: 'Placer le bras dans sa butée <b>avec du jeu</b> (haut, bas, côtés), sans le brider. Remplir : 2 quarts ≈ 1,9 L de Mobil DTE Heavy Medium, contrôler le niveau. Essai du moteur par brèves impulsions.', d: 'Vidanger l\'huile dans un bac. Vérifier que le bras est libre dans sa butée, non chargé.' }
  ]
};
