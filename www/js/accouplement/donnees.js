/* =====================================================================
   accouplement/donnees.js — Textes pédagogiques du banc
   « moteur + accouplement + réducteur »
   ---------------------------------------------------------------------
   Le formateur peut modifier librement ces textes (fiches, pannes,
   procédure d'alignement, quiz) sans toucher au reste du code.
   ===================================================================== */

export const FICHES = {
  moteur: {
    nom: 'Moteur asynchrone triphasé',
    plaque: '1,5 kW · 400 V · 3,4 A · 1450 tr/min · 50 Hz · 4 pôles · cos φ 0,80 · IE3 · IP55',
    role: 'Transforme l\'énergie électrique en énergie mécanique de rotation. Il entraîne le réducteur par l\'intermédiaire de l\'accouplement.',
    fonctionnement: 'Le stator crée un champ tournant à la vitesse de synchronisme ns = 60 × f / p (p = paires de pôles) : 1500 tr/min à 50 Hz pour 4 pôles. Le rotor tourne un peu moins vite : c\'est le glissement (environ 3 %). Plus la charge augmente, plus le glissement, le couple et l\'intensité augmentent. Au-delà du couple maximal (≈ 2,7 × Cn), le moteur décroche.',
    pannes: [
      'Surcharge : intensité supérieure à In, échauffement, déclenchement du relais thermique.',
      'Roulement usé : bruit de grondement, vibrations, échauffement du palier.',
      'Ventilation obstruée (capot encrassé) : échauffement.',
      'Pattes mal appuyées (pied boiteux) : vibrations, déformation de la carcasse.'
    ]
  },
  variateur: {
    nom: 'Variateur de fréquence',
    plaque: 'Alimentation 400 V triphasé · sortie 0 à 60 Hz · rampe 25 Hz/s · limitation 2,2 × In',
    role: 'Commande le moteur : marche / arrêt, sens de rotation et vitesse, en faisant varier la fréquence (et la tension) de l\'alimentation.',
    fonctionnement: 'La vitesse du moteur est proportionnelle à la fréquence : à 25 Hz, le moteur tourne à environ la moitié de sa vitesse nominale. Les rampes d\'accélération et de décélération évitent les à-coups sur l\'accouplement et le réducteur. Le variateur limite aussi le courant de démarrage.',
    pannes: [
      'Défaut surintensité : machine bloquée ou rampe trop courte.',
      'Défaut surtension en décélération : rampe trop courte sur une forte inertie.',
      'Paramètre de protection thermique mal réglé (doit correspondre à In plaque).'
    ]
  },
  accouplement: {
    nom: 'Accouplement élastique à crabots',
    plaque: 'Deux moyeux à crabots en acier, étoile en élastomère (polyuréthane 92 Sh A) · alésages avec clavette et vis de pression',
    role: 'Transmet le couple du moteur au réducteur tout en absorbant les chocs et les vibrations, et en compensant de petits défauts d\'alignement.',
    fonctionnement: 'Chaque moyeu porte 3 crabots. Les crabots des deux moyeux s\'imbriquent dans les branches de l\'étoile élastique : le couple passe par la compression de l\'élastomère, sans contact métal sur métal. L\'accouplement tolère un léger désalignement, mais celui-ci use l\'étoile, chauffe et charge les roulements : il faut donc aligner les arbres au comparateur.',
    pannes: [
      'Étoile usée ou déchiquetée : jeu, claquement au démarrage et à l\'inversion, poussière d\'élastomère sous l\'accouplement.',
      'Désalignement : vibrations, échauffement de l\'accouplement, usure rapide de l\'étoile.',
      'Clavette cisaillée ou vis de pression desserrée : le moteur tourne, la machine non.',
      'Écartement entre moyeux incorrect : l\'étoile est écrasée ou mal tenue.'
    ]
  },
  reducteur: {
    nom: 'Réducteur à engrenages hélicoïdaux',
    plaque: 'Rapports 5 / 10 / 20 / 40 (1, 2 ou 3 étages) · rendement 0,97 par étage · huile ISO VG 220',
    role: 'Diminue la vitesse de rotation et augmente le couple disponible pour la machine entraînée.',
    fonctionnement: 'Un petit pignon entraîne une grande roue : la vitesse est divisée par le rapport i et le couple multiplié par i (aux pertes près). Ns = Nm ÷ i et Cs = Cm × i × η. Exemple : 1450 tr/min ÷ 10 = 145 tr/min. Les engrenages baignent dans l\'huile, qui lubrifie les dentures et évacue la chaleur.',
    pannes: [
      'Manque d\'huile : échauffement, bruit de denture, usure rapide (vérifier le niveau au voyant).',
      'Huile dégradée ou mauvaise viscosité : échauffement, piqûres sur les dents.',
      'Fuite au joint à lèvres de l\'arbre : traces d\'huile, baisse du niveau.',
      'Roulements usés : jeu, bruit, vibrations.'
    ]
  },
  charge: {
    nom: 'Machine entraînée (frein de banc)',
    plaque: 'Frein à disque réglable : couple résistant de 0 à 400 N·m',
    role: 'Simule la machine entraînée (convoyeur, malaxeur, treuil…) en opposant un couple résistant à l\'arbre de sortie du réducteur.',
    fonctionnement: 'Le couple résistant se règle avec le curseur « Charge ». Plus il est élevé, plus le moteur doit fournir de couple et plus son intensité augmente. Si la machine se bloque, le moteur cale et le relais thermique déclenche.',
    pannes: [
      'Machine bloquée (corps étranger, grippage) : moteur calé, surintensité.',
      'Surcharge permanente : déclenchement répété du relais thermique.'
    ]
  },
  socle: {
    nom: 'Socle, pattes et cales de réglage',
    plaque: 'Cales pelables inox 0,05 / 0,10 / 0,20 / 0,50 mm · vis de poussée latérales',
    role: 'Le moteur et le réducteur sont fixés sur un socle commun. Les cales sous les pattes du moteur règlent la hauteur et l\'inclinaison ; les vis de poussée le déplacent latéralement.',
    fonctionnement: 'Le réducteur est la machine fixe : c\'est le moteur que l\'on déplace. Ajouter la même épaisseur sous les 4 pattes monte le moteur parallèlement ; caler plus à l\'arrière qu\'à l\'avant l\'incline. Après chaque réglage, on resserre les vis de fixation dans l\'ordre et on remesure.',
    pannes: [
      'Pied boiteux : une patte ne porte pas ; en serrant, la carcasse se déforme (vibrations, roulements chargés). À contrôler et corriger avant l\'alignement.',
      'Cales trop nombreuses, sales ou pliées : réglage instable. Maximum 3 ou 4 cales par patte.',
      'Vis de fixation desserrées : vibrations, perte de l\'alignement.'
    ]
  },
  carter: {
    nom: 'Carter de protection',
    plaque: 'Protecteur fixe ajouré (norme NF EN ISO 14120)',
    role: 'Empêche tout contact avec les pièces en rotation (accouplement, arbres) : risque d\'entraînement et de happement.',
    fonctionnement: 'C\'est un protecteur fixe : il ne se démonte qu\'avec un outil, machine consignée. Il doit être remis en place avant tout redémarrage.',
    pannes: [
      'Carter absent ou mal fixé : danger grave, la machine ne doit pas être remise en marche.'
    ]
  },
  comparateur: {
    nom: 'Comparateurs d\'alignement',
    plaque: 'Comparateurs au 1/100 mm sur bras fixé au moyeu du réducteur',
    role: 'Mesurer le défaut d\'alignement entre l\'arbre moteur et l\'arbre du réducteur.',
    fonctionnement: 'Le comparateur radial (sur le diamètre du moyeu moteur) mesure le décalage ; le comparateur de face (sur la face du moyeu) mesure le défaut angulaire. On met à zéro à 12 h, puis on tourne les deux arbres ensemble et on lit à 3 h, 6 h et 9 h. La lecture radiale à 6 h vaut 2 fois le décalage vertical. Contrôle : lecture(3 h) + lecture(9 h) = lecture(12 h) + lecture(6 h).',
    pannes: [
      'Bras trop souple (flèche du bras) : lectures faussées.',
      'Arbres tournés séparément : mesure du faux-rond au lieu de l\'alignement.',
      'Jeu axial des arbres : lectures de face erronées.'
    ]
  }
};

