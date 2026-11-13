/* =====================================================================
   donnees.js — Contenu pédagogique de l'application
   ---------------------------------------------------------------------
   Fiches des composants, étapes du mode « Pas à pas », pannes et quiz.
   Tout le texte affiché à l'élève est regroupé ici pour pouvoir être
   relu et modifié facilement par le formateur, sans toucher au code 3D.
   ===================================================================== */

/* ---------------------------------------------------------------------
   FICHES DES COMPOSANTS
   La clé (ex. « reservoir ») est l'identifiant utilisé dans la scène 3D.
   --------------------------------------------------------------------- */
export const FICHES = {
  reservoir: {
    nom: "Réservoir d'huile",
    symbole: "Rectangle ouvert en haut (bâche à l'air libre).",
    role: "Stocker l'huile du circuit, la laisser se reposer et se refroidir, permettre aux bulles d'air et aux impuretés de se séparer.",
    fonctionnement: "L'huile est aspirée par la pompe au fond du réservoir et revient par les conduites de retour. Une cloison interne sépare la zone de retour de la zone d'aspiration pour que l'huile ait le temps de se calmer. Le niveau se contrôle avec l'indicateur visuel (entre MINI et MAXI) et un bouchon-reniflard filtre l'air qui entre et sort quand le niveau varie.",
    pannes: [
      "Niveau trop bas : la pompe aspire de l'air (bruit, mousse, mouvements saccadés).",
      "Huile émulsionnée (laiteuse) : entrée d'eau ou d'air.",
      "Reniflard bouché : dépression dans le réservoir, mauvaise aspiration.",
      "Huile trop chaude (> 60 °C) : usure rapide des joints, perte de viscosité."
    ]
  },
  crepine: {
    nom: "Crépine (filtre d'aspiration)",
    symbole: "Losange avec un trait pointillé, placé sous le niveau d'huile.",
    role: "Arrêter les grosses particules avant qu'elles n'entrent dans la pompe.",
    fonctionnement: "C'est un tamis métallique assez grossier (environ 100 à 150 µm) fixé au bout de la conduite d'aspiration, toujours immergé. Elle doit laisser passer l'huile facilement car la pompe aspire avec une très faible dépression.",
    pannes: [
      "Crépine colmatée : la pompe « cavite » (bruit de graviers, vibrations), le débit baisse, le vérin est lent.",
      "Crépine hors de l'huile (niveau bas) : aspiration d'air.",
      "Crépine percée : la pompe s'use très vite."
    ]
  },
  pompe: {
    nom: "Pompe hydraulique à engrenages",
    symbole: "Cercle avec un triangle plein pointant vers l'extérieur (sens de sortie de l'huile).",
    role: "Transformer l'énergie mécanique du moteur en débit d'huile. La pompe crée du DÉBIT, pas de la pression : la pression naît de la résistance que rencontre l'huile.",
    fonctionnement: "Deux pignons engrènent dans un carter. Côté aspiration, les dents se séparent : le volume augmente, l'huile est aspirée. L'huile est transportée dans le creux des dents le long du carter, puis chassée côté refoulement quand les dents se remettent en prise. C'est une pompe volumétrique à cylindrée fixe.",
    pannes: [
      "Pompe usée (jeux internes trop grands) : débit faible, la pression n'atteint pas la valeur de réglage, échauffement.",
      "Cavitation (aspiration difficile) : bruit, érosion des pignons.",
      "Mauvais sens de rotation : aucun débit.",
      "Fuite au joint d'arbre."
    ]
  },
  moteur: {
    nom: "Moteur électrique",
    symbole: "Cercle avec la lettre M, relié à la pompe par un arbre (double trait).",
    role: "Entraîner la pompe en rotation à vitesse constante (souvent 1 500 tr/min).",
    fonctionnement: "Le moteur asynchrone triphasé fournit le couple nécessaire à la pompe. La puissance absorbée dépend du débit et de la pression : P (kW) ≈ Q (L/min) × p (bar) / 600 / rendement.",
    pannes: [
      "Le moteur chauffe ou disjoncte : pression trop haute en permanence (limiteur mal réglé) ou pompe grippée.",
      "Accouplement usé ou désaligné : vibrations, bruit.",
      "Inversion de phases : mauvais sens de rotation de la pompe."
    ]
  },
  limiteur: {
    nom: "Limiteur de pression (soupape de sûreté)",
    symbole: "Carré avec une flèche décalée, un ressort réglable et une ligne de pilotage pointillée côté entrée.",
    role: "Protéger tout le circuit en limitant la pression maximale. C'est l'organe de sécurité le plus important.",
    fonctionnement: "Un clapet est maintenu fermé par un ressort réglable. Tant que la pression est inférieure au tarage, il reste fermé. Quand la pression atteint le tarage (vérin en fin de course, blocage, surcharge), la force de l'huile dépasse celle du ressort : le clapet s'ouvre et renvoie le débit de la pompe au réservoir. Attention : toute l'énergie passe alors en chaleur.",
    pannes: [
      "Tarage trop bas : le vérin manque de force ou ne bouge pas.",
      "Tarage trop haut : risque d'éclatement des flexibles, moteur surchargé.",
      "Clapet collé ouvert (saleté) : pas de pression, le vérin ne bouge pas.",
      "Ressort cassé : pression faible et instable."
    ]
  },
  manometre: {
    nom: "Manomètre",
    symbole: "Cercle avec une flèche oblique.",
    role: "Mesurer et afficher la pression dans le circuit (en bar).",
    fonctionnement: "Un tube de Bourdon (tube métallique courbé) se déforme sous la pression ; un mécanisme transforme cette déformation en rotation de l'aiguille. Il est souvent rempli de glycérine pour amortir les vibrations. 1 bar = 100 000 Pa ≈ 1 kg/cm².",
    pannes: [
      "Aiguille qui oscille fortement : air dans le circuit ou pompe qui cavite.",
      "Aiguille bloquée : manomètre détérioré par des coups de bélier.",
      "Fuite de glycérine : boîtier fendu."
    ]
  },
  clapet: {
    nom: "Clapet anti-retour",
    symbole: "Bille posée dans un siège en V : le passage se fait dans un seul sens.",
    role: "Laisser passer l'huile dans un seul sens et l'empêcher de revenir en arrière (protection de la pompe, maintien d'une charge).",
    fonctionnement: "Une bille ou un clapet conique est poussé sur son siège par un petit ressort. Dans le sens passant, la pression de l'huile soulève la bille (perte de charge faible, environ 0,5 à 2 bar). Dans l'autre sens, la pression plaque la bille sur son siège : c'est étanche.",
    pannes: [
      "Clapet bloqué fermé : plus aucun débit vers le distributeur, la pression monte au tarage du limiteur.",
      "Clapet bloqué ouvert ou siège abîmé : retour de l'huile, la charge redescend.",
      "Ressort cassé : claquements, fonctionnement irrégulier."
    ]
  },
  regulateur: {
    nom: "Régulateur de débit réglable",
    symbole: "Rétrécissement (deux arcs) traversé par une flèche oblique (réglable).",
    role: "Régler la vitesse du vérin en réglant le débit qui lui est envoyé.",
    fonctionnement: "On règle la section de passage avec la molette. Le débit qui passe détermine la vitesse : v = Q / S (débit divisé par la surface du piston). Avec un régulateur 2 voies placé en série, le surplus de débit de la pompe ne peut pas passer : la pression monte et ce surplus retourne au réservoir par le limiteur de pression.",
    pannes: [
      "Molette déréglée : vérin trop lent ou trop rapide.",
      "Orifice bouché par une saleté : le vérin ne bouge plus.",
      "Usure : la vitesse varie avec la charge."
    ]
  },
  distributeur: {
    nom: "Distributeur 4/3 à centre tandem",
    symbole: "Trois cases côte à côte (3 positions), 4 orifices P, T, A, B ; commande par levier et rappel au centre par ressorts.",
    role: "Diriger l'huile vers le vérin : sortie de tige, arrêt ou rentrée de tige.",
    fonctionnement: "Un tiroir coulisse dans le corps et relie les orifices entre eux. Position gauche (sortie) : P→A et B→T. Position centrale (neutre, centre tandem) : P→T, A et B bloqués : la pompe débite au réservoir sans pression et le vérin reste immobilisé. Position droite (rentrée) : P→B et A→T.",
    pannes: [
      "Tiroir grippé (huile sale) : le distributeur ne revient pas au neutre ou reste bloqué.",
      "Usure du tiroir : fuites internes, le vérin dérive lentement au neutre.",
      "Ressort de rappel cassé.",
      "Bobine grillée (sur un modèle électrique)."
    ]
  },
  verin: {
    nom: "Vérin double effet",
    symbole: "Rectangle (corps) avec piston et tige, deux orifices : un de chaque côté du piston.",
    role: "Transformer l'énergie hydraulique en mouvement rectiligne (pousser, tirer, lever).",
    fonctionnement: "L'huile sous pression entre dans une chambre et pousse le piston ; l'huile de l'autre chambre est chassée vers le réservoir. Force : F = p × S. En rentrée, la surface utile est plus petite (la tige prend de la place) : la force est plus faible mais la vitesse est plus grande pour un même débit.",
    pannes: [
      "Joint de piston usé : fuite interne, le vérin dérive, manque de force.",
      "Joint de tige usé : fuite externe d'huile sur la tige.",
      "Tige rayée ou tordue : fuites, grippage.",
      "Air dans le vérin : mouvements saccadés."
    ]
  },
  filtreRetour: {
    nom: "Filtre de retour",
    symbole: "Losange avec un trait pointillé, placé sur la conduite de retour.",
    role: "Filtrer finement toute l'huile qui revient au réservoir (environ 10 à 25 µm) pour garder une huile propre.",
    fonctionnement: "L'huile traverse une cartouche filtrante. Un clapet by-pass s'ouvre si la cartouche est colmatée, pour éviter l'éclatement ; un indicateur de colmatage signale qu'il faut changer la cartouche.",
    pannes: [
      "Cartouche colmatée : le by-pass s'ouvre, l'huile n'est plus filtrée.",
      "Mauvaise cartouche ou joint absent : huile non filtrée.",
      "Changement oublié : usure de tous les composants."
    ]
  },
  tuyaux: {
    nom: "Tuyauteries et flexibles",
    symbole: "Trait plein : conduite de travail ; trait interrompu : pilotage ou drainage.",
    role: "Transporter l'huile entre les composants.",
    fonctionnement: "Code couleur de l'animation : BLEU = aspiration (dépression), ROUGE = haute pression, VERT = retour au réservoir, GRIS = huile au repos. Les flexibles haute pression ont une pression de service marquée sur leur gaine ; les raccords doivent être serrés au bon couple.",
    pannes: [
      "Fuite au raccord : perte d'huile, baisse de niveau, risque d'incendie et de glissade.",
      "Flexible poreux ou gonflé : à remplacer immédiatement.",
      "ATTENTION : ne jamais chercher une fuite avec la main (injection d'huile sous la peau) — utiliser un carton."
    ]
  }
};

