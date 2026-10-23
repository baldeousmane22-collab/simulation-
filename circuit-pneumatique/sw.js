/* =====================================================================
   sw.js — Service worker : mise en cache pour l'utilisation hors connexion
   ---------------------------------------------------------------------
   « Cache d'abord, réseau en secours ». Changer VERSION_CACHE à chaque
   livraison pour que les téléphones téléchargent la nouvelle version.
   ===================================================================== */
const VERSION_CACHE = 'circuit-pneumatique-v5';
const FICHIERS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/simulation.js', './js/scene3d.js', './js/schema.js', './js/donnees.js', './js/sons.js',
  './vendor/three.min.js', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION_CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k.startsWith('circuit-pneumatique-') && k !== VERSION_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
/* Remplit le cache s'il manque des fichiers : un autre service worker du même site
   (l'appli principale) peut effacer les caches lors de ses mises à jour. */
function verifierCache() {
  return caches.open(VERSION_CACHE).then(c => c.keys().then(cles => {
    if (cles.length < FICHIERS.length) return c.addAll(FICHIERS);
  })).catch(() => {});
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') e.waitUntil(verifierCache());
  e.respondWith(caches.open(VERSION_CACHE).then(c => c.match(e.request, { ignoreSearch: true }).then(rep => rep || fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).origin === location.origin) c.put(e.request, r.clone());
    return r;
  }).catch(() => (e.request.mode === 'navigate' ? c.match('./index.html') : Response.error())))));
});
