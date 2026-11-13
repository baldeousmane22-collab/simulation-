/* =====================================================================
   donnees.js — Textes pédagogiques (le formateur peut les modifier)
   ===================================================================== */

/* Fiche de chaque type d'engrenage */
export const FICHES = {
  droite: {
    def: 'Deux roues cylindriques à axes parallèles, dents taillées parallèlement à l\'axe. La plus petite roue s\'appelle le pignon.',
    usages: ['Boîtes de vitesses de machines-outils', 'Réducteurs simples, pompes à engrenages', 'Mécanismes d\'horlogerie, treuils'],
    plus: ['Simple et économique à fabriquer', 'Aucun effort axial sur les paliers', 'Bon rendement (97 à 99 %)'],
    moins: ['Bruyant à grande vitesse (une seule dent en prise par moments)', 'Chocs à l\'engrènement', 'Rapport limité à environ 7 par étage'],
    retenir: 'Deux roues ne peuvent engrener que si elles ont le même module. Contact extérieur → sens de rotation inversé.'
  },
  helicoidale: {
    def: 'Roues cylindriques à axes parallèles dont les dents sont inclinées d\'un angle β (hélice). Les deux roues ont des hélices de sens contraires.',
    usages: ['Boîtes de vitesses d\'automobiles', 'Réducteurs industriels rapides et silencieux', 'Turbines, compresseurs'],
    plus: ['Silencieux : plusieurs dents en prise en même temps', 'Transmet plus de couple à taille égale', 'Engrènement progressif, sans choc'],
    moins: ['Effort axial Fa = Ft·tan β : il faut des butées', 'Taillage plus coûteux', 'Deux modules : réel mn et apparent mt'],
    retenir: 'On calcule les diamètres avec le module apparent mt = mn / cos β. La denture en chevrons (deux hélices opposées) annule l\'effort axial.'
  },
  interieur: {
    def: 'Un pignon engrène à l\'intérieur d\'une couronne dont les dents sont taillées vers le centre.',
    usages: ['Trains épicycloïdaux (boîtes automatiques, réducteurs)', 'Couronnes d\'orientation de grues, d\'éoliennes', 'Pompes à engrenages intérieurs'],
    plus: ['Très compact : entraxe a = m·(Z2 − Z1)/2', 'Les deux roues tournent dans le même sens', 'Plus de dents en contact : meilleure résistance'],
    moins: ['Taillage par mortaiseuse (plus difficile)', 'Il faut Z2 − Z1 suffisamment grand (≥ 10)', 'Montage et graissage moins accessibles'],
    retenir: 'Pour la couronne : da = d − 2m (vers le centre) et df = d + 2,5m (vers l\'extérieur).'
  },
  cremaillere: {
    def: 'Un pignon engrène avec une barre dentée (roue de rayon infini). La rotation du pignon devient une translation de la crémaillère.',
    usages: ['Direction de voiture', 'Perceuse à colonne (descente du foret)', 'Portails coulissants, machines CNC à grande course'],
    plus: ['Transforme la rotation en translation (et inversement)', 'Grande course possible (crémaillères mises bout à bout)', 'Simple, bon rendement'],
    moins: ['Jeu à l\'inversion de sens', 'Usure en ambiance poussiéreuse', 'Bruit à grande vitesse'],
    retenir: 'Un tour de pignon = π·d de déplacement. Les flancs de la crémaillère sont droits, inclinés de α = 20°.'
  },
  conique: {
    def: 'Roues taillées sur des cônes dont les sommets sont confondus. Elles transmettent le mouvement entre deux arbres concourants, le plus souvent à 90°.',
    usages: ['Renvois d\'angle, perceuses à main', 'Différentiel et pont arrière d\'automobile', 'Têtes de fraiseuses, agitateurs'],
    plus: ['Change la direction du mouvement', 'Rapport de 1 à 6 environ', 'Dentures spirales silencieuses possibles'],
    moins: ['Réglage précis : sommets des cônes confondus', 'Efforts axiaux sur les deux arbres', 'Fabrication coûteuse'],
    retenir: 'Axes à 90° : tan δ1 = Z1 / Z2 et δ1 + δ2 = 90°. Le module est donné au grand diamètre.'
  },
  vis: {
    def: 'Une vis (1 à 4 filets) entraîne une roue dentée creusée. Les axes sont orthogonaux et non concourants.',
    usages: ['Treuils et palans, monte-charges', 'Réducteurs à grand rapport (convoyeurs)', 'Mécaniques de guitare, vannes'],
    plus: ['Très grand rapport en un seul étage (jusqu\'à 1/100)', 'Silencieux, compact', 'Peut être irréversible : la charge reste bloquée'],
    moins: ['Rendement faible (40 à 90 %) : échauffement', 'Glissement : usure, graissage indispensable', 'Roue en bronze (coûteuse)'],
    retenir: 'r = Zf / Z2 (nombre de filets / dents de la roue). Irréversible si l\'angle d\'hélice γ est inférieur à l\'angle de frottement φ.'
  },
  train: {
    def: 'Plusieurs engrenages en série. L\'arbre intermédiaire porte une roue menée et un pignon menant clavetés ensemble.',
    usages: ['Réducteurs à plusieurs étages', 'Boîtes de vitesses', 'Horlogerie, compteurs'],
    plus: ['Grands rapports avec des roues de taille raisonnable', 'Rapport global = produit des rapports', 'Choix de l\'entraxe et de la position des arbres'],
    moins: ['Plus de pièces et de paliers', 'Rendement global = produit des rendements', 'Encombrement'],
    retenir: 'r = (−1)ⁿ × (produit des Z menantes) / (produit des Z menées), n = nombre de contacts extérieurs.'
  },
  epicycloidal: {
    def: 'Un planétaire central (soleil), des satellites portés par un porte-satellites et une couronne intérieure. Ici la couronne est fixe : entrée par le planétaire, sortie par le porte-satellites.',
    usages: ['Boîtes de vitesses automatiques', 'Réducteurs de treuils, d\'éoliennes, de visseuses', 'Moyeux de vélo à vitesses intégrées'],
    plus: ['Très compact, arbres d\'entrée et de sortie alignés', 'Couple réparti sur plusieurs satellites', 'Plusieurs rapports en bloquant un élément différent'],
    moins: ['Conception et fabrication complexes', 'Condition de montage à respecter', 'Calcul des vitesses plus délicat (formule de Willis)'],
    retenir: 'Zc = Zs + 2·Zp. Couronne fixe : nPS / ns = Zs / (Zs + Zc). Formule de Willis : (ns − nPS)/(nc − nPS) = −Zc/Zs.'
  }
};