/* ---------------------------------------------------------------------
   MODE « PAS À PAS »
   Chaque étape impose un état à la simulation et met en évidence
   certains composants (focus caméra + cadre de sélection).
   --------------------------------------------------------------------- */
export const ETAPES = [
  {
    titre: "1. Aspiration",
    texte: "Le moteur électrique entraîne la pompe. Les engrenages en tournant créent une légère dépression côté aspiration : l'huile du réservoir monte à travers la crépine (particules BLEUES). La pompe ne « tire » pas fort : l'aspiration doit être courte, large et sans prise d'air.",
    etat: { pompe: true, distributeur: 0 },
    focus: ["reservoir", "crepine", "pompe", "moteur"]
  },
  {
    titre: "2. Refoulement et sécurité",
    texte: "La pompe refoule l'huile dans la conduite de pression (ROUGE). Le manomètre indique la pression. Le limiteur de pression est branché sur cette conduite : il est fermé tant que la pression reste sous son tarage. Distributeur au neutre (centre tandem) : l'huile retourne au réservoir sans effort, la pression reste faible.",
    etat: { pompe: true, distributeur: 0 },
    focus: ["pompe", "manometre", "limiteur"]
  },
  {
    titre: "3. Clapet et régulateur de débit",
    texte: "L'huile traverse le clapet anti-retour (passage dans un seul sens, il protège la pompe d'un retour d'huile), puis le régulateur de débit. En tournant la molette (curseur « Débit »), on règle la vitesse du vérin.",
    etat: { pompe: true, distributeur: 0 },
    focus: ["clapet", "regulateur"]
  },
  {
    titre: "4. Le distributeur 4/3",
    texte: "Le tiroir du distributeur se déplace pour relier les orifices. Sortie de tige : P→A et B→T. Neutre : P→T (A et B bloqués). Rentrée : P→B et A→T. Observez le tiroir qui coulisse et les repères P, T, A, B.",
    etat: { pompe: true, distributeur: 1, positionVerin: 0.05 },
    focus: ["distributeur"]
  },
  {
    titre: "5. Le vérin sort",
    texte: "L'huile sous pression entre dans la chambre arrière du vérin (côté A) et pousse le piston : la tige sort. L'huile de la chambre avant (côté B) est chassée vers le distributeur puis vers le réservoir (VERT). Force F = p × S.",
    etat: { pompe: true, distributeur: 1, positionVerin: 0.1 },
    focus: ["verin"]
  },
  {
    titre: "6. Fin de course : le limiteur s'ouvre",
    texte: "La tige est arrivée en butée : l'huile ne peut plus avancer. La pression monte très vite jusqu'au tarage du limiteur, qui s'ouvre : tout le débit de la pompe retourne au réservoir par le limiteur (flèches VERTES rapides). Le manomètre affiche la pression de tarage. Si on reste longtemps ainsi, l'huile chauffe !",
    etat: { pompe: true, distributeur: 1, positionVerin: 1 },
    focus: ["limiteur", "manometre", "verin"]
  },
  {
    titre: "7. Rentrée et retour au réservoir",
    texte: "On bascule le distributeur en rentrée : l'huile arrive côté B (avant du piston) et la tige rentre, plus vite car la surface annulaire est plus petite. L'huile de la chambre A retourne au réservoir par le distributeur (A→T) puis le filtre de retour, qui la nettoie.",
    etat: { pompe: true, distributeur: -1, positionVerin: 0.95 },
    focus: ["verin", "distributeur", "filtreRetour", "reservoir"]
  }
];

