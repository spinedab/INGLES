const CACHE_NAME = 'ingles-webapp-v3';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/app-icon.svg',
  './css/app.css',
  './js/app.js',
  './js/storage.js',
  './js/srs.js',
  './js/insights.js',
  './js/dashboard.js',
  './js/flashcards.js',
  './js/reading.js',
  './js/listening.js',
  './js/grammar.js',
  './js/coach.js',
  './js/search.js',
  './js/notebook.js',
  './js/data.js',
  './content/vocab/a1.json',
  './content/vocab/a2.json',
  './content/vocab/b1.json',
  './content/vocab/b2.json',
  './content/lecturas/a1-01.json',
  './content/lecturas/a1-02.json',
  './content/lecturas/a2-01.json',
  './content/lecturas/a2-02.json',
  './content/lecturas/b1-01.json',
  './content/lecturas/b1-02.json',
  './content/lecturas/b2-01.json',
  './content/listening/a1-listen-01.json',
  './content/listening/a2-listen-01.json',
  './content/listening/b1-listen-01.json',
  './content/listening/b2-listen-01.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && sameOrigin(request.url)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (request.mode === 'navigate') return caches.match('./index.html');
    throw error;
  }
}

function sameOrigin(url) {
  return new URL(url).origin === self.location.origin;
}
