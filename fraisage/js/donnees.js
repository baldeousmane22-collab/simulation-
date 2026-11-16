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
  },
  percage: {
    nom: 'Perçage (pointage + foret)', court: 'Perçage', icone: '⊙', machine: 'verticale', piece: 'trous', axial: true,
    outil: '1) Foret à centrer Ø5  2) Foret hélicoïdal ARS Ø10, 2 lèvres', outilPrincipal: 'foret Ø10', D: 10, Z: 2, fz: 0.08, kVc: 0.9,
    ap: '20 mm (trous borgnes)', ae: 10, diam: 'Ø10 mm, 4 trous', outilDefaut: 'ars',
    but: 'Percer 4 trous borgnes Ø10, profondeur 20 mm, positionnés par coordonnées sur la fraiseuse.',
    principe: 'Le foret tourne et descend dans l\'axe de la broche : c\'est un usinage <b>axial</b>. Sur fraiseuse, les trous sont positionnés très précisément avec les verniers (ou la CN) : pas besoin de traçage.',
    etapes: ['Prendre l\'origine pièce (coin ou centre) avec un palpeur ou une tangente', 'Pointer chaque trou au foret à centrer : le foret ne déviera pas', 'Monter le foret Ø10 dans le mandrin de perçage', 'Percer avec débourrage (remonter tous les 1 à 1,5 × D pour évacuer les copeaux)', 'Respecter la profondeur avec la butée ou le vernier (la pointe à 118° ajoute 0,3 × D)', 'Ébavurer l\'entrée des trous (fraisure ou ébavureur)'],
    astuces: ['Toujours pointer avant de percer : la pointe du foret (âme) ne coupe pas bien et « glisse ».', 'Pour un gros trou (> Ø12), faire un avant-trou d\'environ le diamètre de l\'âme du foret.', 'Débourrer souvent dans l\'acier : un foret bourré de copeaux chauffe et casse.', 'Lubrifier : huile de coupe ou arrosage, surtout dans l\'acier et l\'inox.', 'La profondeur se mesure sur la partie cylindrique : ajouter 0,3 × D pour la pointe.'],
    erreurs: ['Pas de pointage → trou décalé ou foret dévié.', 'Avance trop forte en sortie d\'un trou débouchant → le foret « visse » et casse.', 'Foret mal affûté (lèvres inégales) → trou trop grand.']
  },
  taraudage: {
    nom: 'Taraudage M10 (perçage + taraud)', court: 'Taraudage', icone: '🔩', machine: 'verticale', piece: 'trous', axial: true,
    outil: '1) Foret à centrer  2) Foret Ø8,5  3) Taraud machine M10 × 1,5', outilPrincipal: 'taraud M10 × 1,5', D: 10, d0: 8.5, Z: 1, fz: 1.5, pas: 1.5, kVc: 0.35,
    ap: 'perçage 22 mm, filets 18 mm', ae: 10, diam: 'M10 × 1,5, 2 trous', outilDefaut: 'ars',
    but: 'Réaliser 2 trous taraudés M10 × 1,5 sur 18 mm de profondeur utile.',
    principe: 'Le taraud taille les filets dans un trou percé au <b>diamètre de perçage = diamètre nominal − pas</b> (10 − 1,5 = 8,5 mm). Il avance d\'un pas par tour, puis ressort en <b>rotation inverse</b>.',
    etapes: ['Pointer les trous au foret à centrer', 'Percer Ø8,5 plus profond que la longueur filetée (au moins 2 à 3 pas de plus)', 'Chanfreiner l\'entrée du trou (fraisure 90°) : le taraud s\'engage mieux', 'Monter le taraud dans un porte-taraud (compensateur ou débrayable)', 'Tarauder : avance = pas × n (G84 en CN), vitesse lente, huile de coupe', 'Arrivé à la profondeur, inverser la rotation (M4) pour sortir le taraud', 'Contrôler avec un tampon fileté « entre / n\'entre pas »'],
    astuces: ['Diamètre de perçage = diamètre nominal − pas (M6 → 5 ; M8 → 6,8 ; M10 → 8,5 ; M12 → 10,2).', 'Vc de taraudage faible : environ 1/3 de la Vc de perçage.', 'Percer plus profond que la longueur filetée : le taraud ne doit jamais toucher le fond (casse).', 'Taraud cassé = pièce souvent perdue : huile de coupe, porte-taraud à limiteur de couple.', 'En trou borgne, préférer un taraud à goujures hélicoïdales (les copeaux remontent).'],
    erreurs: ['Avant-trou trop petit → taraud bloqué et cassé.', 'Avance différente du pas → filets arrachés ou taraud cassé.', 'Taraud qui touche le fond du trou borgne → casse.']
  },
  alesage: {
    nom: 'Alésage à la tête à aléser', court: 'Alésage', icone: '◉', machine: 'verticale', piece: 'trous', axial: true,
    outil: '1) Foret à centrer  2) Foret Ø18  3) Tête à aléser (ébauche Ø24,4 puis finition Ø25)', outilPrincipal: 'tête à aléser Ø25', D: 25, d0: 18, Z: 1, fz: 0.08, kVc: 0.8,
    ap: '25 mm', ae: 3.5, diam: 'Ø25 H7 (tolérance 0 / +0,021 mm)', outilDefaut: 'carbure',
    but: 'Réaliser un alésage précis Ø25 H7 de 25 mm de profondeur, bien positionné et bien cylindrique (logement de roulement, de bague ou d\'axe).',
    principe: 'Un foret ne donne ni un diamètre précis ni un bon état de surface. On perce un <b>avant-trou</b>, puis la <b>tête à aléser</b> agrandit le trou : sa plaquette tourne sur un cercle dont on règle le rayon au <b>vernier</b> (au centième). Il reste <b>3,5 mm au rayon</b> à enlever.',
    etapes: ['Prendre l\'origine (axe de l\'alésage) au palpeur ou au comparateur', 'Pointer puis percer l\'avant-trou Ø18 avec débourrage', 'Monter la tête à aléser, régler le diamètre d\'ébauche (Ø24,4)', 'Aléser en ébauche, avance régulière', 'Mesurer à l\'alésomètre (ou micromètre d\'intérieur), calculer la correction', 'Régler la tête au diamètre final (+0,3 mm au rayon) et passer en finition', 'Remonter broche arrêtée, plaquette tournée vers l\'opérateur, puis contrôler au tampon lisse H7'],
    astuces: ['Sur la tête à aléser, le vernier se règle au RAYON ou au DIAMÈTRE selon le modèle : vérifier la graduation avant de régler !', 'Laisser 0,2 à 0,4 mm au diamètre pour la finition : la plaquette coupe bien et l\'état de surface est meilleur.', 'Barre d\'alésage la plus courte et la plus grosse possible : moins de vibrations.', 'Faire une passe « à vide » (même réglage) pour voir si la barre fléchit : si elle enlève encore de la matière, il y a de la flexion.', 'Bloquer la table et le chariot pendant l\'alésage : la position ne doit pas bouger.'],
    erreurs: ['Remonter broche en rotation → rayure en hélice dans l\'alésage.', 'Erreur de graduation (rayon / diamètre) → alésage trop grand, pièce perdue.', 'Barre trop longue → alésage conique ou vibrations (broutage).']
  },
  denture: {
    nom: 'Taillage d\'une roue dentée (fraise-module + diviseur)', court: 'Denture', icone: '⚙️', machine: 'horizontale + diviseur', piece: 'denture',
    outil: 'Fraise-module m 2,5 n° 2 (fraise de forme, 12 dents) + diviseur universel', D: 60, Z: 12, fz: 0.04, ap: '5,63 mm (h = 2,25 × m)', ae: 4, outilDefaut: 'ars',
    but: 'Tailler une roue droite Z = 16 dents, module m = 2,5 (d = 40 mm, da = 45 mm, largeur 20 mm) sur fraiseuse horizontale.',
    principe: 'La <b>fraise-module</b> a exactement la forme du creux entre deux dents. Elle taille un creux à chaque passe ; entre deux passes, le <b>diviseur</b> fait tourner la roue de 1/Z de tour. Diviseur 40 : 1 → <b>n manivelle = 40 / Z = 40 / 16 = 2 tours 1/2</b> (2 tours + 10 trous sur le cercle de 20 trous).',
    etapes: ['Calculer la roue : d = m × Z = 40 ; da = d + 2m = 45 ; df = d − 2,5m = 33,75 ; h = 2,25m = 5,63 mm', 'Tourner l\'ébauche au Ø45 (da) et la monter sur un mandrin entre diviseur et contre-pointe', 'Choisir la fraise-module : module 2,5 et n° de fraise selon Z (n° 2 pour 14 à 16 dents)', 'Centrer la fraise sur l\'axe de la roue (tangente sur les deux côtés ou au comparateur)', 'Faire la tangente sur le Ø45, puis monter la console de h = 5,63 mm', 'Tailler le premier creux, revenir, diviser (2 tours 1/2), tailler le suivant… jusqu\'à 16 creux', 'Contrôler l\'épaisseur de la dent au pied à coulisse à dents (ou cote sur k dents)'],
    astuces: ['Toujours tourner la manivelle dans le même sens et ne jamais revenir en arrière : on rattrape le jeu du diviseur.', 'Utiliser l\'alidade (les deux branches du secteur) pour ne pas recompter les trous à chaque division.', 'Le n° de fraise-module dépend du nombre de dents (8 fraises par module) : n° 1 pour 12-13 dents… n° 8 pour 135 dents et plus.', 'Bloquer la broche du diviseur pendant la coupe, la débloquer pour diviser.', 'Faire une première passe légère sur tout le tour pour vérifier la division avant de passer à la profondeur totale.'],
    erreurs: ['Erreur de division → dents inégales, roue inutilisable.', 'Fraise mal centrée → dents dissymétriques.', 'Mauvais n° de fraise → profil de dent incorrect, engrènement bruyant.']
  },
  clavette: {
    nom: 'Rainure de clavette sur arbre', court: 'Clavette', icone: '▬', machine: 'verticale', piece: 'cyl',
    outil: 'Fraise à rainurer 2 dents Ø8 ARS (coupe au centre)', D: 8, Z: 2, fz: 0.02, ap: '4 × 1 mm (t1 = 4 mm)', ae: 8, outilDefaut: 'ars',
    but: 'Creuser une rainure de clavette parallèle fermée (forme A) sur un arbre Ø30 : largeur b = 8 mm, profondeur t1 = 4 mm, longueur 30 mm.',
    principe: 'L\'arbre est posé sur deux <b>vés</b> et bridé. La fraise à rainurer 2 dents coupe au centre : elle <b>plonge</b> de 1 mm puis avance jusqu\'à l\'autre bout, plonge encore, revient… C\'est le <b>fraisage pendulaire</b>. La largeur de la rainure est égale au diamètre de la fraise.',
    etapes: ['Choisir la clavette selon le Ø de l\'arbre (NF E 22-177) : Ø22 à 30 → b × h = 8 × 7, t1 = 4', 'Poser l\'arbre sur deux vés, le brider (cale en laiton sous la bride)', 'Centrer la fraise sur l\'axe de l\'arbre : tangente des deux côtés (ou palpeur) puis moyenne', 'Repérer les deux bouts de la rainure (longueur − diamètre de la fraise)', 'Fraisage pendulaire : plongées de 0,5 à 1 mm à chaque bout jusqu\'à t1', 'Contrôler la largeur avec la clavette ou une cale, la profondeur au pied à coulisse (cote d − t1 = 26)'],
    astuces: ['Le centrage sur l\'axe est la clé : une rainure décentrée empêche le montage du moyeu.', 'Pour centrer : tangenter d\'un côté, monter, passer de l\'autre côté, tangenter, puis se placer au milieu des deux lectures.', 'La profondeur t1 se mesure depuis le haut de l\'arbre : on contrôle souvent la cote d − t1.', 'Fraise 2 dents : elle plonge et elle évacue bien les copeaux dans la rainure.', 'Pour une rainure débouchante, on peut aussi utiliser une fraise 3 tailles sur fraiseuse horizontale.'],
    erreurs: ['Fraise décentrée → clavette qui ne rentre pas dans le moyeu.', 'Plongée trop forte → fraise cassée ou rainure trop large.', 'Arbre mal bridé → il tourne dans les vés, rainure de travers.']
  },
  helice: {
    nom: 'Fraisage hélicoïdal (goujures)', court: 'Hélicoïdal', icone: '🌀', machine: 'universelle (table orientée) + diviseur', piece: 'cyl',
    outil: 'Fraise convexe R4 Ø70 (fraise de forme, 14 dents) + diviseur relié à la table', D: 70, Z: 14, fz: 0.03, ap: '4 mm', ae: 8, outilDefaut: 'ars',
    but: 'Tailler 4 goujures hélicoïdales à 30° sur une ébauche Ø40 (comme les goujures d\'une fraise ou d\'un alésoir, ou une roue hélicoïdale).',
    principe: 'Pendant que la table avance, le <b>diviseur fait tourner la pièce</b> grâce à un <b>train de roues</b> relié à la vis de la table : la fraise trace une <b>hélice</b>. La table est <b>orientée de l\'angle d\'hélice β</b> pour que la fraise soit alignée avec la goujure. Pas de l\'hélice : <b>P = π × D / tan β</b> = π × 40 / tan 30° ≈ 218 mm.',
    etapes: ['Calculer le pas de l\'hélice : P = π × D / tan β ≈ 218 mm', 'Calculer le rapport du train de roues : i = 40 × pas de la vis de table / P (ex. 40 × 6 / 218 ≈ 1,10)', 'Monter les roues entre la vis de la table et le diviseur', 'Orienter la table de β = 30° (fraiseuse universelle), dans le bon sens selon le sens de l\'hélice (à droite ou à gauche)', 'Monter l\'ébauche entre diviseur et contre-pointe, centrer la fraise', 'Tailler la 1re goujure, revenir, diviser (40 / 4 = 10 tours), tailler la suivante…'],
    astuces: ['Le sens d\'orientation de la table dépend du sens de l\'hélice : hélice à droite → table tournée dans un sens, à gauche → dans l\'autre.', 'Ajouter une roue intermédiaire pour inverser le sens de rotation de la pièce si besoin.', 'Pour diviser, débrayer le train de roues ou utiliser le plateau à trous, puis rembrayer.', 'Au retour, la pièce tourne en sens inverse : dégager la fraise avant de revenir pour ne pas abîmer la goujure.', 'Faire une passe d\'essai légère pour vérifier l\'angle de l\'hélice.'],
    erreurs: ['Table orientée du mauvais côté → hélice dans le mauvais sens.', 'Mauvais rapport de roues → pas de l\'hélice faux, angle faux.', 'Jeu dans le train de roues → goujure ondulée.']
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
    <li>Connaître l'emplacement de l'arrêt d'urgence.</li></ul>` },
  { titre: '10. Perçage et taraudage sur fraiseuse', html: `<p>La fraiseuse sert aussi à <b>percer</b> et <b>tarauder</b> : les trous sont positionnés au vernier ou en CN avec une grande précision.</p>
    <table class="voc">
    <tr><td>Foret à centrer</td><td>Pointage : petit cône qui guide le foret.</td></tr>
    <tr><td>Foret hélicoïdal</td><td>2 lèvres, pointe à 118°. Vf = f × n (f en mm/tr).</td></tr>
    <tr><td>Débourrage</td><td>Remontées régulières pour vider les copeaux (cycle G83).</td></tr>
    <tr><td class="f">d perçage = D − pas</td><td>Diamètre de l'avant-trou d'un taraudage (M10 × 1,5 → Ø8,5).</td></tr>
    <tr><td class="f">Vf = pas × n</td><td>Avance imposée du taraud (cycle G84), sortie en rotation inverse (M4).</td></tr>
    <tr><td>Tampon fileté</td><td>Contrôle du taraudage : côté « entre » et côté « n'entre pas ».</td></tr></table>
    <div class="encadre">Exemple : taraud M10, Vc = 9 m/min → n = 1000 × 9 / (π × 10) ≈ 286 tr/min ; Vf = 1,5 × 286 ≈ 430 mm/min.</div>` },
  { titre: '11. Alésage sur fraiseuse', html: `<p>L'<b>alésage</b> donne un trou précis (tolérance H7, ±0,01 mm) et bien positionné, ce qu'un foret ne permet pas.</p>
    <ul><li>Avant-trou au foret (3 à 5 mm plus petit au diamètre).</li>
    <li><b>Tête à aléser</b> : la plaquette tourne sur un cercle de rayon réglable au vernier (au centième).</li>
    <li>Ébauche, mesure à l'alésomètre, correction, finition avec une petite surépaisseur (0,2 à 0,4 mm).</li>
    <li>Contrôle au <b>tampon lisse</b> « entre / n'entre pas » ou à l'alésomètre.</li></ul>
    <div class="encadre">Ø25 H7 : cote mini 25,000 mm, cote maxi 25,021 mm.</div>` },
  { titre: '12. Taillage d\'engrenages au diviseur', html: `<table class="voc">
    <tr><td class="f">d = m × Z</td><td>Diamètre primitif (m = module, Z = nombre de dents).</td></tr>
    <tr><td class="f">da = d + 2m</td><td>Diamètre de tête (diamètre de l'ébauche).</td></tr>
    <tr><td class="f">df = d − 2,5m</td><td>Diamètre de pied.</td></tr>
    <tr><td class="f">h = 2,25 × m</td><td>Hauteur de dent = profondeur de passe.</td></tr>
    <tr><td class="f">p = π × m</td><td>Pas de la denture.</td></tr>
    <tr><td class="f">n = 40 / Z</td><td>Tours de manivelle du diviseur (rapport 40 : 1) entre deux dents.</td></tr></table>
    <p>La <b>fraise-module</b> est une fraise de forme : il en existe 8 par module (n° 1 à 8) selon le nombre de dents à tailler.</p>
    <div class="encadre">Exemple : Z = 16 → n = 40 / 16 = 2,5 → 2 tours + 10 trous sur le cercle de 20 trous. Z = 30 → 40/30 = 1 tour + 1/3 → 1 tour + 6 trous sur le cercle de 18.</div>` },
  { titre: '13. Rainure de clavette', html: `<p>La <b>clavette parallèle</b> lie en rotation un arbre et un moyeu. Ses dimensions dépendent du diamètre de l'arbre (NF E 22-177).</p>
    <table class="voc">
    <tr><td>Ø 17 à 22</td><td>b × h = 6 × 6, t1 = 3,5</td></tr>
    <tr><td>Ø 22 à 30</td><td>b × h = 8 × 7, t1 = 4</td></tr>
    <tr><td>Ø 30 à 38</td><td>b × h = 10 × 8, t1 = 5</td></tr>
    <tr><td>Forme A</td><td>Bouts ronds : rainure fermée à la fraise 2 dents (fraiseuse verticale).</td></tr>
    <tr><td>Forme B</td><td>Bouts droits : rainure débouchante, fraise 3 tailles possible.</td></tr></table>
    <p>Prise de pièce : <b>vés</b> + brides. Méthode : <b>fraisage pendulaire</b> (petites plongées à chaque bout).</p>` },
  { titre: '14. Fraisage hélicoïdal', html: `<table class="voc">
    <tr><td class="f">P = π × D / tan β</td><td>Pas de l'hélice (D = diamètre, β = angle d'hélice).</td></tr>
    <tr><td class="f">i = 40 × p / P</td><td>Rapport du train de roues (p = pas de la vis de table, diviseur 40 : 1).</td></tr>
    <tr><td>Table orientée de β</td><td>Fraiseuse universelle : la fraise suit la direction de la goujure.</td></tr>
    <tr><td>Division</td><td>Entre deux goujures : 40 / N tours de manivelle.</td></tr></table>
    <div class="encadre">Exemple : D = 40, β = 30° → P = π × 40 / 0,577 ≈ 218 mm. Vis de table au pas de 6 : i = 40 × 6 / 218 ≈ 1,10.</div>
    <p>Applications : goujures de fraises, d'alésoirs et de forets, roues et vis hélicoïdales, cames.</p>` }
];

