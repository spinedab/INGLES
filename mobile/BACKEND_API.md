# Contrato de la API del backend

La app es **offline-first**. Si no configuras backend, todo funciona en local. Si configuras la URL en `Ajustes → Backend`, la app sincroniza progreso y descarga contenido remoto (si lo sirves).

Este documento describe el contrato REST que tu hosting debe implementar para integrarse.

## Convenciones generales

- **Base URL**: configurable por el usuario (`expo.extra.apiBaseUrl` en `app.json` por defecto). Ejemplo: `https://api.tudominio.com`.
- **Content-Type**: `application/json` en request y response.
- **Autenticación**: Bearer token JWT en header `Authorization: Bearer <token>`.
- **Códigos de error**: 400 (request inválido), 401 (sin auth o expirada), 403 (sin permisos), 404 (no encontrado), 409 (conflicto), 422 (validación), 5xx (error servidor).
- **Errores con cuerpo JSON**: `{ "error": "mensaje legible", "code": "ERR_CODE" }`.
- **Timestamps**: epoch en milisegundos (compatible con `Date.now()` JS).

## Autenticación

### `POST /auth/register`
```json
{ "email": "user@example.com", "password": "min8chars" }
```
Respuesta 200:
```json
{
  "token": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "userId": "u_abc123",
  "email": "user@example.com",
  "expiresAt": 1748520000000
}
```
Errores: 409 si el email ya existe; 422 si password &lt; 8 chars.

### `POST /auth/login`
Mismo request/response que `/auth/register`. 401 si credenciales inválidas.

### `POST /auth/refresh`
```json
{ "refreshToken": "..." }
```
Respuesta: misma estructura de `AuthSession`. 401 si el refresh token es inválido.

### `POST /auth/logout`
Vacío (token en header). Respuesta 204. Opcional — el cliente borra la sesión local de todos modos.

## Progreso del usuario

### `GET /me/progress`
Auth requerida. Respuesta:
```json
{
  "level": "b1",
  "vocabStates": {
    "vocab-b1:b1-001": { "ef": 2.5, "interval": 6, "reps": 2, "due": 1748520000000 },
    "...": {}
  },
  "readingDone": { "b1-01": true },
  "readingScores": { "b1-01": { "correct": 4, "total": 5, "ts": 1748000000000 } },
  "listeningRevealed": { "b1-listen-01": 1748000000000 },
  "grammarScores": { "present-perfect-vs-past": { "correct": 7, "total": 8, "ts": 1748000000000 } },
  "lastSync": 1748100000000
}
```
Vacío si nunca sincronizó: `{}`. La app rellena defaults.

### `PUT /me/progress`
Reemplaza el documento de progreso completo. Útil para "restaurar desde backup". Body: misma estructura que GET. Respuesta 204.

### `POST /sync/srs-batch`
Sincronización incremental. La app envía solo los cambios desde la última sincronización.
```json
{
  "vocabStates": { "vocab-b1:b1-001": { "ef": 2.5, "interval": 6, "reps": 2, "due": 1748520000000 } },
  "readingDone": { "b1-02": true },
  "readingScores": {},
  "listeningRevealed": {},
  "grammarScores": {}
}
```
Política de merge: **last-write-wins** por `due` o `ts`. El servidor mantiene el documento consolidado.

Respuesta:
```json
{ "accepted": 12, "serverTs": 1748100050000 }
```

## Contenido

Los endpoints de contenido son **opcionales**. La app trae copias empaquetadas en `assets/content/`. Si los implementas, la app prefiere lo remoto (permite actualizar contenido sin nueva versión de app).

### `GET /content/vocab/{level}`
`level` ∈ `{a1, a2, b1, b2}`. Respuesta: array de `VocabCard`.
```json
[
  {
    "id": "b1-001",
    "front": "eventually (adv)",
    "definition": "in the end, after a long time",
    "example": "Eventually, she found a job.",
    "translation": "finalmente",
    "tags": ["b1", "adverb"]
  }
]
```

### `GET /content/lectura/{id}`
Respuesta: objeto `ReadingText`.
```json
{
  "title": "The Hidden Cost of Cheap Fashion",
  "summary": "Argumentative B1 text — passive voice, conditional, AWL.",
  "text": "<p>Every year...</p>",
  "glosses": [{ "word": "landfills", "tip": "vertederos" }],
  "collocations": ["end up in landfills", "carbon emissions"],
  "questions": [
    {
      "q": "What percentage of global carbon emissions does fashion produce?",
      "options": ["Around 5%", "Around 10%", "Around 25%"],
      "answer": 1
    }
  ]
}
```

### `GET /content/listening/{id}`
Respuesta: objeto `ListeningItem`.
```json
{
  "title": "BBC 6 Minute English — Style",
  "summary": "...",
  "duration": "6 min",
  "audio": "https://cdn.tudominio.com/audio/b1-listen-01.mp3",
  "externalUrl": null,
  "script": "Hello and welcome...\nAnd I'm Neil...",
  "vocabulary": [{ "word": "work from home", "meaning": "trabajar desde casa" }],
  "questions": [
    { "q": "...", "options": ["a", "b", "c"], "answer": 1 }
  ]
}
```
Si sirves audio propio, `audio` es URL absoluta a MP3/AAC.

