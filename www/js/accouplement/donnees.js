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
    // Fiche remplacée par celle du type choisi (TYPES_ACCOUPLEMENT) dans l'interface
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
  element: {
    // Nom, symptômes, causes et solutions précisés selon le type (TYPES_ACCOUPLEMENT[type].panneElement)
    nom: 'Élément de liaison usé',
    composant: 'accouplement',
    symptomes: ['Claquement au démarrage et à l\'inversion du sens', 'Jeu entre les deux moyeux', 'Vibrations'],
    causes: ['Désalignement prolongé', 'Démarrages brutaux', 'Surcharges répétées', 'Vieillissement'],
    solutions: ['Consigner et remplacer la pièce d\'usure', 'Contrôler l\'alignement']
  },
  graisse: {
    nom: 'Manque de graisse dans l\'accouplement',
    composant: 'accouplement',
    lubrifie: true,   // n'existe que pour les accouplements graissés
    symptomes: ['Accouplement très chaud (contrôle au thermomètre infrarouge, jamais à la main)', 'Bruit de frottement, grincement', 'Usure rapide, poussière de rouille rouge (« fretting »)', 'Vibrations en hausse'],
    causes: ['Graissage périodique oublié', 'Joints du manchon ou du capot abîmés : la graisse s\'échappe', 'Graisse inadaptée (pas de graisse spéciale accouplement)'],
    solutions: ['Consigner, nettoyer, contrôler l\'usure', 'Regarnir avec la graisse préconisée (quantité constructeur)', 'Remplacer les joints', 'Respecter la périodicité (souvent tous les 6 mois)']
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

/* =====================================================================
   TYPES D'ACCOUPLEMENT : fiche, comparatif et panne de la pièce d'usure
   (le comportement mécanique est dans simulation.js → TYPES)
   ===================================================================== */
export const TYPES_ACCOUPLEMENT = {
  crabots: {
    nom: 'Accouplement élastique à crabots', court: 'À crabots (étoile)',
    plaque: 'Deux moyeux à 3 crabots + étoile en polyuréthane (92 Sh A jaune, 98 Sh A rouge)',
    role: 'Transmet le couple en amortissant chocs et vibrations ; tolère un petit désalignement.',
    fonctionnement: 'Les crabots des deux moyeux s\'imbriquent dans les branches de l\'étoile : le couple passe par la compression de l\'élastomère, sans contact métal sur métal. C\'est l\'accouplement « à tout faire » des petits et moyens moteurs.',
    avantages: ['Simple, compact, bon marché', 'Amortit les chocs', 'Pas de lubrification', 'Isole électriquement les deux arbres'],
    limites: ['Étoile sensible à la chaleur, aux huiles et au désalignement', 'Remplacement de l\'étoile : il faut écarter le moteur'],
    entretien: 'Contrôler l\'état de l\'étoile (fissures, poussière), le jeu entre crabots et l\'écartement entre moyeux.',
    emploi: 'Pompes, ventilateurs, réducteurs, convoyeurs (jusqu\'à quelques centaines de kW).',
    comparatif: { amorti: '★★☆', desal: '★★☆', graissage: 'Non', jeu: 'Non (si étoile bonne)' },
    panneElement: {
      nom: 'Étoile élastomère usée',
      symptomes: ['Claquement au démarrage et à l\'inversion du sens', 'Jeu angulaire entre les deux moyeux', 'Poussière d\'élastomère sous l\'accouplement', 'Vibrations'],
      causes: ['Désalignement prolongé', 'Démarrages brutaux (rampe trop courte)', 'Surcharges répétées', 'Chaleur, huile'],
      solutions: ['Consigner, écarter le moteur et remplacer l\'étoile', 'Contrôler l\'alignement', 'Vérifier les rampes du variateur']
    }
  },
  rigide: {
    nom: 'Accouplement rigide à plateaux', court: 'Rigide à plateaux',
    plaque: 'Deux plateaux en acier boulonnés (6 boulons ajustés) · aucune souplesse',
    role: 'Lie les deux arbres comme s\'ils n\'en faisaient qu\'un : transmission intégrale du couple, sans jeu.',
    fonctionnement: 'Les plateaux sont centrés l\'un dans l\'autre et serrés par des boulons : le couple passe par le frottement des faces et le cisaillement des boulons. Il ne compense AUCUN défaut : le moindre désalignement fait fléchir les arbres et charge énormément les roulements.',
    avantages: ['Très simple et robuste', 'Aucun jeu, aucune pièce d\'usure', 'Transmet de très gros couples'],
    limites: ['Alignement quasi parfait obligatoire (≤ 0,02 mm)', 'Transmet chocs et vibrations', 'Roulements et arbres fatiguent vite au moindre défaut'],
    entretien: 'Contrôler le serrage des boulons (couple de serrage), l\'alignement et l\'état des roulements.',
    emploi: 'Arbres longs en ligne soutenus par leurs propres paliers, lignes d\'arbres de machines lentes.',
    comparatif: { amorti: 'Aucun', desal: 'Aucun', graissage: 'Non', jeu: 'Non' },
    panneElement: {
      nom: 'Boulons d\'accouplement desserrés / roulements fatigués',
      symptomes: ['Vibrations fortes', 'Choc à chaque inversion', 'Palier moteur chaud', 'Traces de frottement (rouille rouge) entre les plateaux'],
      causes: ['Désalignement : les arbres fléchissent à chaque tour', 'Couple de serrage non respecté', 'Chocs de charge'],
      solutions: ['Consigner, contrôler les boulons et l\'alésage des trous', 'Remplacer les boulons, serrer au couple', 'Contrôler les roulements', 'Réaligner au centième']
    }
  },
  pneu: {
    nom: 'Accouplement à pneu (bandage élastique)', court: 'À pneu',
    plaque: 'Deux moyeux à flasques + pneu en caoutchouc renforcé (fendu) serré par des brides',
    role: 'Transmet le couple avec une très grande souplesse : amortit fortement chocs et vibrations, encaisse de gros désalignements.',
    fonctionnement: 'Le pneu (souvent fendu radialement) est pincé entre deux flasques. Il se déforme en torsion pour transmettre le couple et absorbe les défauts. Comme il est fendu, on le change sans déplacer le moteur.',
    avantages: ['Le meilleur amortissement', 'Tolère de gros défauts (jusqu\'à ~1 mm, 1 à 4°)', 'Remplacement du pneu sans déplacer les machines', 'Pas de lubrification'],
    limites: ['Encombrant', 'Le caoutchouc vieillit (ozone, chaleur, huile)', 'Exerce un effort axial quand il tourne vite', 'Même s\'il tolère, on aligne quand même selon la table : sinon roulements et pneu souffrent'],
    entretien: 'Contrôler les craquelures du pneu et le serrage des vis de brides.',
    emploi: 'Machines à chocs : concasseurs, compresseurs à pistons, broyeurs, pompes.',
    comparatif: { amorti: '★★★', desal: '★★★', graissage: 'Non', jeu: 'Non' },
    panneElement: {
      nom: 'Pneu fissuré / déchiré',
      symptomes: ['Craquelures, morceaux de caoutchouc', 'Battement visible du pneu en rotation', 'Vibrations', 'Claquement si le pneu est déchiré'],
      causes: ['Vieillissement (ozone, chaleur)', 'Contact avec de l\'huile', 'Surcharge ou chocs répétés'],
      solutions: ['Consigner, desserrer les brides et remplacer le pneu (sans déplacer le moteur)', 'Serrer les vis de brides au couple', 'Protéger des projections d\'huile']
    }
  },
  broches: {
    nom: 'Accouplement à broches et douilles élastiques', court: 'À broches',
    plaque: 'Plateau à broches acier côté moteur + plateau à douilles caoutchouc côté réducteur',
    role: 'Transmet le couple par des broches entourées de douilles élastiques ; amortit et tolère un défaut moyen.',
    fonctionnement: 'Les broches fixées sur un plateau entrent dans des douilles en caoutchouc logées dans l\'autre plateau. Le couple passe par l\'écrasement des douilles.',
    avantages: ['Robuste, gros couples', 'Douilles faciles à remplacer', 'Pas de lubrification', 'Amortissement correct'],
    limites: ['Usure des douilles → jeu et claquements', 'Encombrement radial'],
    entretien: 'Contrôler le jeu angulaire (douilles écrasées), le serrage des écrous de broches.',
    emploi: 'Pompes et compresseurs de moyenne puissance, machines de levage.',
    comparatif: { amorti: '★★☆', desal: '★★☆', graissage: 'Non', jeu: 'Oui si douilles usées' },
    panneElement: {
      nom: 'Douilles élastiques usées',
      symptomes: ['Claquement à l\'inversion et au démarrage', 'Jeu angulaire important', 'Poussière de caoutchouc noire', 'Vibrations'],
      causes: ['Désalignement', 'Surcharges, démarrages brutaux', 'Vieillissement du caoutchouc'],
      solutions: ['Consigner, remplacer TOUTES les douilles', 'Contrôler les broches (usure, serrage)', 'Contrôler l\'alignement']
    }
  },
  lames: {
    nom: 'Accouplement à lames (disques flexibles)', court: 'À lames',
    plaque: 'Moyeux + paquets de lames inox + entretoise · boulons alternés',
    role: 'Transmet le couple sans jeu ni lubrification, tout en acceptant un défaut angulaire par la flexion des lames.',
    fonctionnement: 'Des paquets de fines lames d\'acier sont boulonnés alternativement à un moyeu et à l\'entretoise. Les lames fléchissent pour compenser l\'angle ; avec deux paquets et une entretoise, on compense aussi le décalage. Aucun frottement : pas d\'usure tant que les lames ne sont pas surchargées.',
    avantages: ['Aucun jeu, transmission précise', 'Aucune lubrification, aucune usure', 'Hautes vitesses, hautes températures'],
    limites: ['Aucun amortissement des chocs', 'Lames qui cassent par fatigue si le désalignement est trop grand', 'Compense mal le décalage sans entretoise'],
    entretien: 'Contrôler visuellement les lames (fissures, ondulations) et le serrage des boulons. Respecter la longueur d\'entretoise.',
    emploi: 'Pompes process (API 610), turbines, compresseurs, servomoteurs.',
    comparatif: { amorti: 'Aucun', desal: '★★☆ angulaire', graissage: 'Non', jeu: 'Non' },
    panneElement: {
      nom: 'Lames fissurées ou rompues',
      symptomes: ['Lames ondulées ou cassées visibles', 'Claquement, à-coups', 'Vibrations', 'Boulons desserrés'],
      causes: ['Désalignement au-delà de la capacité des lames (fatigue)', 'Écartement entre moyeux incorrect (lames tendues ou flambées)', 'Surcharge'],
      solutions: ['Consigner, remplacer les paquets de lames complets', 'Respecter la cote d\'écartement', 'Réaligner']
    }
  },
  denture: {
    nom: 'Accouplement à denture (double denture bombée)', court: 'À denture',
    plaque: 'Deux moyeux à denture extérieure bombée + manchon à denture intérieure · graissé',
    role: 'Transmet de très gros couples sous un faible encombrement ; compense angle, décalage et dilatation axiale.',
    fonctionnement: 'Les dents bombées des moyeux engrènent dans le manchon : elles peuvent basculer légèrement, ce qui compense l\'angle (et le décalage, avec deux dentures). Les dents glissent à chaque tour : la graisse est indispensable.',
    avantages: ['Très gros couples, compact', 'Compense les défauts et la dilatation axiale', 'Grande vitesse possible'],
    limites: ['Graissage périodique obligatoire', 'Petit jeu entre dents (claquement à l\'inversion)', 'Aucun amortissement', 'Usure rapide si désaligné ou sans graisse'],
    entretien: 'Regraisser selon le constructeur (vidange de la graisse usée), contrôler l\'étanchéité des joints du manchon.',
    emploi: 'Laminoirs, gros réducteurs, pompes et ventilateurs de forte puissance, levage.',
    comparatif: { amorti: 'Aucun', desal: '★★☆', graissage: 'Oui', jeu: 'Petit jeu' },
    panneElement: {
      nom: 'Dentures usées',
      symptomes: ['Jeu important, claquement à l\'inversion', 'Dents pointues ou marquées', 'Poussière rouge mêlée à la graisse', 'Vibrations'],
      causes: ['Manque de graisse', 'Désalignement trop important', 'Surcharges'],
      solutions: ['Consigner, remplacer moyeux et manchon (par paire)', 'Graisser correctement', 'Réaligner']
    }
  },
  chaine: {
    nom: 'Accouplement à chaîne double', court: 'À chaîne',
    plaque: 'Deux pignons identiques + chaîne à rouleaux duplex + capot étanche · graissé',
    role: 'Transmet le couple avec un montage et un démontage très rapides (on retire la chaîne).',
    fonctionnement: 'Les deux pignons, côte à côte, sont enveloppés par une même chaîne double. Le jeu entre chaîne et dents permet un petit désalignement. Pour désaccoupler, il suffit d\'ouvrir le maillon d\'attache.',
    avantages: ['Simple, bon marché, démontage rapide', 'Gros couples', 'Tolère un petit défaut'],
    limites: ['Jeu : claquement à chaque inversion', 'Graissage obligatoire (capot)', 'Pas d\'amortissement, vitesse limitée'],
    entretien: 'Graisser la chaîne, contrôler l\'allongement, l\'état des dents et du capot.',
    emploi: 'Convoyeurs, agitateurs, machines lentes et peu précises.',
    comparatif: { amorti: 'Aucun', desal: '★★☆', graissage: 'Oui', jeu: 'Oui' },
    panneElement: {
      nom: 'Chaîne allongée / pignons usés',
      symptomes: ['Claquement important à l\'inversion et au démarrage', 'Chaîne qui « flotte » sur les pignons', 'Dents en crochet', 'Vibrations'],
      causes: ['Manque de graisse', 'Désalignement', 'À-coups de charge'],
      solutions: ['Consigner, remplacer la chaîne (et les pignons s\'ils sont crochus)', 'Graisser et refermer le capot', 'Réaligner']
    }
  },
  grille: {
    nom: 'Accouplement à grille (ressort serpentin)', court: 'À grille',
    plaque: 'Deux moyeux à rainures + grille en acier à ressort en serpentin + couvercle étanche · graissé',
    role: 'Transmet de gros couples avec une certaine élasticité : amortit les chocs et tolère un défaut moyen.',
    fonctionnement: 'Une grille en acier à ressort, pliée en serpentin, passe dans les rainures des deux moyeux. Les rainures sont évasées : plus le couple augmente, plus la grille s\'appuie loin et se raidit. Le couvercle garde la graisse.',
    avantages: ['Gros couples, bon amortissement des chocs', 'Grille remplaçable sans déplacer les machines', 'Tolère un défaut moyen'],
    limites: ['Graissage obligatoire', 'Joints du couvercle à surveiller', 'Grille qui casse si manque de graisse'],
    entretien: 'Regraisser périodiquement, contrôler l\'étanchéité, l\'usure de la grille et des rainures.',
    emploi: 'Concasseurs, convoyeurs à bande, broyeurs, pompes de forte puissance.',
    comparatif: { amorti: '★★☆', desal: '★★☆', graissage: 'Oui', jeu: 'Non' },
    panneElement: {
      nom: 'Grille usée ou cassée',
      symptomes: ['Claquement, à-coups', 'Morceaux de grille dans le couvercle', 'Graisse noire et chaude', 'Vibrations'],
      causes: ['Manque de graisse', 'Chocs de surcharge', 'Désalignement'],
      solutions: ['Consigner, ouvrir le couvercle, remplacer la grille', 'Contrôler les rainures des moyeux', 'Regraisser, changer les joints']
    }
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
  },
  {
    q: 'Quel accouplement exige l\'alignement le plus précis ?',
    choix: ['L\'accouplement rigide à plateaux', 'L\'accouplement à pneu', 'L\'accouplement à grille', 'L\'accouplement à crabots'],
    bonne: 0,
    expl: 'Un accouplement rigide ne compense rien : le moindre défaut fait fléchir les arbres et détruit les roulements. On vise quelques centièmes de mm.'
  },
  {
    q: 'Quels accouplements doivent être graissés périodiquement ?',
    choix: ['À denture, à chaîne et à grille', 'À crabots et à pneu', 'À lames et rigide', 'Tous les accouplements'],
    bonne: 0,
    expl: 'Leurs pièces glissent les unes sur les autres à chaque tour : sans graisse, elles chauffent et s\'usent très vite. Crabots, pneu, broches, lames et rigide n\'ont pas de graissage.'
  },
  {
    q: 'Pour une machine à chocs (concasseur), quel accouplement amortit le mieux ?',
    choix: ['À pneu', 'Rigide', 'À lames', 'À denture'],
    bonne: 0,
    expl: 'Le pneu en caoutchouc absorbe fortement les chocs et tolère de gros défauts. Rigide, lames et denture transmettent les chocs sans les amortir.'
  },
  {
    q: 'Principal avantage d\'un accouplement à lames ?',
    choix: ['Aucun jeu et aucune lubrification', 'Il amortit très bien les chocs', 'Il accepte de très gros décalages', 'Il est le moins cher'],
    bonne: 0,
    expl: 'Les lames fléchissent sans frotter : pas de jeu, pas de graisse, pas d\'usure… tant que le désalignement reste dans leur capacité, sinon elles cassent par fatigue.'
  },
  {
    q: 'Accouplement à chaîne : il claque à chaque inversion de sens, même neuf. Pourquoi ?',
    choix: ['À cause du jeu normal entre la chaîne et les dents', 'Le moteur est surchargé', 'Le réducteur manque d\'huile', 'Le variateur est mal réglé'],
    bonne: 0,
    expl: 'La chaîne a besoin d\'un jeu pour s\'enrouler et compenser les défauts : à l\'inversion du couple, ce jeu se rattrape d\'un coup. Il augmente fortement quand la chaîne s\'allonge.'
  },
  {
    q: 'Un accouplement souple (pneu, crabots) tolère le désalignement. Faut-il quand même aligner ?',
    choix: ['Oui : sinon vibrations, échauffement et usure des roulements et de l\'accouplement', 'Non, c\'est son rôle', 'Seulement au-dessus de 3000 tr/min', 'Seulement si le moteur dépasse 50 kW'],
    bonne: 0,
    expl: 'La capacité de l\'accouplement n\'est pas une tolérance d\'alignement : on aligne toujours selon la table de vitesse (ici 0,10 mm et 0,08 mm/100 mm).'
  }
];
