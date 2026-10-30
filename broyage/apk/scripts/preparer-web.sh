#!/usr/bin/env bash
# Copie l'application web du dossier broyage (index.html, css, js, icônes)
# dans broyage/apk/www pour l'APK. Aucune bibliothèque externe : tout fonctionne hors connexion.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www
mkdir -p www
for f in index.html manifest.webmanifest css js icons; do cp -r "../$f" www/; done
test -f www/index.html && test -f www/js/app.js
echo "Application web prête dans broyage/apk/www"
