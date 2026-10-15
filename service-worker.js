const CACHE_NAME = 'melody-cloud-v13';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/components.css',
  './css/pages.css',
  './js/app.js',
  './js/router.js',
  './js/state.js',
  './js/data.js',
  './js/i18n.js',
  './js/icons.js',
  './js/utils.js',
  './js/components.js',
  './js/checkout.js',
  './js/receipt.js',
  './js/callSimulator.js',
  './js/pages/login.js',
  './js/pages/home.js',
  './js/pages/search.js',
  './js/pages/favorites.js',
  './js/pages/chat.js',
  './js/pages/profile.js',
  './js/pages/profileDetail.js',
  './js/pages/wallet.js',
  './js/pages/dispute.js',
  './js/pages/legal.js',
  './js/pages/seeAll.js',
  './js/pages/writing.js',
  './icons/icon.svg',
  './icons/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
