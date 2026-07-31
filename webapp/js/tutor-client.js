// Cliente del servicio Tutor IA (api/, FastAPI) para la webapp vanilla.
// Sin dependencias. Contrato completo en api/docs/USO-CLIENTES.md.
//
// La base URL y el token opcional se persisten en localStorage con las mismas
// convenciones que el resto de la app (namespace 'ingles:' vía storage.js):
//   settings:tutorBaseUrl  -> string
//   settings:tutorToken    -> string ('' = sin auth, que es el caso hoy)
import * as storage from './storage.js';

export const DEFAULT_BASE_URL = 'https://tutor.apicloud.lat';

/** Error de transporte/HTTP con el status y el cuerpo del servicio. */
export class TutorApiError extends Error {
  constructor(message, { status = 0, detail = '' } = {}) {
    super(message);
    this.name = 'TutorApiError';
    this.status = status;
    this.detail = detail;
  }
}

// ───── Configuración ─────

export function baseUrl() {
  const raw = storage.get('settings:tutorBaseUrl', DEFAULT_BASE_URL);
  return String(raw || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export function setBaseUrl(url) {
  storage.set('settings:tutorBaseUrl', String(url || '').trim().replace(/\/+$/, ''));
}

export function token() {
  return storage.get('settings:tutorToken', '') || '';
}

export function setToken(value) {
  storage.set('settings:tutorToken', String(value || '').trim());
}

function headers(withBody = true) {
  const h = {};
  if (withBody) h['Content-Type'] = 'application/json';
  const t = token();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

// ───── Transporte ─────

async function readError(res) {
  let detail = '';
  try {
    const body = await res.json();
    detail = typeof body?.detail === 'string' ? body.detail : JSON.stringify(body);
  } catch {
    detail = await res.text().catch(() => '');
  }
  return detail;
}

async function request(path, { method = 'GET', body = null, signal = null } = {}) {
  const url = `${baseUrl()}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: headers(body != null),
      body: body == null ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new TutorApiError(`No se pudo conectar con el tutor (${url}): ${e.message}`);
  }
  if (!res.ok) {
    const detail = await readError(res);
    throw new TutorApiError(
      `${method} ${path} devolvió HTTP ${res.status}${detail ? `: ${detail}` : ''}`,
      { status: res.status, detail },
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

// ───── Endpoints ─────

/** GET /health -> {status, provider, model, scenarios_loaded} */
export function health(signal = null) {
  return request('/health', { signal });
}

/** GET /v1/scenarios -> { [id]: {title, min_level, setup, objectives[]} } */
export function scenarios(signal = null) {
  return request('/v1/scenarios', { signal });
}

/**
 * POST /v1/sessions/start
 * @param {{level?:string, mode?:'conversation'|'roleplay'|'grammar', scenario?:string|null}} opts
 * @returns {Promise<{sessionId:string, level:string, mode:string, scenario:string|null, createdAt:number}>}
 */
export function startSession({ level = 'b1', mode = 'conversation', scenario = null } = {}, signal = null) {
  return request('/v1/sessions/start', {
    method: 'POST',
    body: { level: String(level).toLowerCase(), mode, scenario: scenario || null },
    signal,
  });
}

/**
 * POST /v1/sessions/{id}/respond (respuesta completa, sin streaming)
 * @returns {Promise<{sessionId:string, reply:string, model:string, provider:string, turnIndex:number, learnerTurns:number}>}
 */
export function respond(sessionId, text, { grammarTopic = null } = {}, signal = null) {
  return request(`/v1/sessions/${encodeURIComponent(sessionId)}/respond`, {
    method: 'POST',
    body: { text, grammarTopic: grammarTopic || null },
    signal,
  });
}

/** GET /v1/sessions/{id} -> vista completa con `turns` */
export function getSession(sessionId, signal = null) {
  return request(`/v1/sessions/${encodeURIComponent(sessionId)}`, { signal });
}

/** DELETE /v1/sessions/{id} -> {deleted: id} */
export function deleteSession(sessionId, signal = null) {
  return request(`/v1/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE', signal });
}

/**
 * POST /v1/sessions/{id}/stream — SSE manual sobre fetch (EventSource no sirve:
 * no permite POST ni headers). El servicio emite líneas `data: {json}` con
 * {"event":"delta"|"done"|"error"} y cierra con `data: [DONE]`.
 *
 * @param {string} sessionId
 * @param {string} text
 * @param {object} opts
 * @param {(chunk:string, acumulado:string)=>void} opts.onDelta  callback por fragmento
 * @param {(meta:object)=>void} [opts.onDone]                    metadata final
 * @param {string|null} [opts.grammarTopic]
 * @param {AbortSignal|null} [opts.signal]
 * @returns {Promise<{text:string, meta:object|null}>} texto completo acumulado
 */
export async function streamRespond(sessionId, text, {
  onDelta = () => {},
  onDone = () => {},
  grammarTopic = null,
  signal = null,
} = {}) {
  const url = `${baseUrl()}/v1/sessions/${encodeURIComponent(sessionId)}/stream`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ text, grammarTopic: grammarTopic || null }),
      signal,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new TutorApiError(`No se pudo abrir el stream (${url}): ${e.message}`);
  }
  if (!res.ok) {
    const detail = await readError(res);
    throw new TutorApiError(
      `stream devolvió HTTP ${res.status}${detail ? `: ${detail}` : ''}`,
      { status: res.status, detail },
    );
  }
  if (!res.body) {
    // Navegador sin streams legibles: degradar a /respond en lugar de fallar.
    const full = await respond(sessionId, text, { grammarTopic }, signal);
    onDelta(full.reply, full.reply);
    onDone(full);
    return { text: full.reply, meta: full };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let acc = '';
  let meta = null;

  const handleLine = (line) => {
    if (!line.startsWith('data:')) return false;
    const raw = line.slice(5).trim();
    if (raw === '[DONE]') return true;
    let evt;
    try {
      evt = JSON.parse(raw);
    } catch {
      return false; // línea parcial o no-JSON: ignorar
    }
    if (evt.event === 'delta' && typeof evt.text === 'string') {
      acc += evt.text;
      onDelta(evt.text, acc);
    } else if (evt.event === 'done') {
      meta = evt;
      onDone(evt);
    } else if (evt.event === 'error') {
      throw new TutorApiError(`El tutor falló durante el stream: ${evt.message || 'error desconocido'}`);
    }
    return false;
  };

  let finished = false;
  while (!finished) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (handleLine(trimmed)) { finished = true; break; }
    }
  }
  if (buffer.trim() && !finished) handleLine(buffer.trim());

  return { text: acc, meta };
}
