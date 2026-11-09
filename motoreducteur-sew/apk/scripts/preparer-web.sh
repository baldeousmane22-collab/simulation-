#!/usr/bin/env bash
# Copie l'application web du dossier motoreducteur-sew (un seul fichier index.html,
# Three.js déjà intégré) dans motoreducteur-sew/apk/www pour l'APK.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www
mkdir -p www
cp ../index.html www/
test -f www/index.html
echo "Application web prête dans motoreducteur-sew/apk/www"
