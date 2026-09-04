// Sube la versión SIEMPRE que cambie css/js/contenido: la estrategia es
// cache-first, así que sin esto los visitantes recurrentes se quedan
// congelados en la versión que cachearon (pasó con el rediseño OKLCH,
// desplegado con v9 y servido viejo a quien ya tenía la app).
const CACHE_NAME = 'ingles-webapp-v11';

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
  './content/languages.json',
  './content/en/index.json',
  './content/en/grammar.json',
  './content/en/vocab/a1.json',
  './content/en/vocab/a2.json',
  './content/en/vocab/b1.json',
  './content/en/vocab/b2.json',
  './content/en/lecturas/a1-01.json',
  './content/en/lecturas/a1-02.json',
  './content/en/lecturas/a1-03.json',
  './content/en/lecturas/a1-04.json',
  './content/en/lecturas/a2-01.json',
  './content/en/lecturas/a2-02.json',
  './content/en/lecturas/a2-03.json',
  './content/en/lecturas/a2-04.json',
  './content/en/lecturas/b1-01.json',
  './content/en/lecturas/b1-02.json',
  './content/en/lecturas/b1-03.json',
  './content/en/lecturas/b1-04.json',
  './content/en/lecturas/b2-01.json',
  './content/en/lecturas/b2-02.json',
  './content/en/lecturas/b2-03.json',
  './content/en/listening/a1-listen-01.json',
  './content/en/listening/a1-listen-02.json',
  './content/en/listening/a2-listen-01.json',
  './content/en/listening/a2-listen-02.json',
  './content/en/listening/b1-listen-01.json',
  './content/en/listening/b1-listen-02.json',
  './content/en/listening/b2-listen-01.json',
  './content/en/listening/b2-listen-02.json',
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
  // Salvaguarda heredada. Cuando la webapp se servia en la raiz, el scope del
  // SW era "/" y sin esta salida se tragaba tambien /app/ (el export web de
  // Expo) con estrategia cache-first, dejando esa otra app congelada en la
  // primera version vista.
  //
  // Hoy la webapp se publica en https://ingles.nexocloud.co/webapp/ y el SW se
  // registra con ruta relativa, asi que su scope ya es /webapp/ y nunca ve
  // /app/. Se mantiene porque los navegadores que instalaron la version con
  // scope "/" la conservan hasta que se desregistre.
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
