/* =====================================================================
   donnees.js — Textes pédagogiques : opérations de fraisage, matériaux,
   cours, astuces et quiz. Le formateur peut modifier ces textes sans
   toucher au reste de l'application.
   ===================================================================== */

/* Matériaux usinés : Vc (m/min) selon l'outil, kc (N/mm²), facteur sur fz, couleur des copeaux */
export const MATIERES = {
  acier: { nom: 'Acier C45 (mi-dur)', vc: { ars: 25, carbure: 180 }, kc: 2000, kfz: 1, copeau: 0x6b7fc4 },
  doux: { nom: 'Acier doux S235', vc: { ars: 30, carbure: 220 }, kc: 1700, kfz: 1.1, copeau: 0x8a6d4a },
  inox: { nom: 'Inox 304', vc: { ars: 15, carbure: 120 }, kc: 2500, kfz: 0.8, copeau: 0xb8a37a },
  fonte: { nom: 'Fonte grise', vc: { ars: 20, carbure: 120 }, kc: 1200, kfz: 1.1, copeau: 0x4b5563 },
  alu: { nom: 'Aluminium 2017', vc: { ars: 80, carbure: 400 }, kc: 800, kfz: 1.3, copeau: 0xd6dde6 },
  laiton: { nom: 'Laiton', vc: { ars: 50, carbure: 250 }, kc: 900, kfz: 1.2, copeau: 0xd4a72c }
};
export const OUTILS_MAT = { ars: 'Acier rapide (ARS / HSS)', carbure: 'Carbure (plaquettes / monobloc)' };