/* Vocabulaire et formules générales (onglet Cours) */
export const VOCABULAIRE = [
  ['Pignon', 'la plus petite des deux roues d\'un engrenage'],
  ['Roue menante / menée', 'celle qui entraîne / celle qui est entraînée'],
  ['Module m', 'grandeur normalisée (mm) qui fixe la taille des dents : m = d / Z = p / π'],
  ['Pas primitif p', 'distance entre deux dents mesurée sur le cercle primitif : p = π·m'],
  ['Cercle primitif (d)', 'cercles fictifs des deux roues qui roulent sans glisser l\'un sur l\'autre'],
  ['Cercle de tête (da)', 'passe par le sommet des dents'],
  ['Cercle de pied (df)', 'passe par le fond des dents'],
  ['Cercle de base (db)', 'cercle sur lequel est tracée la développante : db = d·cos α'],
  ['Saillie ha / Creux hf', 'hauteur au-dessus / au-dessous du cercle primitif : ha = m, hf = 1,25·m'],
  ['Angle de pression α', 'inclinaison de la ligne d\'action, normalisé à 20°'],
  ['Développante de cercle', 'courbe du profil des dents : tracée par un fil qui se déroule d\'un cercle'],
  ['Entraxe a', 'distance entre les axes des deux roues'],
  ['Rapport de transmission r', 'r = n sortie / n entrée = ω sortie / ω entrée'],
  ['Jeu (de fonctionnement)', 'petit espace entre les flancs non actifs, nécessaire au graissage']
];

export const MODULES_TXT = 'Modules normalisés (série principale) : 0,5 – 0,75 – 1 – 1,25 – 1,5 – 2 – 2,5 – 3 – 4 – 5 – 6 – 8 – 10 – 12 – 16 – 20 mm.';

export const FORMULES_GENERALES = [
  ['Module', 'm = d / Z = p / π'],
  ['Pas', 'p = π·m'],
  ['Diamètre primitif', 'd = m·Z'],
  ['Diamètre de tête', 'da = d + 2m = m·(Z + 2)'],
  ['Diamètre de pied', 'df = d − 2,5m = m·(Z − 2,5)'],
  ['Hauteur de dent', 'h = 2,25·m'],
  ['Entraxe extérieur', 'a = (d1 + d2)/2 = m·(Z1 + Z2)/2'],
  ['Entraxe intérieur', 'a = (d2 − d1)/2 = m·(Z2 − Z1)/2'],
  ['Rapport', 'r = n2/n1 = Z1/Z2 = d1/d2'],
  ['Vitesse angulaire', 'ω = π·n / 30 (rad/s, n en tr/min)'],
  ['Puissance', 'P = C·ω (W, N·m, rad/s)'],
  ['Couple de sortie', 'C2 = C1 × (Z2/Z1) × η'],
  ['Effort tangentiel', 'Ft = 2·C / d (N, N·m, m)'],
  ['Effort radial', 'Fr = Ft·tan α'],
  ['Vitesse linéaire', 'v = ω·d/2 = π·d·n / 60 (d en m)']
];

