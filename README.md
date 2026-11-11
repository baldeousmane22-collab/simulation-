# Simulateur hydraulique 3D

Application de formation pour élèves mécaniciens : un banc hydraulique complet en 3D
(réservoir, crépine, pompe à engrenages + moteur, limiteur de pression, manomètre,
clapet anti-retour, régulateur de débit, distributeur 4/3, vérin double effet, filtre de retour),
avec circulation de l'huile animée, fiches techniques, mode pas à pas, mode pannes,
schéma ISO 1219 et quiz.

Le moteur, le motoréducteur et le banc d'accouplements sont des applications séparées (voir plus bas).

## 1. Ouvrir l'application web (aucune installation)

**Lien :** https://baldeousmane22-collab.github.io/simulation-/hydraulique/

(La racine https://baldeousmane22-collab.github.io/simulation-/ affiche la liste de toutes les applis.)

- Fonctionne dans Chrome sur Android (et sur PC, tablette, iPhone).
- Pour l'installer comme une appli : menu ⋮ de Chrome → **« Ajouter à l'écran d'accueil »**
  (ou le bouton « Installer » sur l'écran d'accueil de l'appli).
- Après la première ouverture, elle fonctionne **hors connexion**.

### Sur iPhone / iPad

Un fichier APK ne s'installe pas sur iPhone (c'est un format Android). Sur iPhone,
on utilise l'application web, qui s'installe comme une vraie appli :

1. Ouvrir le lien ci-dessus dans **Safari**.
2. Toucher **Partager** (carré avec une flèche ⬆️) puis **« Sur l'écran d'accueil »**.
3. L'icône « Hydraulique 3D » apparaît : l'appli s'ouvre en plein écran et marche hors connexion.

**Version iPhone native (facultatif)** : le dossier `ios/` contient le projet iOS
(Capacitor) et le workflow « Construire l'app iPhone » le compile sur un Mac GitHub.
Pour obtenir une app installable, Apple impose un compte **Apple Developer (99 $/an)** :

1. S'inscrire sur https://developer.apple.com/programs/ .
2. Dans App Store Connect (https://appstoreconnect.apple.com) : **Apps → +** → nouvelle app,
   identifiant de paquet `fr.formation.hydraulique3d`, nom « Hydraulique 3D ».
3. **Utilisateurs et accès → Intégrations → Clés API App Store Connect** : créer une clé
   avec le rôle **Admin**, télécharger le fichier `AuthKey_XXXX.p8`.
4. Dans GitHub → Settings → Secrets and variables → Actions, créer :
   `APPLE_TEAM_ID` (Membership details sur developer.apple.com), `APPSTORE_KEY_ID`,
   `APPSTORE_ISSUER_ID` et `APPSTORE_PRIVATE_KEY` (tout le contenu du fichier .p8).
5. Relancer le workflow « Construire l'app iPhone » : l'app est signée et envoyée sur
   **TestFlight**. Les élèves installent l'app gratuite « TestFlight » puis l'invitation.

## 2. Télécharger l'APK Android

**Lien direct :** https://github.com/baldeousmane22-collab/simulation-/releases/latest/download/Hydraulique3D.apk

(ou page des versions : https://github.com/baldeousmane22-collab/simulation-/releases/latest)

1. Ouvrir le lien sur le téléphone : le fichier `Hydraulique3D.apk` se télécharge.
2. Toucher le fichier téléchargé → Android demande d'autoriser l'installation
   depuis Chrome (« sources inconnues ») : accepter, puis **Installer**.
3. Compatible Android 7.0 et plus (cible : Android 16, API 36).

L'APK est reconstruit et signé automatiquement par GitHub Actions à chaque modification
(onglet **Actions** du dépôt → « Construire l'APK Android »).

### Signature permanente (mises à jour sans désinstaller)

**Rien à configurer** : à la première construction, GitHub crée une clé de signature
permanente et la garde dans le cache privé des constructions (elle n'est jamais publiée
dans le dépôt). Chaque APK est ensuite signé avec cette **même clé** : les nouvelles versions
s'installent par-dessus l'ancienne. Une tâche hebdomadaire réutilise la clé pour que GitHub
ne l'efface pas (un cache inutilisé 7 jours est supprimé).

Option plus sûre à long terme : si les 4 secrets ci-dessous sont créés dans
**Settings → Secrets and variables → Actions**, ils sont utilisés en priorité.

| Secret | Contenu |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | le fichier de clé (.jks) converti en texte base64 |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe du fichier de clé |
| `ANDROID_KEY_ALIAS` | `hydraulique` |
| `ANDROID_KEY_PASSWORD` | même mot de passe que ci-dessus |

Pour créer une nouvelle clé (seulement si on en change) :
`keytool -genkeypair -keystore hydraulique.jks -storetype PKCS12 -alias hydraulique -keyalg EC -groupname secp256r1 -validity 10950`
puis `base64 -w0 hydraulique.jks`. Conservez précieusement la clé et son mot de passe :
si on la perd, les téléphones devront désinstaller l'appli une fois.

## Numéro de version

La version (`1.0.N`, N = nombre de commits) est calculée automatiquement à chaque
construction par `scripts/version.sh`. Le même numéro apparaît sur l'accueil de l'appli, dans
le cache hors connexion (`VERSION_CACHE` de `hydraulique/sw.js`) et dans l'APK. Comme `sw.js` change
à chaque livraison, les téléphones téléchargent tout seuls la nouvelle version.

## 3. Utilisation

| Élément | Action |
|---|---|
| 1 doigt | tourner autour du banc |
| 2 doigts | pincer pour zoomer, glisser pour déplacer |
| Toucher un composant (ou son étiquette) | fiche : rôle, fonctionnement, pannes |
| « Recentrer la vue » | revenir à la vue d'ensemble |
| Pompe | démarrer / arrêter le moteur et la pompe |
| ◀ Rentrée / ■ Neutre / Sortie ▶ | position du distributeur 4/3 |
| Curseur Débit | vitesse du vérin (régulateur de débit) |
| Curseur Limiteur | tarage de la soupape de sûreté (20 à 200 bar) |
| 🏷️ / 📐 | afficher les étiquettes / ouvrir le schéma ISO 1219 |

Couleurs de l'huile : **bleu** = aspiration, **rouge** = haute pression,
**vert** = retour au réservoir, **gris** = huile au repos.

Onglets du panneau : **Commandes**, **Pas à pas** (7 étapes commentées),
**Pannes** (crépine colmatée, fuite, pompe usée, clapet bloqué + « panne mystère »
à diagnostiquer) et **Quiz** (10 questions, correction à la fin).

## 4. Organisation du code

```
hydraulique/            Application web (publiée dans /hydraulique/ et embarquée dans l'APK)
  index.html            Écrans et panneaux
  css/style.css         Mise en page mobile (portrait / paysage)
  js/app.js             Interface, modes, quiz, navigation, PWA
  js/simulation.js      Modèle physique (débits, pressions, vérin, pannes)
  js/scene3d.js         Scène 3D Three.js (composants, tuyaux, particules, tactile)
  js/schema.js          Schéma ISO 1219 en SVG, coloré en direct
  js/donnees.js         Textes pédagogiques (fiches, étapes, pannes, quiz)
  js/version.js         Numéro de version (rempli automatiquement)
  vendor/three.min.js   Three.js r186 (embarqué pour le hors-connexion)
  sw.js, manifest.webmanifest, icons/   PWA
android/, ios/          Projets Android et iPhone (Capacitor 8) de l'appli hydraulique
www/                    Racine du site : liste des applis (index.html) + plan-maison/
.github/workflows/      Publication GitHub Pages + construction de l'APK
```

Tester sur un PC : `npx http-server hydraulique -p 8080` puis ouvrir http://localhost:8080.

Les textes destinés aux élèves sont dans `hydraulique/js/donnees.js` : le formateur peut
les modifier sans toucher au reste. Le numéro de version et le cache hors connexion sont
mis à jour automatiquement à chaque publication.

---

# Plan de maison (plain-pied, 3 chambres)

Application de plan d'architecte : terrain 20,00 × 25,00 m, maison 15,00 × 12,00 m + terrasse
couverte, abri voiture, annexe, clôture, portail et portillon.

- **Lien web (aucune autorisation demandée)** : https://baldeousmane22-collab.github.io/simulation-/plan-maison/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/plan-maison/PlanMaison.apk

Onglets **Plan 2D** (cotes complètes, portes avec arcs, fenêtres, flèche du nord, échelle graphique,
cartouche, tableau des surfaces, export PNG A3 au 1/100), **Vue 3D** (toit amovible, étiquettes,
voiture, rotation / pincement / déplacement à deux doigts) et **Surfaces** (détail des pièces,
emprise bâtie, % du terrain, vérification automatique que toutes les cotes s'additionnent).

Toute l'appli tient dans `www/plan-maison/index.html` ; toutes les dimensions sont dans l'objet
`CONFIG` en tête du script. Le projet Android est dans `plan-maison/` (Capacitor 8, Three.js
embarqué pour fonctionner hors connexion) et l'APK est construit par le workflow
« Construire l'APK Plan de maison ».

---

# Accouplements 3D (types et défauts d'alignement)

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/accouplements/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/accouplements/Accouplements.apk

**Écran d'accueil** : 📘 **Cours** (dossier `accouplements/cours/` : 12 chapitres pour le brevet technique — définition,
classification, rigides, élastiques, métalliques, Oldham et cardan, défauts d'alignement, méthode d'alignement,
choix et calcul du couple, entretien et sécurité, résumé + exercices corrigés ; chaque chapitre a un bouton
« Voir en 3D »), Simulation 3D, Défauts d'alignement, Comparer, Quiz.

**12 types d'accouplement** animés en 3D : rigide à plateaux, rigide à manchon, à crabots (étoile),
à pneu, à broches et douilles, à lames (avec entretoise), à denture double, à chaîne double,
à grille, Oldham, joint de cardan, à soufflet métallique. Vue éclatée, carter transparent,
nom des pièces au toucher.

**Défauts d'alignement** (animés, exagérés à l'écran) : décalage parallèle, angulaire, combiné,
écart axial, avec démonstration automatique. Cinématique réelle : disque d'Oldham qui décrit un
cercle à 2× la vitesse, cardan non homocinétique (courbe de vitesse de sortie), entretoise et
soufflet qui se plient. Diagnostic : % de tolérance, vibrations ISO 10816 (signal + spectre 1×/2×/3×),
température, durée de vie, efforts sur les roulements. Onglets **Fiche**, **Comparer** et **Quiz**.

Tout est dans le dossier `accouplements/` (projet Android dans `accouplements/apk`,
construit par l'action « Construire l'APK Accouplements »).

---

# Engrenages 3D (types, formules et calculs — brevet technique)

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/engrenages/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/engrenages/Engrenages.apk

**8 types d'engrenages animés en 3D**, avec un vrai profil de dent en développante de cercle (α = 20°)
et des roues synchronisées : denture droite, hélicoïdale, intérieure (couronne), pignon-crémaillère
(aller-retour), conique (renvoi d'angle 90°), roue et vis sans fin, train à 2 étages, train épicycloïdal
(planétaire, satellites, porte-satellites). Flèches de sens de rotation, étiquettes avec les vitesses,
nom des pièces au toucher, vitesse d'animation, pause, plein écran.

Onglets : **Réglages** (module normalisé, nombres de dents, β, filets, q, frottement, n1, P, η + alertes :
interférence Z < 17, montage des satellites, irréversibilité…), **Calculs** (chaque grandeur avec sa formule,
l'application numérique et le résultat : p, d, da, df, db, ha, hf, h, a, r, i, n2, ω, C1, C2, Ft, Fr, Fa,
δ1/δ2, γ, rendement de la vis, formule de Willis…), **Profil** (dessin coté des dents, zoomable au doigt),
**Cours** (définition, utilisations, avantages / inconvénients, formules générales, vocabulaire, classification),
**Exercices** (9 exercices corrigés + entraînement aux valeurs aléatoires avec vérification) et **Quiz** (18 questions).

Tout est dans le dossier `engrenages/` (textes modifiables dans `engrenages/js/donnees.js`, formules dans
`engrenages/js/calculs.js`) ; projet Android dans `engrenages/apk`, construit par l'action
« Construire l'APK Engrenages ».

---

# Chaîne de broyage 3D (culbuteur → alimentateur → chaîne racleuse → broyeur → CV301)

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/broyage/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/broyage/Broyage.apk

Simulation **3D animée** (vue 2D en option, bouton « 2D ») de la ligne de broyage de la bauxite : **voie ferrée** (rails, traverses, ballast) avec une rame de wagons qui avance à chaque échange, **culbuteur** (rotation du wagon à 160°,
bridage, couronne + pignon), **trémie**, **alimentateur à tabliers** (variateur 10–50 Hz, débit calculé),
**miettes qui passent entre les tabliers** et tombent dans la **chaîne racleuse**, **broyeur à rouleaux
dentés** contrarotatifs à **deux moteurs (un par module)** et **convoyeur à bande CV301** (tendeur à contrepoids, antidévireur).
Chaque machine montre sa **chaîne cinématique** (moteur → accouplement / coupleur → réducteur → organe).

Onglets : **Commande** (marche / arrêt de chaque machine avec asservissements, démarrage séquentiel de l'aval
vers l'amont, arrêt séquentiel avec vidange, arrêt d'urgence, défauts simulés), **Chaîne cinématique**
(schéma animé + calculs n2 = n1 / i, v = π·D·n / 60, C = 9550·P / n), **Cours** et **Quiz** (10 questions).
En 3D : 1 doigt pour tourner, 2 doigts pour zoomer / déplacer, toucher une machine pour sa fiche.

Tout est dans le dossier `broyage/` (textes et caractéristiques dans `broyage/js/donnees.js`) ; projet Android
dans `broyage/apk`, construit par l'action « Construire l'APK Broyage ».

### Vente : codes d'activation (Chaîne de broyage)

L'appli (site et APK) demande un **code d'activation** ; sans code, un **mode démonstration de 5 minutes** est proposé.

1. Le client ouvre l'appli : l'écran « Activation » affiche l'**identifiant de son appareil** (ex. `K7Q2-M9XD`), qu'il vous envoie.
2. Vous ouvrez le **générateur** : https://baldeousmane22-collab.github.io/simulation-/broyage/generateur-codes.html
   et chargez votre fichier **`cle-privee-NE-PAS-PARTAGER.json`** (gardé chez vous, jamais sur GitHub).
3. Nom du client + identifiant + durée (illimitée, 30 jours, 3 mois, 6 mois, 1 an, date) → **Générer** →
   envoyez le message par WhatsApp (code + lien d'activation directe pour la version web).
4. Le client colle le code → appli activée. Les ventes sont listées dans le générateur (export CSV / Excel).

Le code est **signé** (ECDSA P-256) : l'appli ne contient que la clé publique, personne ne peut fabriquer de code sans
votre clé privée. Chaque code ne marche que sur l'appareil indiqué (si le client efface les données de l'appli, il
faudra un nouveau code). Réglages (numéro WhatsApp du vendeur, durée de la démo) : en haut de `broyage/js/licence.js`.
Limite : le code source étant public, un informaticien pourrait retirer la vérification ; passer le dépôt en privé
renforce la protection.

---

# Fraisage 3D (opérations de fraisage animées)

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/fraisage/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/fraisage/Fraisage.apk
- **QR codes** (à scanner avec l'appareil photo du téléphone) : [fraisage/qr-codes.png](fraisage/qr-codes.png)

Fraiseuse à console en 3D : la fraise tourne, la table / le chariot / la console déplacent la pièce, la matière
est enlevée en direct (copeaux, arrosage, changement d'outil). **16 opérations** : surfaçage en bout (fraise à
surfacer), surfaçage en roulant (fraiseuse horizontale), épaulement, rainure droite, poche, contournage,
chanfrein, rainure à la fraise 3 tailles, rainure en T, queue d'aronde, **perçage** (pointage + foret avec
débourrage), **taraudage M10** (pointage, perçage Ø8,5, taraud avec sortie en rotation inverse, filets visibles),
**alésage Ø25 H7** (avant-trou, tête à aléser en ébauche puis finition) et **taillage d'une roue dentée** Z 16, m 2,5
(fraise-module sur fraiseuse horizontale, diviseur 40 : 1 qui tourne de 2 tours 1/2 entre chaque dent).
Aussi : **rainure de clavette** sur arbre Ø30 posé sur vés (fraise 2 dents Ø8, fraisage pendulaire) et
**fraisage hélicoïdal** (4 goujures à 30°, table orientée, diviseur entraîné par la table via un train de roues).

- **Réglages** : matériau de la pièce, outil ARS / carbure, Vc, fz, sens d'avance (opposition / avalant),
  arrosage ; calcul détaillé de n, Vf, débit de copeaux, puissance et temps de coupe, avec alertes.
- **Fiche** de chaque opération (but, outil, gamme opératoire, astuces, erreurs fréquentes), **Cours** (14 chapitres),
  **Astuces** d'atelier et **Quiz** (45 questions, 10 tirées au hasard, avec explications).

- **Plein écran** (bouton ⛶) : la 3D occupe tout l'écran avec une barre de commandes (opération précédente /
  suivante, liste des opérations, sens d'avance, arrosage, outil ARS / carbure), vitesse, pause, recommencer.

Textes modifiables dans `fraisage/js/donnees.js`.

---

# Moteur asynchrone 3D

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/moteur/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/moteur/Moteur.apk

Moteur asynchrone 1,5 kW piloté par un variateur de fréquence (5 à 60 Hz, rampe, sens de rotation), entraînant
directement un frein de charge (arbre + palier). Mesures en direct : vitesse, glissement, couple, intensité,
puissance, vibrations ISO 10816 ; relais thermique avec réarmement ; décrochage au-delà du couple maximal.
Onglets **Commandes**, **Pannes** (roulement, pied boiteux, machine bloquée + panne mystère) et **Quiz** (9 questions).
Dossier `moteur/`.

---

# Motoréducteur 3D

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/motoreducteur/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/motoreducteur/Motoreducteur.apk

Moteur asynchrone + réducteur à engrenages hélicoïdaux (i = 5, 10, 20 ou 40, carter transparent) + frein de charge :
Ns = Nm ÷ i, Cs = Cm × i × η, rendement par étage, température de l'huile. Onglets **Commandes**, **Pannes**
(manque d'huile, clavette cisaillée, roulement, machine bloquée + panne mystère) et **Quiz** (17 questions).
Dossier `motoreducteur/`.

---

# Simulation Motoréducteur du deferailleur CV 301 (SEW KA97/T DRN180L4, 3D réaliste)

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/motoreducteur-sew/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/motoreducteur-sew/Motoreducteur-SEW-KA97.apk

Motoréducteur réel du broyage (plaque : 22 kW, 1477/123 tr/min, i = 11,99, 1710 N·m, CLP HC 220 synthétique 20 L),
moteur vertical sur réducteur à couple conique, arbre creux et bras de réaction. Vues normale, coupe, éclatée, transparente ;
variateur 0–50 Hz et charge ; onglets **Vidange** (11 étapes animées), **Plaque**, **Cours**, **Calculs**, **Pannes** (9) et **Quiz** (12).
Dossier `motoreducteur-sew/`.

---

# Motoréducteur du deferailleur CV 301 – version 2

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/motoreducteur-sew-v2/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/motoreducteur-sew-v2/Motoreducteur-CV301-V2.apk

Nouvelle version, indépendante de la première (qui reste dans `motoreducteur-sew/`). Même motoréducteur SEW KA97/T DRN180L4,
avec des engrenages à profil en développante (hélicoïdaux et conique spirale) qui engrènent réellement, coupe animée, vue éclatée,
transparence, nomenclature avec isolement des pièces, enregistreur de mesures, vidange en 11 étapes, 10 pannes dont une « panne mystère »,
calculs (vitesse de bande, effort de traction) et quiz de 14 questions. Dossier `motoreducteur-sew-v2/`.

---

# Banc d'accouplements 3D (alignement au comparateur)

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/banc-accouplements/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/banc-accouplements/BancAccouplements.apk

**8 types d'accouplement** entre le moteur et le réducteur (crabots, rigide, pneu, broches, lames, denture, chaîne,
grille), avec comportement, tolérances, pièce d'usure et tableau comparatif. **Alignement** : consignation, comparateurs
radial et de face (12 h / 3 h / 6 h / 9 h), calcul des cales et des déplacements, réglage des cales et des vis de poussée.
**Pannes** (désalignement, pièce d'usure, manque de graisse, pied boiteux, clavette + panne mystère) et **Quiz** (11 questions).
Dossier `banc-accouplements/` (l'appli `accouplements/` — cours + 12 types — reste inchangée).

Ces trois applis partagent le même code de banc (`js/banc/`) ; seul `js/config.js` change d'un dossier à l'autre.

---

# Touret à meuler 3D + réalité augmentée (guidage en rotation)

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/touret-a-meuler-ra/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/touret-ra/TouretRA.apk
  (version 1.0.N toujours plus élevée : s'installe par-dessus l'ancienne)

Touret à meuler d'après le dessin d'ensemble du cours « Solutions constructives – guidage en rotation » (20 repères,
nomenclature en couleurs). **Montage pas à pas** (26 étapes), **en marche** (affûtage avec étincelles), coupe, éclaté,
repères. **Réalité augmentée** : dans Chrome sur Android (ARCore / « Services Google Play pour la RA »), bouton
« 👓 Réalité augmentée », viser une table puis toucher l'écran pour poser le touret à taille réelle (meule Ø200).
Si la caméra est refusée, l'appli explique comment l'autoriser dans les paramètres du téléphone ; dans l'APK, la RA
s'ouvre dans Chrome (lien direct). Dossier `touret-a-meuler-ra/` (page autonome) ; projet Android dans `touret-a-meuler-ra/apk/`.

---

# Hydraulique réaliste 3D (physique réelle)

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/hydraulique-realiste/
- **APK Android** : https://github.com/baldeousmane22-collab/simulation-/releases/download/hydraulique-realiste/HydrauliqueRealiste.apk

Banc complet calculé avec les vraies équations : compressibilité de l'huile, débit des orifices
(`Q = Cd·S·√(2Δp/ρ)`), fuites internes de la pompe, clapet du limiteur, tiroir du distributeur 4/3 (centre fermé
ou tandem, commande proportionnelle), réducteur de débit unidirectionnel (descente freinée), vérin Ø50/28 × 500
qui soulève 0 à 1500 kg, frottements des joints, amortisseurs de fin de course, échauffement et viscosité de l'huile.
**Vue en coupe** (pignons, tiroir, clapet, piston), **voir l'huile** (couleur = pression, chevrons = débit),
**courbes** (15 s), **6 pannes** + panne mystère, **calculs** en direct, sons. Dossier `hydraulique-realiste/`
(l'appli `hydraulique/` reste inchangée) ; projet Android dans `hydraulique-realiste/apk/`.

# Clé pour boulon (caméra en direct)

- **Lien web** : https://baldeousmane22-collab.github.io/simulation-/cle-boulon/
- Dossier séparé : `cle-boulon/` (appli seule, sans lien avec les autres).

On vise la tête du boulon avec la caméra, une carte ou un badge (85,6 mm) posé à côté :
l'appli détecte la carte et la tête hexagonale, projette le gabarit à l'échelle et affiche
la clé (ex. M20 → clé de 30). Réglage à la main possible (image figée, repères, gabarit).