/* Opérations : géométrie de l'outil (D, Z), conditions de coupe, textes */
export const OPERATIONS = {
  surfacage: {
    nom: 'Surfaçage en bout', court: 'Surfaçage', icone: '▭', machine: 'verticale', piece: 'profil',
    outil: 'Fraise à surfacer à plaquettes carbure Ø80, 5 dents', D: 80, Z: 5, fz: 0.15, ap: '3 puis 1 mm', ae: 60, outilDefaut: 'carbure',
    but: 'Obtenir une surface plane et lisse sur le dessus de la pièce (face de référence ou mise à la cote en hauteur).',
    principe: 'La fraise travaille <b>en bout</b> : ce sont les plaquettes situées sous la fraise qui coupent. L\'axe de la fraise est perpendiculaire à la surface usinée.',
    etapes: ['Brider la pièce dans l\'étau sur cales parallèles, la frapper au maillet', 'Monter la fraise à surfacer, choisir n et Vf', 'Faire la tangente (effleurer le dessus de la pièce), mettre le vernier à zéro', 'Dégager en X, monter la table de ap = 3 mm (ébauche)', 'Passe d\'ébauche en avance automatique', 'Mesurer, puis passe de finition ap = 1 mm', 'Ébavurer à la lime, contrôler la planéité'],
    astuces: ['Choisir une fraise 1,3 à 1,6 fois plus large que la pièce (ae ≈ 70 % de D) : coupe stable, pas de vibrations.', 'Décaler légèrement l\'axe de la fraise par rapport au centre de la pièce : les plaquettes entrent en douceur.', 'Toujours finir avec une petite prise de passe (0,5 à 1 mm) et une avance par dent plus faible pour un bel état de surface.', 'Ne pas s\'arrêter au milieu de la surface : la fraise laisse une marque circulaire.'],
    erreurs: ['Pièce mal frappée sur les cales → surface non parallèle.', 'Plaquette usée ou cassée → état de surface strié, bruit.', 'Avance trop forte en finition → stries visibles.']
  },
  roulant: {
    nom: 'Surfaçage en roulant (fraise cylindrique)', court: 'En roulant', icone: '◎', machine: 'horizontale', piece: 'profil',
    outil: 'Fraise cylindrique à denture hélicoïdale ARS Ø63 × 70, 8 dents', D: 63, Z: 8, fz: 0.08, ap: '2 puis 1 mm', ae: 60, outilDefaut: 'ars',
    but: 'Dresser une grande surface plane sur une fraiseuse horizontale.',
    principe: 'La fraise travaille <b>en roulant</b> (en périphérie) : ce sont les dents sur le pourtour qui coupent. L\'axe de la fraise est parallèle à la surface usinée.',
    etapes: ['Monter la fraise sur l\'arbre porte-fraise avec les bagues, serrer l\'écrou après avoir posé la lunette', 'Orienter l\'hélice pour que l\'effort pousse l\'arbre vers la broche', 'Faire la tangente, mettre le vernier à zéro', 'Prise de passe ap = 2 mm, usinage en opposition', 'Passe de finition ap = 1 mm', 'Contrôler la planéité à la règle'],
    astuces: ['La fraise doit être plus longue que la largeur de la pièce.', 'Le fraisage en opposition est conseillé sur les machines conventionnelles qui ont du jeu dans la vis de table.', 'Placer la fraise le plus près possible du nez de broche et la lunette au plus près de la fraise : moins de flexion de l\'arbre.'],
    erreurs: ['Arbre non soutenu par la lunette → vibrations, mauvaise surface.', 'Fraisage en avalant avec du jeu → la table est « tirée », la fraise casse.']
  },
  epaulement: {
    nom: 'Épaulement (fraise 2 tailles)', court: 'Épaulement', icone: '⌐', machine: 'verticale', piece: 'profil',
    outil: 'Fraise 2 tailles carbure monobloc Ø20, 4 dents', D: 20, Z: 4, fz: 0.06, ap: '2 × 6 mm', ae: 15, outilDefaut: 'carbure',
    but: 'Réaliser un épaulement droit : une face horizontale et une face verticale à 90°.',
    principe: 'La fraise 2 tailles coupe <b>en bout</b> (face horizontale) et <b>en roulant</b> (face verticale) en même temps.',
    etapes: ['Faire la tangente sur le côté de la pièce (papier à cigarette ou palpeur), zéro en Y', 'Décaler de la largeur de l\'épaulement moins le rayon de la fraise', 'Faire la tangente sur le dessus, zéro en Z', 'Usiner en plusieurs passes de profondeur (ap)', 'Finition des flancs : petite prise de passe radiale (0,2 à 0,5 mm)', 'Contrôler au pied à coulisse et à l\'équerre'],
    astuces: ['Ici la matière est du côté colonne de la fraise : fraise avançant vers la gauche = fraisage en avalant, vers la droite = en opposition. Comparez avec le bouton « Sens d\'avance ».', 'Laisser 0,3 mm sur le flanc pour une passe de finition : la face sera bien perpendiculaire.', 'Serrer la fraise au plus court dans le mandrin (porte-à-faux minimal).'],
    erreurs: ['Fraise trop longue → flanc en dépouille (pas à 90°).', 'Oublier le rayon de la fraise dans le décalage → mauvaise cote.']
  },
  rainure: {
    nom: 'Rainure droite (fraise 2 tailles)', court: 'Rainure', icone: '⊔', machine: 'verticale', piece: 'profil',
    outil: 'Fraise 2 tailles ARS Ø16, 3 dents', D: 16, Z: 3, fz: 0.04, ap: '2 × 5 mm', ae: 16, outilDefaut: 'ars',
    but: 'Réaliser une rainure débouchante de largeur 16 mm et de profondeur 10 mm (ex. logement de clavette).',
    principe: 'En rainurage, la fraise travaille sur toute sa largeur (ae = D) : un côté en opposition, l\'autre en avalant. C\'est l\'opération la plus chargée pour l\'outil.',
    etapes: ['Tracer et repérer l\'axe de la rainure', 'Faire la tangente sur le côté, décaler de la cote + rayon', 'Tangente sur le dessus, zéro', 'Plusieurs passes de profondeur (ap ≤ 0,5 × D)', 'Contrôler largeur (cale ou tampon) et profondeur'],
    astuces: ['Pour une largeur précise, ébaucher avec une fraise plus petite (Ø14) puis finir chaque flanc séparément.', 'Réduire l\'avance par dent (≈ 70 %) car la fraise est engagée sur 180°.', 'Bien évacuer les copeaux (soufflette ou arrosage) : un copeau recoupé abîme les flancs.'],
    erreurs: ['Rainure trop large : fraise faussée ou mal serrée (faux-rond).', 'Prise de passe trop forte → fraise cassée.']
  },
  poche: {
    nom: 'Poche rectangulaire', court: 'Poche', icone: '▣', machine: 'verticale', piece: 'carte',
    outil: 'Fraise 2 tailles à coupe au centre carbure Ø10, 3 dents', D: 10, Z: 3, fz: 0.04, ap: '2 × 4 mm', ae: 7, outilDefaut: 'carbure',
    but: 'Creuser une poche fermée 60 × 30 × 8 mm avec des rayons d\'angle de 5 mm.',
    principe: 'La fraise doit pouvoir <b>plonger</b> (coupe au centre). Elle balaye la poche en zigzag, puis fait une passe de contour pour la finition des flancs.',
    etapes: ['Choisir une fraise de rayon ≤ rayon d\'angle de la poche', 'Plongée progressive (ou en rampe / hélice) à ap = 4 mm', 'Balayage en zigzag avec un recouvrement (ae ≈ 0,7 × D)', 'Passe de contour pour finir les flancs', 'Deuxième niveau à 8 mm, même méthode', 'Contrôler les cotes et la profondeur (jauge de profondeur)'],
    astuces: ['Plonger en rampe (2 à 3°) ou en hélice plutôt qu\'à la verticale : la fraise dure plus longtemps.', 'Le rayon des angles de la poche est égal au rayon de la fraise : choisir la fraise en conséquence.', 'Souffler les copeaux du fond de la poche entre chaque niveau.'],
    erreurs: ['Fraise sans coupe au centre → impossible de plonger, la fraise casse.', 'Copeaux restés au fond → surface du fond abîmée.']
  },
  contournage: {
    nom: 'Contournage (profil extérieur)', court: 'Contournage', icone: '▢', machine: 'verticale', piece: 'carte',
    outil: 'Fraise 2 tailles carbure Ø16, 4 dents', D: 16, Z: 4, fz: 0.05, ap: '2 × 5 mm', ae: 8, outilDefaut: 'carbure',
    but: 'Usiner un profil extérieur 104 × 44 mm avec des angles arrondis R10 sur 10 mm de hauteur.',
    principe: 'La fraise suit le contour de la pièce, décalée de son rayon (correction de rayon G41 / G42 en commande numérique).',
    etapes: ['Définir le contour et le point d\'entrée', 'Entrée tangentielle au contour (pas d\'arrêt sur la pièce)', 'Faire le tour complet du profil à ap = 5 mm', 'Deuxième niveau à 10 mm', 'Passe de finition légère pour la cote finale'],
    astuces: ['En contournage extérieur, tourner dans le sens horaire (vu de dessus) pour travailler en avalant (G41).', 'Entrer et sortir tangentiellement : sinon la fraise laisse une marque.', 'Le rayon d\'un angle intérieur ne peut pas être plus petit que le rayon de la fraise.'],
    erreurs: ['Oubli de la correction de rayon → pièce trop petite ou trop grande de D/2.', 'Arrêt de l\'avance sur le profil → marque (talonnage).']
  },
  chanfrein: {
    nom: 'Chanfreinage 45°', court: 'Chanfrein', icone: '◺', machine: 'verticale', piece: 'profil',
    outil: 'Fraise à chanfreiner 90° (45°) ARS, 4 dents', D: 20, Z: 4, fz: 0.04, ap: '4 mm × 45°', ae: 4, outilDefaut: 'ars',
    but: 'Casser les arêtes vives du dessus de la pièce : chanfreins 4 × 45° sur les deux grands côtés.',
    principe: 'La fraise conique coupe avec ses flancs inclinés à 45°. La taille du chanfrein dépend de la position de la pointe par rapport à l\'arête.',
    etapes: ['Monter la fraise à chanfreiner', 'Tangenter la pointe sur l\'arête', 'Régler la profondeur pour obtenir le chanfrein voulu', 'Usiner le premier côté', 'Se décaler et usiner le second côté', 'Contrôler au rapporteur / gabarit'],
    astuces: ['Ne pas couper avec la pointe : la vitesse y est nulle, elle s\'use et casse vite.', 'Un petit chanfrein (0,5 × 45°) sur toutes les arêtes évite de se couper et facilite le montage.', 'Réduire la vitesse de rotation : le diamètre effectif est plus grand en haut du cône.'],
    erreurs: ['Pointe engagée dans la matière → arrachement et mauvaise surface.']
  },
  disque: {
    nom: 'Rainure à la fraise 3 tailles', court: '3 tailles', icone: '⊓', machine: 'horizontale', piece: 'profil',
    outil: 'Fraise disque 3 tailles ARS Ø80 × 10, 16 dents', D: 80, Z: 16, fz: 0.04, ap: '2 × 6 mm', ae: 10, outilDefaut: 'ars',
    but: 'Réaliser une rainure de 10 mm de large et 12 mm de profondeur sur fraiseuse horizontale.',
    principe: 'La fraise 3 tailles coupe sur sa périphérie et sur ses deux faces : la largeur de la rainure est égale à l\'épaisseur de la fraise.',
    etapes: ['Monter la fraise sur l\'arbre, centrer avec les bagues d\'entretoise', 'Poser la lunette, serrer l\'écrou d\'arbre', 'Positionner la fraise sur l\'axe de la rainure (tangente sur les côtés)', 'Prise de passe et usinage en opposition', 'Seconde passe à la profondeur finale', 'Contrôler la largeur au tampon ou à la cale'],
    astuces: ['Deux fraises 3 tailles montées ensemble avec une bague entre elles permettent de « fraiser à cheval » (deux faces parallèles en une passe).', 'Plus rapide que la fraise 2 tailles pour les longues rainures.', 'Utiliser une fraise à dents alternées pour les rainures profondes : meilleure coupe.'],
    erreurs: ['Fraise voilée ou bagues sales → rainure trop large.', 'Lunette oubliée → vibrations et cote non tenue.']
  },
  rainureT: {
    nom: 'Rainure en T', court: 'Rainure en T', icone: '⊤', machine: 'verticale', piece: 'profil',
    outil: '1) Fraise 2 tailles Ø12  2) Fraise à rainure en T Ø24 × 8, 6 dents', D: 24, Z: 6, fz: 0.03, ap: '20 puis 8 mm', ae: 24, outilDefaut: 'ars',
    but: 'Réaliser une rainure en T comme celles des tables de machines (pour les boulons de bridage).',
    principe: 'On usine d\'abord une rainure droite (le « col »), puis la fraise en T vient élargir le fond de la rainure.',
    etapes: ['Rainure droite Ø12 à la profondeur totale (2 passes)', 'Changer d\'outil : fraise à rainure en T', 'Descendre la fraise en T hors de la pièce, à la profondeur finale', 'Usiner en une seule passe, avance réduite', 'Souffler les copeaux, contrôler'],
    astuces: ['La fraise en T est fragile (petit col) : avance faible et bon arrosage.', 'Les copeaux s\'évacuent mal : souffler souvent.', 'Toujours entrer la fraise en T par le côté de la pièce, jamais en plongée.'],
    erreurs: ['Rainure droite pas assez profonde → la fraise en T frotte et casse.']
  },
  aronde: {
    nom: 'Queue d\'aronde', court: 'Queue d\'aronde', icone: '⏢', machine: 'verticale', piece: 'profil',
    outil: '1) Fraise 2 tailles Ø12  2) Fraise à queue d\'aronde 60° Ø25, 6 dents', D: 25, Z: 6, fz: 0.03, ap: '10 mm', ae: 6, outilDefaut: 'ars',
    but: 'Réaliser une glissière en queue d\'aronde à 60° (guidage des chariots de machines).',
    principe: 'Une rainure droite d\'ébauche est réalisée, puis la fraise conique à queue d\'aronde usine les deux flancs inclinés.',
    etapes: ['Ébauche : rainure droite Ø12, profondeur 10 mm', 'Changer d\'outil : fraise à queue d\'aronde 60°', 'Descendre la fraise hors de la pièce à la profondeur finale', 'Usiner les flancs (passe centrale ou flanc par flanc)', 'Contrôler avec deux piges et un micromètre (cote sur piges)'],
    astuces: ['Le contrôle se fait sur piges : on mesure la cote entre deux rouleaux calibrés.', 'Avance très faible : les dents de la fraise sont fines et pointues.', 'Ébaucher au plus près pour soulager la fraise à queue d\'aronde.'],
    erreurs: ['Angle de la fraise mal choisi → la glissière ne s\'emboîte pas.']
  }
};

