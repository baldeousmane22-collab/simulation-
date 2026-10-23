# Simulateur hydraulique 3D

Application de formation pour élèves mécaniciens : un banc hydraulique complet en 3D
(réservoir, crépine, pompe à engrenages + moteur, limiteur de pression, manomètre,
clapet anti-retour, régulateur de débit, distributeur 4/3, vérin double effet, filtre de retour),
avec circulation de l'huile animée, fiches techniques, mode pas à pas, mode pannes,
schéma ISO 1219 et quiz.

### Banc « Moteur + réducteur » (accouplement)

Depuis l'accueil, le bouton bleu **⚙️ Moteur + réducteur** ouvre un second banc 3D :
moteur asynchrone 1,5 kW piloté par variateur de fréquence, **accouplement au choix**,
**réducteur à engrenages hélicoïdaux** (i = 5, 10, 20 ou 40, carter transparent) et frein de charge.

**8 types d'accouplement**, chacun avec son modèle 3D, son comportement (amortissement, jeu,
graissage, sensibilité au désalignement), ses tolérances, sa pièce d'usure, sa panne et sa fiche :
à crabots (étoile), rigide à plateaux, à pneu, à broches et douilles, à lames, à denture,
à chaîne double et à grille. Le bouton **📊 Comparer les types** affiche un tableau comparatif.

- **Commandes** : marche / arrêt, sens, fréquence (5 à 60 Hz), rapport de réduction, couple
  résistant ; mesures en direct (vitesses, couples, intensité, puissance, glissement, rendement,
  vibrations ISO 10816, températures, usure de l'étoile). Relais thermique avec réarmement.
- **Alignement** : consignation, carter déposé, comparateurs radial et de face, lecture à
  12 h / 3 h / 6 h / 9 h avec règle de validité, calcul des cales et des déplacements,
  réglage des cales sous les pattes et des vis de poussée, tolérances à 1500 tr/min.
- **Pannes** : désalignement, pièce d'usure de l'accouplement (étoile, pneu, douilles, lames,
  dentures, chaîne, grille, boulons), manque de graisse (accouplements graissés), roulement,
  manque d'huile, pied boiteux, clavette cisaillée, machine bloquée + panne mystère.
- **Quiz** : 16 questions sur la transmission, les types d'accouplement et l'alignement.

## 1. Ouvrir l'application web (aucune installation)

**Lien :** https://baldeousmane22-collab.github.io/simulation-/

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
le cache hors connexion (`VERSION_CACHE` de `www/sw.js`) et dans l'APK. Comme `sw.js` change
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
www/                    Application web (c'est elle qui est publiée et embarquée dans l'APK)
  index.html            Écrans et panneaux
  css/style.css         Mise en page mobile (portrait / paysage)
  js/app.js             Interface, modes, quiz, navigation, PWA
  js/simulation.js      Modèle physique (débits, pressions, vérin, pannes)
  js/scene3d.js         Scène 3D Three.js (composants, tuyaux, particules, tactile)
  js/schema.js          Schéma ISO 1219 en SVG, coloré en direct
  js/donnees.js         Textes pédagogiques (fiches, étapes, pannes, quiz)
  js/version.js         Numéro de version (rempli automatiquement)
  js/accouplement/      Banc moteur + accouplement + réducteur :
    app.js              interface, alignement, pannes, quiz
    simulation.js       modèle (courbe de Kloss, réducteur, relais thermique, alignement)
    scene3d.js          scène 3D (moteur, crabots, étoile, engrenages, comparateurs)
    donnees.js          textes pédagogiques (fiches, procédure, pannes, quiz)
  vendor/three.min.js   Three.js r186 (embarqué pour le hors-connexion)
  sw.js, manifest.webmanifest, icons/   PWA
android/                Projet Android Capacitor 8
.github/workflows/      Publication GitHub Pages + construction de l'APK
```

Tester sur un PC : `npx http-server www -p 8080` puis ouvrir http://localhost:8080.

Les textes destinés aux élèves sont dans `www/js/donnees.js` (hydraulique) et
`www/js/accouplement/donnees.js` (moteur + réducteur) : le formateur peut
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