### Listado / discovery (opcional, recomendado)

Para descubrir contenido nuevo desde el servidor, sin tener que hardcodear IDs en la app:

#### `GET /content/index`
```json
{
  "vocab": { "a1": 50, "a2": 40, "b1": 34, "b2": 30 },
  "lecturas": [
    { "id": "a1-01", "level": "a1", "title": "My Morning Routine" },
    { "id": "b2-01", "level": "b2", "title": "On the Paradox of Choice" }
  ],
  "listening": [
    { "id": "a1-listen-01", "level": "a1", "title": "Ordering Coffee at a Café" }
  ]
}
```
La app puede llamarlo al arrancar y cachear el índice.

## Modelo de datos sugerido (esquema relacional)

Si vas a implementar este backend en Postgres/MySQL, esquema mínimo:

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_tokens (
  token        TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  expires_at   TIMESTAMP NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_progress (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level        TEXT NOT NULL DEFAULT 'a2',
  vocab_states JSONB NOT NULL DEFAULT '{}',
  reading_done JSONB NOT NULL DEFAULT '{}',
  reading_scores JSONB NOT NULL DEFAULT '{}',
  listening_revealed JSONB NOT NULL DEFAULT '{}',
  grammar_scores JSONB NOT NULL DEFAULT '{}',
  last_sync    TIMESTAMP
);

-- Contenido (si lo manejas en BD)
CREATE TABLE content_vocab (level TEXT, card_id TEXT, data JSONB, PRIMARY KEY (level, card_id));
CREATE TABLE content_reading (id TEXT PRIMARY KEY, level TEXT, data JSONB);
CREATE TABLE content_listening (id TEXT PRIMARY KEY, level TEXT, data JSONB);
```

## Implementaciones de referencia (esqueletos)

### Node.js + Express + Postgres
```js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const app = express();
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const SECRET = process.env.JWT_SECRET!;
const TTL_MS = 7 * 24 * 3600 * 1000;

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const r = await pool.query('SELECT id, password_hash FROM users WHERE email=$1', [email]);
  if (r.rowCount === 0) return res.status(401).json({ error: 'invalid_credentials' });
  const ok = await bcrypt.compare(password, r.rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
  const userId = r.rows[0].id;
  const token = jwt.sign({ userId }, SECRET, { expiresIn: '7d' });
  res.json({ token, refreshToken: token, userId, email, expiresAt: Date.now() + TTL_MS });
});

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.replace(/^Bearer /, '');
  try { req.user = jwt.verify(t, SECRET); next(); }
  catch { res.status(401).json({ error: 'invalid_token' }); }
}

app.get('/me/progress', auth, async (req, res) => {
  const r = await pool.query('SELECT * FROM user_progress WHERE user_id=$1', [req.user.userId]);
  if (r.rowCount === 0) return res.json({});
  const p = r.rows[0];
  res.json({
    level: p.level,
    vocabStates: p.vocab_states,
    readingDone: p.reading_done,
    readingScores: p.reading_scores,
    listeningRevealed: p.listening_revealed,
    grammarScores: p.grammar_scores,
    lastSync: p.last_sync ? +p.last_sync : null,
  });
});

app.put('/me/progress', auth, async (req, res) => {
  const { level, vocabStates, readingDone, readingScores, listeningRevealed, grammarScores } = req.body;
  await pool.query(`
    INSERT INTO user_progress (user_id, level, vocab_states, reading_done, reading_scores, listening_revealed, grammar_scores, last_sync)
    VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      level=$2, vocab_states=$3, reading_done=$4, reading_scores=$5, listening_revealed=$6, grammar_scores=$7, last_sync=NOW()
  `, [req.user.userId, level, vocabStates, readingDone, readingScores, listeningRevealed, grammarScores]);
  res.status(204).end();
});

app.listen(process.env.PORT || 3000);
```

### PHP + MySQL (Apache/cPanel-style hosting)
```php
<?php
header('Content-Type: application/json');
// ... routing, prepared statements, password_verify(), JWT lib (Firebase JWT) ...
```

### Python + FastAPI
```python
from fastapi import FastAPI, Depends, HTTPException, Header
from passlib.hash import bcrypt
import jwt, time, asyncpg

app = FastAPI()
# ... endpoints similares ...
```

## Sincronización segura

Para evitar race conditions cuando el usuario edita progreso en dos dispositivos a la vez:

1. **Cliente envía** delta solo de cambios locales nuevos (timestamp local).
2. **Servidor compara** por `due` (para SRS) o `ts` (para scores) — gana el más reciente.
3. **Servidor devuelve** `serverTs` que el cliente persiste como `lastSync` para el próximo delta.

La política **last-write-wins** es suficiente para este dominio (no hay edición colaborativa de un mismo registro).

## Rate limiting (recomendado)

- Auth: 5 req/min por IP.
- Sync: 30 req/min por usuario.
- Content: cacheable, sin límite estricto (usa CDN o cache HTTP).

## CORS

Si el web build se sirve desde otro dominio (Vercel, Netlify, GitHub Pages), añade headers CORS:

```
Access-Control-Allow-Origin: https://tu-webapp.com
Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

Para la app nativa (iOS/Android) CORS no aplica.
