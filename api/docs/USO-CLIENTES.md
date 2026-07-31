# Uso del servicio Tutor IA desde las apps del repo

El servicio de `api/` está desplegado y público en **https://tutor.apicloud.lat**
(detalles de infraestructura en [DESPLIEGUE.md](DESPLIEGUE.md)). Este documento
cubre lo otro: **cómo lo consumen las apps**.

Clientes disponibles:

| App | Cliente | Notas |
|-----|---------|-------|
| `webapp/` (vanilla JS) | [`webapp/js/tutor-client.js`](../../webapp/js/tutor-client.js) | ES module, cero dependencias. UI en [`webapp/js/tutor.js`](../../webapp/js/tutor.js), ruta `#/tutor` |
| `mobile/` (Expo + RN + TS) | [`mobile/lib/tutorApi.ts`](../../mobile/lib/tutorApi.ts) | Tipado. Singleton `tutorApi`. Sin UI todavía (ver [Pendiente](#pendiente)) |
| `tutor-ia/` (CLI) | — | Habla directo con el modelo, no pasa por HTTP |

---

## 1. Contrato del servicio

Fuente de verdad: [`api/app/main.py`](../app/main.py). Resumen:

| Método | Ruta | Cuerpo | Respuesta |
|--------|------|--------|-----------|
| `GET` | `/health` | — | `{"status","provider","model","scenarios_loaded"}` |
| `GET` | `/v1/scenarios` | — | objeto indexado por id de escenario |
| `POST` | `/v1/sessions/start` | `{"level","mode","scenario"}` | `{"sessionId","level","mode","scenario","createdAt"}` |
| `POST` | `/v1/sessions/{id}/respond` | `{"text","grammarTopic"}` | `{"sessionId","reply","model","provider","turnIndex","learnerTurns"}` |
| `POST` | `/v1/sessions/{id}/stream` | `{"text","grammarTopic"}` | SSE (`text/event-stream`) |
| `GET` | `/v1/sessions/{id}` | — | vista completa con `turns[]` |
| `DELETE` | `/v1/sessions/{id}` | — | `{"deleted": id}` |

Valores válidos:

- `level`: `a1` \| `a2` \| `b1` \| `b2` (minúsculas, exactamente 2 caracteres).
- `mode`: `conversation` \| `roleplay` \| `grammar`.
- `scenario`: **obligatorio** si `mode=roleplay`, y debe ser una clave de
  `/v1/scenarios`. En los otros modos, `null`.
- `grammarTopic`: opcional, string libre; sólo tiene sentido con `mode=grammar`.
- `text`: 1–4000 caracteres.

Errores: el servicio responde `{"detail": "mensaje"}` con 400 (validación),
401 (token), 404 (sesión no encontrada), 429 (rate limit) o 502 (fallo del
modelo upstream). Ambos clientes normalizan esto en un error con `.status` y
`.detail`.

### Formato del stream SSE

Cada evento es una línea `data: ` con un JSON, separada por línea vacía, y el
stream cierra con un centinela literal:

```
data: {"event": "delta", "text": "That"}

data: {"event": "delta", "text": "’s"}

data: {"event": "done", "model": "gemma4:e4b", "provider": "gemma", "turnIndex": 4, "learnerTurns": 2}

data: [DONE]
```

Si el modelo falla a mitad de la generación llega `{"event":"error","message":"…"}`
seguido de `data: [DONE]`.

> **No se puede usar `EventSource`.** El endpoint es `POST` y `EventSource` sólo
> hace `GET` y no permite cabeceras. Por eso los dos clientes parsean SSE a mano
> sobre `fetch` (o `XMLHttpRequest` en React Native).

### Base URL configurable

| App | Dónde se guarda | Clave |
|-----|-----------------|-------|
| `webapp/` | `localStorage` vía `js/storage.js` (namespace `ingles:`) | `settings:tutorBaseUrl`, `settings:tutorToken` |
| `mobile/` | `AsyncStorage` vía `lib/storage.ts` (namespace `ingles:`) | `settings:tutorBaseUrl`, `settings:tutorToken` |

El valor por defecto de `mobile/` sale de `expo.extra.tutorBaseUrl` en
`mobile/app.json`; el de `webapp/` es la constante `DEFAULT_BASE_URL` en
`tutor-client.js`. Ambos apuntan a `https://tutor.apicloud.lat`.

Ojo: `settings:tutorBaseUrl` es **distinto** de `settings:apiBaseUrl`. Ese
segundo pertenece al backend de sincronización de progreso descrito en
[`mobile/BACKEND_API.md`](../../mobile/BACKEND_API.md), que es otro servicio con
otro esquema de auth (JWT de usuario). El tutor no comparte nada con él.

### Token opcional

El servicio sólo exige `Authorization: Bearer <token>` si la variable de entorno
`INGLES_API_TOKEN` está configurada. **Hoy está vacía en producción, así que el
servicio es abierto** y los clientes funcionan sin token. Si algún día se activa:

- webapp: pestaña *Servidor* dentro de la vista Tutor IA → campo *Token*.
- mobile: `await tutorApi.setToken('mi-token')`.

Los clientes sólo añaden la cabecera cuando el token no está vacío, así que dejar
el campo en blanco es el comportamiento correcto actual.

---

## 2. webapp (vanilla JS)

La vista vive en `#/tutor` y está registrada en `webapp/js/app.js` igual que el
resto de rutas. Permite elegir nivel y modo, elegir escenario cuando el modo es
roleplay, chatear con streaming token a token, recargar el historial del turno
desde el servidor y terminar la sesión.

Uso directo del cliente:

```js
import * as tutorApi from './tutor-client.js';

// Configuración (persistida en localStorage)
tutorApi.setBaseUrl('https://tutor.apicloud.lat');
tutorApi.setToken('');            // '' = sin auth

// Salud y catálogo
const h = await tutorApi.health();
// { status: 'ok', provider: 'gemma', model: 'gemma4:e4b', scenarios_loaded: 8 }
const scenarios = await tutorApi.scenarios();
// { cafe: { title: 'Ordering at a café', min_level: 'a1', setup: '…', objectives: [...] }, … }

// Sesión de roleplay
const session = await tutorApi.startSession({
  level: 'b1',
  mode: 'roleplay',
  scenario: 'cafe',
});

// Respuesta completa (sin streaming)
const turn = await tutorApi.respond(session.sessionId, 'Hello, a large coffee please.');
console.log(turn.reply, turn.learnerTurns);

// Respuesta con streaming
const { text, meta } = await tutorApi.streamRespond(session.sessionId, 'And a croissant?', {
  onDelta: (chunk, acumulado) => { document.querySelector('#out').textContent = acumulado; },
  onDone: (m) => console.log('modelo', m.model, 'turno', m.turnIndex),
});

// Historial y cierre
const full = await tutorApi.getSession(session.sessionId);
full.turns.forEach(t => console.log(t.role, t.content));
await tutorApi.deleteSession(session.sessionId);
```

Cancelar una respuesta en curso (el botón *Detener* de la vista hace esto):

```js
const controller = new AbortController();
tutorApi.streamRespond(id, text, { onDelta, signal: controller.signal });
controller.abort();   // lanza AbortError; el turno ya quedó registrado en el servidor
```

Errores:

```js
import { TutorApiError } from './tutor-client.js';
try {
  await tutorApi.startSession({ mode: 'roleplay' });   // falta scenario
} catch (e) {
  if (e instanceof TutorApiError) console.log(e.status, e.detail);
}
```

---

## 3. mobile (Expo + React Native + TypeScript)

`mobile/lib/tutorApi.ts` exporta el singleton `tutorApi` siguiendo el mismo
patrón que `apiClient` de `lib/api.ts` (clase con `init()`, `getBaseUrl()`,
`setBaseUrl()` y persistencia en `lib/storage.ts`). Es un módulo aparte a
propósito: el tutor es otro servicio, con otro host y otro esquema de auth.

```ts
import { tutorApi, TutorApiError } from '@/lib/tutorApi';
import type { TutorScenarioMap, TutorSessionStart } from '@/lib/tutorApi';

await tutorApi.init();                    // carga base URL y token persistidos

const health = await tutorApi.health();
const scenarios: TutorScenarioMap = await tutorApi.scenarios();

const session: TutorSessionStart = await tutorApi.startSession({
  level: 'b1',
  mode: 'conversation',
});

// Streaming: onDelta recibe el fragmento y el acumulado
const [reply, setReply] = useState('');
const { meta } = await tutorApi.streamRespond(session.sessionId, 'Hi!', {
  onDelta: (_chunk, accumulated) => setReply(accumulated),
  onDone: (m) => console.log(m.model, m.turnIndex),
  shouldStop: () => cancelRef.current,   // corta el stream sin AbortController
});

const view = await tutorApi.getSession(session.sessionId);
await tutorApi.deleteSession(session.sessionId);

try {
  await tutorApi.respond('id-inexistente', 'hola');
} catch (e) {
  if (e instanceof TutorApiError) console.log(e.status);   // 404
}
```

Cambiar el servidor desde una pantalla de ajustes:

```ts
await tutorApi.setBaseUrl(url.trim());
await tutorApi.setToken('');   // vacío = sin auth (modo actual)
```

`streamRespond` tiene dos implementaciones internas porque **React Native no
implementa `Response.body` / `ReadableStream`**: en web usa `fetch` +
`getReader()`; en nativo usa `XMLHttpRequest` y va parseando `responseText` en
`readyState === 3`. Ambas producen el mismo resultado y aceptan `shouldStop`.

---

## 4. Limitaciones y gotchas

- **Las sesiones están ligadas a la IP del cliente.** `api/app/sessions.py`
  guarda un `owner_hash = sha256(ip)` y `load_session()` rechaza la sesión si la
  IP no coincide. Consecuencias prácticas: un `sessionId` no es portable entre
  dispositivos ni entre redes, y si el usuario cambia de WiFi a datos móviles a
  media conversación, los siguientes `/respond`, `/stream`, `GET` y `DELETE`
  devolverán **404**. Los clientes tratan ese 404 como "sesión perdida"; hay que
  arrancar una nueva.
- **El historial vive sólo en el servidor.** Ningún cliente persiste los turnos
  en `localStorage`/`AsyncStorage`; al recargar la webapp la conversación se
  pierde. Es una decisión deliberada (privacidad, y las sesiones caducan en el
  servidor de todos modos), no un bug.
- **Sin auth hoy.** El servicio es público y sin token. La única protección es un
  rate limit por IP en memoria (`INGLES_RATE_LIMIT_PER_MIN`), que se reinicia con
  el contenedor y no funciona bien con varias réplicas.
- **CORS es `*`** (`INGLES_CORS_ORIGINS` por defecto), así que la webapp funciona
  tanto desde GitHub Pages como desde `http://127.0.0.1:5189`.
- **Latencia.** Es IA local (Gemma4 vía Ollama, sin coste). Una respuesta completa
  tarda del orden de segundos; `/respond` deja al usuario esperando en blanco, así
  que en UI conviene usar siempre `/stream`.
- **El nivel mínimo de los escenarios no lo valida el backend.** `min_level` es
  informativo; la webapp lo muestra como aviso (`(min B2)`) en lugar de bloquear.
- **`createdAt` / `lastActive` / `ts` vienen en segundos** (epoch float de
  Python), mientras que el resto de la app usa milisegundos (`Date.now()`).
  Multiplica por 1000 antes de mezclarlos con timestamps locales.
- **El modelo responde en Markdown** (`**negrita**`, listas numeradas). Los
  clientes devuelven el texto crudo y la vista de la webapp lo pinta escapado y
  con saltos de línea, sin renderizar el Markdown: se ven los asteriscos. Si
  molesta, hay que añadir un renderizador mínimo en `webapp/js/tutor.js`.
- **El service worker de la webapp** (`webapp/sw.js`) sólo cachea peticiones
  `GET` del mismo origen, así que no interfiere con el tutor. Si editas los
  ficheros del tutor, sube `CACHE_NAME` para invalidar la caché.

---

## Pendiente

- `mobile/` tiene el cliente tipado pero **todavía no una pantalla**. Falta una
  ruta tipo `app/tutor.tsx` y un campo de base URL del tutor en
  `app/settings.tsx`.
- La webapp no ofrece un selector de `grammarTopic` para `mode=grammar`: el
  cliente lo envía si existe `tutor:grammarTopic` en `localStorage`, pero ninguna
  UI lo escribe todavía. Lo natural sería enlazarlo con los ids de
  `webapp/js/grammar.js`.
- La ruta XHR de `streamRespond` en `mobile/lib/tutorApi.ts` se validó con el
  mismo algoritmo ejecutado en Chrome contra el servicio real (23 lecturas
  incrementales), pero **no se ha ejecutado dentro de un simulador iOS/Android**.
