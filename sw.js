const CACHE_NAME = 'tugas-v6-cache-1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const CDN_ORIGINS = [
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Strategi: Stale-While-Revalidate untuk Pustaka CDN
  if (CDN_ORIGINS.some(origin => url.hostname.includes(origin))) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
          }
          return networkResponse;
        }).catch((error) => {
          console.error(JSON.stringify({ what: "CDN Fetch Failed", where: "sw.js fetch handler", why: error.message }));
          return cachedResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Strategi: Network First, Fallback Cache untuk Aset Lokal
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
        }
        return response;
      })
      .catch((error) => {
        console.error(JSON.stringify({ what: "Local Fetch Failed", where: "sw.js fetch handler", why: error.message }));
        return caches.match(request);
      })
  );
});
