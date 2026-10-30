/* =====================================================================
   donnees.js — Textes et caractéristiques des machines (modifiables)
   Valeurs d'exemple pédagogique, proches d'une installation réelle.
   ===================================================================== */
'use strict';
window.DONNEES = {
  // Ordre du flux de matière (amont → aval)
  ordre: ['culbuteur', 'alim', 'racleuse', 'broyeur', 'cv301'],

  machines: {
    culbuteur: {
      nom: 'Culbuteur', court: 'Culbuteur',
      role: "Retourne le wagon (rotation ≈ 160°) pour vider la bauxite dans la trémie de réception.",
      aval: ['alim'],
      moteur: { P: 75, n: 1480, nb: 2 },
      chaine: [
        { t: 'moteur', l: 'Moteur ×2', d: '75 kW · 1480 tr/min' },
        { t: 'frein', l: 'Frein', d: 'à disque, manque de courant' },
        { t: 'accouplement', l: 'Accouplement', d: 'élastique' },
        { t: 'reducteur', l: 'Réducteur', d: 'i = 140' },
        { t: 'pignon', l: 'Pignon', d: 'Z1 = 17 dents' },
        { t: 'couronne', l: 'Couronne', d: 'Z2 = 200 dents (anneau)' }
      ],
      i: 140, z1: 17, z2: 200,
      calc(m) {
        const n2 = m.moteur.n / m.i;
        const nc = n2 * m.z1 / m.z2;
        return [
          ['Vitesse sortie réducteur', 'n2 = n1 / i', `1480 / 140`, `${n2.toFixed(1)} tr/min`],
          ['Rapport pignon / couronne', 'i2 = Z2 / Z1', `200 / 17`, `${(m.z2 / m.z1).toFixed(2)}`],
          ['Vitesse du culbuteur', 'nc = n2 × Z1 / Z2', `${n2.toFixed(2)} × 17 / 200`, `${nc.toFixed(2)} tr/min`],
          ['Rapport total', 'it = i × Z2 / Z1', `140 × ${(m.z2 / m.z1).toFixed(2)}`, `${(m.i * m.z2 / m.z1).toFixed(0)}`],
          ['Durée d\'un retournement de 160°', 't = (160/360) × 60 / nc', `0,444 × 60 / ${nc.toFixed(2)}`, `${(160 / 360 * 60 / nc).toFixed(0)} s`]
        ];
      },
      points: ['Wagon bloqué par les brides (bridage) avant rotation.', 'Frein à manque de courant : le culbuteur reste immobile en cas de coupure.', 'Graissage de la couronne et du pignon, contrôle des galets de roulement.', 'Le culbuteur attend si la trémie est pleine.']
    },
    alim: {
      nom: 'Alimentateur à tabliers', court: 'Alimentateur',
      role: "Extrait la bauxite de la trémie à débit réglable (variateur) et la déverse dans le broyeur.",
      aval: ['racleuse', 'broyeur'],
      moteur: { P: 55, n: 1480, nb: 1 },
      chaine: [
        { t: 'variateur', l: 'Variateur', d: '10 à 50 Hz' },
        { t: 'moteur', l: 'Moteur', d: '55 kW · 1480 tr/min à 50 Hz' },
        { t: 'accouplement', l: 'Accouplement', d: 'élastique' },
        { t: 'reducteur', l: 'Réducteur', d: 'arbre creux · i = 250' },
        { t: 'barbotin', l: 'Roues à chaîne', d: 'Ø 0,90 m (arbre de tête)' },
        { t: 'tabliers', l: 'Chaîne + tabliers', d: 'pas 0,30 m · largeur 1,8 m' }
      ],
      i: 250, D: 0.9, b: 1.8, h: 0.8, rho: 1.4, phi: 0.8,
      calc(m, s) {
        const f = s.freq, n1 = m.moteur.n * f / 50, n2 = n1 / m.i, v = Math.PI * m.D * n2 / 60;
        const Q = 3600 * v * m.b * m.h * m.rho * m.phi;
        return [
          ['Vitesse du moteur', 'n1 = 1480 × f / 50', `1480 × ${f} / 50`, `${n1.toFixed(0)} tr/min`],
          ['Vitesse de l\'arbre de tête', 'n2 = n1 / i', `${n1.toFixed(0)} / 250`, `${n2.toFixed(2)} tr/min`],
          ['Vitesse des tabliers', 'v = π × D × n2 / 60', `π × 0,9 × ${n2.toFixed(2)} / 60`, `${v.toFixed(3)} m/s`],
          ['Débit', 'Q = 3600·v·b·h·ρ·φ', `3600 × ${v.toFixed(3)} × 1,8 × 0,8 × 1,4 × 0,8`, `${Q.toFixed(0)} t/h`]
        ];
      },
      points: ['Le variateur règle la vitesse donc le débit envoyé au broyeur.', 'Les miettes (fines) passent entre les tabliers et tombent dans la chaîne racleuse.', 'Contrôler l\'usure des tabliers, des galets et la tension de la chaîne.', 'Bavettes (jupes) latérales pour guider la matière.']
    },
    racleuse: {
      nom: 'Chaîne racleuse', court: 'Chaîne racleuse',
      role: "Récupère les miettes tombées entre les tabliers et les reprend vers le convoyeur CV301.",
      aval: ['cv301'],
      moteur: { P: 11, n: 1460, nb: 1 },
      chaine: [
        { t: 'moteur', l: 'Moteur', d: '11 kW · 1460 tr/min' },
        { t: 'accouplement', l: 'Accouplement', d: 'élastique' },
        { t: 'reducteur', l: 'Réducteur', d: 'i = 70' },
        { t: 'barbotin', l: 'Pignon à empreintes', d: 'Ø 0,40 m' },
        { t: 'raclettes', l: 'Chaîne + raclettes', d: 'raclettes tous les 0,8 m' }
      ],
      i: 70, D: 0.4,
      calc(m) {
        const n2 = m.moteur.n / m.i, v = Math.PI * m.D * n2 / 60;
        return [
          ['Vitesse de sortie', 'n2 = n1 / i', `1460 / 70`, `${n2.toFixed(1)} tr/min`],
          ['Vitesse de la chaîne', 'v = π × D × n2 / 60', `π × 0,4 × ${n2.toFixed(1)} / 60`, `${v.toFixed(2)} m/s`],
          ['Couple sur le pignon', 'C = 9550 × P / n2', `9550 × 11 / ${n2.toFixed(1)}`, `${(9550 * 11 / n2 * 0.9).toFixed(0)} N·m (η 0,9)`]
        ];
      },
      points: ['Si elle s\'arrête, les miettes s\'accumulent sous l\'alimentateur (bourrage).', 'Elle doit tourner avant l\'alimentateur.', 'Contrôler les raclettes, les maillons et la tension (tendeur à la queue).']
    },
    broyeur: {
      nom: 'Broyeur à rouleaux dentés', court: 'Broyeur',
      role: "Concasse les gros blocs entre deux rouleaux dentés qui tournent en sens inverse.",
      aval: ['cv301'],
      moteur: { P: 250, n: 1490, nb: 1 },
      chaine: [
        { t: 'moteur', l: 'Moteur', d: '250 kW · 1490 tr/min' },
        { t: 'coupleur', l: 'Coupleur hydraulique', d: 'démarrage progressif, limite le couple' },
        { t: 'reducteur', l: 'Réducteur', d: 'i = 20' },
        { t: 'synchro', l: 'Pignons de synchro', d: 'Z = Z : sens inverse' },
        { t: 'rouleaux', l: '2 rouleaux dentés', d: 'Ø 0,70 m' }
      ],
      i: 20, D: 0.7,
      calc(m) {
        const n2 = m.moteur.n / m.i, v = Math.PI * m.D * n2 / 60, C = 9550 * m.moteur.P / n2;
        return [
          ['Vitesse des rouleaux', 'n2 = n1 / i', `1490 / 20`, `${n2.toFixed(1)} tr/min`],
          ['Vitesse périphérique', 'v = π × D × n2 / 60', `π × 0,7 × ${n2.toFixed(1)} / 60`, `${v.toFixed(2)} m/s`],
          ['Couple de sortie', 'C = 9550 × P / n2', `9550 × 250 / ${n2.toFixed(1)}`, `${(C / 1000).toFixed(1)} kN·m`],
          ['Rapport des pignons de synchro', 'i = Z2 / Z1', 'Z / Z', '1 (sens inverse)']
        ];
      },
      points: ['Le coupleur hydraulique protège la chaîne cinématique en cas de blocage (bloc trop dur).', 'Les pignons de synchronisation font tourner les 2 rouleaux en sens inverse à la même vitesse.', 'Contrôler l\'usure des dents, le jeu entre rouleaux, le niveau d\'huile du coupleur.']
    },
    cv301: {
      nom: 'Convoyeur à bande CV301', court: 'CV301',
      role: "Évacue la bauxite broyée (et les miettes) vers le stockage / convoyeur suivant.",
      aval: [],
      moteur: { P: 160, n: 1485, nb: 1 },
      chaine: [
        { t: 'moteur', l: 'Moteur', d: '160 kW · 1485 tr/min' },
        { t: 'coupleur', l: 'Coupleur hydraulique', d: 'démarrage en douceur de la bande' },
        { t: 'reducteur', l: 'Réducteur', d: 'i = 20' },
        { t: 'antidevireur', l: 'Antidévireur', d: 'empêche le retour arrière (bande inclinée)' },
        { t: 'tambour', l: 'Tambour de tête', d: 'Ø 1,0 m (motorisé)' }
      ],
      i: 20, D: 1.0, b: 1.4,
      calc(m) {
        const n2 = m.moteur.n / m.i, v = Math.PI * m.D * n2 / 60;
        return [
          ['Vitesse du tambour', 'n2 = n1 / i', `1485 / 20`, `${n2.toFixed(1)} tr/min`],
          ['Vitesse de la bande', 'v = π × D × n2 / 60', `π × 1,0 × ${n2.toFixed(1)} / 60`, `${v.toFixed(2)} m/s`],
          ['Couple au tambour', 'C = 9550 × P / n2', `9550 × 160 / ${n2.toFixed(1)}`, `${(9550 * 160 / n2 / 1000).toFixed(1)} kN·m`]
        ];
      },
      points: ['Premier démarré, dernier arrêté.', 'Tendeur à contrepoids sur le brin de retour, rouleaux porteurs et de retour.', 'Sécurités : tirette d\'arrêt d\'urgence le long de la bande, contrôleur de rotation, déport de bande.']
    }
  },

  cours: `
<h3>La ligne de broyage</h3>
<ol>
  <li><b>Culbuteur</b> : le wagon de bauxite est bridé puis retourné (≈ 160°). La matière tombe dans la <b>trémie</b>.</li>
  <li><b>Alimentateur à tabliers</b> : une chaîne de plaques d'acier (tabliers) extrait la matière sous la trémie, à vitesse réglée par un <b>variateur</b>.</li>
  <li><b>Miettes</b> : les fines passent dans les petits jeux <b>entre les tabliers</b> et tombent dans la <b>chaîne racleuse</b> placée dessous.</li>
  <li><b>Chaîne racleuse</b> : des raclettes poussent les miettes au fond de l'auge et les déversent sur le CV301.</li>
  <li><b>Broyeur</b> : deux rouleaux dentés contrarotatifs concassent les gros blocs.</li>
  <li><b>Convoyeur CV301</b> : la bande reçoit la bauxite broyée et les miettes et les évacue.</li>
</ol>
<h3>La chaîne cinématique</h3>
<p>C'est l'ensemble des organes qui transmettent le mouvement du <b>moteur</b> à l'<b>organe de travail</b> :</p>
<div class="encadre">Moteur → accouplement (ou coupleur hydraulique) → réducteur → organe (pignon, barbotin, tambour, rouleau)</div>
<ul>
  <li><b>Réducteur</b> : diminue la vitesse et augmente le couple. <span class="f">n2 = n1 / i</span> ; <span class="f">C2 ≈ C1 × i × η</span></li>
  <li><b>Vitesse linéaire</b> d'une chaîne ou d'une bande : <span class="f">v = π × D × n / 60</span> (m/s, D en m, n en tr/min)</li>
  <li><b>Couple</b> : <span class="f">C = 9550 × P / n</span> (N·m, P en kW)</li>
  <li><b>Variateur de fréquence</b> : <span class="f">n ≈ n50 × f / 50</span></li>
  <li><b>Coupleur hydraulique</b> : démarrage progressif et protection contre les surcharges.</li>
  <li><b>Antidévireur</b> : empêche une bande inclinée chargée de repartir en arrière à l'arrêt.</li>
  <li><b>Frein</b> : immobilise le culbuteur en position.</li>
</ul>
<h3>Démarrage et arrêt (asservissements)</h3>
<ul>
  <li><b>Démarrage</b> de l'aval vers l'amont : CV301 → broyeur → chaîne racleuse → alimentateur → culbuteur.</li>
  <li><b>Arrêt normal</b> de l'amont vers l'aval : culbuteur → alimentateur → (vidange) → chaîne racleuse → broyeur → CV301.</li>
  <li>Si une machine s'arrête, toutes les machines <b>en amont</b> s'arrêtent automatiquement (sinon bourrage).</li>
</ul>
<h3>Sécurité</h3>
<ul>
  <li>Avant toute intervention : <b>consignation</b> (séparer, condamner par cadenas, identifier, vérifier l'absence d'énergie).</li>
  <li>Ne jamais intervenir sur une chaîne ou une bande en mouvement ; respecter les carters de protection.</li>
  <li>Tirettes d'arrêt d'urgence le long du CV301 et boutons « coup de poing » à chaque machine.</li>
</ul>`,

  quiz: [
    { q: "Dans quel ordre démarre-t-on la ligne ?", r: ["Culbuteur en premier", "CV301 en premier (de l'aval vers l'amont)", "Toutes les machines en même temps"], b: 1 },
    { q: "Pourquoi trouve-t-on une chaîne racleuse sous l'alimentateur ?", r: ["Pour refroidir les tabliers", "Pour récupérer les miettes qui passent entre les tabliers", "Pour tendre la chaîne de l'alimentateur"], b: 1 },
    { q: "Comment règle-t-on le débit de l'alimentateur à tabliers ?", r: ["Avec le variateur de fréquence (vitesse)", "En changeant le réducteur", "En freinant le culbuteur"], b: 0 },
    { q: "Un réducteur de rapport i = 20 reçoit 1490 tr/min. Vitesse de sortie ?", r: ["29 800 tr/min", "74,5 tr/min", "149 tr/min"], b: 1 },
    { q: "Formule de la vitesse d'une bande (tambour Ø D, n tr/min) :", r: ["v = D × n", "v = π × D × n / 60", "v = 9550 × P / n"], b: 1 },
    { q: "Rôle du coupleur hydraulique du broyeur :", r: ["Démarrage progressif et protection contre les surcharges", "Augmenter la vitesse", "Changer le sens de rotation"], b: 0 },
    { q: "Que se passe-t-il si le CV301 s'arrête ?", r: ["Rien", "Seul le culbuteur s'arrête", "Toutes les machines en amont s'arrêtent (asservissement)"], b: 2 },
    { q: "Rôle de l'antidévireur du CV301 :", r: ["Empêcher la bande inclinée de reculer à l'arrêt", "Centrer la bande", "Nettoyer la bande"], b: 0 },
    { q: "Comment tournent les deux rouleaux du broyeur ?", r: ["Dans le même sens", "En sens inverse, entraînés par des pignons de synchronisation", "Un seul rouleau tourne"], b: 1 },
    { q: "Avant d'intervenir sur la chaîne racleuse, on doit :", r: ["Ralentir la chaîne", "Consigner la machine", "Prévenir après l'intervention"], b: 1 }
  ]
};
