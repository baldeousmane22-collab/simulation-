# Circuit pneumatique 3D

Application de formation autonome : tout ce qu'elle utilise est dans ce dossier
(HTML, CSS, JavaScript, Three.js, icônes). Elle ne dépend d'aucun autre dossier du dépôt.

## Le banc

Panneau rainuré avec : compresseur à piston + cuve 24 L (pressostat 6 → 8 bar, soupape de
sûreté 10 bar, clapet anti-retour), vanne d'arrivée 3/2 (consignation), FRL (filtre à purge,
régulateur + manomètre, lubrificateur), bloc de distribution, distributeur 5/2 bistable piloté
14 / 12, silencieux, régleurs de débit au refoulement, vérin double effet Ø32 × 200 vertical à
tube transparent qui soulève une charge (0 à 40 kg) avec amortissements de fin de course,
manomètres des chambres A et B, capteurs à galet 1S1 / 1S2 alimentés par le sélecteur de
cycle 0V1. Circuit 2 : bouton poussoir 3/2 NF (2V1) → soupape d'échappement rapide (2V2) →
vérin simple effet à ressort (2A).

Animation : particules d'air dans les tubes (bleu = air comprimé, vert = échappement,
gris = atmosphère), piston / bielle / vilebrequin visibles dans le compresseur transparent,
galets enfoncés par la came, ralentissement et rebond en fin de course, ressort qui se
comprime, gouttes de purge, bouffées d'air. Sons synthétisés (bouton 🔊).

- **Commandes** : compresseur, Sortie / Rentrée / Auto, vanne 3/2, pression, vitesses, charge,
  purge, bouton 2V1 à maintenir ; mesures en direct et calcul de l'effort F = p × S.
- **Schéma** : ISO 1219 coloré en direct (repérage 1A, 1V1, 1V2, 1V3, 1S1, 1S2, 0V1, 2V1, 2V2, 2A).
- **Pannes** : 9 pannes + panne mystère. **Quiz** : 20 questions. Fiche pour chaque composant.

## Ouvrir l'application

Sur un PC : `npx http-server circuit-pneumatique -p 8080` puis http://localhost:8080.
Après la première ouverture (en https ou sur localhost), elle fonctionne hors connexion.

## APK Android

**Lien direct :** https://github.com/baldeousmane22-collab/simulation-/releases/download/circuit-pneumatique/CircuitPneumatique.apk

Ouvrir le lien sur le téléphone, toucher le fichier téléchargé, autoriser l'installation depuis
cette source si Android le demande, puis **Installer** (Android 7.0 minimum). L'appli
« Pneumatique 3D » fonctionne hors connexion ; le bouton retour du téléphone ferme d'abord la
fiche ouverte.

L'APK est reconstruit et signé automatiquement par GitHub Actions à chaque modification du
dossier (workflow « Construire l'APK Circuit pneumatique »), avec la même clé permanente que les
autres applis du dépôt : les mises à jour s'installent par-dessus l'ancienne version.
Le projet Android (Capacitor 8) est dans `apk/` : `apk/scripts/preparer-web.sh` y copie l'appli
web, puis `npx cap sync android` et `./gradlew assembleRelease` construisent l'APK.

## Organisation

```
index.html            écran, panneau, fiches
css/style.css         mise en page mobile (portrait / paysage)
js/app.js             interface, commandes, pannes, quiz, sons, boucle d'animation
js/simulation.js      modèle (orifices ISO 6358, cuve, pressostat, FRL, 5/2, vérins, capteurs)
js/scene3d.js         scène 3D Three.js
js/schema.js          schéma ISO 1219 en SVG, coloré en direct
js/sons.js            bruitages synthétisés (Web Audio)
js/donnees.js         textes pédagogiques (fiches, pannes, quiz) : modifiables
vendor/three.min.js   Three.js r186 (embarqué pour le hors-connexion)
sw.js, manifest.webmanifest, icons/   application installable (PWA)
apk/                  projet Android Capacitor (APK)
```

Après une modification, changer `VERSION_CACHE` dans `sw.js` pour que les téléphones
téléchargent la nouvelle version.
