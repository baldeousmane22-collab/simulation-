/* =====================================================================
   donnees.js — Textes pédagogiques du banc « pompe centrifuge »
   ---------------------------------------------------------------------
   Le formateur peut modifier librement ces textes (fiches, procédure,
   pannes, quiz) sans toucher au reste du code.
   ===================================================================== */

export const FICHES = {
  bache: {
    nom: 'Bâche (réservoir d\'eau)',
    plaque: 'Réservoir 300 L à l\'air libre · niveau réglable · retour du refoulement au-dessus du niveau',
    role: 'Contient l\'eau pompée en circuit fermé. Son niveau par rapport à l\'axe de la pompe fixe la hauteur d\'aspiration.',
    fonctionnement: 'Niveau sous l\'axe de la pompe : la pompe est « en aspiration », elle doit être amorcée et la pression à son entrée est inférieure à la pression atmosphérique. Niveau au-dessus de l\'axe : la pompe est « en charge », elle se remplit seule et le risque de cavitation est plus faible.',
    pannes: ['Niveau trop bas : la crépine aspire de l\'air (vortex), la pompe se désamorce.', 'Eau chaude : la pression de vapeur augmente, le NPSH disponible baisse : cavitation.', 'Dépôts au fond : colmatage de la crépine.']
  },
  crepine: {
    nom: 'Crépine + clapet de pied',
    plaque: 'Crépine inox à mailles 3 mm · clapet anti-retour à battant · DN 50',
    role: 'La crépine empêche les débris d\'entrer dans la pompe. Le clapet de pied garde la conduite d\'aspiration pleine d\'eau à l\'arrêt : la pompe reste amorcée.',
    fonctionnement: 'En marche, l\'eau soulève le clapet et entre dans la conduite. À l\'arrêt, le poids de la colonne d\'eau referme le clapet : l\'eau ne redescend pas dans la bâche.',
    pannes: ['Crépine colmatée : pertes de charge à l\'aspiration, vacuomètre très bas, cavitation, débit en baisse.', 'Clapet de pied qui fuit ou bloqué ouvert : la conduite se vide à l\'arrêt, la pompe se désamorce et tourne à sec au démarrage suivant.']
  },
  vanneAsp: {
    nom: 'Vanne d\'aspiration',
    plaque: 'Vanne à opercule DN 50 · volant · TOUJOURS grande ouverte en service',
    role: 'Isole la pompe de la bâche pour l\'entretien (démontage de la pompe sans vider la bâche).',
    fonctionnement: 'Elle doit rester grande ouverte quand la pompe tourne : on ne règle JAMAIS le débit à l\'aspiration. La fermer, même en partie, crée une forte dépression à l\'entrée de la roue : cavitation assurée.',
    pannes: ['Vanne partiellement fermée : cavitation, bruit, chute du débit.', 'Presse-étoupe de la tige qui prend l\'air : entrée d\'air, désamorçage.']
  },
  vacuometre: {
    nom: 'Vacuomètre (manovacuomètre d\'aspiration)',
    plaque: 'Échelle −1 à +1,5 bar · monté juste avant l\'entrée de la pompe',
    role: 'Mesure la pression à l\'entrée de la pompe. En aspiration, elle est négative (dépression).',
    fonctionnement: 'Elle vaut environ − (hauteur d\'aspiration + pertes de charge d\'aspiration) : par exemple −0,3 bar pour 2 m d\'aspiration et 1 m de pertes. Une dépression qui augmente sans changer le débit signale une aspiration qui se bouche (crépine, vanne).',
    pannes: ['Lecture très négative : crépine colmatée, vanne d\'aspiration fermée, hauteur d\'aspiration trop grande.', 'Aiguille qui oscille : cavitation ou entrée d\'air.']
  },
  pompe: {
    nom: 'Pompe centrifuge',
    plaque: 'Monocellulaire, roue fermée Ø 160 · 2900 tr/min · Q = 20 m³/h · H = 26 m · NPSH requis 4,8 m · bouchon d\'amorçage sur le corps',
    role: 'Transforme l\'énergie mécanique du moteur en énergie hydraulique : elle donne de la vitesse puis de la pression à l\'eau.',
    fonctionnement: 'L\'eau entre au centre de la roue (l\'ouïe). Les aubes, en tournant, la projettent vers l\'extérieur (force centrifuge) : sa vitesse augmente. La volute (corps en spirale) ralentit ensuite l\'eau et transforme cette vitesse en pression. La hauteur dépend de la vitesse : lois de similitude Q ∝ N, H ∝ N², P ∝ N³. Une pompe centrifuge ne peut pas aspirer de l\'air : elle doit être amorcée (pleine d\'eau).',
    pannes: ['Pompe désamorcée : elle tourne sans débit ni pression, la garniture chauffe à sec.', 'Cavitation : bruit de gravier, vibrations, érosion des aubes (aspect « éponge »).', 'Roue usée ou bagues d\'usure usées : débit et hauteur en baisse, rendement en baisse.', 'Sens de rotation inversé : la pompe débite encore un peu, mais avec une hauteur très faible.']
  },
  garniture: {
    nom: 'Garniture mécanique',
    plaque: 'Garniture simple carbone / carbure de silicium · ressort · joint torique',
    role: 'Assure l\'étanchéité entre l\'arbre qui tourne et le corps de pompe sous pression.',
    fonctionnement: 'Deux bagues très planes frottent l\'une sur l\'autre : une fixe dans le corps, une tournante avec l\'arbre, appuyée par un ressort. Un film d\'eau très mince les lubrifie et les refroidit : la garniture ne doit jamais tourner à sec.',
    pannes: ['Fuite au niveau de l\'arbre (goutte-à-goutte puis filet d\'eau).', 'Destruction en quelques secondes en cas de marche à sec (pompe désamorcée).', 'Usure accélérée par l\'eau chargée (sable) ou les vibrations.']
  },
  moteur: {
    nom: 'Moteur asynchrone',
    plaque: '3 kW · 400 V · 6,1 A · 2900 tr/min · 2 pôles · IP55',
    role: 'Entraîne la pompe à vitesse quasi constante (ou variable par le variateur).',
    fonctionnement: 'La puissance absorbée par une pompe centrifuge augmente avec le débit : elle est minimale vanne de refoulement fermée. On démarre donc vanne presque fermée pour limiter l\'appel de courant, puis on ouvre progressivement.',
    pannes: ['Surintensité à grand débit (vanne trop ouverte, réseau sans pertes de charge).', 'Inversion de deux phases : sens de rotation inversé (vérifier la flèche sur le corps de pompe).', 'Roulement usé : bruit, vibrations, palier chaud.']
  },
  accouplement: {
    nom: 'Accouplement + lanterne',
    plaque: 'Accouplement élastique à crabots · lanterne d\'alignement · carter de protection',
    role: 'Transmet le couple du moteur à l\'arbre de la pompe en absorbant les petits défauts d\'alignement.',
    fonctionnement: 'La lanterne centre le moteur sur le corps de pompe. Après toute intervention, on contrôle l\'alignement et on remonte le carter de protection avant de démarrer.',
    pannes: ['Désalignement : vibrations, usure de l\'élément élastique et des roulements.', 'Élément élastique usé : claquement au démarrage.']
  },
  manometre: {
    nom: 'Manomètre de refoulement',
    plaque: 'Échelle 0 à 4 bar · bain de glycérine · robinet d\'isolement',
    role: 'Mesure la pression à la sortie de la pompe.',
    fonctionnement: 'La hauteur manométrique totale se calcule avec les deux appareils : HMT ≈ (p refoulement − p aspiration) × 10,2 m/bar. Exemple : 2,3 − (−0,3) = 2,6 bar → ≈ 26,5 m.',
    pannes: ['Pression qui chute et oscille : cavitation, entrée d\'air.', 'Pression maximale à débit nul : vanne de refoulement fermée ou conduite bouchée.']
  },
  clapet: {
    nom: 'Clapet anti-retour de refoulement',
    plaque: 'Clapet à battant DN 40',
    role: 'Empêche l\'eau de redescendre dans la pompe à l\'arrêt (la pompe tournerait à l\'envers) et protège contre les coups de bélier.',
    fonctionnement: 'Le débit soulève le battant ; à l\'arrêt, il se referme par son poids dès que l\'eau veut repartir en arrière.',
    pannes: ['Clapet qui fuit : la pompe tourne à l\'envers à l\'arrêt.', 'Clapet qui claque (coup de bélier) à l\'arrêt brutal.']
  },
  vanneRef: {
    nom: 'Vanne de refoulement (réglage)',
    plaque: 'Vanne à soupape DN 40 · volant gradué',
    role: 'Règle le débit de la pompe en ajoutant plus ou moins de pertes de charge au réseau.',
    fonctionnement: 'Fermer la vanne relève la courbe du réseau : le point de fonctionnement remonte sur la courbe de la pompe (moins de débit, plus de hauteur, moins de puissance). C\'est TOUJOURS au refoulement qu\'on règle, jamais à l\'aspiration. Le réglage par variateur de vitesse économise beaucoup plus d\'énergie.',
    pannes: ['Fermée trop longtemps : l\'eau du corps de pompe chauffe (toute la puissance devient chaleur).', 'Trop ouverte : débit au-delà du nominal, surintensité, cavitation.']
  },
  debitmetre: {
    nom: 'Débitmètre (rotamètre)',
    plaque: 'Tube conique transparent · flotteur · 0 à 40 m³/h',
    role: 'Indique le débit de la pompe.',
    fonctionnement: 'Le flotteur monte dans un tube conique jusqu\'à ce que la force de l\'eau équilibre son poids : plus le débit est fort, plus il monte. On lit le débit au niveau du haut du flotteur.',
    pannes: ['Flotteur qui saute : débit instable (cavitation, air).', 'Tube encrassé : lecture fausse.']
  },
  variateur: {
    nom: 'Variateur de fréquence',
    plaque: '400 V · 3 kW · 20 à 50 Hz · rampes 20 Hz/s',
    role: 'Commande la marche, l\'arrêt et la vitesse de la pompe.',
    fonctionnement: 'La vitesse est proportionnelle à la fréquence. Lois de similitude : à 40 Hz (N × 0,8), le débit est × 0,8, la hauteur × 0,64 et la puissance × 0,51 ! Les rampes évitent les coups de bélier au démarrage et à l\'arrêt.',
    pannes: ['Défaut surintensité : pompe bloquée, rampe trop courte.', 'Vitesse trop faible : la pompe n\'atteint plus la hauteur géométrique, le débit tombe à zéro.']
  }
};

