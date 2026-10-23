# Pompe centrifuge 3D

Application de formation autonome : tout ce qu'elle utilise est dans ce dossier
(HTML, CSS, JavaScript, Three.js, icônes). Elle ne dépend d'aucun autre dossier du dépôt.

## Le banc

Bâche à niveau réglable → crépine + clapet de pied → vanne d'aspiration → vacuomètre →
**pompe centrifuge** (couvercle transparent : la roue tourne) entraînée par un moteur 3 kW
(lanterne, accouplement, variateur de fréquence) → manomètre → clapet anti-retour →
vanne de refoulement → débitmètre à flotteur → retour dans la bâche.

- **Commandes** : marche / arrêt, vanne de refoulement, fréquence (20 à 50 Hz), hauteur
  d'aspiration (pompe en charge ou en aspiration), température de l'eau, vanne d'aspiration,
  amorçage ; procédure de démarrage cochée automatiquement ; mesures en direct (débit, HMT,
  pressions, puissance, intensité, rendement, NPSH, vibrations, températures) et calculs.
- **Courbes** : courbe de la pompe (vitesse actuelle et 50 Hz), courbe du réseau, point de
  fonctionnement, rendement, NPSH requis / disponible avec la zone de cavitation.
- **Pannes** : crépine colmatée, clapet de pied qui fuit (désamorçage), roue usée, sens de
  rotation inversé, garniture qui fuit, roulement usé, prise d'air + panne mystère.
- **Quiz** : 14 questions.

## Ouvrir l'application

Sur un PC : `npx http-server pompe-centrifuge -p 8080` puis http://localhost:8080.
Après la première ouverture (en https ou sur localhost), elle fonctionne hors connexion.

## Organisation

```
index.html            écran, panneau, fiches
css/style.css         mise en page mobile (portrait / paysage)
js/app.js             interface, commandes, pannes, quiz, boucle d'animation
js/simulation.js      modèle : courbes H(Q), lois de similitude, réseau, NPSH, cavitation
js/scene3d.js         scène 3D Three.js
js/courbes.js         courbes caractéristiques en SVG
js/donnees.js         textes pédagogiques (fiches, procédure, pannes, quiz) : modifiables
vendor/three.min.js   Three.js r186 (embarqué pour le hors-connexion)
sw.js, manifest.webmanifest, icons/   application installable (PWA)
```

Après une modification, changer `VERSION_CACHE` dans `sw.js` pour que les téléphones
téléchargent la nouvelle version.
