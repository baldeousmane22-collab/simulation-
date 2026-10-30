#!/usr/bin/env bash
# Copie l'application web du dossier broyage (index.html, css, js, vendor/three.min.js, icônes)
# dans broyage/apk/www pour l'APK. Three.js est embarqué : la 3D fonctionne hors connexion.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www
mkdir -p www
for f in index.html manifest.webmanifest css js vendor icons; do cp -r "../$f" www/; done
test -f www/index.html && test -f www/js/app.js && test -f www/vendor/three.min.js
echo "Application web prête dans broyage/apk/www"