/* ---------------------------------------------------------------------
   MODE « PANNES »
   --------------------------------------------------------------------- */
export const PANNES = {
  filtre: {
    nom: "Crépine / filtre d'aspiration colmaté",
    composant: "crepine",
    symptomes: [
      "Bruit anormal de la pompe (bruit de « graviers » : cavitation).",
      "Vérin plus lent que d'habitude, mouvements parfois saccadés.",
      "Bulles et mousse dans l'huile, vibrations de la conduite d'aspiration.",
      "Pression instable (l'aiguille du manomètre tremble)."
    ],
    causes: [
      "Huile sale, entretien non fait.",
      "Cartouche ou crépine jamais nettoyée.",
      "Huile trop froide (trop visqueuse) au démarrage."
    ],
    solutions: [
      "Arrêter la pompe pour éviter sa destruction.",
      "Nettoyer ou remplacer la crépine, vidanger si l'huile est sale.",
      "Vérifier le niveau et la viscosité de l'huile.",
      "Remplacer aussi le filtre de retour et respecter les intervalles d'entretien."
    ]
  },
  fuite: {
    nom: "Fuite externe (raccord côté vérin)",
    composant: "tuyaux",
    symptomes: [
      "Gouttes / flaque d'huile sous le raccord.",
      "Le niveau du réservoir baisse.",
      "Le vérin est plus lent (une partie du débit s'échappe).",
      "Si la pompe est arrêtée longtemps, la tige peut redescendre doucement (huile perdue)."
    ],
    causes: [
      "Raccord desserré ou mal serré.",
      "Joint torique abîmé ou absent.",
      "Flexible usé, frotté ou poreux."
    ],
    solutions: [
      "Arrêter la pompe et faire chuter la pression AVANT d'intervenir.",
      "Repérer la fuite avec un carton (jamais avec la main !).",
      "Resserrer au bon couple ou remplacer le joint / le flexible.",
      "Nettoyer, compléter le niveau d'huile, contrôler l'absence de fuite."
    ]
  },
  pompe: {
    nom: "Pompe usée",
    composant: "pompe",
    symptomes: [
      "Vérin lent, même avec le régulateur grand ouvert.",
      "La pression n'atteint jamais le tarage du limiteur, même en fin de course.",
      "Pompe et huile qui chauffent.",
      "Le vérin manque de force sous charge."
    ],
    causes: [
      "Usure normale après de nombreuses heures.",
      "Huile polluée (particules abrasives).",
      "Cavitation répétée, huile inadaptée."
    ],
    solutions: [
      "Mesurer le débit de la pompe avec un débitmètre et comparer à la valeur constructeur.",
      "Remplacer ou réviser la pompe.",
      "Trouver la cause : vidange, filtration, contrôle de l'aspiration."
    ]
  },
  clapet: {
    nom: "Clapet anti-retour bloqué fermé",
    composant: "clapet",
    symptomes: [
      "Le vérin ne bouge pas, dans aucun sens.",
      "Le manomètre affiche la pression de tarage dès que la pompe tourne.",
      "Le limiteur est ouvert en permanence : bruit de sifflement, l'huile chauffe."
    ],
    causes: [
      "Saleté coincée dans le clapet.",
      "Clapet monté à l'envers après une intervention.",
      "Bille ou siège déformé."
    ],
    solutions: [
      "Arrêter la pompe, décompresser le circuit.",
      "Démonter, nettoyer le clapet, contrôler le sens de montage (flèche).",
      "Remplacer le clapet s'il est abîmé, puis nettoyer le circuit."
    ]
  }
};