/* Exercices corrigés (type brevet) */
export const EXERCICES = [
  {
    titre: '1. Calcul d\'une roue',
    enonce: 'Une roue dentée droite a 40 dents et un module m = 2,5 mm. Calculer p, d, da, df et h.',
    corr: ['p = π·m = π × 2,5 = <b>7,85 mm</b>', 'd = m·Z = 2,5 × 40 = <b>100 mm</b>', 'da = d + 2m = 100 + 5 = <b>105 mm</b>',
      'df = d − 2,5m = 100 − 6,25 = <b>93,75 mm</b>', 'h = 2,25·m = <b>5,625 mm</b>']
  },
  {
    titre: '2. Retrouver le module',
    enonce: 'On mesure le diamètre de tête d\'un pignon usé : da = 66 mm. Il a 20 dents. Quel est son module ? Son diamètre primitif ?',
    corr: ['da = m·(Z + 2) ⇒ m = da / (Z + 2)', 'm = 66 / 22 = <b>3 mm</b> (module normalisé)', 'd = m·Z = 3 × 20 = <b>60 mm</b>']
  },
  {
    titre: '3. Entraxe et vitesse',
    enonce: 'Un pignon Z1 = 18 dents tourne à 1500 tr/min et entraîne une roue Z2 = 54 dents, module 2 mm. Calculer l\'entraxe, le rapport et la vitesse de la roue.',
    corr: ['a = m·(Z1 + Z2)/2 = 2 × 72 / 2 = <b>72 mm</b>', 'r = Z1/Z2 = 18/54 = <b>1/3</b> (réduction i = 3)',
      'n2 = n1 × r = 1500 / 3 = <b>500 tr/min</b>, en sens inverse']
  },
  {
    titre: '4. Couples et effort sur la dent',
    enonce: 'Moteur de 4 kW à 1450 tr/min. Pignon Z1 = 20, m = 3, roue Z2 = 60, rendement 0,98. Calculer C1, n2, C2 et l\'effort tangentiel Ft.',
    corr: ['ω1 = π × 1450 / 30 = 151,8 rad/s', 'C1 = P / ω1 = 4000 / 151,8 = <b>26,3 N·m</b>', 'n2 = 1450 × 20/60 = <b>483,3 tr/min</b>',
      'C2 = C1 × (Z2/Z1) × η = 26,3 × 3 × 0,98 = <b>77,4 N·m</b>', 'd1 = 3 × 20 = 60 mm = 0,06 m ; Ft = 2·C1/d1 = 2 × 26,34 / 0,06 = <b>878 N</b>',
      'Fr = Ft × tan 20° = <b>320 N</b>']
  },
  {
    titre: '5. Train à deux étages',
    enonce: 'Z1 = 15 (menant), Z2 = 45, Z3 = 20 (sur l\'arbre de Z2), Z4 = 60. n1 = 1500 tr/min. Calculer le rapport global et n4. Sens de rotation ?',
    corr: ['r = (Z1·Z3)/(Z2·Z4) = (15 × 20)/(45 × 60) = 300/2700 = <b>1/9</b>', 'n4 = 1500 / 9 = <b>166,7 tr/min</b>',
      '2 contacts extérieurs ⇒ (−1)² = +1 : <b>même sens</b> que l\'entrée']
  },
  {
    titre: '6. Denture hélicoïdale',
    enonce: 'mn = 2 mm, β = 20°, Z1 = 25, Z2 = 50. Calculer mt, d1, d2 et l\'entraxe.',
    corr: ['mt = mn / cos β = 2 / 0,9397 = <b>2,128 mm</b>', 'd1 = mt·Z1 = <b>53,2 mm</b> ; d2 = mt·Z2 = <b>106,4 mm</b>',
      'a = (d1 + d2)/2 = <b>79,8 mm</b>', 'Remarque : en denture droite (m = 2) on aurait a = 75 mm.']
  },
  {
    titre: '7. Vis sans fin',
    enonce: 'Vis à 2 filets, roue de 40 dents, module 4, q = 10. La vis tourne à 1400 tr/min. Calculer n2, d1, d2, a et l\'angle d\'hélice γ.',
    corr: ['r = Zf / Z2 = 2/40 = 1/20 ⇒ n2 = 1400/20 = <b>70 tr/min</b>', 'd1 = q·m = <b>40 mm</b> ; d2 = m·Z2 = <b>160 mm</b>',
      'a = (40 + 160)/2 = <b>100 mm</b>', 'tan γ = Zf / q = 0,2 ⇒ γ = <b>11,3°</b>']
  },
  {
    titre: '8. Pignon – crémaillère',
    enonce: 'Un pignon de 24 dents, module 2, entraîne une crémaillère. Quelle course pour 5 tours ? Vitesse de la crémaillère à 30 tr/min ?',
    corr: ['d = 2 × 24 = 48 mm ; un tour : L = π·d = <b>150,8 mm</b>', '5 tours : 5 × 150,8 = <b>754 mm</b>',
      'V = π·d·n / 60 = π × 0,048 × 30 / 60 = <b>0,075 m/s</b> (75 mm/s)']
  },
  {
    titre: '9. Train épicycloïdal',
    enonce: 'Planétaire Zs = 20, satellites Zp = 25, couronne fixe. Entrée sur le planétaire à 1200 tr/min. Calculer Zc et la vitesse du porte-satellites.',
    corr: ['Zc = Zs + 2·Zp = 20 + 50 = <b>70 dents</b>', 'r = Zs / (Zs + Zc) = 20/90 = <b>2/9</b>',
      'nPS = 1200 × 2/9 = <b>266,7 tr/min</b> (même sens)', 'Montage : (Zs + Zc)/3 = 30 ⇒ 3 satellites possibles à 120°']
  }
];