/* Procédure d'alignement (onglet Alignement) */
export const PROCEDURE = [
  'Consigner la machine : arrêt, sectionneur ouvert et cadenassé, vérification d\'absence de tension et de rotation.',
  'Déposer le carter de protection, nettoyer les pattes et le socle, contrôler le pied boiteux.',
  'Monter les comparateurs sur le moyeu du réducteur (machine fixe), palpeurs sur le moyeu du moteur. Zéro à 12 h.',
  'Tourner les deux arbres ensemble et relever les lectures à 3 h, 6 h et 9 h. Vérifier : 3 h + 9 h = 12 h + 6 h.',
  'Calculer les corrections, ajouter ou retirer des cales sous les pattes avant et arrière (vertical), puis déplacer le moteur avec les vis de poussée (horizontal).',
  'Resserrer les vis de fixation, remesurer jusqu\'à être dans les tolérances, remonter le carter, déconsigner.'
];

export const PANNES = {
  desalignement: {
    nom: 'Désalignement moteur / réducteur',
    composant: 'accouplement',
    symptomes: ['Vibrations élevées (zone C ou D)', 'Accouplement chaud', 'Usure rapide de l\'étoile (poussière noire ou jaune sous l\'accouplement)', 'Roulements chargés, bruit'],
    causes: ['Moteur remonté sans alignement', 'Cales retirées ou tassées', 'Dilatation du socle', 'Vis de fixation desserrées'],
    solutions: ['Consigner, mesurer au comparateur (onglet Alignement)', 'Caler et déplacer le moteur jusqu\'aux tolérances', 'Remplacer l\'étoile si elle est abîmée']
  },
  elastomere: {
    nom: 'Étoile élastomère usée',
    composant: 'accouplement',
    symptomes: ['Claquement au démarrage et à l\'inversion du sens', 'Jeu angulaire entre les deux moyeux', 'Vibrations', 'Débris d\'élastomère'],
    causes: ['Désalignement prolongé', 'Démarrages trop brutaux (rampe trop courte)', 'Surcharges répétées', 'Vieillissement (chaleur, huile)'],
    solutions: ['Consigner et remplacer l\'étoile', 'Contrôler l\'alignement', 'Vérifier les rampes du variateur']
  },
  roulement: {
    nom: 'Roulement moteur défectueux',
    composant: 'moteur',
    symptomes: ['Grondement, bruit métallique', 'Vibrations élevées même bien aligné', 'Palier chaud', 'Intensité à vide un peu plus forte'],
    causes: ['Manque ou excès de graisse', 'Désalignement ou tension excessive', 'Pollution (eau, poussière)', 'Fin de vie'],
    solutions: ['Remplacer les roulements (ou le moteur)', 'Respecter la périodicité de graissage', 'Contrôler l\'alignement']
  },
  huile: {
    nom: 'Manque d\'huile dans le réducteur',
    composant: 'reducteur',
    symptomes: ['Réducteur très chaud (> 80 °C)', 'Bruit de denture (sifflement)', 'Rendement en baisse, intensité moteur plus forte', 'Niveau bas au voyant, traces d\'huile'],
    causes: ['Fuite au joint à lèvres ou au plan de joint', 'Vidange oubliée', 'Bouchon de vidange desserré'],
    solutions: ['Arrêter, rechercher et réparer la fuite', 'Faire le niveau avec l\'huile préconisée', 'Contrôler les dentures et les roulements']
  },
  piedBoiteux: {
    nom: 'Pied boiteux (patte mal appuyée)',
    composant: 'socle',
    symptomes: ['Vibrations élevées à 2 × la fréquence de rotation', 'Alignement impossible à stabiliser', 'Le comparateur bouge quand on desserre une vis de patte'],
    causes: ['Socle non plan', 'Cale manquante, pliée ou sale', 'Patte déformée'],
    solutions: ['Desserrer une vis à la fois avec un comparateur sur la patte', 'Ajouter la cale manquante sous la patte qui se soulève (> 0,05 mm)', 'Réaligner ensuite']
  },
  clavette: {
    nom: 'Clavette cisaillée côté réducteur',
    composant: 'accouplement',
    symptomes: ['Le moteur et un moyeu tournent, l\'arbre de sortie est à l\'arrêt', 'Intensité proche du courant à vide', 'Bruit de frottement / glissement'],
    causes: ['Blocage brutal de la machine', 'Vis de pression non serrée', 'Clavette de mauvaise qualité ou mal ajustée'],
    solutions: ['Consigner, déposer le moyeu', 'Contrôler la rainure et l\'alésage', 'Remplacer la clavette, serrer la vis de pression', 'Rechercher la cause du blocage']
  },
  bloquee: {
    nom: 'Machine entraînée bloquée',
    composant: 'charge',
    symptomes: ['Le moteur ne démarre pas ou cale', 'Intensité très élevée (limitée par le variateur)', 'Déclenchement du relais thermique'],
    causes: ['Corps étranger dans la machine', 'Grippage d\'un palier', 'Frein serré'],
    solutions: ['Consigner', 'Rechercher et supprimer le blocage', 'Contrôler la clavette et l\'étoile avant de redémarrer', 'Réarmer le relais thermique']
  }
};

