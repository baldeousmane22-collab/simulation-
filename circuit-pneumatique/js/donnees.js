/* =====================================================================
   donnees.js — Textes pédagogiques du banc pneumatique
   ---------------------------------------------------------------------
   Le formateur peut modifier librement ces textes (fiches, pannes,
   quiz) sans toucher au reste du code.
   ===================================================================== */

export const FICHES = {
  compresseur: {
    nom: 'Compresseur à piston + cuve',
    plaque: '1,1 kW · 230 V · 200 NL/min aspirés · cuve 24 L · pressostat 6 → 8 bar · soupape de sûreté 10 bar',
    role: 'Produit l\'air comprimé et le stocke dans la cuve. La cuve sert de réserve : elle fournit les pointes de consommation et laisse le moteur se reposer entre deux remplissages.',
    fonctionnement: 'Le moteur entraîne un piston qui aspire l\'air ambiant par un filtre puis le refoule dans la cuve par un clapet anti-retour. Le pressostat arrête le moteur quand la cuve atteint 8 bar et le remet en marche à 6 bar. La soupape de sûreté s\'ouvre si la pression dépasse 10 bar (pressostat défaillant). En se comprimant, l\'air chauffe puis se refroidit dans la cuve : l\'humidité se condense en eau, qu\'il faut purger.',
    pannes: [
      'Pressostat bloqué : le moteur ne s\'arrête plus, la soupape de sûreté siffle à 10 bar.',
      'Fuites dans le réseau : le compresseur redémarre sans arrêt, même machines arrêtées.',
      'Filtre d\'aspiration colmaté ou clapets usés : remplissage très lent, compresseur qui chauffe.',
      'Eau dans la cuve (purge oubliée) : corrosion de la cuve, eau envoyée dans le réseau.'
    ]
  },
  vanne: {
    nom: 'Vanne d\'arrivée 3/2 (sectionneur)',
    plaque: 'Vanne à commande manuelle, cadenassable · position fermée : arrivée coupée ET aval mis à l\'échappement',
    role: 'Isole le poste du réseau d\'air. C\'est l\'organe de consignation pneumatique : on la ferme et on la cadenasse avant toute intervention.',
    fonctionnement: 'Ouverte : l\'air passe de 1 vers 2. Fermée : 1 est bloqué et 2 est relié à l\'échappement 3, donc le circuit aval se vide. Une simple vanne 2/2 couperait l\'air mais laisserait le circuit sous pression : danger ! Après fermeture, on vérifie au manomètre que la pression est bien à 0. Attention aux charges suspendues : sans air, un vérin vertical peut descendre.',
    pannes: [
      'Vanne 2/2 montée à la place d\'une 3/2 : l\'air reste emprisonné dans le circuit après fermeture.',
      'Échappement bouché : le circuit ne se vide pas.',
      'Fuite au corps ou au joint de l\'axe : sifflement permanent.'
    ]
  },
  filtre: {
    nom: 'Filtre à purge manuelle',
    plaque: 'Élément filtrant 40 µm · cuve transparente avec protection · purge manuelle',
    role: 'Retient l\'eau condensée, les poussières et les particules de rouille venant du réseau avant qu\'elles n\'abîment les distributeurs et les joints.',
    fonctionnement: 'L\'air entre en tourbillonnant (déflecteur) : la force centrifuge plaque l\'eau et les grosses particules contre la cuve, elles tombent au fond. L\'air traverse ensuite l\'élément filtrant. L\'eau s\'accumule au fond de la cuve : on la vide avec la purge (ou une purge automatique).',
    pannes: [
      'Purge oubliée : la cuve se remplit d\'eau, l\'eau est entraînée vers les distributeurs (tiroirs qui collent, rouille).',
      'Élément filtrant colmaté : forte chute de pression quand l\'air circule, les vérins perdent de la force et de la vitesse.',
      'Cuve fendue (solvants, chocs) : fuite, risque d\'éclatement.'
    ]
  },
  regulateur: {
    nom: 'Régulateur de pression + manomètre',
    plaque: 'Plage de réglage 0,5 à 8 bar · à décharge (relieving) · manomètre 0 à 10 bar',
    role: 'Fournit une pression stable et réglable au circuit, plus basse que celle de la cuve, quelle que soit la consommation et les variations du réseau.',
    fonctionnement: 'Un ressort, comprimé par la molette, pousse une membrane qui ouvre le clapet d\'alimentation. La pression aval agit sous la membrane et referme le clapet : l\'équilibre donne la pression réglée. Si la pression aval dépasse la consigne (molette desserrée), la membrane s\'ouvre vers l\'échappement (fonction « à décharge »). On règle toujours en montant : desserrer en dessous de la valeur voulue, puis serrer jusqu\'à elle.',
    pannes: [
      'Membrane percée : sifflement permanent à l\'échappement du régulateur.',
      'Pression aval qui chute en mouvement : régulateur sous-dimensionné ou filtre en amont colmaté.',
      'Pression aval qui monte lentement à l\'arrêt : clapet d\'alimentation qui fuit.'
    ]
  },
  lubrificateur: {
    nom: 'Lubrificateur',
    plaque: 'Lubrificateur à brouillard · huile ISO VG 32 · réglage du goutte-à-goutte',
    role: 'Ajoute un fin brouillard d\'huile dans l\'air pour lubrifier les distributeurs et les vérins qui en ont besoin.',
    fonctionnement: 'Le débit d\'air crée une dépression qui aspire l\'huile de la cuve ; une vis règle le nombre de gouttes par minute. Le matériel moderne est souvent graissé à vie : il fonctionne sans lubrification. Mais attention : un matériel qui a reçu de l\'huile une fois doit toujours en recevoir (la graisse d\'origine a été lavée).',
    pannes: [
      'Cuve vide sur un circuit lubrifié : usure des joints, distributeurs qui grippent.',
      'Trop d\'huile : brouillard gras à l\'échappement, pollution, silencieux encrassés.',
      'Huile inadaptée : gonflement des joints.'
    ]
  },
  distributeur: {
    nom: 'Distributeur 5/2 bistable',
    plaque: '5 orifices, 2 positions · pilotage pneumatique 14 et 12 + commandes manuelles · G1/8',
    role: 'Dirige l\'air vers l\'une ou l\'autre chambre du vérin et met l\'autre chambre à l\'échappement : il commande le sens du mouvement.',
    fonctionnement: 'Orifices (norme ISO 5599) : 1 = alimentation, 2 et 4 = utilisations, 3 et 5 = échappements, 12 et 14 = pilotages. Un signal sur 14 relie 1 → 4 et 2 → 3 ; un signal sur 12 relie 1 → 2 et 4 → 5. Bistable = à mémoire : il garde sa dernière position quand le signal disparaît (pas de ressort de rappel). Si 12 et 14 sont actionnés ensemble, il ne bascule pas : c\'est un « signal bloquant ».',
    pannes: [
      'Tiroir qui colle (eau, huile vieillie, poussière) : commutation lente ou absente.',
      'Joints du tiroir usés : fuite permanente à un échappement.',
      'Pression de pilotage trop faible (< 1,5 bar) : le distributeur ne bascule pas.',
      'Signal bloquant : deux pilotes actionnés en même temps.'
    ]
  },
  silencieux: {
    nom: 'Silencieux d\'échappement',
    plaque: 'Bronze fritté G1/8 · montés sur les échappements 3 et 5 du distributeur',
    role: 'Réduit le bruit de l\'air qui s\'échappe (jusqu\'à 30 dB de moins) et retient les projections d\'huile.',
    fonctionnement: 'L\'air traverse un matériau poreux (bronze fritté, plastique) qui casse les turbulences. Un silencieux propre freine très peu l\'échappement. Il ne remplace pas un régleur de débit pour régler la vitesse.',
    pannes: [
      'Silencieux colmaté (huile, poussière) : l\'air s\'échappe mal, le vérin devient lent dans les deux sens, les régleurs de débit n\'ont plus d\'effet.',
      'Silencieux retiré : bruit très fort (danger pour l\'audition), projection d\'huile.'
    ]
  },
  regleur: {
    nom: 'Régleurs de débit unidirectionnels',
    plaque: 'Étrangleur réglable + clapet anti-retour en parallèle · montés directement sur les orifices du vérin',
    role: 'Règlent la vitesse de sortie et de rentrée de la tige, séparément.',
    fonctionnement: 'Dans un sens, l\'air passe librement par le clapet ; dans l\'autre, il doit passer par l\'étrangleur réglable. On les monte « au refoulement » : l\'air entre librement dans le vérin et c\'est l\'air qui SORT de la chambre opposée qui est freiné. La tige est ainsi tenue entre deux coussins d\'air : mouvement régulier, même avec une charge entraînante. Le régleur côté tige règle donc la vitesse de SORTIE, celui côté fond la vitesse de RENTRÉE.',
    pannes: [
      'Régleur fermé à fond : le vérin ne bouge plus (ou très lentement) dans un sens.',
      'Régleur monté à l\'envers (à l\'admission) : mouvement saccadé, broutement, la charge s\'emballe.',
      'Contre-écrou desserré : le réglage change avec les vibrations.'
    ]
  },
  verin: {
    nom: 'Vérin double effet',
    plaque: 'ISO 15552 · Ø32 mm · tige Ø12 mm · course 200 mm · amortissements de fin de course',
    role: 'Transforme l\'énergie de l\'air comprimé en mouvement rectiligne et en effort : ici, il soulève la charge posée sur le plateau.',
    fonctionnement: 'L\'air poussant sur la face du piston (chambre A, côté fond) fait sortir la tige ; poussant sur la face annulaire (chambre B, côté tige) il la fait rentrer. Force théorique F = p × S : à 6 bar (0,6 N/mm²), en sortie F = 0,6 × 804 mm² ≈ 482 N ; en rentrée la section annulaire n\'est que de 691 mm² (la tige prend de la place) : F ≈ 415 N. On compte en pratique 10 à 20 % de pertes (frottements, contre-pression).',
    pannes: [
      'Joint de piston usé : fuite d\'une chambre à l\'autre, perte de force, mouvement lent, air qui souffle en permanence à l\'échappement en fin de course.',
      'Joint de tige usé : fuite le long de la tige, entrée de poussière.',
      'Tige rayée ou pliée (effort latéral) : usure rapide des joints, grippage.',
      'Charge trop lourde ou pression trop basse : le vérin cale.'
    ]
  },
  charge: {
    nom: 'Plateau et charge',
    plaque: 'Plateau guidé sur deux colonnes · masses de 5 kg · 0 à 40 kg',
    role: 'Simule la machine entraînée : le vérin vertical doit soulever la charge.',
    fonctionnement: 'Le poids de la charge (P = m × g) s\'oppose à la sortie et aide la rentrée. Si F = p × S est plus faible que le poids + les frottements, le vérin cale. En rentrée, la charge « tire » la tige : c\'est l\'étranglement de l\'air qui s\'échappe de la chambre A qui retient la descente.',
    pannes: [
      'Guidage grippé ou désaligné : effort latéral sur la tige, usure.',
      'Charge supérieure à la capacité du vérin : calage, mouvement saccadé.'
    ]
  },
  capteurs: {
    nom: 'Capteurs de fin de course 1S1 / 1S2',
    plaque: 'Distributeurs 3/2 à galet, normalement fermés, rappel par ressort',
    role: 'Détectent la position de la tige (1S1 = rentrée, 1S2 = sortie) et envoient un signal pneumatique au distributeur : ils permettent le cycle automatique (va-et-vient).',
    fonctionnement: 'Quand la came du plateau appuie sur le galet, le capteur laisse passer l\'air vers le pilote du distributeur. En cycle automatique : 1S1 actionné → pilote 14 → sortie ; 1S2 actionné → pilote 12 → rentrée. Repérage : 1 = numéro de la chaîne (vérin 1A), S = capteur, 1 et 2 = position.',
    pannes: [
      'Capteur déréglé (desserré, déplacé) : la came ne l\'atteint plus, le cycle s\'arrête à cette position.',
      'Galet cassé ou grippé : signal absent ou permanent.',
      'Capteur actionné trop tôt : course incomplète.'
    ]
  },
  tuyaux: {
    nom: 'Tubes et raccords instantanés',
    plaque: 'Tube polyuréthane Ø8 / Ø6 mm · raccords instantanés à pince',
    role: 'Transportent l\'air entre les composants.',
    fonctionnement: 'Le tube s\'enfonce dans le raccord jusqu\'en butée : une pince le retient et un joint torique assure l\'étanchéité. Pour démonter, on appuie sur la bague du raccord ET on tire le tube, toujours circuit à l\'échappement. Couper le tube bien d\'équerre avec un coupe-tube.',
    pannes: [
      'Fuite à un raccord (tube coupé de travers, pas enfoncé, joint abîmé) : sifflement, le compresseur redémarre souvent. Recherche à l\'eau savonneuse ou au détecteur à ultrasons.',
      'Tube pincé ou plié : débit réduit.',
      'Tube arraché sous pression : coup de fouet dangereux.'
    ]
  },
  nourrice: {
    nom: 'Bloc de distribution (nourrice)',
    plaque: '1 entrée G1/4 · 3 sorties à raccords instantanés',
    role: 'Distribue l\'air conditionné par le FRL vers les différents circuits du poste : distributeur 1V1, bouton 2V1, sélecteur 0V1.',
    fonctionnement: 'Toutes les sorties sont à la même pression (celle du régulateur). Un circuit qui consomme beaucoup peut faire baisser la pression des autres si le FRL est trop petit.',
    pannes: ['Bouchon ou raccord desserré : fuite.', 'Sortie inutilisée non bouchée : perte d\'air permanente.']
  },
  bouton: {
    nom: 'Distributeur 3/2 NF à bouton poussoir (2V1)',
    plaque: '3 orifices, 2 positions · normalement fermé · bouton champignon · rappel par ressort (monostable)',
    role: 'Commande le vérin simple effet 2A : tant qu\'on appuie, l\'air passe ; quand on relâche, le circuit se vide.',
    fonctionnement: 'Au repos (ressort), 1 est bouché et 2 est relié à l\'échappement 3. Bouton enfoncé : 1 → 2, le vérin est alimenté. Monostable : il revient seul en position de repos dès qu\'on relâche (contrairement au 5/2 bistable).',
    pannes: ['Ressort cassé : le distributeur reste en position travail.', 'Joint usé : fuite permanente à l\'échappement 3.', 'Petit débit : le vérin se remplit lentement.']
  },
  echapRapide: {
    nom: 'Soupape d\'échappement rapide (2V2)',
    plaque: 'Corps laiton G1/8 · clapet à membrane · silencieux intégré',
    role: 'Accélère le retour du vérin simple effet en vidant sa chambre directement à l\'atmosphère, sans faire revenir l\'air par le tube et le distributeur.',
    fonctionnement: 'Quand le bouton alimente, la pression pousse la membrane qui ferme l\'échappement : l\'air va vers le vérin. Quand on relâche, la pression chute côté bouton : la membrane bascule et ouvre un gros passage du vérin vers l\'atmosphère. On la monte au plus près du vérin.',
    pannes: ['Membrane collée ou bloquée : l\'air repasse par le petit échappement du bouton, le retour est lent.', 'Silencieux colmaté : retour lent.']
  },
  verinSE: {
    nom: 'Vérin simple effet à rappel par ressort (2A)',
    plaque: 'Ø20 mm · course 50 mm · ressort de rappel 20 → 40 N',
    role: 'Fait un mouvement simple (serrage, éjection, blocage) avec un seul orifice d\'alimentation.',
    fonctionnement: 'L\'air pousse le piston et comprime le ressort : la tige sort. À l\'échappement, c\'est le ressort qui ramène la tige. La force utile en sortie = p × S − force du ressort : à 6 bar, 0,6 × 314 = 188 N moins 20 à 40 N. Il consomme deux fois moins d\'air qu\'un double effet, mais sa course est courte et son retour sans force.',
    pannes: ['Ressort cassé : la tige reste sortie après la mise à l\'échappement.', 'Joint usé : perte de force, air qui souffle par l\'évent.', 'Évent bouché : le vérin freine (la chambre du ressort se comprime).']
  },
  selecteur: {
    nom: 'Sélecteur de cycle 0V1 (3/2 à accrochage)',
    plaque: 'Distributeur 3/2 NF à commande manuelle tournante, à accrochage (reste dans la position choisie)',
    role: 'Met en service le cycle automatique : il alimente les capteurs 1S1 et 1S2.',
    fonctionnement: 'Position « Auto » : 1 → 2, les capteurs reçoivent l\'air et peuvent piloter le distributeur 1V1. Position « Arrêt » : les capteurs sont à l\'échappement, le cycle s\'arrête à la fin du mouvement en cours (le 5/2 bistable garde sa position).',
    pannes: ['Sélecteur qui fuit : cycle qui repart seul.', 'Accrochage usé : le sélecteur revient seul en position arrêt.']
  },
  manometres: {
    nom: 'Manomètres des chambres A et B',
    plaque: 'Ø40 mm · 0 à 10 bar · montés sur des tés près des orifices du vérin',
    role: 'Montrent la pression dans chaque chambre du vérin double effet : indispensables pour comprendre le réglage de vitesse et diagnostiquer une fuite interne.',
    fonctionnement: 'En sortie de tige, A est presque à la pression du réseau et B garde une contre-pression (c\'est le régleur qui la freine) : la tige est tenue entre deux coussins d\'air. En fin de course, l\'amortissement fait remonter la pression de la chambre qui s\'échappe. Avec un joint de piston usé, les deux pressions se rapprochent.',
    pannes: ['Aiguille bloquée : manomètre à changer.', 'Lecture qui chute à l\'arrêt : fuite sur la chambre.']
  }
};

