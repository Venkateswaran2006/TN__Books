/* =====================================================================
   TNPSC Study Library — service worker
   Caches only small application assets. NEVER caches PDF documents
   (the book PDFs are external links and are never intercepted).
   ===================================================================== */

const CACHE = 'tl-v1';

const PRECACHE = [
  './',
  './index.html',
  './library.html',
  './reader.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/css/reader.css',
  './assets/js/utils.js',
  './assets/js/app.js',
  './assets/js/library.js',
  './assets/js/reader.js',
  './assets/images/logo.svg',
  './data/books.json',
  './pdfjs/pdf.min.js',
  './pdfjs/pdf.worker.min.js',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE) return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // never touch PDF hosts
  if (/\.pdf(\?|$)/i.test(url.pathname)) return; // never cache PDFs

  // Navigations: network-first, offline fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Other same-origin GET: cache-first with runtime fill
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok && (res.type === 'basic' || res.type === 'default')) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});