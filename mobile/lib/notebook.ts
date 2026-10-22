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

// Determinista también para escrituras sin letras latinas: con el antiguo
// fallback a Date.now(), «你» recibía un id nuevo en cada guardado (entradas
// duplicadas e isSaved siempre en falso). Los ids latinos no cambian.
function entryId(term: string): string {
  return (
    normalize(term).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
    'u-' + Array.from(term.trim()).map((c) => (c.codePointAt(0) ?? 0).toString(16)).join('-')
  );
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
    // \b es ASCII: no casa entre hanzi ni ante «é» o «à», y la respuesta se
    // quedaba a la vista en la frase.
    // Si la palabra no aparece tal cual se tapa la forma flexionada (years,
    // talked), y se tapan todas las apariciones. Mismo criterio que la web.
    const esc = entry.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const L = 'A-Za-z\u00C0-\u024F';
    let re: RegExp;
    if (/[\u3400-\u9FFF]/.test(entry.term)) re = new RegExp(`()${esc}`, 'g');
    else {
      re = new RegExp(`(^|[^${L}])${esc}(?![${L}])`, 'gi');
      if (!re.test(entry.example)) re = new RegExp(`(^|[^${L}])${esc}[${L}]{0,4}(?![${L}])`, 'gi');
      re.lastIndex = 0;
    }
    const prompt = entry.example.replace(re, '$1_____');
    return { prompt, answer: entry.term };
  }
  return { prompt: `¿Cómo usarías «${entry.term}» en una frase?`, answer: entry.term };
}