export const PANNES = {
  fuite: {
    nom: 'Fuite d\'air sur un raccord',
    composant: 'tuyaux',
    symptomes: ['Sifflement près du raccord (air qui s\'échappe)', 'Le compresseur redémarre souvent, même vérin à l\'arrêt', 'Temps de marche du compresseur en hausse', 'Consommation d\'air sans aucun mouvement'],
    causes: ['Tube coupé de travers ou pas enfoncé jusqu\'en butée', 'Joint torique du raccord abîmé', 'Tube usé, fendu près du raccord'],
    solutions: ['Repérer la fuite (bruit, eau savonneuse, détecteur à ultrasons)', 'Mettre le circuit à l\'échappement (vanne 3/2 fermée et cadenassée)', 'Recouper le tube d\'équerre et le renfoncer, ou remplacer le raccord']
  },
  joint: {
    nom: 'Joint de piston du vérin usé',
    composant: 'verin',
    symptomes: ['Vérin plus lent, il peine à soulever la charge', 'Air qui souffle en permanence à l\'échappement en fin de course', 'Les pressions des deux chambres se rapprochent', 'Consommation d\'air par cycle en hausse'],
    causes: ['Usure normale (nombre de cycles)', 'Air pollué (poussière, eau)', 'Effort latéral sur la tige', 'Manque de lubrification sur un vérin lubrifié'],
    solutions: ['Test : tige en fin de course, débrancher le tube de la chambre non alimentée : si l\'air souffle, le joint fuit', 'Changer le jeu de joints (pochette) ou le vérin', 'Corriger la cause (filtration, guidage de la charge)']
  },
  filtre: {
    nom: 'Filtre colmaté',
    composant: 'filtre',
    symptomes: ['La pression du réseau chute fortement dès que le vérin bouge, puis remonte à l\'arrêt', 'Vérin moins puissant, il peut caler avec une charge lourde', 'Pression de cuve normale'],
    causes: ['Élément filtrant jamais remplacé', 'Air très pollué (huile du compresseur, rouille)'],
    solutions: ['Mettre à l\'échappement, démonter la cuve, remplacer l\'élément filtrant', 'Respecter la périodicité de remplacement', 'Installer un indicateur de colmatage (manomètre différentiel)']
  },
  silencieux: {
    nom: 'Silencieux d\'échappement colmatés',
    composant: 'silencieux',
    symptomes: ['Vérin très lent dans les deux sens', 'Les régleurs de débit n\'ont plus d\'effet quand on les ouvre', 'La chambre qui s\'échappe reste longtemps sous pression', 'Silencieux noirs, gras'],
    causes: ['Excès d\'huile (lubrificateur trop ouvert)', 'Air pollué', 'Silencieux jamais nettoyés'],
    solutions: ['Nettoyer ou remplacer les silencieux', 'Régler le lubrificateur (moins de gouttes)', 'Contrôler la filtration']
  },
  eau: {
    nom: 'Purge oubliée : eau dans le circuit',
    composant: 'filtre',
    symptomes: ['Cuve du filtre pleine d\'eau', 'Le distributeur colle : il bascule avec retard', 'Cycle irrégulier, plus lent', 'Traces d\'eau et de rouille aux échappements'],
    causes: ['Purge manuelle du filtre et de la cuve non faite', 'Purge automatique en panne', 'Air très humide (pas de sécheur)'],
    solutions: ['Purger le filtre et la cuve du compresseur (bouton « 💧 Purger »)', 'Purger tous les jours, ou installer une purge automatique', 'Nettoyer le distributeur si l\'eau y est entrée']
  },
  pressostat: {
    nom: 'Pressostat du compresseur bloqué',
    composant: 'compresseur',
    symptomes: ['Le compresseur ne s\'arrête plus à 8 bar', 'Pression de cuve qui monte au-delà de 8 bar', 'La soupape de sûreté s\'ouvre et siffle vers 10 bar', 'Moteur du compresseur qui chauffe'],
    causes: ['Contacts du pressostat soudés', 'Membrane ou tube de prise de pression bouché', 'Réglage modifié'],
    solutions: ['Arrêter le compresseur (interrupteur) et le consigner électriquement', 'Remplacer le pressostat, contrôler les réglages 6 → 8 bar', 'Ne jamais bloquer la soupape de sûreté : c\'est elle qui a évité l\'éclatement']
  },
  capteur: {
    nom: 'Capteur de fin de course 1S2 déréglé',
    composant: 'capteurs',
    symptomes: ['En cycle automatique, la tige sort puis reste sortie', 'Le voyant du capteur 1S2 reste éteint, tige sortie', 'En commande manuelle, tout fonctionne'],
    causes: ['Capteur desserré, déplacé par les vibrations ou un choc', 'Came du plateau déréglée', 'Galet cassé'],
    solutions: ['Mettre à l\'échappement et cadenasser', 'Replacer le capteur pour que la came écrase le galet en fin de course (sans le mettre en butée)', 'Serrer les vis et tester en cycle']
  },
  ressort: {
    nom: 'Ressort du vérin simple effet cassé',
    composant: 'verinSE',
    symptomes: ['Le vérin 2A sort quand on appuie sur le bouton', 'Il reste sorti quand on relâche, alors que sa chambre est à l\'échappement (manomètre à 0)', 'On peut repousser la tige à la main'],
    causes: ['Fatigue du ressort (nombre de cycles)', 'Corrosion (air humide)', 'Surcharge en bout de tige'],
    solutions: ['Mettre à l\'échappement et cadenasser', 'Remplacer le ressort ou le vérin', 'Contrôler la qualité de l\'air (purge, filtre)']
  },
  echapRapide: {
    nom: 'Échappement rapide bloqué',
    composant: 'echapRapide',
    symptomes: ['Le vérin 2A sort normalement', 'Mais il revient lentement quand on relâche le bouton', 'L\'air sort par le petit échappement du bouton 2V1 au lieu de la soupape'],
    causes: ['Membrane collée (huile, poussière)', 'Silencieux de la soupape colmaté', 'Soupape montée à l\'envers'],
    solutions: ['Nettoyer ou remplacer la soupape d\'échappement rapide', 'Vérifier le sens de montage (P côté bouton, A côté vérin)', 'Remplacer le silencieux']
  }
};

