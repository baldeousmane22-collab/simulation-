#!/usr/bin/env bash
# =====================================================================
# version.sh — Calcule et applique le numéro de version (GitHub Actions)
# ---------------------------------------------------------------------
# Version = 1.0.N, où N = nombre de commits de la branche : il augmente
# à chaque modification et il est identique pour le site, le cache hors
# connexion et l'APK (même commit = même numéro).
# Le code de version Android vaut 100 + N (toujours croissant).
# Nécessite un historique complet (actions/checkout avec fetch-depth: 0).
# =====================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
N=$(git rev-list --count HEAD)
VERSION="1.0.${N}"
CODE=$((100 + N))
sed -i.bak "s/^export const VERSION = .*/export const VERSION = '${VERSION}';/" www/js/version.js
sed -i.bak "s/^const VERSION_CACHE = .*/const VERSION_CACHE = 'hydraulique-3d-v${VERSION}';/" www/sw.js
rm -f www/js/version.js.bak www/sw.js.bak
grep -q "'${VERSION}'" www/js/version.js && grep -q "v${VERSION}'" www/sw.js
echo "Version appliquée : ${VERSION} (code Android ${CODE})"
if [ -n "${GITHUB_ENV:-}" ]; then
  echo "VERSION_NAME=${VERSION}" >> "$GITHUB_ENV"
  echo "VERSION_CODE=${CODE}" >> "$GITHUB_ENV"
fi
