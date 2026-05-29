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
  'a2-01': async () => (await import('../assets/content/lecturas/a2-01.json')).default as ReadingText,
  'a2-02': async () => (await import('../assets/content/lecturas/a2-02.json')).default as ReadingText,
  'b1-01': async () => (await import('../assets/content/lecturas/b1-01.json')).default as ReadingText,
  'b1-02': async () => (await import('../assets/content/lecturas/b1-02.json')).default as ReadingText,
  'b2-01': async () => (await import('../assets/content/lecturas/b2-01.json')).default as ReadingText,
};

const LISTEN_LOCAL: Record<string, () => Promise<ListeningItem>> = {
  'a1-listen-01': async () => (await import('../assets/content/listening/a1-listen-01.json')).default as ListeningItem,
  'a2-listen-01': async () => (await import('../assets/content/listening/a2-listen-01.json')).default as ListeningItem,
  'b1-listen-01': async () => (await import('../assets/content/listening/b1-listen-01.json')).default as ListeningItem,
  'b2-listen-01': async () => (await import('../assets/content/listening/b2-listen-01.json')).default as ListeningItem,
};

export const READING_INDEX: Record<CefrLevel, string[]> = {
  a1: ['a1-01', 'a1-02'],
  a2: ['a2-01', 'a2-02'],
  b1: ['b1-01', 'b1-02'],
  b2: ['b2-01'],
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
export const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    id: 'present-perfect-vs-past',
    title: 'Present Perfect vs. Past Simple',
    level: 'b1',
    why: "Error #1 de hispanohablantes: usar \"I have eaten yesterday\" cuando \"yesterday\" exige past simple. El present perfect implica conexión con el presente (sin tiempo definido); el past simple, tiempo cerrado.",
    rule: "Past simple: tiempo determinado y cerrado (yesterday, last year, in 2019, ago). Present perfect: experiencia (ever, never), resultado presente, periodo no terminado (today, this week, since, for + período hasta ahora).",
    examples: [
      ['I lived in Madrid in 2015.', 'Past simple — tiempo cerrado.'],
      ['I have lived in Madrid since 2015.', 'Present perfect — desde entonces y aún continúa.'],
      ['Have you ever been to Japan?', 'Present perfect — experiencia de vida.'],
      ['I went to Japan last summer.', 'Past simple — momento concreto.'],
    ],
    exercises: [
      { q: 'I _____ John yesterday.', options: ['saw', 'have seen'], answer: 0 },
      { q: 'I _____ in this city for 10 years.', options: ['lived', 'have lived'], answer: 1 },
      { q: 'She _____ to Paris three times in her life.', options: ['went', 'has been'], answer: 1 },
      { q: 'We _____ dinner an hour ago.', options: ['had', 'have had'], answer: 0 },
      { q: '_____ you ever _____ sushi?', options: ['Did / try', 'Have / tried'], answer: 1 },
      { q: 'I _____ the new movie last weekend.', options: ['saw', 'have seen'], answer: 0 },
      { q: 'They _____ in their new house since March.', options: ['live', 'have lived'], answer: 1 },
      { q: 'When _____ you _____ here?', options: ['did / arrive', 'have / arrived'], answer: 0 },
    ],
  },
  {
    id: 'do-support',
    title: 'Do-support en preguntas y negaciones',
    level: 'a2',
    why: 'En español preguntamos "¿Tú comes carne?" sin auxiliar. En inglés se requiere "do/does" excepto con be y modales: "Do you eat meat?".',
    rule: 'Para presente simple: do (I, you, we, they) / does (he, she, it). Pasado simple: did para todos. El verbo principal en infinitivo SIN -s ni -ed: "Does he LIVE here?" (no "lives"). Excepciones: be, modal verbs, have got.',
    examples: [
      ['Do you speak English?', "NO: *Speak you English?"],
      ["She doesn't like coffee.", "NO: *She not likes coffee."],
      ['Did they arrive on time?', "NO: *Arrived they on time?"],
      ['Is he a doctor?', 'Con "be" no hay do-support.'],
    ],
    exercises: [
      { q: '_____ you like pizza?', options: ['Are', 'Do', '—'], answer: 1 },
      { q: 'She _____ live in Madrid.', options: ["don't", "doesn't", 'not'], answer: 1 },
      { q: '_____ he come yesterday?', options: ['Was', 'Did', 'Do'], answer: 1 },
      { q: 'They _____ work on Sundays.', options: ["don't", "doesn't", "aren't"], answer: 0 },
      { q: '_____ your sister speak French?', options: ['Is', 'Does', 'Do'], answer: 1 },
      { q: 'I _____ understand the question.', options: ["don't", 'am not', 'not'], answer: 0 },
    ],
  },
  {
    id: 'word-order',
    title: 'Orden de palabras: adjetivo + sustantivo',
    level: 'a1',
    why: 'En español "una casa roja", en inglés "a red house". El adjetivo SIEMPRE va antes del sustantivo en inglés.',
    rule: 'Adjetivo + sustantivo. Si hay varios: opinión → tamaño → edad → forma → color → origen → material → propósito.',
    examples: [
      ['a red car', "NO: *a car red"],
      ['expensive Italian shoes', 'opinión + origen'],
      ['the small black cat', 'tamaño + color'],
    ],
    exercises: [
      { q: 'Choose: "Tengo un coche nuevo y rápido."', options: ['I have a new fast car.', 'I have a car new and fast.', 'I have a fast new car.'], answer: 0 },
      { q: 'Choose: "Una casa grande y blanca"', options: ['A big white house', 'A white big house', 'A house big white'], answer: 0 },
      { q: 'Choose the correct sentence:', options: ['She wore a beautiful long red dress.', 'She wore a red long beautiful dress.', 'She wore a dress beautiful long red.'], answer: 0 },
    ],
  },
  {
    id: 'conditionals',
    title: '1ª, 2ª y 3ª condicional',
    level: 'b1',
    why: 'Cuatro patrones que muchos confunden. Decisión clave: ¿situación real, hipotética presente o hipotética pasada?',
    rule: '0ª: If + present, present (verdad general). 1ª: If + present, will (futuro real). 2ª: If + past, would (hipotético presente). 3ª: If + past perfect, would have + p.p. (hipotético pasado).',
    examples: [
      ['If you heat water, it boils.', '0ª — verdad.'],
      ["If it rains, I'll stay home.", '1ª — real futuro.'],
      ['If I had more money, I would travel.', '2ª — irreal presente.'],
      ['If I had studied harder, I would have passed.', '3ª — irreal pasado.'],
    ],
    exercises: [
      { q: 'If I _____ rich, I would buy a house.', options: ['am', 'were', 'have been'], answer: 1 },
      { q: "If it _____ tomorrow, we'll cancel the picnic.", options: ['rains', 'will rain', 'rained'], answer: 0 },
      { q: 'If she had known, she _____ you.', options: ['would tell', 'would have told', 'will tell'], answer: 1 },
      { q: 'If you _____ ice, it melts.', options: ['heat', 'will heat', 'heated'], answer: 0 },
      { q: 'If I _____ you, I would apologize.', options: ['am', 'was', 'were'], answer: 2 },
    ],
  },
  {
    id: 'phrasal-verbs-core',
    title: 'Phrasal verbs esenciales',
    level: 'b1',
    why: 'No se pueden traducir literalmente. "Look up" puede significar "mirar arriba" o "buscar (en diccionario)" según contexto.',
    rule: 'Separables: "turn the light on / turn on the light". Inseparables: "look after the children" (no "*look the children after"). Memorizar como unidades.',
    examples: [
      ['Could you turn off the TV?', 'Separable.'],
      ['I look after my grandmother.', 'Inseparable.'],
      ['Find out what time it starts.', 'Inseparable, transitivo.'],
      ['She finally gave up smoking.', 'Inseparable.'],
    ],
    exercises: [
      { q: 'Please _____ your homework before dinner.', options: ['turn off', 'finish off', 'figure out'], answer: 1 },
      { q: "I can't _____ this puzzle.", options: ['figure out', 'put up with', 'come across'], answer: 0 },
      { q: 'How do you _____ all this stress?', options: ['put up with', 'look up', 'turn into'], answer: 0 },
      { q: 'I ran _____ an old friend yesterday.', options: ['into', 'after', 'on'], answer: 0 },
      { q: 'We need to _____ a solution to this problem.', options: ['come up with', 'put off', 'take after'], answer: 0 },
    ],
  },
];

export function grammarById(id: string): GrammarTopic | undefined {
  return GRAMMAR_TOPICS.find((t) => t.id === id);
}
