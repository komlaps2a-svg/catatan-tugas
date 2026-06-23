// WAJIB DIGANTI SETIAP ADA UPDATE HTML/LOGIKA (contoh: 1.0.3 -> 1.0.4)
const CACHE_VERSION = '1.0.5';
const CACHE_NAME = `tugas-v6-cache-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json'
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
      keys.filter((key) => key.startsWith('tugas-v6-cache-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // PROTEKSI FATAL: Jangan pernah intersep request untuk sw.js itu sendiri
  // Ini mencegah layar putih ketika browser bingung me-resolve lokasi cache
  if (url.pathname.endsWith('sw.js')) {
      return; 
  }

  // 1. Dokumen HTML & Permintaan Navigasi -> Network First, Fallback ke Index Lokal
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => caches.match('./index.html').then(res => res || caches.match('./')))
    );
    return;
  }

  // 2. Aset Eksternal (CDN) & Gambar -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => { /* Abaikan log koneksi mati di environment produksi */ });
      
      return cachedResponse || fetchPromise;
    })
  );
});
