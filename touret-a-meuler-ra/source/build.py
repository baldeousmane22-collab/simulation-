# Construit ../index.html (page autonome) : python3 build.py   (nécessite node + npm i three@0.170 esbuild)
import base64, subprocess, os
here = os.path.dirname(os.path.abspath(__file__))
subprocess.run(["npx", "esbuild", os.path.join(here, "src/ar_main.js"), "--bundle", "--minify", "--format=iife", "--outfile=/tmp/_b.js", "--log-level=warning"], check=True)
js = open('/tmp/_b.js').read().replace('</script', '<\\/script')
h = open(os.path.join(here, 'ar_template.html')).read().replace('__JS__', js)
open(os.path.join(here, '..', 'index.html'), 'w').write(h); print('index.html', len(h) // 1024, 'KB')
