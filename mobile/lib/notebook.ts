// Cuaderno léxico — guardar palabras/colocaciones para reutilizarlas en output.
// Port de webapp/js/notebook.js (lógica pura, sin UI).
import { get, set } from './storage';
import { logActivity } from './insights';
import type { LexiconEntry } from './types';

const KEY = 'lexicon:entries';

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function normalize(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function entryId(term: string): string {
  return normalize(term).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || String(Date.now());
}

export async function lexiconEntries(): Promise<LexiconEntry[]> {
  return get<LexiconEntry[]>(KEY, []);
}

export async function isSaved(term: string): Promise<boolean> {
  const id = entryId(term);
  const entries = await lexiconEntries();
  return entries.some((entry) => entry.id === id);
}

export interface LexiconInput {
  term?: string;
  word?: string;
  meaning?: string;
  definition?: string;
  example?: string;
  notes?: string;
  source?: string;
  level?: string;
  tags?: string[];
}

export async function addLexiconEntry(data: LexiconInput): Promise<LexiconEntry | null> {
  const term = clean(data.term || data.word || '');
  if (!term) return null;

  const now = Date.now();
  const id = entryId(term);
  const entries = await lexiconEntries();
  const current = entries.find((entry) => entry.id === id);
  const next: LexiconEntry = {
    id,
    term,
    meaning: clean(data.meaning || data.definition || current?.meaning || ''),
    example: clean(data.example || current?.example || ''),
    notes: clean(data.notes || current?.notes || ''),
    source: clean(data.source || current?.source || 'manual'),
    level: clean(data.level || current?.level || ''),
    tags: Array.isArray(data.tags) ? data.tags : current?.tags || [],
    mastered: current?.mastered || false,
    hits: (current?.hits || 0) + 1,
    addedAt: current?.addedAt || now,
    updatedAt: now,
  };

  const saved = current
    ? entries.map((entry) => (entry.id === id ? next : entry))
    : [next, ...entries];

  await set(KEY, saved);
  await logActivity('lexicon_saved', { skill: 'writing', term, minutes: 1 });
  return next;
}

export async function toggleMastered(id: string): Promise<void> {
  const entries = await lexiconEntries();
  const updated = entries.map((entry) =>
    entry.id === id ? { ...entry, mastered: !entry.mastered, updatedAt: Date.now() } : entry,
  );
  await set(KEY, updated);
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = await lexiconEntries();
  await set(KEY, entries.filter((entry) => entry.id !== id));
}

export async function filterEntries(opts: {
  status?: 'all' | 'active' | 'mastered';
  query?: string;
} = {}): Promise<LexiconEntry[]> {
  const { status = 'active', query = '' } = opts;
  const entries = await lexiconEntries();
  let visible = entries;
  if (status === 'active') visible = visible.filter((e) => !e.mastered);
  if (status === 'mastered') visible = visible.filter((e) => e.mastered);
  const q = normalize(query);
  if (q) {
    visible = visible.filter((entry) =>
      normalize([entry.term, entry.meaning, entry.example, entry.notes, entry.source].join(' ')).includes(q),
    );
  }
  return visible;
}

/**
 * Genera una pregunta de cloze para una entrada del cuaderno.
 * Devuelve la frase con la palabra reemplazada por _____ o un prompt genérico.
 */
export function buildCloze(entry: LexiconEntry): { prompt: string; answer: string } {
  if (entry.example) {
    const re = new RegExp(`\\b${entry.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const prompt = entry.example.replace(re, '_____');
    return { prompt, answer: entry.term };
  }
  return { prompt: `How would you use "${entry.term}" in a sentence?`, answer: entry.term };
}
