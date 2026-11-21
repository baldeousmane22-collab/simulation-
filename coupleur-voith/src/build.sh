#!/usr/bin/env bash
# Assemble src/index.html + src/main.js (+ Three.js) en un seul fichier ../index.html
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p /tmp/voith-build
npx --yes esbuild main.js --bundle --minify --format=iife --outfile=/tmp/voith-build/bundle.js --log-level=warning
python3 - <<'P'
h=open('index.html').read(); b=open('/tmp/voith-build/bundle.js').read()
assert '<script>/*BUNDLE*/</script>' in h
open('../index.html','w').write(h.replace('<script>/*BUNDLE*/</script>','<script>'+b.replace('</script','<\\/script')+'</script>'))
P
ls -la ../index.html
