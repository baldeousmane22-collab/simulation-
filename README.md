# Simulateur hydraulique 3D

Application de formation pour élèves mécaniciens : un banc hydraulique complet en 3D
(réservoir, crépine, pompe à engrenages + moteur, limiteur de pression, manomètre,
clapet anti-retour, régulateur de débit, distributeur 4/3, vérin double effet, filtre de retour),
avec circulation de l'huile animée, fiches techniques, mode pas à pas, mode pannes,
schéma ISO 1219 et quiz.

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

### Garder la même signature d'une version à l'autre (facultatif mais conseillé)

Sans configuration, chaque construction utilise une clé temporaire : pour installer une
nouvelle version il faut alors d'abord **désinstaller** l'ancienne. Pour une clé permanente :

1. Sur un PC avec Java : `keytool -genkeypair -keystore hydraulique.jks -alias hydraulique -keyalg RSA -keysize 2048 -validity 10000`
2. Convertir en texte : `base64 -w0 hydraulique.jks > cle.txt`
3. Sur GitHub : **Settings → Secrets and variables → Actions → New repository secret**, créer :
   `ANDROID_KEYSTORE_BASE64` (contenu de cle.txt), `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS` (`hydraulique`) et `ANDROID_KEY_PASSWORD`.
4. Relancer le workflow (Actions → « Construire l'APK Android » → Run workflow).

Conservez précieusement le fichier `.jks` et son mot de passe.

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
  vendor/three.min.js   Three.js r186 (embarqué pour le hors-connexion)
  sw.js, manifest.webmanifest, icons/   PWA
android/                Projet Android Capacitor 8
.github/workflows/      Publication GitHub Pages + construction de l'APK
```

Tester sur un PC : `npx http-server www -p 8080` puis ouvrir http://localhost:8080.

Les textes destinés aux élèves sont tous dans `www/js/donnees.js` : le formateur peut
les modifier sans toucher au reste. Après une modification, changer `VERSION_CACHE`
dans `www/sw.js` pour que les téléphones récupèrent la nouvelle version.
