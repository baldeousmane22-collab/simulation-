/* =====================================================================
   sw.js — Service worker : mise en cache pour l'utilisation hors connexion
   « Cache d'abord, réseau en secours ». VERSION_CACHE est changé à chaque
   publication (workflow GitHub Pages) : les téléphones se mettent à jour.
   ===================================================================== */
const VERSION_CACHE = 'banc-accouplements-v1';
const FICHIERS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/main.js', './js/config.js', './js/banc/app.js', './js/banc/simulation.js',
  './js/banc/scene3d.js', './js/banc/donnees.js',
  './vendor/three.min.js', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION_CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k.startsWith('banc-accouplements-') && k !== VERSION_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(rep => rep || fetch(e.request)));
});