export const QUIZ = [
  {
    q: 'Quel est le rôle de la cuve du compresseur ?',
    choix: ['Stocker de l\'air comprimé et fournir les pointes de consommation', 'Refroidir le moteur du compresseur', 'Augmenter la pression au-delà de celle du compresseur', 'Lubrifier l\'air'],
    bonne: 0,
    expl: 'La cuve est une réserve : elle fournit l\'air pendant les pointes et permet au moteur de s\'arrêter entre deux remplissages (pressostat 6 → 8 bar).'
  },
  {
    q: 'Dans l\'unité FRL, que signifient les trois lettres ?',
    choix: ['Filtre, Régulateur, Lubrificateur', 'Frein, Raccord, Limiteur', 'Fuite, Retour, Ligne', 'Fond, Rentrée, Levier'],
    bonne: 0,
    expl: 'Filtre (enlève l\'eau et les poussières), Régulateur (règle et stabilise la pression), Lubrificateur (ajoute un brouillard d\'huile si le matériel l\'exige).'
  },
  {
    q: 'Vérin Ø32 mm (S = 804 mm²) alimenté à 6 bar. Force théorique en sortie ?',
    choix: ['≈ 482 N', '≈ 48 N', '≈ 4 820 N', '≈ 192 N'],
    bonne: 0,
    expl: '6 bar = 0,6 N/mm². F = p × S = 0,6 × 804 ≈ 482 N (environ 49 kg). En pratique on retire 10 à 20 % de pertes.'
  },
  {
    q: 'Pourquoi un vérin double effet pousse-t-il moins fort en rentrée qu\'en sortie ?',
    choix: ['La tige réduit la surface sur laquelle l\'air pousse côté tige', 'L\'air est plus froid côté tige', 'Le distributeur réduit la pression en rentrée', 'Les régleurs de débit réduisent la force'],
    bonne: 0,
    expl: 'Côté tige, l\'air ne pousse que sur la section annulaire : S = π × (32² − 12²) / 4 ≈ 691 mm², contre 804 mm² côté fond.'
  },
  {
    q: 'Dans un distributeur 5/2, que désignent les orifices 3 et 5 ?',
    choix: ['Les échappements', 'Les pilotages', 'L\'alimentation', 'Les sorties vers le vérin'],
    bonne: 0,
    expl: 'ISO 5599 : 1 = alimentation, 2 et 4 = utilisations, 3 et 5 = échappements, 12 et 14 = pilotages.'
  },
  {
    q: 'Le distributeur est « bistable ». Que se passe-t-il quand le signal de pilotage disparaît ?',
    choix: ['Il garde sa position (mémoire)', 'Il revient en position de repos par ressort', 'Il se met en position centrale', 'Il met tout à l\'échappement'],
    bonne: 0,
    expl: 'Un distributeur bistable n\'a pas de ressort de rappel : il reste dans la dernière position commandée. Un monostable, lui, revient par ressort.'
  },
  {
    q: 'Comment règle-t-on habituellement la vitesse d\'un vérin pneumatique ?',
    choix: ['En étranglant l\'air qui s\'échappe du vérin (au refoulement)', 'En étranglant l\'air qui entre dans le vérin', 'En baissant la pression du compresseur', 'Avec les silencieux'],
    bonne: 0,
    expl: 'Réglage au refoulement : l\'air entre librement (clapet) et c\'est l\'échappement qui est freiné. Le piston est tenu entre deux pressions : mouvement régulier, même avec une charge entraînante.'
  },
  {
    q: 'Sur ce banc, quel régleur faut-il fermer pour ralentir la SORTIE de tige ?',
    choix: ['Le régleur côté tige (chambre B)', 'Le régleur côté fond (chambre A)', 'Les deux régleurs', 'Le régulateur de pression'],
    bonne: 0,
    expl: 'En sortie, c\'est la chambre B (côté tige) qui s\'échappe. Son régleur étrangle cet échappement et règle donc la vitesse de sortie.'
  },
  {
    q: 'Quel est le premier geste avant de débrancher un tube ?',
    choix: ['Fermer et cadenasser la vanne 3/2 et vérifier que la pression est à 0', 'Arrêter le compresseur', 'Fermer les régleurs de débit', 'Mettre le distributeur en position rentrée'],
    bonne: 0,
    expl: 'Consignation pneumatique : la vanne 3/2 coupe l\'arrivée ET vide le circuit. On vérifie au manomètre (0 bar) et on pense aux charges qui peuvent descendre.'
  },
  {
    q: 'Le compresseur redémarre sans arrêt alors qu\'aucun vérin ne bouge. Cause la plus probable ?',
    choix: ['Une fuite dans le réseau', 'Un régleur de débit fermé', 'Un silencieux colmaté', 'Une charge trop lourde'],
    bonne: 0,
    expl: 'Sans consommation, la pression ne devrait pas baisser. Si elle baisse, l\'air part quelque part : fuite. Les fuites représentent souvent 20 à 30 % de l\'air produit dans une usine.'
  },
  {
    q: 'Pourquoi faut-il purger régulièrement le filtre et la cuve ?',
    choix: ['Pour évacuer l\'eau de condensation', 'Pour faire baisser la pression', 'Pour ajouter de l\'huile', 'Pour refroidir le compresseur'],
    bonne: 0,
    expl: 'L\'air comprimé contient de l\'humidité qui se condense en refroidissant. L\'eau rouille la cuve et les composants et fait coller les tiroirs des distributeurs.'
  },
  {
    q: 'La pression du réseau chute à 3,5 bar à chaque mouvement puis remonte à 6 bar à l\'arrêt. Cuve à 7 bar. Cause ?',
    choix: ['Filtre colmaté (ou FRL sous-dimensionné)', 'Pressostat bloqué', 'Capteur de fin de course déréglé', 'Silencieux colmaté'],
    bonne: 0,
    expl: 'La pression se rétablit à débit nul mais chute dès que l\'air circule : il y a une forte perte de charge entre la cuve et le réseau, typiquement l\'élément filtrant colmaté.'
  },
  {
    q: 'Que fait la soupape de sûreté de la cuve ?',
    choix: ['Elle s\'ouvre si la pression dépasse 10 bar pour éviter l\'éclatement', 'Elle règle la pression d\'utilisation', 'Elle purge l\'eau', 'Elle arrête le moteur à 8 bar'],
    bonne: 0,
    expl: 'C\'est la dernière sécurité si le pressostat ne coupe plus le moteur. On ne la bloque jamais, on la teste périodiquement.'
  },
  {
    q: 'En cycle automatique, la tige sort puis reste sortie. En manuel, tout fonctionne. Cause ?',
    choix: ['Le capteur 1S2 n\'est pas actionné (déréglé)', 'Fuite à un raccord', 'Joint de piston usé', 'Pressostat bloqué'],
    bonne: 0,
    expl: 'C\'est 1S2 (tige sortie) qui pilote le retour par 12. S\'il n\'est jamais actionné, le distributeur bistable reste en position sortie.'
  },
  {
    q: 'Pourquoi utilise-t-on une vanne 3/2 (et non 2/2) en tête du poste ?',
    choix: ['Fermée, elle met aussi le circuit aval à l\'échappement', 'Elle laisse passer plus de débit', 'Elle règle la pression', 'Elle filtre l\'air'],
    bonne: 0,
    expl: 'Une vanne 2/2 coupe l\'arrivée mais l\'air reste emprisonné dans le circuit : un vérin peut bouger quand on débranche un tube. La 3/2 vide le circuit.'
  },
  {
    q: 'Le vérin cale à mi-course avec 40 kg sous 2 bar. Que faire en priorité ?',
    choix: ['Augmenter la pression au régulateur (dans la limite autorisée) ou réduire la charge', 'Ouvrir les silencieux', 'Fermer le régleur de sortie', 'Purger le filtre'],
    bonne: 0,
    expl: 'F = 0,2 N/mm² × 804 mm² ≈ 161 N < poids 42 kg × 9,81 ≈ 412 N. À 6 bar, F ≈ 482 N : le vérin passe (de justesse, avec les frottements).'
  },
  {
    q: 'Quelle est la différence entre un distributeur monostable et un bistable ?',
    choix: ['Le monostable revient seul en position de repos (ressort), le bistable garde sa position', 'Le monostable a 5 orifices, le bistable 3', 'Le bistable ne peut pas être piloté', 'Aucune différence'],
    bonne: 0,
    expl: 'Le bouton 2V1 est monostable : on relâche, il revient. Le 5/2 1V1 est bistable : il garde la dernière commande reçue (mémoire).'
  },
  {
    q: 'À quoi sert la soupape d\'échappement rapide 2V2 ?',
    choix: ['À vider le vérin directement à l\'atmosphère pour un retour rapide', 'À augmenter la pression du vérin', 'À ralentir la sortie de tige', 'À filtrer l\'air'],
    bonne: 0,
    expl: 'Sans elle, l\'air du vérin repasse par le tube et le petit échappement du bouton : retour lent. Montée sur le vérin, elle ouvre un gros passage direct.'
  },
  {
    q: 'Vérin simple effet Ø20 (S = 314 mm²) à 6 bar, ressort de 40 N en fin de course. Force utile en fin de sortie ?',
    choix: ['≈ 148 N', '≈ 188 N', '≈ 228 N', '≈ 40 N'],
    bonne: 0,
    expl: 'F = p × S − F ressort = 0,6 × 314 − 40 ≈ 188 − 40 = 148 N : le ressort « mange » une partie de l\'effort.'
  },
  {
    q: 'Pourquoi le vérin double effet ralentit-il juste avant la fin de course ?',
    choix: ['Les amortissements pneumatiques : l\'air qui s\'échappe ne sort plus que par la vis d\'amortissement', 'Le compresseur s\'arrête', 'Le distributeur se ferme à moitié', 'La charge devient plus lourde'],
    bonne: 0,
    expl: 'Sur les 15 derniers millimètres, un piston d\'amortissement bouche le gros passage : l\'air est comprimé et ne sort que par une petite vis réglable. Le choc en butée est évité.'
  }
];