/* ---------------------------------------------------------------------
   QUIZ — 10 questions à choix multiples
   « bonne » = index de la bonne réponse dans « choix ».
   --------------------------------------------------------------------- */
export const QUIZ = [
  {
    q: "Que crée une pompe hydraulique ?",
    choix: ["De la pression", "Du débit", "De la chaleur", "Du vide uniquement"],
    bonne: 1,
    expl: "La pompe crée du débit. La pression apparaît seulement quand l'huile rencontre une résistance (charge, fin de course, étranglement)."
  },
  {
    q: "Quel composant protège le circuit contre une pression trop élevée ?",
    choix: ["Le clapet anti-retour", "Le régulateur de débit", "Le limiteur de pression", "Le manomètre"],
    bonne: 2,
    expl: "Le limiteur de pression (soupape de sûreté) s'ouvre au tarage et renvoie l'huile au réservoir."
  },
  {
    q: "Le vérin arrive en fin de course, distributeur toujours actionné. Que se passe-t-il ?",
    choix: [
      "La pompe s'arrête toute seule",
      "La pression monte jusqu'au tarage et le limiteur renvoie l'huile au réservoir",
      "La pression tombe à zéro",
      "Le clapet anti-retour s'ouvre en grand"
    ],
    bonne: 1,
    expl: "L'huile ne peut plus avancer : la pression monte jusqu'au tarage, le limiteur s'ouvre et l'huile retourne au réservoir en chauffant."
  },
  {
    q: "Dans un distributeur 4/3, que signifient « 4 » et « 3 » ?",
    choix: [
      "4 positions et 3 orifices",
      "4 orifices et 3 positions",
      "4 bars et 3 litres",
      "4 vérins et 3 pompes"
    ],
    bonne: 1,
    expl: "Le premier chiffre est le nombre d'orifices (P, T, A, B), le second le nombre de positions (sortie, neutre, rentrée)."
  },
  {
    q: "Dans l'animation, que représentent les particules VERTES ?",
    choix: ["L'aspiration", "La haute pression", "Le retour au réservoir", "Une fuite"],
    bonne: 2,
    expl: "Bleu = aspiration, rouge = haute pression, vert = retour au réservoir."
  },
  {
    q: "Quel réglage modifie la VITESSE du vérin ?",
    choix: ["Le limiteur de pression", "Le régulateur de débit", "Le manomètre", "Le filtre de retour"],
    bonne: 1,
    expl: "La vitesse dépend du débit : v = Q / S. On la règle avec le régulateur de débit."
  },
  {
    q: "La pompe fait un bruit de « graviers » et le vérin est lent. Cause la plus probable ?",
    choix: ["Crépine d'aspiration colmatée (cavitation)", "Limiteur réglé trop haut", "Manomètre cassé", "Distributeur au neutre"],
    bonne: 0,
    expl: "Une aspiration difficile (crépine colmatée, niveau bas) provoque la cavitation : bruit, débit réduit, usure de la pompe."
  },
  {
    q: "Pourquoi la tige rentre-t-elle plus vite qu'elle ne sort (à débit égal) ?",
    choix: [
      "Parce que la pression est plus forte en rentrée",
      "Parce que la surface côté tige est plus petite",
      "Parce que le limiteur s'ouvre",
      "Ce n'est pas vrai, la vitesse est identique"
    ],
    bonne: 1,
    expl: "Côté tige, la surface utile est la surface du piston moins celle de la tige. Pour un même débit, une surface plus petite donne une vitesse plus grande."
  },
  {
    q: "Comment rechercher une fuite sur un flexible sous pression ?",
    choix: ["En passant la main dessus", "Avec un morceau de carton, pompe arrêtée si possible", "En serrant le flexible avec une pince", "En augmentant la pression"],
    bonne: 1,
    expl: "Un jet d'huile fin peut traverser la peau (injection) : c'est très grave. On utilise un carton et on décomprime avant d'intervenir."
  },
  {
    q: "Le manomètre affiche la pression de tarage dès le démarrage et le vérin ne bouge jamais. Quelle panne ?",
    choix: ["Pompe usée", "Fuite au raccord", "Clapet anti-retour bloqué fermé", "Filtre de retour neuf"],
    bonne: 2,
    expl: "Si le passage est bloqué en aval de la pompe, l'huile ne peut aller que par le limiteur : pression maximale, aucun mouvement."
  }
];
