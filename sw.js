/* =====================================================================
   sw.js (racine du site) — Nettoyage seulement.
   L'appli hydraulique était publiée à la racine du site ; elle est
   maintenant dans hydraulique/. Ce fichier remplace l'ancien service
   worker sur les téléphones qui l'avaient installée : il efface l'ancien
   cache, se désinstalle et recharge la page (qui affiche alors la liste
   des applis). Il ne met rien en cache.
   ===================================================================== */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const cles = await caches.keys();
    await Promise.all(cles.filter(k => k.startsWith('hydraulique-3d-')).map(k => caches.delete(k)));
    await self.registration.unregister();
    const pages = await self.clients.matchAll({ type: 'window' });
    for (const p of pages) p.navigate(p.url).catch(() => {});
  })());
});
