/**
 * STREAM IT (סטרים איט) — Network-First Service Worker (v4.5)
 * מוחק אוטומטית כל מטמון ישן (כדי למנוע טעינת קבצים ישנים עם שגיאת Sandbox) וטוען תמיד את הגרסה העדכנית ביותר.
 */
const CACHE_NAME = 'stream-it-v4.5-network-first';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    fetch(request, { cache: 'no-store' }).catch(() => caches.match(request))
  );
});
