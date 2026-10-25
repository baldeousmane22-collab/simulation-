#!/usr/bin/env bash
# Copie l'application web du dossier accouplements (index.html, css, js,
# vendor/three.min.js, icônes) dans accouplements/apk/www pour l'APK.
# Three.js est déjà embarqué dans l'appli : la 3D fonctionne hors connexion.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www
mkdir -p www
for f in index.html manifest.webmanifest css js vendor icons; do cp -r "../$f" www/; done
test -f www/index.html && test -f www/vendor/three.min.js
echo "Application web prête dans accouplements/apk/www"
