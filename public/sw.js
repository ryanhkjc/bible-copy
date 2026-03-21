/* 聖經抄寫平靜 - Service Worker */
const CACHE_NAME = 'bible-copy-calming-v3';
const STATIC_ASSETS = [
  '/',
  '/css/style.css',
  '/js/child.js',
  '/js/parent.js',
  '/manifest.json',
  '/icons/icon.svg'
];

// 安裝時快取靜態資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW install cache failed:', err))
  );
});

// 啟用時取代舊 SW
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 網路優先，失敗時使用快取
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate' && !event.request.url.match(/\.(css|js|png|svg|json|ico)$/)) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
      .then((cached) => cached || caches.match('/'))
  );
});
