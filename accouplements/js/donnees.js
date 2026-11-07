/* =====================================================================
   donnees.js — Textes pédagogiques : types d'accouplement, défauts
   d'alignement, quiz. Modifiables sans toucher au reste du code.
   Tolérances indicatives (constructeurs courants) à 1500 tr/min :
   r = décalage radial (mm), a = angle (°), x = écart axial (± mm).
   max = étendue des réglages proposés. Un 0 = défaut non admis.
   ===================================================================== */

export const TYPES = [
  {
    id: 'plateaux', nom: 'Rigide à plateaux', ico: '⚙️', famille: 'Rigide',
    tol: { r: 0.02, a: 0.02, x: 0.05 }, max: { r: 0.3, a: 0.3, x: 0.5 }, exag: 40, raideur: 2.2,
    principe: "Deux plateaux (flasques) clavetés sur les arbres sont serrés par des boulons ajustés. Les deux arbres ne forment plus qu'un seul arbre.",
    constitution: ["2 plateaux clavetés avec emboîtement de centrage", "Boulons ajustés (6 à 8)", "Clavettes"],
    avantages: ["Très simple, peu coûteux", "Transmet de très gros couples", "Aucun jeu, aucune pièce d'usure"],
    inconvenients: ["N'accepte AUCUN désalignement", "Transmet chocs et vibrations", "Un désalignement fait fléchir les arbres et casse les roulements"],
    applications: "Arbres de grande longueur, lignes d'arbres, machines montées sur un même bâti très rigide.",
    usure: "Boulons (desserrage, cisaillement), portées des roulements.",
    defaut: "Désalignement → flexion alternée des arbres, roulements chauds, fissure de fatigue de l'arbre."
  },
  {
    id: 'manchon', nom: 'Rigide à manchon', ico: '🔩', famille: 'Rigide',
    tol: { r: 0.02, a: 0.02, x: 0.1 }, max: { r: 0.3, a: 0.3, x: 0.5 }, exag: 40, raideur: 2.0,
    principe: "Un manchon (douille) en acier enfile les deux bouts d'arbre ; il est claveté et bloqué par vis de pression ou par cône de serrage.",
    constitution: ["Manchon en acier ou fonte", "Clavette commune ou 2 clavettes", "Vis de pression / goupilles"],
    avantages: ["Très compact (faible diamètre)", "Économique"],
    inconvenients: ["Aucun désalignement admis", "Démontage difficile : il faut déplacer une machine", "Pas d'amortissement"],
    applications: "Petits arbres de transmission, convoyeurs, arbres de liaison à faible vitesse.",
    usure: "Clavettes et rainures (matage), vis de pression desserrées.",
    defaut: "Désalignement → le manchon force, échauffement des paliers, matage des clavettes."
  },
  {
    id: 'crabots', nom: 'À crabots (étoile)', ico: '✳️', famille: 'Élastique',
    tol: { r: 0.2, a: 1.0, x: 1.0 }, max: { r: 0.6, a: 2.5, x: 2.5 }, exag: 12, raideur: 0.8,
    principe: "Deux moyeux à crabots (griffes) s'emboîtent avec une étoile en élastomère entre les griffes. Le couple passe en comprimant les branches de l'étoile.",
    constitution: ["2 moyeux à 3 crabots (fonte, alu ou acier)", "Étoile élastomère (polyuréthane, 92 à 98 Shore A)", "Vis de blocage sur clavette"],
    avantages: ["Amortit les chocs et les vibrations", "Sécurité intrinsèque : si l'étoile casse, les crabots continuent d'entraîner", "Montage simple, faible coût"],
    inconvenients: ["Faible décalage radial admis", "Étoile sensible à la chaleur et aux huiles", "Pour changer l'étoile il faut écarter les machines"],
    applications: "Pompes, ventilateurs, réducteurs, compresseurs de petite et moyenne puissance.",
    usure: "Étoile : déformation permanente, fissures, poudre noire autour de l'accouplement.",
    defaut: "Désalignement → étoile chaude et déformée, poudre d'élastomère, vibration à 2× la vitesse."
  },
  {
    id: 'pneu', nom: 'À pneu (bandage)', ico: '🛞', famille: 'Élastique',
    tol: { r: 2.0, a: 4.0, x: 3.0 }, max: { r: 5, a: 8, x: 6 }, exag: 4, raideur: 0.55,
    principe: "Un bandage en caoutchouc en forme de pneu est serré entre deux flasques. Il se déforme en torsion et absorbe de grands désalignements.",
    constitution: ["2 moyeux avec flasques", "Bagues de serrage + vis", "Bandage caoutchouc renforcé (fendu pour le démontage)"],
    avantages: ["Accepte les plus grands désalignements", "Très bon amortissement des chocs", "Bandage changeable sans déplacer les machines (bandage fendu)"],
    inconvenients: ["Encombrant (grand diamètre)", "Crée une poussée axiale à haute vitesse (effet centrifuge)", "Sensible à l'ozone, aux huiles, au soleil"],
    applications: "Concasseurs, broyeurs, convoyeurs, pompes, moteurs thermiques.",
    usure: "Bandage : craquelures, décollement des talons, échauffement.",
    defaut: "Désalignement trop fort → bandage chaud, fissures sur les flancs, poussée sur les roulements."
  },
  {
    id: 'broches', nom: 'À broches et douilles', ico: '📍', famille: 'Élastique',
    tol: { r: 0.3, a: 0.5, x: 2.0 }, max: { r: 0.9, a: 1.5, x: 4 }, exag: 10, raideur: 0.9,
    principe: "Des broches (axes) fixées sur un plateau passent dans des douilles en caoutchouc logées dans l'autre plateau. Les douilles se déforment.",
    constitution: ["Plateau à broches (acier)", "Plateau à alésages", "Douilles en caoutchouc / élastomère", "Écrous et rondelles"],
    avantages: ["Robuste, couples importants", "Douilles changeables facilement", "Fonctionne dans les deux sens"],
    inconvenients: ["Désalignement admis limité", "Usure des douilles → jeu, chocs au démarrage"],
    applications: "Pompes, compresseurs, moteurs électriques de moyenne et forte puissance.",
    usure: "Douilles : ovalisation, jeu, poussière noire ; broches marquées.",
    defaut: "Désalignement → usure rapide et inégale des douilles, broches qui cognent (choc à chaque tour)."
  },
  {
    id: 'lames', nom: 'À lames (disques)', ico: '💿', famille: 'Métallique flexible',
    tol: { r: 0.4, a: 0.7, x: 1.0 }, max: { r: 1.2, a: 2, x: 2.5 }, exag: 10, raideur: 1.1,
    principe: "Des paquets de lames minces en acier inox, boulonnés alternativement au moyeu et à l'entretoise, fléchissent. Avec deux paquets et une entretoise, le décalage radial est permis.",
    constitution: ["2 moyeux", "2 paquets de lames inox", "Entretoise (spacer)", "Boulons ajustés alternés"],
    avantages: ["Sans jeu, sans lubrification, sans usure", "Hautes vitesses, hautes températures", "L'entretoise se démonte sans déplacer les machines"],
    inconvenients: ["Pas d'amortissement des chocs", "Rupture brutale des lames si désalignement excessif (fatigue)", "Prix élevé"],
    applications: "Turbines, compresseurs, grosses pompes process (API 610 / API 671).",
    usure: "Lames : fissures près des boulons, lames ondulées ou bleuies.",
    defaut: "Désalignement → flexion alternée des lames → fissures de fatigue → rupture du paquet."
  },
  {
    id: 'denture', nom: 'À denture (double)', ico: '🦷', famille: 'Métallique flexible',
    tol: { r: 0.5, a: 1.0, x: 3.0 }, max: { r: 1.5, a: 2.5, x: 6 }, exag: 8, raideur: 1.2,
    principe: "Deux moyeux à denture extérieure bombée engrènent dans un manchon à denture intérieure. Les dents glissent et pivotent : chaque denture accepte un angle, les deux ensemble un décalage.",
    constitution: ["2 moyeux à denture bombée", "Manchon(s) à denture intérieure (souvent en 2 parties boulonnées)", "Joints toriques", "Graisse ou huile"],
    avantages: ["Très gros couples sous faible diamètre", "Grand jeu axial (dilatations)", "Hautes vitesses"],
    inconvenients: ["Doit être graissé régulièrement", "Usure des dents si désalignement ou manque de graisse", "Frottement : efforts axiaux sur les roulements"],
    applications: "Laminoirs, gros réducteurs, ponts roulants, turbines.",
    usure: "Dents : usure en « pointe », piqûres, graisse noire ou absente.",
    defaut: "Désalignement → dents qui glissent fortement à chaque tour → usure, échauffement, poussée axiale."
  },
  {
    id: 'chaine', nom: 'À chaîne double', ico: '⛓️', famille: 'Métallique flexible',
    tol: { r: 0.5, a: 1.0, x: 1.0 }, max: { r: 1.5, a: 2.5, x: 2.5 }, exag: 8, raideur: 1.0,
    principe: "Deux pignons identiques, côte à côte, sont entourés par une chaîne à rouleaux double. Le jeu entre chaîne et dents absorbe les petits désalignements.",
    constitution: ["2 pignons", "Chaîne duplex avec maillon d'attache", "Carter (capot) étanche avec graisse"],
    avantages: ["Simple, robuste, bon marché", "Montage/démontage rapide (on ouvre la chaîne)"],
    inconvenients: ["Jeu de torsion (chocs aux inversions)", "Doit être graissé et protégé par un carter", "Vitesse limitée"],
    applications: "Convoyeurs, agitateurs, machines agricoles, entraînements lents.",
    usure: "Rouleaux et axes de chaîne, dents des pignons en crochet.",
    defaut: "Désalignement → maillons qui travaillent en biais, usure rapide, bruit de claquement."
  },
  {
    id: 'grille', nom: 'À grille (ressort)', ico: '〰️', famille: 'Métallique flexible',
    tol: { r: 0.3, a: 0.25, x: 2.0 }, max: { r: 0.9, a: 0.8, x: 4 }, exag: 12, raideur: 0.9,
    principe: "Une grille ressort en acier (en serpentin) passe dans les rainures de deux moyeux. Sous le couple, la grille fléchit : elle amortit chocs et vibrations.",
    constitution: ["2 moyeux à rainures évasées", "Grille ressort en acier trempé (en segments)", "Carter en 2 parties avec joints", "Graisse"],
    avantages: ["Amortit les chocs (rigidité variable)", "Grille remplaçable sans déplacer les machines", "Bon rapport couple / taille"],
    inconvenients: ["Doit être graissé", "Désalignement angulaire admis faible", "Fuite de graisse si joints usés"],
    applications: "Broyeurs, ventilateurs industriels, pompes, malaxeurs.",
    usure: "Grille marquée ou cassée, rainures usées, graisse noire.",
    defaut: "Désalignement → grille qui frotte en biais dans les rainures → usure, rupture de la grille."
  },
  {
    id: 'oldham', nom: "Oldham (à croisillon)", ico: '➕', famille: 'Métallique / glissant',
    tol: { r: 2.0, a: 0.5, x: 0.5 }, max: { r: 5, a: 1.5, x: 1.5 }, exag: 5, raideur: 1.0,
    principe: "Un disque intermédiaire porte deux tenons perpendiculaires qui coulissent dans les rainures des deux moyeux. Il accepte un grand décalage parallèle : le centre du disque décrit un cercle à 2 fois la vitesse.",
    constitution: ["2 moyeux rainurés", "Disque central à 2 tenons à 90° (polyacétal, bronze ou acier)"],
    avantages: ["Grand décalage parallèle", "Transmission homocinétique (vitesse constante)", "Disque isolant électriquement (version plastique)"],
    inconvenients: ["Très peu d'angle admis", "Frottement des tenons → usure, balourd du disque", "Vitesse limitée"],
    applications: "Petites machines, codeurs, pompes doseuses, machines-outils.",
    usure: "Tenons du disque (jeu), rainures marquées.",
    defaut: "Décalage → le disque oscille à 2× la vitesse : vibration à 2×, usure des tenons."
  },
  {
    id: 'cardan', nom: 'Joint de cardan', ico: '✚', famille: 'Articulé',
    tol: { r: 0, a: 25, x: 0 }, max: { r: 0, a: 40, x: 0 }, exag: 1, raideur: 1.0,
    principe: "Deux fourches reliées par un croisillon monté sur roulements à aiguilles. Il transmet entre arbres qui se coupent avec un grand angle. Un cardan seul n'est PAS homocinétique : la vitesse de sortie oscille 2 fois par tour.",
    constitution: ["2 fourches (chapes)", "Croisillon", "4 roulements à aiguilles + graisseur", "(Transmission complète : 2 cardans + arbre cannelé coulissant)"],
    avantages: ["Très grands angles (jusqu'à 25° à 45°)", "Transmet de gros couples"],
    inconvenients: ["Vitesse de sortie irrégulière (variation en cos β)", "Décalage parallèle impossible avec un cardan seul", "Graissage et usure des aiguilles"],
    applications: "Transmissions de véhicules, prises de force agricoles, laminoirs, machines à angle variable.",
    usure: "Roulements à aiguilles du croisillon (jeu, « marquage »), cannelures.",
    defaut: "Angle trop grand → irrégularité de vitesse, vibrations de torsion, usure des aiguilles. Il faut 2 cardans en phase avec angles égaux pour être homocinétique."
  },
  {
    id: 'soufflet', nom: 'À soufflet métallique', ico: '🪗', famille: 'Métallique flexible',
    tol: { r: 0.2, a: 1.5, x: 0.4 }, max: { r: 0.6, a: 3.5, x: 1 }, exag: 15, raideur: 1.1,
    principe: "Un soufflet en acier inox à ondulations relie deux moyeux. Il fléchit pour absorber l'angle et le décalage, mais il est très rigide en torsion.",
    constitution: ["2 moyeux à serrage (vis ou pince)", "Soufflet inox soudé ou serti"],
    avantages: ["Zéro jeu, très rigide en torsion : précision de position", "Sans entretien, hautes vitesses"],
    inconvenients: ["Faibles couples", "Fragile : rupture du soufflet si surcharge ou désalignement excessif"],
    applications: "Servomoteurs, codeurs, vis à billes, machines-outils à commande numérique.",
    usure: "Pas d'usure mais fissures de fatigue du soufflet.",
    defaut: "Désalignement excessif → fatigue du soufflet et rupture soudaine, erreurs de position."
  }
];

