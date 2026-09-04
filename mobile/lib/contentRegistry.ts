// GENERADO por tools/build_content.py — no editar a mano.
// Metro no resuelve imports con rutas dinámicas, así que la tabla de
// contenido de cada idioma se escribe aquí de forma literal.
/* eslint-disable */
import type { GrammarTopic, ListeningItem, ReadingText, VocabCard } from './types';

import grammar_en from '../assets/content/en/grammar.json';
import grammar_fr from '../assets/content/fr/grammar.json';
import grammar_it from '../assets/content/it/grammar.json';
import grammar_pt from '../assets/content/pt/grammar.json';
import grammar_zh from '../assets/content/zh/grammar.json';

export type Loader<T> = () => Promise<T>;
export interface LangMeta { code: string; name: string; native: string; tts: string; headline: string; variant?: string }
export interface LangContent {
  meta: LangMeta;
  grammar: GrammarTopic[];
  vocab: Record<string, Loader<VocabCard[]>>;
  readings: Record<string, string[]>;   // nivel → ids
  listening: Record<string, string[]>;  // nivel → ids
  loadReading: Record<string, Loader<ReadingText>>;
  loadListening: Record<string, Loader<ListeningItem>>;
}

export const CONTENT: Record<string, LangContent> = {
  en: {
    meta: {"code": "en", "name": "inglés", "native": "English", "tts": "en-US", "variant": "Inglés estándar (referencia británica/americana neutra)", "headline": "Aprende inglés, basado en evidencia."},
    grammar: grammar_en as unknown as GrammarTopic[],
    vocab: {
      a1: async () => (await import('../assets/content/en/vocab/a1.json')).default as VocabCard[],
      a2: async () => (await import('../assets/content/en/vocab/a2.json')).default as VocabCard[],
      b1: async () => (await import('../assets/content/en/vocab/b1.json')).default as VocabCard[],
      b2: async () => (await import('../assets/content/en/vocab/b2.json')).default as VocabCard[],
    },
    readings: {"a1": ["a1-01", "a1-02", "a1-03", "a1-04"], "a2": ["a2-01", "a2-02", "a2-03", "a2-04"], "b1": ["b1-01", "b1-02", "b1-03", "b1-04"], "b2": ["b2-01", "b2-02", "b2-03"]},
    listening: {"a1": ["a1-listen-01", "a1-listen-02"], "a2": ["a2-listen-01", "a2-listen-02"], "b1": ["b1-listen-01", "b1-listen-02"], "b2": ["b2-listen-01", "b2-listen-02"]},
    loadReading: {
      'a1-01': async () => (await import('../assets/content/en/lecturas/a1-01.json')).default as ReadingText,
      'a1-02': async () => (await import('../assets/content/en/lecturas/a1-02.json')).default as ReadingText,
      'a1-03': async () => (await import('../assets/content/en/lecturas/a1-03.json')).default as ReadingText,
      'a1-04': async () => (await import('../assets/content/en/lecturas/a1-04.json')).default as ReadingText,
      'a2-01': async () => (await import('../assets/content/en/lecturas/a2-01.json')).default as ReadingText,
      'a2-02': async () => (await import('../assets/content/en/lecturas/a2-02.json')).default as ReadingText,
      'a2-03': async () => (await import('../assets/content/en/lecturas/a2-03.json')).default as ReadingText,
      'a2-04': async () => (await import('../assets/content/en/lecturas/a2-04.json')).default as ReadingText,
      'b1-01': async () => (await import('../assets/content/en/lecturas/b1-01.json')).default as ReadingText,
      'b1-02': async () => (await import('../assets/content/en/lecturas/b1-02.json')).default as ReadingText,
      'b1-03': async () => (await import('../assets/content/en/lecturas/b1-03.json')).default as ReadingText,
      'b1-04': async () => (await import('../assets/content/en/lecturas/b1-04.json')).default as ReadingText,
      'b2-01': async () => (await import('../assets/content/en/lecturas/b2-01.json')).default as ReadingText,
      'b2-02': async () => (await import('../assets/content/en/lecturas/b2-02.json')).default as ReadingText,
      'b2-03': async () => (await import('../assets/content/en/lecturas/b2-03.json')).default as ReadingText,
    },
    loadListening: {
      'a1-listen-01': async () => (await import('../assets/content/en/listening/a1-listen-01.json')).default as ListeningItem,
      'a1-listen-02': async () => (await import('../assets/content/en/listening/a1-listen-02.json')).default as ListeningItem,
      'a2-listen-01': async () => (await import('../assets/content/en/listening/a2-listen-01.json')).default as ListeningItem,
      'a2-listen-02': async () => (await import('../assets/content/en/listening/a2-listen-02.json')).default as ListeningItem,
      'b1-listen-01': async () => (await import('../assets/content/en/listening/b1-listen-01.json')).default as ListeningItem,
      'b1-listen-02': async () => (await import('../assets/content/en/listening/b1-listen-02.json')).default as ListeningItem,
      'b2-listen-01': async () => (await import('../assets/content/en/listening/b2-listen-01.json')).default as ListeningItem,
      'b2-listen-02': async () => (await import('../assets/content/en/listening/b2-listen-02.json')).default as ListeningItem,
    },
  },
  fr: {
    meta: {"code": "fr", "name": "francés", "native": "Français", "tts": "fr-FR", "variant": "Francés estándar de Francia. Ortografía y pronunciación se separan mucho: se trabaja la relación sonido-grafía desde A1.", "headline": "Aprende francés, basado en evidencia."},
    grammar: grammar_fr as unknown as GrammarTopic[],
    vocab: {
      a1: async () => (await import('../assets/content/fr/vocab/a1.json')).default as VocabCard[],
      a2: async () => (await import('../assets/content/fr/vocab/a2.json')).default as VocabCard[],
      b1: async () => (await import('../assets/content/fr/vocab/b1.json')).default as VocabCard[],
      b2: async () => (await import('../assets/content/fr/vocab/b2.json')).default as VocabCard[],
    },
    readings: {"a1": ["fr-a1-01"], "a2": ["fr-a2-01"], "b1": ["fr-b1-01"], "b2": ["fr-b2-01"]},
    listening: {"a1": ["fr-a1-listen-01"], "a2": [], "b1": ["fr-b1-listen-01"], "b2": []},
    loadReading: {
      'fr-a1-01': async () => (await import('../assets/content/fr/lecturas/fr-a1-01.json')).default as ReadingText,
      'fr-a2-01': async () => (await import('../assets/content/fr/lecturas/fr-a2-01.json')).default as ReadingText,
      'fr-b1-01': async () => (await import('../assets/content/fr/lecturas/fr-b1-01.json')).default as ReadingText,
      'fr-b2-01': async () => (await import('../assets/content/fr/lecturas/fr-b2-01.json')).default as ReadingText,
    },
    loadListening: {
      'fr-a1-listen-01': async () => (await import('../assets/content/fr/listening/fr-a1-listen-01.json')).default as ListeningItem,
      'fr-b1-listen-01': async () => (await import('../assets/content/fr/listening/fr-b1-listen-01.json')).default as ListeningItem,
    },
  },
  it: {
    meta: {"code": "it", "name": "italiano", "native": "Italiano", "tts": "it-IT", "variant": "Italiano estándar. Tan cercano al español que la trampa es dar por idéntico lo que no lo es: artículos, dobles consonantes, essere/avere.", "headline": "Aprende italiano, basado en evidencia."},
    grammar: grammar_it as unknown as GrammarTopic[],
    vocab: {
      a1: async () => (await import('../assets/content/it/vocab/a1.json')).default as VocabCard[],
      a2: async () => (await import('../assets/content/it/vocab/a2.json')).default as VocabCard[],
      b1: async () => (await import('../assets/content/it/vocab/b1.json')).default as VocabCard[],
      b2: async () => (await import('../assets/content/it/vocab/b2.json')).default as VocabCard[],
    },
    readings: {"a1": ["it-a1-01"], "a2": ["it-a2-01"], "b1": ["it-b1-01"], "b2": ["it-b2-01"]},
    listening: {"a1": ["it-a1-listen-01"], "a2": [], "b1": ["it-b1-listen-01"], "b2": []},
    loadReading: {
      'it-a1-01': async () => (await import('../assets/content/it/lecturas/it-a1-01.json')).default as ReadingText,
      'it-a2-01': async () => (await import('../assets/content/it/lecturas/it-a2-01.json')).default as ReadingText,
      'it-b1-01': async () => (await import('../assets/content/it/lecturas/it-b1-01.json')).default as ReadingText,
      'it-b2-01': async () => (await import('../assets/content/it/lecturas/it-b2-01.json')).default as ReadingText,
    },
    loadListening: {
      'it-a1-listen-01': async () => (await import('../assets/content/it/listening/it-a1-listen-01.json')).default as ListeningItem,
      'it-b1-listen-01': async () => (await import('../assets/content/it/listening/it-b1-listen-01.json')).default as ListeningItem,
    },
  },
  pt: {
    meta: {"code": "pt", "name": "portugués", "native": "Português", "tts": "pt-BR", "variant": "Portugués de Brasil. Para un hispanohablante el peligro no es entender sino el «portuñol»: se insiste en la forma.", "headline": "Aprende portugués, basado en evidencia."},
    grammar: grammar_pt as unknown as GrammarTopic[],
    vocab: {
      a1: async () => (await import('../assets/content/pt/vocab/a1.json')).default as VocabCard[],
      a2: async () => (await import('../assets/content/pt/vocab/a2.json')).default as VocabCard[],
      b1: async () => (await import('../assets/content/pt/vocab/b1.json')).default as VocabCard[],
      b2: async () => (await import('../assets/content/pt/vocab/b2.json')).default as VocabCard[],
    },
    readings: {"a1": ["pt-a1-01"], "a2": ["pt-a2-01"], "b1": ["pt-b1-01"], "b2": ["pt-b2-01"]},
    listening: {"a1": ["pt-a1-listen-01"], "a2": [], "b1": ["pt-b1-listen-01"], "b2": []},
    loadReading: {
      'pt-a1-01': async () => (await import('../assets/content/pt/lecturas/pt-a1-01.json')).default as ReadingText,
      'pt-a2-01': async () => (await import('../assets/content/pt/lecturas/pt-a2-01.json')).default as ReadingText,
      'pt-b1-01': async () => (await import('../assets/content/pt/lecturas/pt-b1-01.json')).default as ReadingText,
      'pt-b2-01': async () => (await import('../assets/content/pt/lecturas/pt-b2-01.json')).default as ReadingText,
    },
    loadListening: {
      'pt-a1-listen-01': async () => (await import('../assets/content/pt/listening/pt-a1-listen-01.json')).default as ListeningItem,
      'pt-b1-listen-01': async () => (await import('../assets/content/pt/listening/pt-b1-listen-01.json')).default as ListeningItem,
    },
  },
  zh: {
    meta: {"code": "zh", "name": "chino mandarín", "native": "普通话", "tts": "zh-CN", "variant": "Mandarín estándar, caracteres simplificados, con pinyin y tonos en todo el contenido A1-A2 (referencia HSK).", "headline": "Aprende chino mandarín, basado en evidencia."},
    grammar: grammar_zh as unknown as GrammarTopic[],
    vocab: {
      a1: async () => (await import('../assets/content/zh/vocab/a1.json')).default as VocabCard[],
      a2: async () => (await import('../assets/content/zh/vocab/a2.json')).default as VocabCard[],
      b1: async () => (await import('../assets/content/zh/vocab/b1.json')).default as VocabCard[],
      b2: async () => (await import('../assets/content/zh/vocab/b2.json')).default as VocabCard[],
    },
    readings: {"a1": ["zh-a1-01"], "a2": ["zh-a2-01"], "b1": ["zh-b1-01"], "b2": ["zh-b2-01"]},
    listening: {"a1": ["zh-a1-listen-01"], "a2": [], "b1": ["zh-b1-listen-01"], "b2": []},
    loadReading: {
      'zh-a1-01': async () => (await import('../assets/content/zh/lecturas/zh-a1-01.json')).default as ReadingText,
      'zh-a2-01': async () => (await import('../assets/content/zh/lecturas/zh-a2-01.json')).default as ReadingText,
      'zh-b1-01': async () => (await import('../assets/content/zh/lecturas/zh-b1-01.json')).default as ReadingText,
      'zh-b2-01': async () => (await import('../assets/content/zh/lecturas/zh-b2-01.json')).default as ReadingText,
    },
    loadListening: {
      'zh-a1-listen-01': async () => (await import('../assets/content/zh/listening/zh-a1-listen-01.json')).default as ListeningItem,
      'zh-b1-listen-01': async () => (await import('../assets/content/zh/listening/zh-b1-listen-01.json')).default as ListeningItem,
    },
  },
};

export const LANGUAGE_CODES = ["en", "fr", "it", "pt", "zh"] as const;
