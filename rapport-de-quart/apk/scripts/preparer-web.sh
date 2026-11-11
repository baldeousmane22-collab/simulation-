#!/usr/bin/env bash
# Copie l'application web du dossier rapport-de-quart (index.html + vendor/jspdf)
# dans rapport-de-quart/apk/www pour l'APK.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www
mkdir -p www
cp ../index.html www/
cp -r ../vendor www/
test -f www/index.html
test -f www/vendor/jspdf.umd.min.js
echo "Application web prête dans rapport-de-quart/apk/www"