export const PROCEDURE = [
  'Vérifier le niveau de la bâche et que la pompe est amorcée (corps plein d\'eau)',
  'Ouvrir en grand la vanne d\'aspiration',
  'Fermer presque complètement la vanne de refoulement (puissance minimale au démarrage)',
  'Démarrer (Marche) et contrôler le sens de rotation, la pression au manomètre',
  'Ouvrir progressivement la vanne de refoulement jusqu\'au débit voulu, sans cavitation'
];

export const PANNES = {
  crepine: {
    nom: 'Crépine colmatée',
    composant: 'crepine',
    symptomes: ['Vacuomètre très négatif', 'Débit en baisse', 'Bruit de gravier (cavitation), vibrations', 'NPSH disponible effondré'],
    causes: ['Débris, feuilles, dépôts au fond de la bâche', 'Nettoyage périodique oublié'],
    solutions: ['Arrêter, consigner, isoler (vanne d\'aspiration fermée)', 'Sortir et nettoyer la crépine', 'Nettoyer la bâche, poser un filtre en amont']
  },
  clapetPied: {
    nom: 'Clapet de pied qui fuit',
    composant: 'crepine',
    symptomes: ['La pompe fonctionne, mais après un arrêt elle redémarre sans débit ni pression', 'Bruit de marche à sec, garniture qui chauffe', 'Il faut réamorcer à chaque démarrage'],
    causes: ['Battant ou joint du clapet usé', 'Débris coincé sous le battant', 'Ressort cassé'],
    solutions: ['Arrêter immédiatement la pompe (marche à sec)', 'Réparer ou remplacer le clapet de pied', 'Réamorcer : remplir le corps et l\'aspiration par le bouchon d\'amorçage']
  },
  roue: {
    nom: 'Roue et bagues d\'usure usées',
    composant: 'pompe',
    symptomes: ['Débit et pression en baisse au même réglage', 'Rendement en baisse (plus de kW pour moins d\'eau)', 'Légères vibrations'],
    causes: ['Eau chargée (sable) : abrasion', 'Cavitation prolongée : érosion des aubes', 'Jeu des bagues d\'usure trop grand : l\'eau recircule du refoulement vers l\'aspiration'],
    solutions: ['Démonter, contrôler la roue et les jeux', 'Remplacer les bagues d\'usure, la roue si elle est érodée', 'Supprimer la cause (filtration, cavitation)']
  },
  sens: {
    nom: 'Sens de rotation inversé',
    composant: 'moteur',
    symptomes: ['Débit et pression très faibles (environ la moitié)', 'La flèche du corps de pompe ne correspond pas au sens du ventilateur', 'Pompe bruyante'],
    causes: ['Deux phases inversées au raccordement du moteur (ou du variateur)', 'Intervention électrique récente'],
    solutions: ['Consigner électriquement', 'Inverser deux phases au bornier du moteur', 'Toujours contrôler le sens par une impulsion après une intervention']
  },
  garniture: {
    nom: 'Garniture mécanique qui fuit',
    composant: 'garniture',
    symptomes: ['Eau qui goutte ou coule sous l\'arbre, entre la pompe et la lanterne', 'Flaque sous la pompe', 'Fuite qui augmente avec la pression'],
    causes: ['Usure normale des bagues de frottement', 'Marche à sec (pompe désamorcée)', 'Eau chargée, vibrations, désalignement'],
    solutions: ['Consigner, isoler (vannes fermées), vidanger le corps', 'Remplacer la garniture complète', 'Ne jamais faire tourner la pompe à sec']
  },
  roulement: {
    nom: 'Roulement de palier usé',
    composant: 'moteur',
    symptomes: ['Grondement, sifflement', 'Vibrations élevées (> 7 mm/s)', 'Palier chaud (> 80 °C)', 'Intensité légèrement en hausse'],
    causes: ['Manque ou excès de graisse', 'Désalignement de l\'accouplement', 'Vibrations dues à la cavitation', 'Fin de vie'],
    solutions: ['Contrôler vibrations et température (thermomètre infrarouge)', 'Consigner et remplacer les roulements', 'Contrôler l\'alignement']
  },
  entreeAir: {
    nom: 'Prise d\'air à l\'aspiration',
    composant: 'vanneAsp',
    symptomes: ['Débit et pression qui oscillent', 'Bulles d\'air visibles, eau laiteuse au retour', 'Bruit irrégulier', 'Risque de désamorçage'],
    causes: ['Joint de bride d\'aspiration abîmé', 'Presse-étoupe de la vanne d\'aspiration desserré', 'Niveau de la bâche trop bas (vortex à la crépine)'],
    solutions: ['Chercher la prise d\'air (bruit d\'aspiration, mousse à raser sur les brides)', 'Remplacer le joint, resserrer le presse-étoupe', 'Remonter le niveau de la bâche']
  }
};

