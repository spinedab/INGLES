// Cliente del servicio Tutor IA (carpeta api/, FastAPI). Es un servicio APARTE
// del backend de sincronización que cubre lib/api.ts + BACKEND_API.md: distinto
// host, distinto esquema de auth (Bearer estático opcional, no JWT de usuario).
// Por eso vive en su propio módulo y no dentro de ApiClient.
//
// Contrato y ejemplos: api/docs/USO-CLIENTES.md
// Despliegue: api/docs/DESPLIEGUE.md
import Constants from 'expo-constants';
import { get as storageGet, set as storageSet } from './storage';
import type { CefrLevel } from './types';

export const DEFAULT_TUTOR_BASE_URL =
  (Constants.expoConfig?.extra?.tutorBaseUrl as string | undefined) ?? 'https://tutor.apicloud.lat';

// ─── Tipos del contrato ────────────────────────────────────────────────────

export type TutorMode = 'conversation' | 'roleplay' | 'grammar';

export interface TutorHealth {
  status: string;
  provider: string;
  model: string;
  scenarios_loaded: number;
}

export interface TutorScenario {
  title: string;
  min_level: CefrLevel;
  setup: string;
  objectives: string[];
}

/** El servicio devuelve un objeto indexado por id de escenario. */
export type TutorScenarioMap = Record<string, TutorScenario>;

export interface TutorSessionStart {
  sessionId: string;
  level: CefrLevel;
  mode: TutorMode;
  scenario: string | null;
  /** epoch en SEGUNDOS (float), no en ms como el resto de la app. */
  createdAt: number;
}

export interface TutorTurnResult {
  sessionId: string;
  reply: string;
  model: string;
  provider: string;
  turnIndex: number;
  learnerTurns: number;
}

export interface TutorTurn {
  role: 'user' | 'assistant';
  content: string;
  /** epoch en SEGUNDOS. */
  ts: number;
}

export interface TutorSessionView {
  sessionId: string;
  level: CefrLevel;
  mode: TutorMode;
  scenario: string | null;
  createdAt: number;
  lastActive: number;
  learnerTurns: number;
  turns: TutorTurn[];
}

/** Metadata del evento `done` del stream SSE. */
export interface TutorStreamDone {
  event: 'done';
  model: string;
  provider: string;
  turnIndex: number;
  learnerTurns: number;
}

export interface StartSessionOptions {
  level?: CefrLevel;
  mode?: TutorMode;
  scenario?: string | null;
}

export interface StreamOptions {
  onDelta: (chunk: string, accumulated: string) => void;
  onDone?: (meta: TutorStreamDone) => void;
  grammarTopic?: string | null;
  /** Devuelve true para cortar el stream (equivalente a un abort simple). */
  shouldStop?: () => boolean;
}

export class TutorApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(message: string, status = 0, detail = '') {
    super(message);
    this.name = 'TutorApiError';
    this.status = status;
    this.detail = detail;
  }
}

// ─── Cliente ───────────────────────────────────────────────────────────────

class TutorApiClient {
  private baseUrl: string = DEFAULT_TUTOR_BASE_URL;
  private token = '';

  /** Cargar config persistida. Llamar una vez al arrancar (como apiClient.init). */
  async init(): Promise<void> {
    this.baseUrl =
      (await storageGet<string>('settings:tutorBaseUrl', DEFAULT_TUTOR_BASE_URL)) ||
      DEFAULT_TUTOR_BASE_URL;
    this.token = await storageGet<string>('settings:tutorToken', '');
  }

  getBaseUrl(): string {
    return this.baseUrl.replace(/\/+$/, '');
  }

  async setBaseUrl(url: string): Promise<void> {
    this.baseUrl = url.trim().replace(/\/+$/, '');
    await storageSet('settings:tutorBaseUrl', this.baseUrl);
  }

  getToken(): string {
    return this.token;
  }

  /** Cadena vacía = sin auth (es el modo actual del servicio en producción). */
  async setToken(token: string): Promise<void> {
    this.token = token.trim();
    await storageSet('settings:tutorToken', this.token);
  }

