#!/usr/bin/env bash
# Copie l'application web du dossier antidevireur-ringspann (index.html) dans antidevireur-ringspann/apk/www pour l'APK.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www
mkdir -p www
cp ../index.html www/
test -f www/index.html
echo "Application web prête dans antidevireur-ringspann/apk/www"