/* Cours (contenu HTML statique, rédigé par le formateur) */
export const COURS = [
  { titre: '1. Le fraisage : définition', html: `<p>Le <b>fraisage</b> est un procédé d'usinage par enlèvement de copeaux. L'outil, la <b>fraise</b>, possède plusieurs dents et tourne (<b>mouvement de coupe</b>). La pièce, fixée sur la table, se déplace (<b>mouvement d'avance</b>).</p>
    <div class="encadre">Mouvement de coupe = rotation de la fraise · Mouvement d'avance = déplacement de la pièce (table)</div>
    <p>On obtient des surfaces planes, des épaulements, des rainures, des poches, des profils…</p>` },
  { titre: '2. La fraiseuse', html: `<ul><li><b>Fraiseuse verticale</b> : axe de broche vertical (surfaçage, rainures, poches).</li>
    <li><b>Fraiseuse horizontale</b> : axe de broche horizontal, la fraise est montée sur un <b>arbre porte-fraise</b> soutenu par une <b>lunette</b>.</li>
    <li><b>Fraiseuse universelle</b> : tête orientable et table inclinable.</li>
    <li><b>Centre d'usinage CN</b> : commande numérique, changeur d'outils.</li></ul>
    <p>Organes : bâti (colonne), <b>console</b> (mouvement vertical Z), <b>chariot transversal</b> (Y), <b>table</b> (longitudinal X), broche, tête.</p>` },
  { titre: '3. Les fraises', html: `<table class="voc">
    <tr><td>Fraise à surfacer</td><td>Grand diamètre, plaquettes carbure, coupe en bout.</td></tr>
    <tr><td>Fraise 2 tailles</td><td>Coupe en bout et en roulant : épaulements, rainures, poches, contours.</td></tr>
    <tr><td>Fraise 3 tailles</td><td>Fraise disque, coupe sur la périphérie et les 2 faces : rainures.</td></tr>
    <tr><td>Fraise cylindrique</td><td>Coupe en roulant, surfaçage sur fraiseuse horizontale.</td></tr>
    <tr><td>Fraise de forme</td><td>Queue d'aronde, rainure en T, demi-lune, rayon, module…</td></tr>
    <tr><td>Fraise à chanfreiner</td><td>Conique 90° ou 60°.</td></tr></table>
    <p>Matériaux : <b>ARS</b> (acier rapide, HSS) — économique, tenace ; <b>carbure</b> — Vc 4 à 8 fois plus élevée, plus fragile.</p>` },
  { titre: '4. Fraisage en bout et en roulant', html: `<p><b>En bout</b> : l'axe de la fraise est perpendiculaire à la surface usinée ; ce sont les dents du bout qui génèrent la surface. Bon état de surface.</p>
    <p><b>En roulant</b> : l'axe de la fraise est parallèle à la surface ; les dents de la périphérie génèrent la surface (ondulations dues aux dents).</p>
    <p><b>Combiné</b> : la fraise 2 tailles réalise les deux à la fois (épaulement).</p>` },
  { titre: '5. Opposition ou avalant', html: `<ul><li><b>En opposition</b> (conventionnel) : la dent attaque la matière contre le sens d'avance. Le copeau commence à épaisseur nulle : la dent frotte avant de couper. Conseillé sur machine conventionnelle (jeu dans la vis de table).</li>
    <li><b>En avalant</b> (en concordance) : la dent tourne dans le même sens que l'avance. Le copeau commence épais : meilleur état de surface, moins d'usure. Nécessite une machine <b>sans jeu</b> (vis à billes, CN).</li></ul>
    <div class="encadre">Dans la simulation, le bouton « Sens d'avance » permet de comparer les deux modes.</div>` },
  { titre: '6. Conditions de coupe', html: `<table class="voc">
    <tr><td>Vc</td><td>Vitesse de coupe (m/min) — dépend du matériau usiné et de l'outil.</td></tr>
    <tr><td class="f">n = 1000·Vc / (π·D)</td><td>Fréquence de rotation (tr/min), D en mm.</td></tr>
    <tr><td>fz</td><td>Avance par dent (mm/dent).</td></tr>
    <tr><td class="f">Vf = fz · Z · n</td><td>Vitesse d'avance (mm/min), Z = nombre de dents.</td></tr>
    <tr><td>ap / ae</td><td>Profondeur de passe axiale / engagement radial (mm).</td></tr>
    <tr><td class="f">Q = ap·ae·Vf / 1000</td><td>Débit de copeaux (cm³/min).</td></tr>
    <tr><td class="f">Pc = Q · kc / 60 000</td><td>Puissance de coupe (kW), kc en N/mm².</td></tr>
    <tr><td class="f">tc = L / Vf</td><td>Temps de coupe (min), L = course (longueur + D + dégagements).</td></tr></table>
    <div class="encadre">Exemple : acier, carbure Vc = 180 m/min, Ø80 → n = 1000×180 / (π×80) ≈ 716 tr/min. Z = 5, fz = 0,15 → Vf ≈ 537 mm/min.</div>` },
  { titre: '7. Prise de pièce et réglages', html: `<ul><li>Pièce serrée dans l'<b>étau</b> sur <b>cales parallèles</b>, mors fixe = référence.</li>
    <li>Frapper la pièce au maillet pour qu'elle porte bien sur les cales.</li>
    <li>La pièce doit dépasser des mors de la hauteur à usiner + quelques mm.</li>
    <li><b>Tangente</b> : approcher la fraise en rotation jusqu'à effleurer la pièce (papier à cigarette), puis mettre le vernier à zéro.</li>
    <li>Le mors fixe de l'étau doit être aligné avec la table (contrôle au comparateur).</li></ul>` },
  { titre: '8. Ébauche et finition', html: `<p><b>Ébauche</b> : enlever un maximum de matière rapidement (ap et fz élevés), en laissant une surépaisseur (0,3 à 1 mm).</p>
    <p><b>Finition</b> : obtenir la cote et l'état de surface (ap faible, fz plus faible, Vc un peu plus élevée).</p>` },
  { titre: '9. Sécurité au poste de fraisage', html: `<ul><li>Lunettes de protection obligatoires, pas de gants près de la fraise en rotation, cheveux attachés, manches serrées.</li>
    <li>Ne jamais enlever les copeaux à la main : utiliser un pinceau ou un crochet, machine arrêtée.</li>
    <li>Arrêter la broche pour mesurer.</li>
    <li>Vérifier le serrage de la pièce et de l'outil avant la mise en marche.</li>
    <li>Retirer la clé de l'étau et la clé de serrage avant de démarrer.</li>
    <li>Connaître l'emplacement de l'arrêt d'urgence.</li></ul>` }
];

