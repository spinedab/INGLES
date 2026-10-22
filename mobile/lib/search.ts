// Búsqueda global: vocabulario, lecturas, listening, gramática.
// Port de webapp/js/search.js (lógica pura, sin UI).
import type { CefrLevel, SearchItem } from './types';
import { loadVocab, loadReading, loadListening, deckName, readingIndex, listeningIndex, grammarTopics, activeLanguage } from './content';

const LEVELS: CefrLevel[] = ['a1', 'a2', 'b1', 'b2'];

// La caché es por idioma: sin la clave, al cambiar de idioma seguía sirviendo
// el índice anterior, con enlaces a lecturas que el idioma nuevo no tiene.
let indexCache: { lang: string; items: SearchItem[] } | null = null;

function normalize(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function headword(front: string): string {
  return String(front).replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function stripHtml(text: string): string {
  return String(text || '').replace(/<[^>]*>/g, ' ');
}

// \b es ASCII: no casaba entre hanzi ni ante «à», y las colocaciones chinas se
// guardaban sin ejemplo. «…» es un hueco y el pinyin final se ignora. Mismo
// criterio que webapp/js/search.js.
function findSentence(text: string, term: string): string {
  const base = String(term).replace(/\s*\([^)]*\)\s*$/, '').replace(/[?？!！]\s*$/, '').trim();
  if (!base) return '';
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cjk = /[\u3400-\u9FFF]/.test(base);
  const L = 'A-Za-z\u00C0-\u024F';
  const gap = cjk ? '[^。！？\\n]{0,12}?' : '[^.!?\\n]{0,40}?';
  const body = base.split('…').map((p) => esc(p.trim())).filter(Boolean).join(gap);
  const re = cjk
    ? new RegExp(`[^。！？()\\n]*${body}[^。！？()\\n]*[。！？]?`)
    : new RegExp(`[^.!?\\n]*(?:^|[^${L}])${body}(?![${L}])[^.!?\\n]*[.!?]?`, 'i');
  return (String(text || '').match(re) || [''])[0].trim();
}

export function countWords(s: string): number {
  return stripHtml(s).split(/\s+/).filter(Boolean).length;
}

export function snippet(text: string, length: number = 190): string {
  return stripHtml(text).replace(/\s+/g, ' ').trim().slice(0, length);
}

export function labelForType(type: SearchItem['type']): string {
  return ({
    vocab: 'Vocabulario',
    reading: 'Lectura',
    listening: 'Listening',
    grammar: 'Gramática',
  } as const)[type];
}

export async function buildSearchIndex(): Promise<SearchItem[]> {
  const lang = activeLanguage();
  if (indexCache && indexCache.lang === lang) return indexCache.items;
  const items: SearchItem[] = [];

  for (const level of LEVELS) {
    const vocab = await loadVocab(level).catch(() => []);
    for (const card of vocab) {
      const term = headword(card.front);
      items.push({
        type: 'vocab',
        level,
        title: term,
        subtitle: `${level.toUpperCase()} · ${card.translation || ''}`,
        body: [card.definition, card.example, card.translation, ...(card.tags || [])].join(' '),
        href: '/flashcards',
        save: {
          term,
          meaning: card.translation || card.definition,
          example: card.example,
          source: deckName(level),
          level,
          tags: card.tags || [],
        },
      });
    }

    for (const id of readingIndex(level)) {
      const text = await loadReading(id).catch(() => null);
      if (!text) continue;
      items.push({
        type: 'reading',
        level,
        title: text.title,
        subtitle: `${level.toUpperCase()} · ${countWords(text.text)} palabras`,
        body: [text.summary, stripHtml(text.text), ...(text.collocations || [])].join(' '),
        href: `/reading/${id}`,
      });
      for (const phrase of text.collocations || []) {
        items.push({
          type: 'vocab',
          level,
          title: phrase,
          subtitle: `${level.toUpperCase()} · colocación de lectura`,
          body: `${text.title} ${text.summary}`,
          href: `/reading/${id}`,
          save: {
            term: phrase,
            meaning: 'Colocación para usar como bloque.',
            example: findSentence(stripHtml(text.text), phrase),
            source: `reading-${id}`,
            level,
            tags: ['collocation'],
          },
        });
      }
    }

    for (const id of listeningIndex(level)) {
      const item = await loadListening(id).catch(() => null);
      if (!item) continue;
      items.push({
        type: 'listening',
        level,
        title: item.title,
        subtitle: `${level.toUpperCase()} · ${item.duration}`,
        body: [item.summary, item.script, ...(item.vocabulary || []).map((v) => `${v.word} ${v.meaning}`)].join(' '),
        href: `/listening/${id}`,
      });
      for (const v of item.vocabulary || []) {
        items.push({
          type: 'vocab',
          level,
          title: v.word,
          subtitle: `${level.toUpperCase()} · vocabulario de listening`,
          body: `${v.meaning} ${item.title} ${item.script}`,
          href: `/listening/${id}`,
          save: {
            term: v.word,
            meaning: v.meaning,
            example: findSentence(item.script, v.word),
            source: `listening-${id}`,
            level,
            tags: ['listening'],
          },
        });
      }
    }
  }

  for (const topic of grammarTopics()) {
    items.push({
      type: 'grammar',
      level: topic.level,
      title: topic.title,
      subtitle: `${topic.level.toUpperCase()} · gramática`,
      body: [
        topic.why,
        topic.rule,
        ...topic.examples.flat(),
        ...topic.exercises.map((ex) => `${ex.q} ${ex.options.join(' ')}`),
      ].join(' '),
      href: `/grammar/${topic.id}`,
    });
  }

  const built = items.map((item) => ({
    ...item,
    haystack: normalize(`${item.title} ${item.subtitle} ${item.body}`),
  }));
  indexCache = { lang, items: built };
  return built;
}

function scoreItem(item: SearchItem, tokens: string[], level: CefrLevel): number {
  let score = 0;
  for (const token of tokens) {
    if (normalize(item.title).includes(token)) score += 8;
    if (normalize(item.subtitle).includes(token)) score += 3;
    if (item.haystack?.includes(token)) score += 2;
  }
  if (score > 0 && item.level === level) score += 2;
  return score;
}

export function searchIndex(
  index: SearchItem[],
  query: string,
  opts: { type: 'all' | SearchItem['type']; level: CefrLevel },
): SearchItem[] {
  const { type, level } = opts;
  const q = normalize(query);
  const tokens = q.split(/\s+/).filter(Boolean);
  const pool = index.filter((item) => type === 'all' || item.type === type);

  if (!tokens.length) {
    return pool
      .filter((item) => item.level === level || item.type === 'grammar')
      .slice(0, 24);
  }

  return pool
    .map((item) => ({ ...item, score: scoreItem(item, tokens, level) }))
    .filter((item) => (item as unknown as { score: number }).score > 0)
    .sort((a, b) => {
      const sa = (a as unknown as { score: number }).score;
      const sb = (b as unknown as { score: number }).score;
      return sb - sa || a.title.localeCompare(b.title);
    })
    .slice(0, 60);
}

export function invalidateSearchIndex(): void {
  indexCache = null;
}