  private headers(withBody: boolean): Record<string, string> {
    const h: Record<string, string> = {};
    if (withBody) h['Content-Type'] = 'application/json';
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  private async req<T>(
    path: string,
    { method = 'GET', body }: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    if (!this.getBaseUrl()) throw new TutorApiError('Base URL del tutor no configurada.');
    const url = `${this.getBaseUrl()}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: this.headers(body !== undefined),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new TutorApiError(`No se pudo conectar con el tutor (${url}): ${(e as Error).message}`);
    }
    if (!res.ok) {
      const detail = await readError(res);
      throw new TutorApiError(
        `${method} ${path} devolvió HTTP ${res.status}${detail ? `: ${detail}` : ''}`,
        res.status,
        detail,
      );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  // ── Endpoints ──

  health(): Promise<TutorHealth> {
    return this.req<TutorHealth>('/health');
  }

  scenarios(): Promise<TutorScenarioMap> {
    return this.req<TutorScenarioMap>('/v1/scenarios');
  }

  startSession({
    level = 'b1',
    mode = 'conversation',
    scenario = null,
  }: StartSessionOptions = {}): Promise<TutorSessionStart> {
    return this.req<TutorSessionStart>('/v1/sessions/start', {
      method: 'POST',
      body: { level, mode, scenario: scenario || null },
    });
  }

  respond(
    sessionId: string,
    text: string,
    grammarTopic: string | null = null,
  ): Promise<TutorTurnResult> {
    return this.req<TutorTurnResult>(`/v1/sessions/${encodeURIComponent(sessionId)}/respond`, {
      method: 'POST',
      body: { text, grammarTopic },
    });
  }

  getSession(sessionId: string): Promise<TutorSessionView> {
    return this.req<TutorSessionView>(`/v1/sessions/${encodeURIComponent(sessionId)}`);
  }

  deleteSession(sessionId: string): Promise<{ deleted: string }> {
    return this.req<{ deleted: string }>(`/v1/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  }

  /**
   * POST /v1/sessions/{id}/stream — SSE.
   *
   * React Native no implementa `Response.body` (ReadableStream), así que aquí
   * hay dos caminos: si el runtime expone streams legibles (web / Expo web) se
   * lee incrementalmente; si no, se usa XHR con `onreadystatechange` y
   * `responseText`, que en RN sí llega por trozos. Ambos parsean el mismo
   * formato: líneas `data: {json}` terminadas por `data: [DONE]`.
   *
   * @returns el texto completo acumulado y la metadata del evento `done`.
   */
  async streamRespond(
    sessionId: string,
    text: string,
    opts: StreamOptions,
  ): Promise<{ text: string; meta: TutorStreamDone | null }> {
    const url = `${this.getBaseUrl()}/v1/sessions/${encodeURIComponent(sessionId)}/stream`;
    const payload = JSON.stringify({ text, grammarTopic: opts.grammarTopic ?? null });
    const headers = this.headers(true);

    const state = { acc: '', meta: null as TutorStreamDone | null };

    /** Procesa una línea SSE. Devuelve true si el stream terminó. */
    const handleLine = (line: string): boolean => {
      if (!line.startsWith('data:')) return false;
      const raw = line.slice(5).trim();
      if (raw === '[DONE]') return true;
      let evt: Record<string, unknown>;
      try {
        evt = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return false; // fragmento parcial: se completará en el siguiente chunk
      }
      if (evt.event === 'delta' && typeof evt.text === 'string') {
        state.acc += evt.text;
        opts.onDelta(evt.text, state.acc);
      } else if (evt.event === 'done') {
        state.meta = evt as unknown as TutorStreamDone;
        opts.onDone?.(state.meta);
      } else if (evt.event === 'error') {
        throw new TutorApiError(`El tutor falló durante el stream: ${String(evt.message ?? '')}`);
      }
      return false;
    };

    // ── Camino A: fetch + ReadableStream (web) ──
    const canStreamFetch =
      typeof TextDecoder !== 'undefined' && typeof ReadableStream !== 'undefined';

    if (canStreamFetch) {
      let res: Response;
      try {
        res = await fetch(url, { method: 'POST', headers, body: payload });
      } catch (e) {
        throw new TutorApiError(`No se pudo abrir el stream (${url}): ${(e as Error).message}`);
      }
      if (!res.ok) {
        const detail = await readError(res);
        throw new TutorApiError(`stream devolvió HTTP ${res.status}: ${detail}`, res.status, detail);
      }
      const body = (res as unknown as { body?: ReadableStream<Uint8Array> }).body;
      if (body?.getReader) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finished = false;
        while (!finished) {
          if (opts.shouldStop?.()) {
            await reader.cancel().catch(() => undefined);
            break;
          }
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (handleLine(trimmed)) {
              finished = true;
              break;
            }
          }
        }
        if (buffer.trim() && !finished) handleLine(buffer.trim());
        return { text: state.acc, meta: state.meta };
      }
      // Sin ReadableStream real: el body ya llegó completo, lo parseamos de golpe.
      const full = await res.text();
      for (const line of full.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && handleLine(trimmed)) break;
      }
      return { text: state.acc, meta: state.meta };
    }

    // ── Camino B: XHR incremental (React Native) ──
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
      let consumed = 0; // bytes de responseText ya parseados
      let finished = false;

      const drain = (final: boolean) => {
        const chunk = xhr.responseText.slice(consumed);
        const lines = chunk.split('\n');
        // La última línea puede estar incompleta salvo en el drenado final.
        const tail = final ? '' : (lines.pop() ?? '');
        consumed = xhr.responseText.length - tail.length;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (handleLine(trimmed)) {
            finished = true;
            return;
          }
        }
      };

      xhr.onreadystatechange = () => {
        try {
          if (xhr.readyState === 3) {
            if (opts.shouldStop?.()) {
              xhr.abort();
              return;
            }
            drain(false);
          } else if (xhr.readyState === 4) {
            if (xhr.status < 200 || xhr.status >= 300) {
              reject(
                new TutorApiError(
                  `stream devolvió HTTP ${xhr.status}: ${xhr.responseText}`,
                  xhr.status,
                  xhr.responseText,
                ),
              );
              return;
            }
            if (!finished) drain(true);
            resolve({ text: state.acc, meta: state.meta });
          }
        } catch (e) {
          reject(e);
        }
      };
      xhr.onerror = () =>
        reject(new TutorApiError(`No se pudo abrir el stream (${url}): error de red`));
      xhr.onabort = () => resolve({ text: state.acc, meta: state.meta });
      xhr.send(payload);
    });
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    return typeof body?.detail === 'string' ? body.detail : JSON.stringify(body);
  } catch {
    return await res.text().catch(() => '');
  }
}

export const tutorApi = new TutorApiClient();
