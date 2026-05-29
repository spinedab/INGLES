// Cliente HTTP del backend. Diseño defensivo: cualquier fallo permite caer al
// modo offline. Ver BACKEND_API.md para el contrato REST.
import Constants from 'expo-constants';
import { get as storageGet, set as storageSet } from './storage';
import type {
  AuthSession,
  CefrLevel,
  ListeningItem,
  Progress,
  ReadingText,
  SyncDelta,
  VocabCard,
} from './types';

const DEFAULT_BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? '';

class ApiClient {
  private baseUrl: string;
  private session: AuthSession | null = null;

  constructor(baseUrl: string = DEFAULT_BASE) {
    this.baseUrl = baseUrl;
  }

  async init() {
    this.baseUrl = (await storageGet<string>('settings:apiBaseUrl', DEFAULT_BASE)) || DEFAULT_BASE;
    this.session = await storageGet<AuthSession | null>('auth:session', null);
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
    return storageSet('settings:apiBaseUrl', url);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  isAuthenticated(): boolean {
    return this.session != null && this.session.expiresAt > Date.now();
  }

  getSession(): AuthSession | null {
    return this.session;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.session) h.Authorization = `Bearer ${this.session.token}`;
    return h;
  }

  private async req<T>(path: string, opts: RequestInit = {}): Promise<T> {
    if (!this.baseUrl) throw new Error('API base URL no configurada.');
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...opts,
      headers: { ...this.headers(), ...(opts.headers ?? {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    return (await res.json()) as T;
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<AuthSession> {
    const session = await this.req<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.session = session;
    await storageSet('auth:session', session);
    return session;
  }

  async register(email: string, password: string): Promise<AuthSession> {
    const session = await this.req<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.session = session;
    await storageSet('auth:session', session);
    return session;
  }

  async logout(): Promise<void> {
    this.session = null;
    await storageSet('auth:session', null);
  }

  // ── Progress sync ──────────────────────────────────────────────────────
  async getProgress(): Promise<Progress> {
    return this.req<Progress>('/me/progress');
  }

  async putProgress(progress: Progress): Promise<void> {
    await this.req<void>('/me/progress', {
      method: 'PUT',
      body: JSON.stringify(progress),
    });
  }

  async syncBatch(delta: SyncDelta): Promise<{ accepted: number; serverTs: number }> {
    return this.req<{ accepted: number; serverTs: number }>('/sync/srs-batch', {
      method: 'POST',
      body: JSON.stringify(delta),
    });
  }

  // ── Content ────────────────────────────────────────────────────────────
  getVocab(level: CefrLevel): Promise<VocabCard[]> {
    return this.req<VocabCard[]>(`/content/vocab/${level}`);
  }

  getReading(id: string): Promise<ReadingText> {
    return this.req<ReadingText>(`/content/lectura/${id}`);
  }

  getListening(id: string): Promise<ListeningItem> {
    return this.req<ListeningItem>(`/content/listening/${id}`);
  }
}

export const apiClient = new ApiClient();