export const DEFAUTS = {
  aligne: {
    nom: 'Aligné', ico: '✅', reglage: { r: 0, a: 0, x: 0 },
    texte: "Les deux axes de rotation sont confondus (sur le prolongement l'un de l'autre). L'accouplement tourne sans se déformer : vibrations faibles, roulements et joints durent longtemps.",
    signes: ["Vibrations faibles, surtout à 1× (balourd résiduel)", "Températures normales", "Élément souple intact"],
    correction: "Contrôler l'alignement à l'installation, après 1 semaine de marche (tassement, dilatation), puis à chaque intervention."
  },
  radial: {
    nom: 'Décalage parallèle (radial)', ico: '⇅', reglage: { r: 1.4, a: 0, x: 0 },
    texte: "Les axes sont parallèles mais décalés (l'un plus haut ou plus sur le côté). À chaque tour, l'accouplement doit « rattraper » ce décalage : il se déforme 2 fois par tour.",
    signes: ["Forte vibration RADIALE à 2× la vitesse (et 1×)", "Mesures radiales en opposition (180°) de part et d'autre de l'accouplement", "Échauffement de l'élément souple et des roulements côté accouplement"],
    correction: "Mesurer au comparateur RADIAL (sur la périphérie). Corriger en hauteur avec des cales sous les 4 pattes (même épaisseur), et sur le côté avec les vis de poussée."
  },
  angulaire: {
    nom: 'Désalignement angulaire', ico: '∠', reglage: { r: 0, a: 1.4, x: 0 },
    texte: "Les axes se coupent avec un angle : les faces des moyeux ne sont pas parallèles (l'écart est plus grand en haut qu'en bas, ou d'un côté). À chaque tour, l'élément se plie d'un côté puis de l'autre.",
    signes: ["Forte vibration AXIALE à 1× (avec 2× et 3×)", "Mesures axiales en opposition (180°) de part et d'autre", "Poussée axiale sur les roulements"],
    correction: "Mesurer au comparateur de FACE (ou jauge d'épaisseur entre les faces). Corriger avec des cales seulement sous les pattes avant ou arrière (différence de cales)."
  },
  combine: {
    nom: 'Désalignement combiné', ico: '⤡', reglage: { r: 1.0, a: 1.0, x: 0 },
    texte: "Le cas réel le plus fréquent : décalage + angle en même temps, en vertical et en horizontal. On corrige d'abord l'angle, puis le décalage, d'abord en vertical, puis en horizontal.",
    signes: ["Vibrations radiales ET axiales à 1× et 2×", "Échauffement, usure rapide de l'élément", "Bruit, fuite aux garnitures et joints"],
    correction: "Méthode : pied boiteux d'abord → vertical (angle puis hauteur) → horizontal → serrage croisé → vérification finale."
  },
  axial: {
    nom: 'Écart axial incorrect', ico: '↔', reglage: { r: 0, a: 0, x: 1.4 },
    texte: "La distance entre les faces des moyeux n'est pas la cote du constructeur : trop près, l'élément est comprimé et pousse les arbres ; trop loin, il est tiré et les dents/griffes ne portent pas sur toute la longueur.",
    signes: ["Poussée axiale permanente sur les roulements", "Échauffement des butées", "Élément écrasé ou pas assez engagé"],
    correction: "Régler l'écart entre faces à la cote du constructeur (jauge ou cale étalon), moteur poussé vers son centre magnétique."
  }
};