/* Quiz */
export const QUIZ = [
  { q: 'Deux roues dentées peuvent engrener si elles ont…', r: ['le même module', 'le même nombre de dents', 'le même diamètre', 'la même largeur'], b: 0 },
  { q: 'Le diamètre primitif d\'une roue de 30 dents, module 2, vaut :', r: ['60 mm', '64 mm', '15 mm', '32 mm'], b: 0 },
  { q: 'La formule du diamètre de tête est :', r: ['da = m·(Z + 2)', 'da = m·(Z − 2,5)', 'da = π·m·Z', 'da = 2,25·m'], b: 0 },
  { q: 'Le creux d\'une dent normale vaut :', r: ['1,25·m', 'm', '2,25·m', 'π·m'], b: 0 },
  { q: 'L\'angle de pression normalisé est de :', r: ['20°', '14,5°', '30°', '45°'], b: 0 },
  { q: 'Le profil des dents est une :', r: ['développante de cercle', 'parabole', 'hélice', 'droite'], b: 0 },
  { q: 'Z1 = 20 à 1000 tr/min entraîne Z2 = 50. La vitesse de Z2 est :', r: ['400 tr/min', '2500 tr/min', '1000 tr/min', '250 tr/min'], b: 0 },
  { q: 'Dans un engrenage extérieur, les deux roues tournent :', r: ['en sens inverse', 'dans le même sens', 'à la même vitesse', 'sans glisser au pied'], b: 0 },
  { q: 'Quel engrenage produit un effort axial important ?', r: ['hélicoïdal', 'droit', 'intérieur droit', 'pignon-crémaillère droit'], b: 0 },
  { q: 'Pour un renvoi d\'angle à 90°, on utilise un engrenage :', r: ['conique', 'intérieur', 'cylindrique droit', 'à chevrons'], b: 0 },
  { q: 'Une vis à 1 filet entraîne une roue de 50 dents. Le rapport est :', r: ['1/50', '1/25', '50', '1/100'], b: 0 },
  { q: 'Un système roue et vis est irréversible quand :', r: ['γ < φ (angle d\'hélice < angle de frottement)', 'la vis a 4 filets', 'le module est grand', 'la roue est en acier'], b: 0 },
  { q: 'Un tour d\'un pignon de diamètre primitif 40 mm déplace la crémaillère de :', r: ['125,7 mm', '40 mm', '80 mm', '62,8 mm'], b: 0 },
  { q: 'Le rapport global d\'un train d\'engrenages est :', r: ['le produit des rapports de chaque étage', 'la somme des rapports', 'le rapport du dernier étage', 'toujours égal à 1'], b: 0 },
  { q: 'En dessous de combien de dents (α = 20°) y a-t-il risque d\'interférence ?', r: ['17', '30', '8', '50'], b: 0 },
  { q: 'Dans un train épicycloïdal à couronne fixe, Zs = 20 et Zc = 60. nPS / ns vaut :', r: ['1/4', '1/3', '3', '1/2'], b: 0 },
  { q: 'Un réducteur divise la vitesse par 3. Le couple de sortie (η = 1) est :', r: ['multiplié par 3', 'divisé par 3', 'inchangé', 'multiplié par 9'], b: 0 },
  { q: 'En denture hélicoïdale, le diamètre primitif se calcule avec :', r: ['le module apparent mt = mn / cos β', 'le module réel mn', 'mn·cos β', 'le pas axial'], b: 0 }
];
