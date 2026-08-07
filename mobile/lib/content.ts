// Loaders de contenido. Primero intenta backend; si falla, cae al bundle local.
// El contenido empaquetado garantiza modo offline.
import type {
  CefrLevel,
  GrammarTopic,
  ListeningItem,
  ReadingText,
  VocabCard,
} from './types';
import { apiClient } from './api';
import grammarData from '../assets/content/grammar.json';

// Vocab — embebido para arranque y funcionamiento offline.
const VOCAB_LOCAL: Record<CefrLevel, () => Promise<VocabCard[]>> = {
  a1: async () => (await import('../assets/content/vocab/a1.json')).default as VocabCard[],
  a2: async () => (await import('../assets/content/vocab/a2.json')).default as VocabCard[],
  b1: async () => (await import('../assets/content/vocab/b1.json')).default as VocabCard[],
  b2: async () => (await import('../assets/content/vocab/b2.json')).default as VocabCard[],
};

const READING_LOCAL: Record<string, () => Promise<ReadingText>> = {
  'a1-01': async () => (await import('../assets/content/lecturas/a1-01.json')).default as ReadingText,
  'a1-02': async () => (await import('../assets/content/lecturas/a1-02.json')).default as ReadingText,
  'a1-03': async () => (await import('../assets/content/lecturas/a1-03.json')).default as ReadingText,
  'a1-04': async () => (await import('../assets/content/lecturas/a1-04.json')).default as ReadingText,
  'a2-01': async () => (await import('../assets/content/lecturas/a2-01.json')).default as ReadingText,
  'a2-02': async () => (await import('../assets/content/lecturas/a2-02.json')).default as ReadingText,
  'a2-03': async () => (await import('../assets/content/lecturas/a2-03.json')).default as ReadingText,
  'a2-04': async () => (await import('../assets/content/lecturas/a2-04.json')).default as ReadingText,
  'b1-01': async () => (await import('../assets/content/lecturas/b1-01.json')).default as ReadingText,
  'b1-02': async () => (await import('../assets/content/lecturas/b1-02.json')).default as ReadingText,
  'b1-03': async () => (await import('../assets/content/lecturas/b1-03.json')).default as ReadingText,
  'b1-04': async () => (await import('../assets/content/lecturas/b1-04.json')).default as ReadingText,
  'b2-01': async () => (await import('../assets/content/lecturas/b2-01.json')).default as ReadingText,
  'b2-02': async () => (await import('../assets/content/lecturas/b2-02.json')).default as ReadingText,
  'b2-03': async () => (await import('../assets/content/lecturas/b2-03.json')).default as ReadingText,
};

const LISTEN_LOCAL: Record<string, () => Promise<ListeningItem>> = {
  'a1-listen-01': async () => (await import('../assets/content/listening/a1-listen-01.json')).default as ListeningItem,
  'a2-listen-01': async () => (await import('../assets/content/listening/a2-listen-01.json')).default as ListeningItem,
  'b1-listen-01': async () => (await import('../assets/content/listening/b1-listen-01.json')).default as ListeningItem,
  'b2-listen-01': async () => (await import('../assets/content/listening/b2-listen-01.json')).default as ListeningItem,
};

export const READING_INDEX: Record<CefrLevel, string[]> = {
  a1: ['a1-01', 'a1-02', 'a1-03', 'a1-04'],
  a2: ['a2-01', 'a2-02', 'a2-03', 'a2-04'],
  b1: ['b1-01', 'b1-02', 'b1-03', 'b1-04'],
  b2: ['b2-01', 'b2-02', 'b2-03'],
};

export const LISTENING_INDEX: Record<CefrLevel, string[]> = {
  a1: ['a1-listen-01'],
  a2: ['a2-listen-01'],
  b1: ['b1-listen-01'],
  b2: ['b2-listen-01'],
};

export async function loadVocab(level: CefrLevel): Promise<VocabCard[]> {
  try {
    const remote = await apiClient.getVocab(level);
    if (remote && remote.length > 0) return remote;
  } catch {
    // backend unavailable → fallback
  }
  return VOCAB_LOCAL[level]();
}

export async function loadReading(id: string): Promise<ReadingText> {
  try {
    const remote = await apiClient.getReading(id);
    if (remote) return remote;
  } catch {
    // fallback
  }
  const loader = READING_LOCAL[id];
  if (!loader) throw new Error(`Lectura '${id}' no disponible.`);
  return loader();
}

export async function loadListening(id: string): Promise<ListeningItem> {
  try {
    const remote = await apiClient.getListening(id);
    if (remote) return remote;
  } catch {
    // fallback
  }
  const loader = LISTEN_LOCAL[id];
  if (!loader) throw new Error(`Listening '${id}' no disponible.`);
  return loader();
}

// ─── Grammar topics ───────────────────────────────────────────────────────
// Embebidos (no requieren backend). Misma estructura que el webapp.
// Generado por tools/build_grammar.py desde content/grammar.json. Antes estos
// temas estaban escritos a mano aquí Y otra vez en webapp/js/grammar.js, que es
// exactamente cómo dos copias del mismo contenido acaban divergiendo.
export const GRAMMAR_TOPICS: GrammarTopic[] = grammarData as unknown as GrammarTopic[];

export function grammarById(id: string): GrammarTopic | undefined {
  return GRAMMAR_TOPICS.find((t) => t.id === id);
}