export const QUIZ = [
  { q: "Quel accouplement n'accepte AUCUN désalignement ?", r: ["À pneu", "Rigide à plateaux", "Oldham", "À crabots"], b: 1, e: "Les accouplements rigides font des deux arbres un seul : il faut un alignement parfait." },
  { q: "Un décalage parallèle se mesure avec le comparateur…", r: ["De face", "Radial (sur la périphérie)", "Sur la clavette", "Il ne se mesure pas"], b: 1, e: "Le comparateur radial lit le décalage ; le comparateur de face lit l'angle." },
  { q: "Un désalignement angulaire donne surtout une vibration…", r: ["Axiale à 1×", "Radiale à 5×", "Aucune vibration", "Seulement à l'arrêt"], b: 0, e: "Angle → forte vibration axiale à 1× (déphasage 180° de part et d'autre)." },
  { q: "Un décalage parallèle donne surtout une vibration…", r: ["Axiale à 0,5×", "Radiale à 2×", "Électrique à 100 Hz", "Nulle"], b: 1, e: "Le décalage déforme l'accouplement 2 fois par tour : pic radial à 2×." },
  { q: "Quel accouplement accepte les plus grands désalignements ?", r: ["Rigide à manchon", "À lames", "À pneu", "À soufflet"], b: 2, e: "Le bandage en caoutchouc absorbe plusieurs mm et plusieurs degrés." },
  { q: "Pourquoi un joint de cardan seul n'est-il pas homocinétique ?", r: ["Il glisse", "La vitesse de sortie varie 2 fois par tour avec l'angle", "Il a trop de jeu axial", "Il manque de graisse"], b: 1, e: "ω2 oscille entre ω1·cos β et ω1/cos β : il faut 2 cardans en phase." },
  { q: "Dans l'Oldham, le centre du disque intermédiaire décrit…", r: ["Une droite", "Un cercle à 2× la vitesse", "Rien, il est fixe", "Une hélice"], b: 1, e: "Son diamètre est égal au décalage ; il tourne 2 fois plus vite que les arbres." },
  { q: "Quels accouplements doivent être graissés ?", r: ["À lames et soufflet", "À denture, à grille et à chaîne", "À pneu et à crabots", "Rigides"], b: 1, e: "Denture, grille et chaîne ont des pièces métalliques qui glissent : graissage obligatoire." },
  { q: "On corrige l'angle dans le plan vertical en…", r: ["Mettant la même cale sous les 4 pattes", "Mettant une différence de cales entre pattes avant et arrière", "Serrant plus fort", "Changeant l'étoile"], b: 1, e: "Même cale partout = correction de hauteur ; différence avant/arrière = correction d'angle." },
  { q: "De la poudre noire autour d'un accouplement à crabots indique…", r: ["Un bon fonctionnement", "L'usure de l'étoile (souvent désalignement)", "Trop de graisse", "Un moteur neuf"], b: 1, e: "L'étoile s'use et s'échauffe : vérifier l'alignement et la changer." },
  { q: "Avant d'aligner, il faut d'abord éliminer…", r: ["Le pied boiteux", "La plaque signalétique", "Le carter de protection définitivement", "Le graissage"], b: 0, e: "Un pied boiteux fausse toutes les mesures et déforme le carter du moteur." },
  { q: "L'accouplement à lames avec entretoise accepte un décalage parce que…", r: ["Les lames sont en caoutchouc", "Chaque paquet de lames prend un petit angle", "L'entretoise est élastique", "Il n'a pas de boulons"], b: 1, e: "Deux angles opposés sur une longueur d'entretoise = décalage parallèle." },
  { q: "Un écart axial trop faible entre moyeux provoque…", r: ["Une poussée axiale sur les roulements", "Une baisse de tension", "Une meilleure durée de vie", "Rien"], b: 0, e: "L'élément est comprimé et pousse sur les arbres et les butées." },
  { q: "L'accouplement à soufflet est choisi pour…", r: ["Les gros couples à choc", "La précision de position (zéro jeu)", "Les grands désalignements", "Sa graisse"], b: 1, e: "Très rigide en torsion : servomoteurs, codeurs, vis à billes." }
];
