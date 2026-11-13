#!/usr/bin/env bash
# Copie l'application web du dossier groupe-hydraulique-hpu (index.html) dans groupe-hydraulique-hpu/apk/www pour l'APK.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www
mkdir -p www
cp ../index.html www/
test -f www/index.html
echo "Application web prête dans groupe-hydraulique-hpu/apk/www"
