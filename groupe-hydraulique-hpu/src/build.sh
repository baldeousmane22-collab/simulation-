set -e
cd /home/claude/hpu
npx esbuild src/main.js --bundle --minify --format=iife --outfile=dist/bundle.js --log-level=warning
python3 - <<'P'
h=open('src/index.html').read(); b=open('dist/bundle.js').read()
open('dist/index.html','w').write(h.replace('<script>/*BUNDLE*/</script>','<script>'+b.replace('</script','<\\/script')+'</script>'))
P
ls -la dist