/* Astuces générales de l'atelier */
export const ASTUCES = [
  { theme: 'Réglage', liste: ['Faire la tangente avec un papier à cigarette humidifié collé sur la pièce : quand il s\'arrache, la fraise est à 0,03 mm.', 'Rattraper toujours le jeu du vernier dans le même sens (tourner au-delà puis revenir).', 'Bloquer les axes qui ne bougent pas pendant la passe (console, chariot) : moins de vibrations.'] },
  { theme: 'Outils', liste: ['Une fraise qui « chante » (vibre) : réduire n, augmenter un peu fz, ou réduire le porte-à-faux.', 'Copeaux bleus en acier avec du carbure = normal ; avec de l\'ARS = Vc trop élevée.', 'Pour l\'aluminium : fraises à 2 ou 3 dents, très affûtées, et lubrification pour éviter le collage.', 'Nettoyer le cône de broche et le cône du porte-outil avant chaque montage.'] },
  { theme: 'Conditions de coupe', liste: ['Commencer par le bas de la plage de Vc conseillée, puis augmenter si tout va bien.', 'Si la fraise s\'use vite : Vc trop élevée. Si elle casse : fz ou ap trop élevés.', 'En rainurage pleine fraise, diminuer l\'avance d\'environ 30 %.'] },
  { theme: 'Qualité', liste: ['Mauvais état de surface : vérifier l\'usure, réduire fz, augmenter Vc, travailler en avalant (CN).', 'Toujours ébavurer après usinage : une bavure fausse les mesures.', 'Mesurer la pièce à température ambiante : l\'acier chaud est plus grand.'] }
];