/* Astuces générales de l'atelier */
export const ASTUCES = [
  { theme: 'Réglage', liste: ['Faire la tangente avec un papier à cigarette humidifié collé sur la pièce : quand il s\'arrache, la fraise est à 0,03 mm.', 'Rattraper toujours le jeu du vernier dans le même sens (tourner au-delà puis revenir).', 'Bloquer les axes qui ne bougent pas pendant la passe (console, chariot) : moins de vibrations.'] },
  { theme: 'Outils', liste: ['Une fraise qui « chante » (vibre) : réduire n, augmenter un peu fz, ou réduire le porte-à-faux.', 'Copeaux bleus en acier avec du carbure = normal ; avec de l\'ARS = Vc trop élevée.', 'Pour l\'aluminium : fraises à 2 ou 3 dents, très affûtées, et lubrification pour éviter le collage.', 'Nettoyer le cône de broche et le cône du porte-outil avant chaque montage.'] },
  { theme: 'Conditions de coupe', liste: ['Commencer par le bas de la plage de Vc conseillée, puis augmenter si tout va bien.', 'Si la fraise s\'use vite : Vc trop élevée. Si elle casse : fz ou ap trop élevés.', 'En rainurage pleine fraise, diminuer l\'avance d\'environ 30 %.'] },
  { theme: 'Perçage et taraudage', liste: ['Pointer, percer, chanfreiner, tarauder : toujours dans cet ordre.', 'Diamètre de perçage avant taraudage = nominal − pas.', 'Huile de coupe au taraudage, même quand on usine à sec le reste de la pièce.', 'Pour l\'aluminium, débourrer moins souvent mais lubrifier pour éviter le collage.'] },
  { theme: 'Alésage et denture', liste: ['Tête à aléser : vérifier si le vernier est gradué au rayon ou au diamètre.', 'Remonter la barre d\'alésage broche arrêtée.', 'Diviseur : tourner toujours dans le même sens, utiliser l\'alidade.', 'Contrôler la première dent avant de tailler toute la roue.'] },
  { theme: 'Clavette et hélice', liste: ['Clavette : bien centrer la fraise sur l\'axe de l\'arbre (moyenne des deux tangentes).', 'Clavette : cale en laiton sous la bride pour ne pas marquer l\'arbre.', 'Hélice : vérifier le sens de l\'hélice avant d\'orienter la table.', 'Hélice : dégager la fraise avant le retour (la pièce tourne en sens inverse).'] },
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
  { q: 'Avant de percer sur fraiseuse, on commence par :', r: ['Un pointage au foret à centrer', 'Le taraudage', 'Un chanfrein à 45° sur l\'arête', 'Le surfaçage du dessous'], b: 0, e: 'Le pointage guide le foret, qui ne dévie pas.' },
  { q: 'Diamètre de perçage avant un taraudage M10 × 1,5 :', r: ['8,5 mm', '10 mm', '11,5 mm', '7 mm'], b: 0, e: 'd = D − pas = 10 − 1,5 = 8,5 mm.' },
  { q: 'Avance d\'un taraud : n = 300 tr/min, M10 × 1,5. Vf = ?', r: ['450 mm/min', '300 mm/min', '200 mm/min', '4500 mm/min'], b: 0, e: 'Vf = pas × n = 1,5 × 300 = 450 mm/min.' },
  { q: 'Pourquoi fait-on du débourrage au perçage ?', r: ['Pour évacuer les copeaux et refroidir le foret', 'Pour aller plus vite', 'Pour agrandir le trou', 'Pour affûter le foret'], b: 0, e: 'Un foret bourré de copeaux chauffe, coince et casse.' },
  { q: 'Comment sort le taraud du trou ?', r: ['En rotation inverse (M4)', 'En rotation normale, plus vite', 'Broche arrêtée, à la main', 'En remontée rapide G0'], b: 0, e: 'Il se dévisse : rotation inverse, à la même avance (pas × n).' },
  { q: 'Le contrôle d\'un trou taraudé se fait avec :', r: ['Un tampon fileté entre / n\'entre pas', 'Un mètre ruban', 'Une règle', 'Un rapporteur'], b: 0, e: 'Le côté « entre » doit se visser, le côté « n\'entre pas » non.' },
  { q: 'Angle de pointe d\'un foret hélicoïdal standard :', r: ['118°', '90°', '60°', '180°'], b: 0, e: 'La pointe standard fait 118° (130 à 140° pour les aciers durs).' },
  { q: 'Pourquoi aléser un trou au lieu de le percer seulement ?', r: ['Pour obtenir un diamètre précis (H7) et un bon état de surface', 'Pour aller plus vite', 'Parce que le foret est trop petit', 'Pour faire un filetage'], b: 0, e: 'Le foret ne garantit ni la cote ni la cylindricité ; l\'alésage si.' },
  { q: 'Comment remonte-t-on l\'outil après une passe d\'alésage de finition ?', r: ['Broche arrêtée, pour ne pas rayer l\'alésage', 'En rotation rapide', 'En avance maximale', 'On ne remonte pas'], b: 0, e: 'Une plaquette qui tourne en remontant laisse une rayure hélicoïdale.' },
  { q: 'Roue de module 2,5 et 16 dents : diamètre primitif d = ?', r: ['40 mm', '45 mm', '16 mm', '6,4 mm'], b: 0, e: 'd = m × Z = 2,5 × 16 = 40 mm.' },
  { q: 'Même roue (m = 2,5 ; Z = 16) : diamètre de l\'ébauche da = ?', r: ['45 mm', '40 mm', '42,5 mm', '50 mm'], b: 0, e: 'da = d + 2m = 40 + 5 = 45 mm.' },
  { q: 'Profondeur de passe pour tailler une denture de module 2 :', r: ['4,5 mm (h = 2,25 × m)', '2 mm', '6,28 mm', '1 mm'], b: 0, e: 'h = 2,25 × m = 2,25 × 2 = 4,5 mm.' },
  { q: 'Diviseur 40 : 1, roue de 20 dents. Tours de manivelle entre 2 dents :', r: ['2 tours', '20 tours', '1/2 tour', '40 tours'], b: 0, e: 'n = 40 / Z = 40 / 20 = 2 tours.' },
  { q: 'La fraise-module est choisie selon :', r: ['Le module et le nombre de dents de la roue', 'La couleur de la pièce', 'La vitesse de la broche seulement', 'La longueur de la table'], b: 0, e: '8 fraises par module, chacune pour une plage de nombres de dents.' },
  { q: 'Rainure de clavette sur un arbre Ø25 : largeur b de la clavette ?', r: ['8 mm', '25 mm', '4 mm', '12 mm'], b: 0, e: 'Pour Ø22 à 30 : clavette 8 × 7, t1 = 4 mm.' },
  { q: 'Pour centrer la fraise sur l\'axe d\'un arbre, on :', r: ['Tangente des deux côtés et se place au milieu', 'Vise à l\'œil', 'Prend le bord de la table', 'Mesure la longueur de l\'arbre'], b: 0, e: 'La moyenne des deux tangentes donne l\'axe exact.' },
  { q: 'Le fraisage pendulaire d\'une rainure de clavette consiste à :', r: ['Plonger un peu à chaque bout et aller-retour jusqu\'à la profondeur', 'Plonger d\'un coup à la profondeur', 'Tourner l\'arbre', 'Usiner avec une fraise 3 tailles'], b: 0, e: 'Petites plongées alternées : la fraise est peu chargée.' },
  { q: 'Fraisage hélicoïdal : pendant que la table avance, la pièce…', r: ['Tourne, entraînée par un train de roues relié au diviseur', 'Reste fixe', 'Monte', 'Est desserrée'], b: 0, e: 'Avance + rotation synchronisées = hélice.' },
  { q: 'Pas d\'une hélice : D = 40 mm, β = 45°. P = ?', r: ['≈ 126 mm (π × 40 / tan 45°)', '40 mm', '≈ 218 mm', '45 mm'], b: 0, e: 'tan 45° = 1 → P = π × 40 ≈ 125,7 mm.' },
  { q: 'Pourquoi oriente-t-on la table de l\'angle d\'hélice ?', r: ['Pour aligner la fraise avec la direction de la goujure', 'Pour aller plus vite', 'Pour refroidir', 'Pour serrer la pièce'], b: 0, e: 'Sinon la fraise déforme la goujure (flancs taillés de travers).' },
  { q: 'Enlever les copeaux autour de la fraise se fait :', r: ['Machine arrêtée, avec un pinceau ou un crochet', 'À la main, machine en marche', 'Avec un gant près de la fraise', 'En soufflant avec la bouche'], b: 0, e: 'Les copeaux coupent et sont chauds : pinceau, crochet, machine arrêtée.' }
];
