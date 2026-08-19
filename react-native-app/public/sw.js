// ORIZON PWA service worker minimal — necessaire pour rendre l'app installable
// (Android/Chrome exige un SW avec fetch handler).
const CACHE = 'orizon-shell-v7';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => null))
  );
  // Pas de skipWaiting() automatique : on attend que l'utilisateur choisisse
  // de recharger (voir UpdateBanner) pour eviter des rechargements surprise
  // pendant qu'il est en train d'utiliser l'app (ex: publier une annonce).
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Network-first pour la nav (toujours frais), cache-fallback hors-ligne
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => null);
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }
  // Cache-first pour les assets statiques same-origin
  if (url.origin === location.origin && /\.(png|jpg|jpeg|webp|svg|ico|css|js|woff2?|ttf)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => null);
          return res;
        }).catch(() => cached)
      )
    );
  }
});
