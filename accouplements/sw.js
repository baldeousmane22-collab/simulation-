/* =====================================================================
   sw.js — Service worker : mise en cache pour l'utilisation hors connexion
   ---------------------------------------------------------------------
   « Cache d'abord, réseau en secours ». Changer VERSION_CACHE à chaque
   livraison pour que les téléphones téléchargent la nouvelle version.
   ===================================================================== */
const VERSION_CACHE = 'accouplements-v1';
const FICHIERS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/scene3d.js', './js/donnees.js',
  './vendor/three.min.js', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION_CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k.startsWith('accouplements-') && k !== VERSION_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(rep => rep || fetch(e.request)));
});