export const QUIZ = [
  {
    q: 'Quel est le rôle principal d\'un réducteur ?',
    choix: ['Diminuer la vitesse et augmenter le couple', 'Augmenter la vitesse et le couple', 'Diminuer l\'intensité du moteur sans changer la vitesse', 'Protéger le moteur contre les surcharges'],
    bonne: 0,
    expl: 'Ns = Nm ÷ i et Cs = Cm × i × η : la vitesse est divisée, le couple multiplié (aux pertes près).'
  },
  {
    q: 'Moteur à 1450 tr/min, réducteur i = 10. Vitesse de l\'arbre de sortie ?',
    choix: ['145 tr/min', '14 500 tr/min', '1440 tr/min', '72,5 tr/min'],
    bonne: 0,
    expl: 'Ns = 1450 ÷ 10 = 145 tr/min.'
  },
  {
    q: 'Cm = 10 N·m, i = 20, η = 0,94. Couple disponible en sortie ?',
    choix: ['188 N·m', '200 N·m', '0,47 N·m', '213 N·m'],
    bonne: 0,
    expl: 'Cs = Cm × i × η = 10 × 20 × 0,94 = 188 N·m. Le rendement retire 6 % de pertes (frottements des dentures et des roulements).'
  },
  {
    q: 'À quoi sert l\'étoile en élastomère de l\'accouplement ?',
    choix: ['Amortir les chocs et compenser de faibles défauts d\'alignement', 'Augmenter le couple transmis', 'Remplacer l\'alignement des arbres', 'Lubrifier les crabots'],
    bonne: 0,
    expl: 'L\'étoile absorbe chocs et vibrations et tolère un petit défaut, mais elle ne dispense jamais d\'aligner : un désalignement l\'use très vite.'
  },
  {
    q: 'Avant de déposer le carter et d\'intervenir sur l\'accouplement, il faut d\'abord :',
    choix: ['Consigner : couper, cadenasser, vérifier l\'absence de tension et de rotation', 'Mettre le variateur à 0 Hz', 'Appuyer sur Arrêt', 'Prévenir son collègue et faire vite'],
    bonne: 0,
    expl: 'Un arrêt ou une consigne à 0 Hz ne protège pas : seule la consignation (séparation, condamnation par cadenas, vérification) évite un redémarrage intempestif.'
  },
  {
    q: 'Comparateur radial mis à zéro à 12 h. Lecture à 6 h : −0,30 mm. Le décalage vertical vaut :',
    choix: ['0,15 mm', '0,30 mm', '0,60 mm', '0,03 mm'],
    bonne: 0,
    expl: 'Le comparateur radial lit le double du décalage (TIR) : 0,30 ÷ 2 = 0,15 mm.'
  },
  {
    q: 'Lectures radiales : 12 h = 0 ; 3 h = −0,10 ; 6 h = −0,30 ; 9 h = −0,15. La série est-elle valable ?',
    choix: ['Non : 3 h + 9 h (−0,25) ≠ 12 h + 6 h (−0,30), il faut remesurer', 'Oui, toujours', 'Oui, car la lecture à 12 h est nulle', 'On ne peut pas savoir'],
    bonne: 0,
    expl: 'Règle de validité : lecture(3 h) + lecture(9 h) = lecture(12 h) + lecture(6 h). Un écart signale un bras qui fléchit, un comparateur qui accroche ou des arbres tournés séparément.'
  },
  {
    q: 'Qu\'appelle-t-on « pied boiteux » ?',
    choix: ['Une patte du moteur qui ne repose pas à plat sur le socle', 'Un roulement usé côté ventilateur', 'Un moteur monté sans cales', 'Un défaut de l\'étoile élastomère'],
    bonne: 0,
    expl: 'En serrant une patte qui ne porte pas, on déforme la carcasse : vibrations et alignement instable. Il se corrige avant l\'alignement.'
  },
  {
    q: 'Le moteur tourne normalement, l\'intensité est faible, mais l\'arbre de sortie est arrêté. Cause la plus probable ?',
    choix: ['Clavette cisaillée ou vis de pression desserrée', 'Surcharge', 'Manque d\'huile', 'Désalignement'],
    bonne: 0,
    expl: 'Le couple n\'est plus transmis : le moteur tourne presque à vide. On contrôle la clavette, la vis de pression et l\'état de l\'alésage.'
  },
  {
    q: 'Le variateur passe de 50 Hz à 25 Hz. La vitesse du moteur devient environ :',
    choix: ['La moitié (≈ 725 tr/min)', 'Le double', 'Inchangée, seul le couple diminue', 'Nulle'],
    bonne: 0,
    expl: 'La vitesse de synchronisme est proportionnelle à la fréquence : ns = 60 × f / p = 750 tr/min à 25 Hz (4 pôles).'
  }
];
