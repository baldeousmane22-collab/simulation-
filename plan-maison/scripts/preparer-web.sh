#!/usr/bin/env bash
# Copie l'application (fichier unique www/plan-maison/index.html) dans plan-maison/www
# et y ajoute Three.js en local, pour que la 3D fonctionne hors connexion dans l'APK.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www
mkdir -p www/vendor/build www/vendor/examples/jsm/controls
cp ../www/plan-maison/index.html www/index.html
cp node_modules/three/build/three.module.min.js www/vendor/build/
cp node_modules/three/examples/jsm/controls/OrbitControls.js www/vendor/examples/jsm/controls/
echo "Application web prête dans plan-maison/www"