/* Quiz : q = question, r = réponses, b = indice de la bonne réponse, e = explication */
export const QUIZ = [
  { q: 'Au fraisage, quel est le mouvement de coupe ?', r: ['La rotation de la fraise', 'Le déplacement de la table', 'La montée de la console', 'La rotation de la pièce'], b: 0, e: 'La fraise tourne (coupe) ; la pièce avance avec la table (avance).' },
  { q: 'Formule de la fréquence de rotation n (tr/min) :', r: ['n = 1000·Vc / (π·D)', 'n = π·D·Vc / 1000', 'n = Vc / D', 'n = fz·Z·Vc'], b: 0, e: 'Vc en m/min, D en mm : n = 1000·Vc / (π·D).' },
  { q: 'Formule de la vitesse d\'avance Vf (mm/min) :', r: ['Vf = fz · Z · n', 'Vf = Vc · n', 'Vf = fz / (Z · n)', 'Vf = ap · ae'], b: 0, e: 'Avance par dent × nombre de dents × fréquence de rotation.' },
  { q: 'Vc = 25 m/min, fraise Ø16 en ARS. n ≈ ?', r: ['≈ 500 tr/min', '≈ 50 tr/min', '≈ 1600 tr/min', '≈ 5000 tr/min'], b: 0, e: 'n = 1000 × 25 / (π × 16) ≈ 497 tr/min.' },
  { q: 'n = 500 tr/min, Z = 4 dents, fz = 0,05 mm/dent. Vf = ?', r: ['100 mm/min', '25 mm/min', '2000 mm/min', '10 mm/min'], b: 0, e: 'Vf = 0,05 × 4 × 500 = 100 mm/min.' },
  { q: 'Quelle fraise coupe à la fois en bout et en roulant ?', r: ['La fraise 2 tailles', 'La fraise cylindrique', 'La fraise à chanfreiner', 'La scie-fraise'], b: 0, e: '« 2 tailles » = deux arêtes de coupe : en bout et sur la périphérie.' },
  { q: 'Pour réaliser une rainure en T, on commence par :', r: ['Une rainure droite (le col)', 'La fraise en T directement', 'Un chanfrein', 'Un perçage'], b: 0, e: 'La fraise en T a besoin du passage de son col : on fait d\'abord la rainure droite.' },
  { q: 'En fraisage en opposition, la dent :', r: ['Tourne contre le sens d\'avance, le copeau commence fin', 'Tourne dans le sens de l\'avance, le copeau commence épais', 'Ne coupe pas', 'Coupe uniquement en bout'], b: 0, e: 'En opposition, le copeau part d\'une épaisseur nulle : la dent frotte d\'abord.' },
  { q: 'Le fraisage en avalant est conseillé :', r: ['Sur machine sans jeu (vis à billes, CN)', 'Sur toute vieille fraiseuse', 'Seulement pour la fonte', 'Jamais'], b: 0, e: 'Avec du jeu, la fraise « tire » la table : risque de casse.' },
  { q: 'La largeur d\'une rainure faite à la fraise 3 tailles est égale :', r: ['À l\'épaisseur de la fraise', 'Au diamètre de la fraise', 'Au rayon de la fraise', 'À la profondeur de passe'], b: 0, e: 'La fraise coupe sur ses deux faces : largeur = épaisseur (si pas de voile).' },
  { q: 'Sur une fraiseuse horizontale, la fraise est montée sur :', r: ['Un arbre porte-fraise soutenu par une lunette', 'Un mandrin à pinces', 'Le mors fixe', 'La console'], b: 0, e: 'L\'arbre porte-fraise est maintenu côté broche et par la lunette au bout.' },
  { q: 'Pourquoi place-t-on la pièce sur des cales parallèles dans l\'étau ?', r: ['Pour qu\'elle dépasse des mors et soit bien parallèle à la table', 'Pour la refroidir', 'Pour la peser', 'Pour éviter de la serrer'], b: 0, e: 'Les cales donnent une référence plane et la hauteur nécessaire.' },
  { q: 'Pour usiner une poche fermée, la fraise doit :', r: ['Avoir une coupe au centre (pouvoir plonger)', 'Être une fraise 3 tailles', 'Être plus large que la poche', 'Tourner à l\'envers'], b: 0, e: 'Il faut descendre dans la matière : fraise à coupe au centre, plongée en rampe de préférence.' },
  { q: 'Le rayon des angles intérieurs d\'une poche est au minimum égal :', r: ['Au rayon de la fraise', 'Au diamètre de la fraise', 'À zéro', 'À la profondeur'], b: 0, e: 'La fraise étant ronde, elle ne peut pas faire d\'angle plus petit que son rayon.' },
  { q: 'Quelle Vc choisir avec un outil carbure par rapport à l\'ARS ?', r: ['Beaucoup plus élevée (× 4 à 8)', 'Identique', 'Plus faible', 'Nulle'], b: 0, e: 'Le carbure résiste mieux à la chaleur : Vc beaucoup plus élevée.' },
  { q: 'Le surfaçage en bout donne :', r: ['Une surface perpendiculaire à l\'axe de la fraise', 'Une surface parallèle à l\'axe de la fraise', 'Un cylindre', 'Un filetage'], b: 0, e: 'En bout, la surface générée est perpendiculaire à l\'axe de rotation.' },
  { q: 'Largeur conseillée de la fraise à surfacer pour une pièce de 60 mm :', r: ['≈ 80 à 100 mm', '≈ 60 mm exactement', '≈ 20 mm', '≈ 300 mm'], b: 0, e: 'D ≈ 1,3 à 1,6 × la largeur : coupe stable (ae ≈ 70 % de D).' },
  { q: 'Que signifie « faire la tangente » ?', r: ['Effleurer la pièce avec la fraise pour prendre une origine', 'Usiner un arrondi', 'Mesurer un angle', 'Changer d\'outil'], b: 0, e: 'On effleure la surface puis on met le vernier à zéro.' },
  { q: 'La fraise vibre (« broute »). Que faire en premier ?', r: ['Réduire le porte-à-faux et la vitesse de rotation', 'Augmenter fortement ap', 'Desserrer l\'étau', 'Retirer l\'arrosage'], b: 0, e: 'Un outil court et une n adaptée réduisent les vibrations.' },
  { q: 'En contournage extérieur en CN, pour travailler en avalant on utilise :', r: ['G41 (correction à gauche), sens horaire', 'G42, sens anti-horaire', 'G00', 'Aucune correction'], b: 0, e: 'Outil à gauche du profil (G41) avec rotation M3 = avalant.' },
  { q: 'Débit de copeaux : ap = 5, ae = 16, Vf = 100 mm/min. Q = ?', r: ['8 cm³/min', '80 cm³/min', '0,8 cm³/min', '1600 cm³/min'], b: 0, e: 'Q = 5 × 16 × 100 / 1000 = 8 cm³/min.' },
  { q: 'Pourquoi ne coupe-t-on pas avec la pointe d\'une fraise à chanfreiner ?', r: ['La vitesse de coupe y est nulle', 'Elle est trop large', 'Elle est en plastique', 'Elle est trop rapide'], b: 0, e: 'Au centre, le rayon est nul donc Vc = 0 : la pointe frotte et casse.' },
  { q: 'Le contrôle d\'une queue d\'aronde se fait :', r: ['Avec deux piges calibrées et un micromètre', 'Au mètre ruban', 'À l\'œil', 'Au comparateur seul sur le dessus'], b: 0, e: 'On mesure la cote sur piges, puis on calcule la largeur.' },
  { q: 'Avant de mesurer une pièce sur la fraiseuse, il faut :', r: ['Arrêter la broche', 'Augmenter l\'avance', 'Retirer les lunettes', 'Laisser tourner pour gagner du temps'], b: 0, e: 'Règle de sécurité : jamais de mesure outil en rotation.' },
  { q: 'Enlever les copeaux autour de la fraise se fait :', r: ['Machine arrêtée, avec un pinceau ou un crochet', 'À la main, machine en marche', 'Avec un gant près de la fraise', 'En soufflant avec la bouche'], b: 0, e: 'Les copeaux coupent et sont chauds : pinceau, crochet, machine arrêtée.' }
];