export const QUIZ = [
  {
    q: 'Comment une pompe centrifuge donne-t-elle de la pression à l\'eau ?',
    choix: ['La roue accélère l\'eau, la volute transforme cette vitesse en pression', 'Un piston comprime l\'eau', 'Deux engrenages enferment l\'eau', 'Le moteur chauffe l\'eau qui se dilate'],
    bonne: 0,
    expl: 'La roue projette l\'eau vers l\'extérieur (force centrifuge) : elle gagne de la vitesse. La volute, de section croissante, la ralentit et transforme la vitesse en pression.'
  },
  {
    q: 'Pourquoi faut-il amorcer une pompe centrifuge en aspiration ?',
    choix: ['Elle ne peut pas aspirer de l\'air : elle doit être pleine d\'eau', 'Pour lubrifier le moteur', 'Pour régler le débit', 'Pour refroidir la vanne de refoulement'],
    bonne: 0,
    expl: 'L\'air est 800 fois plus léger que l\'eau : la roue ne crée presque aucune dépression avec de l\'air. Pleine d\'air, la pompe tourne sans débit (et la garniture brûle à sec).'
  },
  {
    q: 'Avec quelle vanne règle-t-on le débit d\'une pompe centrifuge ?',
    choix: ['La vanne de refoulement', 'La vanne d\'aspiration', 'Le clapet de pied', 'N\'importe laquelle'],
    bonne: 0,
    expl: 'On règle toujours au refoulement. Fermer l\'aspiration crée une dépression à l\'entrée de la roue : cavitation et destruction de la pompe.'
  },
  {
    q: 'Dans quelle position met-on la vanne de refoulement pour démarrer ?',
    choix: ['Presque fermée', 'Grande ouverte', 'Peu importe', 'Fermée pendant toute la marche'],
    bonne: 0,
    expl: 'La puissance absorbée d\'une pompe centrifuge est minimale à débit nul : on démarre vanne presque fermée, puis on ouvre progressivement. Mais on ne la laisse pas fermée longtemps (échauffement).'
  },
  {
    q: 'Qu\'est-ce que le point de fonctionnement d\'une pompe ?',
    choix: ['L\'intersection de la courbe de la pompe et de la courbe du réseau', 'Le débit maximal écrit sur la plaque', 'La vitesse du moteur', 'La pression de la bâche'],
    bonne: 0,
    expl: 'La pompe fournit H(Q) ; le réseau demande Hgéo + pertes de charge (∝ Q²). Le débit s\'établit là où les deux courbes se croisent.'
  },
  {
    q: 'On passe de 2900 à 1450 tr/min (vitesse ÷ 2). Que devient la hauteur à débit nul ?',
    choix: ['Divisée par 4', 'Divisée par 2', 'Inchangée', 'Divisée par 8'],
    bonne: 0,
    expl: 'Lois de similitude : Q ∝ N, H ∝ N², P ∝ N³. Hauteur ÷ 4, puissance ÷ 8 : le variateur économise beaucoup d\'énergie.'
  },
  {
    q: 'Que se passe-t-il quand le NPSH disponible devient inférieur au NPSH requis ?',
    choix: ['La pompe cavite', 'Le débit augmente', 'Le moteur s\'arrête', 'La pompe se désamorce toujours'],
    bonne: 0,
    expl: 'La pression à l\'entrée de la roue descend sous la pression de vapeur : l\'eau bout, les bulles implosent plus loin : bruit de gravier, vibrations, érosion, chute de hauteur.'
  },
  {
    q: 'Quel changement AUGMENTE le risque de cavitation ?',
    choix: ['Une eau plus chaude', 'Une bâche plus haute (pompe en charge)', 'Moins de débit', 'Une crépine propre'],
    bonne: 0,
    expl: 'L\'eau chaude a une pression de vapeur plus grande : le NPSH disponible baisse. Les autres réponses diminuent le risque.'
  },
  {
    q: 'Vacuomètre −0,3 bar, manomètre +2,3 bar. Hauteur manométrique totale approximative ?',
    choix: ['≈ 26,5 m', '≈ 20 m', '≈ 2,6 m', '≈ 23 m'],
    bonne: 0,
    expl: 'HMT ≈ (2,3 − (−0,3)) × 10,2 = 2,6 × 10,2 ≈ 26,5 m de colonne d\'eau.'
  },
  {
    q: 'À quoi sert le clapet de pied ?',
    choix: ['À garder l\'aspiration pleine d\'eau à l\'arrêt (pompe amorcée)', 'À régler le débit', 'À protéger le moteur', 'À limiter la pression'],
    bonne: 0,
    expl: 'Sans clapet de pied étanche, la colonne d\'eau redescend dans la bâche à l\'arrêt : la pompe se désamorce.'
  },
  {
    q: 'La pompe tourne, le manomètre reste presque à zéro et il n\'y a pas de débit. Première cause à vérifier ?',
    choix: ['Pompe désamorcée', 'Vanne de refoulement trop ouverte', 'Moteur trop puissant', 'Eau trop froide'],
    bonne: 0,
    expl: 'Sans eau dans le corps, la roue ne peut créer ni débit ni pression. Arrêter tout de suite (garniture à sec), réamorcer et chercher la cause (clapet de pied, prise d\'air).'
  },
  {
    q: 'Débit et hauteur sont environ divisés par deux après une intervention sur le moteur. Cause probable ?',
    choix: ['Sens de rotation inversé', 'Crépine colmatée', 'Garniture qui fuit', 'Vanne d\'aspiration grande ouverte'],
    bonne: 0,
    expl: 'Deux phases inversées font tourner la roue à l\'envers : elle débite encore un peu, mais avec une hauteur très réduite. Contrôler la flèche de sens de rotation.'
  },
  {
    q: 'Pourquoi ne faut-il pas laisser tourner longtemps une pompe vanne de refoulement fermée ?',
    choix: ['Toute la puissance absorbée chauffe l\'eau du corps de pompe', 'Le moteur s\'emballe', 'La pression devient infinie', 'La bâche déborde'],
    bonne: 0,
    expl: 'À débit nul, il n\'y a plus d\'eau fraîche pour évacuer la chaleur : l\'eau chauffe, peut se vaporiser, et la garniture et la roue souffrent.'
  },
  {
    q: 'Où se situe le meilleur rendement d\'une pompe centrifuge ?',
    choix: ['Vers son débit nominal (milieu de la courbe)', 'À débit nul', 'Au débit maximal', 'Il est constant'],
    bonne: 0,
    expl: 'Le rendement est nul à débit nul, maximal vers le débit nominal (ici ≈ 59 % vers 19 m³/h) et redescend à grand débit. On choisit la pompe pour travailler près de ce point.'
  }
];
