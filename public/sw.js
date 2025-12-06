const CACHE_NAME = 'registro-spedizioni-cache-v2';
const APP_SHELL = [
  '/',
  '/scan',
  '/search',
  '/registro',
  '/impostazioni',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return undefined;
        })
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const { pathname } = new URL(req.url);
  const isStaticAsset = pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image');

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req)
            .then((response) => {
              cache.put(req, response.clone());
              return response;
            })
            .catch(() => cached);
        })
      )
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return response;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).catch(() => caches.match('/'));
    })
  );
});
