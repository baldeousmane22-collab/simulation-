/* =====================================================================
   sw.js — Service worker : utilisation hors connexion
   « Cache d'abord, réseau en secours ». VERSION_CACHE est renouvelé à
   chaque publication par le workflow GitHub Pages.
   ===================================================================== */
const VERSION_CACHE = 'hydraulique-realiste-v1';
const FICHIERS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/physique.js', './js/scene3d.js', './js/sons.js',
  './vendor/three.min.js', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION_CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k.startsWith('hydraulique-realiste-') && k !== VERSION_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
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
