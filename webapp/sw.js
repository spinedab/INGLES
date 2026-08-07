const CACHE_NAME = 'ingles-webapp-v9';

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
  './js/tutor.js',
  './js/tutor-client.js',
  './js/search.js',
  './js/notebook.js',
  './js/data.js',
  './content/grammar.json',
  './content/vocab/a1.json',
  './content/vocab/a2.json',
  './content/vocab/b1.json',
  './content/vocab/b2.json',
  './content/lecturas/a1-01.json',
  './content/lecturas/a1-02.json',
  './content/lecturas/a1-03.json',
  './content/lecturas/a1-04.json',
  './content/lecturas/a2-01.json',
  './content/lecturas/a2-02.json',
  './content/lecturas/a2-03.json',
  './content/lecturas/a2-04.json',
  './content/lecturas/b1-01.json',
  './content/lecturas/b1-02.json',
  './content/lecturas/b1-03.json',
  './content/lecturas/b1-04.json',
  './content/lecturas/b2-01.json',
  './content/lecturas/b2-02.json',
  './content/lecturas/b2-03.json',
  './content/listening/a1-listen-01.json',
  './content/listening/a1-listen-02.json',
  './content/listening/a2-listen-01.json',
  './content/listening/a2-listen-02.json',
  './content/listening/b1-listen-01.json',
  './content/listening/b1-listen-02.json',
  './content/listening/b2-listen-01.json',
  './content/listening/b2-listen-02.json',
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
  // En producción esta webapp se sirve en la raíz de ingles.nawibox.com y el
  // export web de Expo vive en /app/. El scope del SW es "/", así que sin esta
  // salida se tragaría también /app/ con estrategia cache-first y dejaría esa
  // otra app congelada en la primera versión vista.
  if (new URL(event.request.url).pathname.startsWith('/app/')) return;
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
