/* =====================================================================
   sw.js — Service worker : mise en cache pour l'utilisation hors connexion
   ---------------------------------------------------------------------
   Stratégie : on met tous les fichiers en cache à l'installation, puis
   « cache d'abord, réseau en secours ». VERSION_CACHE est remplacé
   automatiquement par GitHub Actions à chaque livraison (scripts/version.sh) :
   le fichier change, le téléphone installe donc la nouvelle version.
   ===================================================================== */
const VERSION_CACHE = 'hydraulique-3d-v1.0.0-dev';
const FICHIERS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/donnees.js',
  './js/simulation.js',
  './js/scene3d.js',
  './js/schema.js',
  './js/version.js',
  './vendor/three.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION_CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // Suppression des anciennes versions du cache
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k !== VERSION_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(rep => rep || fetch(e.request).then(r => {
      // On garde aussi en cache les fichiers récupérés plus tard (même origine)
      if (r.ok && new URL(e.request.url).origin === location.origin) {
        const copie = r.clone();
        caches.open(VERSION_CACHE).then(c => c.put(e.request, copie));
      }
      return r;
    }).catch(() => caches.match('./index.html')))
  );
});
