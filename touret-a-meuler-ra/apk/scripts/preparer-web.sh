#!/usr/bin/env bash
# Copie la page autonome du touret (index.html : Three.js et code intégrés)
# dans touret-a-meuler-ra/apk/www pour l'APK : la 3D fonctionne hors connexion.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www
mkdir -p www
cp ../index.html www/
test -s www/index.html
echo "Application web prête dans touret-a-meuler-ra/apk/www"
