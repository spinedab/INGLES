// Capa de TV: navegación con mando a distancia.
//
// La webapp se diseñó para dedo y ratón. En un televisor no hay ninguno de los
// dos: hay cuatro flechas, OK y ATRÁS. Este archivo es lo único que se añade
// para que la misma app sea manejable desde el sofá, sin tocar ni una línea de
// los 15 módulos originales.
//
// Por qué navegación geométrica y no tabindex: el layout es bidimensional
// (rejillas de tarjetas, barra superior, pies). Un orden lineal de tabulación
// haría que "flecha derecha" saltara a un elemento que está debajo, lo que en
// TV se percibe como que el mando está roto. Buscar el vecino más cercano en
// la dirección real pulsada es lo que hace que el foco se mueva donde el ojo
// espera.

(function () {
  'use strict';

  // Códigos de la tecla ATRÁS. No hay estándar: cada fabricante usa el suyo.
  // 461 es webOS (LG), 10009 es Tizen (Samsung), 8 y 27 cubren teclado y
  // navegador para poder probar en el Mac sin televisor.
  const BACK_KEYS = new Set([461, 10009, 8, 27]);

  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'select:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  function visible(el) {
    if (el.hidden || el.closest('[hidden]')) return false;
    const r = el.getBoundingClientRect();
    // Ancho y alto cero descarta lo colapsado; comprobar offsetParent no sirve
    // porque los elementos con position:fixed de la barra lo tienen a null.
    return r.width > 0 && r.height > 0;
  }

  function candidates() {
    return Array.from(document.querySelectorAll(FOCUSABLE)).filter(visible);
  }

  function centre(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
  }

  // Elige el mejor vecino en una dirección.
  //
  // Dos pasadas, y el orden importa. En una rejilla, pulsar DERECHA debe ir a
  // la tarjeta de al lado, no a un botón que esté arriba a la derecha aunque
  // esté más cerca en línea recta: un salto diagonal se percibe como que el
  // mando está roto.
  //
  // Pasada 1: solo candidatos cuya franja perpendicular se solapa con la del
  // elemento actual, es decir, los que están de verdad "en la misma fila" (o
  // columna). Entre ellos gana el más cercano en el eje del movimiento.
  //
  // Pasada 2: si no hay ninguno alineado, se acepta el más cercano penalizando
  // el desalineamiento. Esto es lo que permite salir del último elemento de una
  // fila hacia la siguiente sección en vez de quedarse encallado.
  function nearest(from, dir) {
    const a = centre(from);
    const horizontal = dir === 'left' || dir === 'right';

    let aligned = null, alignedScore = Infinity;
    let loose = null, looseScore = Infinity;

    for (const el of candidates()) {
      if (el === from) continue;
      const b = centre(el);
      const dx = b.x - a.x;
      const dy = b.y - a.y;

      let along, across;
      if (dir === 'right')      { along = dx;  across = Math.abs(dy); }
      else if (dir === 'left')  { along = -dx; across = Math.abs(dy); }
      else if (dir === 'down')  { along = dy;  across = Math.abs(dx); }
      else                      { along = -dy; across = Math.abs(dx); }

      // Umbral de 8px: por debajo se considera que el elemento está al lado y
      // no en la dirección pulsada, y se descarta para que el foco no vibre
      // entre dos controles casi solapados.
      if (along <= 8) continue;

      // ¿Se solapan las franjas perpendiculares? Para un movimiento
      // horizontal se comparan los bordes verticales, y al revés.
      const overlap = horizontal
        ? Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top)
        : Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);

      if (overlap > 0) {
        if (along < alignedScore) { alignedScore = along; aligned = el; }
      } else if (along + across * 2 < looseScore) {
        looseScore = along + across * 2;
        loose = el;
      }
    }
    // En horizontal no se acepta el respaldo: al llegar al borde de una fila,
    // el foco se queda quieto. Es la convención de las apps de televisor y es
    // predecible; un salto diagonal a otra sección desorienta. Arriba y abajo
    // sí lo aceptan, porque cruzar de una sección a la siguiente es justo el
    // movimiento esperado y así nada queda inalcanzable.
    return aligned || (horizontal ? null : loose);
  }

  function focus(el) {
    if (!el) return;
    el.focus({ preventScroll: true });
    // 'nearest' y no 'center': centrar provoca saltos bruscos de la página al
    // moverse por una rejilla, que en pantalla grande marea.
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }

  function current() {
    const el = document.activeElement;
    return el && el !== document.body && visible(el) ? el : null;
  }

  // Al entrar en una vista nueva el foco se queda en el <body> y el mando deja
  // de responder. Se reengancha al primer elemento del contenido principal, no
  // de la barra: así ATRÁS y las flechas arrancan desde donde mira el usuario.
  function reseat() {
    if (current()) return;
    const main = document.getElementById('view');
    const first = (main && Array.from(main.querySelectorAll(FOCUSABLE)).find(visible))
      || candidates()[0];
    focus(first);
  }

  function exitApp() {
    // Cada plataforma cierra la app a su manera y ninguna de las dos APIs
    // existe en la otra, así que se prueban por orden.
    if (window.webOS && window.webOS.platformBack) { window.webOS.platformBack(); return; }
    try {
      if (window.tizen && window.tizen.application) {
        window.tizen.application.getCurrentApplication().exit();
        return;
      }
    } catch (_) { /* sin privilegio de salida: se ignora */ }
    window.close();
  }

  document.addEventListener('keydown', (event) => {
    const code = event.keyCode;

    if (BACK_KEYS.has(code)) {
      // En la raíz, ATRÁS cierra la app: es lo que espera el usuario de TV y
      // lo exigen ambas certificaciones. Fuera de la raíz, vuelve al inicio.
      const atRoot = location.hash === '' || location.hash === '#/' ;
      event.preventDefault();
      if (atRoot) exitApp();
      else location.hash = '#/';
      return;
    }

    const dir = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' }[code];
    if (!dir) return;

    // Dentro de un campo de texto las flechas mueven el cursor; secuestrarlas
    // impediría corregir lo que se escribe con el teclado en pantalla.
    const el = current();
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
    // El <select> de nivel abre su propia lista y arriba/abajo la recorren.
    if (el && el.tagName === 'SELECT' && (dir === 'up' || dir === 'down')) return;

    event.preventDefault();
    if (!el) { reseat(); return; }
    focus(nearest(el, dir));
  });

  // OK en el mando llega como Enter, que ya activa <a> y <button> de forma
  // nativa. Solo hace falta ayudar al <select>, que en TV no responde a Enter
  // en todos los motores.
  document.addEventListener('keydown', (event) => {
    if (event.keyCode !== 13) return;
    const el = current();
    if (el && el.tagName === 'SELECT' && typeof el.showPicker === 'function') {
      try { el.showPicker(); event.preventDefault(); } catch (_) { /* no soportado */ }
    }
  });

  // El enrutado es por hash y reemplaza el contenido de #view, así que hay que
  // recolocar el foco en cada cambio de vista.
  window.addEventListener('hashchange', () => setTimeout(reseat, 60));
  window.addEventListener('load', () => setTimeout(reseat, 120));

  // El paquete de TV no incluye sw.js: la app ya vive en local, así que
  // cachear no aporta nada y las actualizaciones pasan por la tienda, no por
  // la red. Pero app.js registra el service worker sin condiciones y eso
  // dejaba un 404 y un error en consola en cada arranque.
  //
  // Se anula aquí y no en app.js para no tocar el código que comparten web,
  // móvil y televisor. Este archivo es un <script> clásico y app.js es un
  // módulo (diferido), así que esto se ejecuta antes.
  if ('serviceWorker' in navigator) {
    try {
      Object.defineProperty(navigator.serviceWorker, 'register', {
        configurable: true,
        value: function () { return Promise.resolve(undefined); },
      });
    } catch (_) { /* si el motor no deja redefinirlo, el catch de app.js basta */ }
  }

  // Marca la raíz para que tv.css aplique la escala de 10 pies solo aquí y no
  // en la versión web normal.
  document.documentElement.setAttribute('data-platform', 'tv');
})();
