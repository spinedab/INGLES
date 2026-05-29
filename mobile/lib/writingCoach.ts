// Writing coach — reglas focalizadas en errores de hispanohablantes + analizador.
// Port de la lógica del coach.js webapp (sin UI).
import type { VocabCard, WritingAnalysis, WritingIssue } from './types';

interface WritingRule extends WritingIssue {
  re: RegExp;
}

export const WRITING_RULES: WritingRule[] = [
  {
    title: 'Edad en inglés',
    detail: 'Usa "I am 25 years old", no "I have 25 years".',
    re: /\bI have\s+\d+\s+years?\b/i,
  },
  {
    title: 'Agree no lleva be',
    detail: 'La forma natural es "I agree", no "I am agree".',
    re: /\bI am agree\b/i,
  },
  {
    title: 'People es plural',
    detail: 'Escribe "people are", no "people is".',
    re: /\bpeople\s+is\b/i,
  },
  {
    title: 'Depend on',
    detail: 'En inglés estándar se dice "depend on", no "depend of".',
    re: /\bdepend(s|ed|ing)?\s+of\b/i,
  },
  {
    title: 'Listen to',
    detail: 'Cuando hay objeto, usa "listen to music / listen to a podcast".',
    re: /\blisten(?:ed|ing)?\s+(music|podcasts?|songs?|the radio)\b/i,
  },
  {
    title: 'Explain it to me',
    detail: 'Evita "explain me"; usa "explain it to me".',
    re: /\bexplain\s+me\b/i,
  },
  {
    title: 'Married to',
    detail: 'La colocación correcta es "married to", no "married with".',
    re: /\bmarried\s+with\b/i,
  },
  {
    title: 'Evita doble comparativo',
    detail: 'Usa "better" o "more useful", no "more better".',
    re: /\bmore\s+better\b/i,
  },
  {
    title: 'Important to',
    detail: 'Después de "important" suele venir infinitivo: "important to practice".',
    re: /\bimportant\s+(learn|study|practice|improve|speak|write|read)\b/i,
  },
  {
    title: 'Take a photo',
    detail: 'La colocación natural es "take a photo", no "make a photo".',
    re: /\bmake\s+a\s+photo\b/i,
  },
];

export function headword(front: string): string {
  return String(front).replace(/\s*\([^)]*\)\s*$/, '').trim();
}

export function tokenize(text: string): string[] {
  return String(text).toLowerCase().match(/[a-z']+/g) || [];
}

function wordAppears(text: string, word: string): boolean {
  const escaped = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

function repeatedWords(words: string[]): string[] {
  const counts = new Map<string, number>();
  for (const word of words) {
    if (word.length < 5) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function estimateLevel(wordCount: number, lexicalVariety: number, sentenceCount: number): string {
  if (wordCount < 50 || sentenceCount < 4) return 'A1-A2';
  if (wordCount < 120 || lexicalVariety < 0.58) return 'A2-B1';
  if (wordCount < 220 || lexicalVariety < 0.68) return 'B1-B2';
  return 'B2+';
}

export function analyzeWriting(text: string, vocab: VocabCard[]): WritingAnalysis {
  const clean = text.trim();
  const words = tokenize(clean);
  const sentences = clean.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const issues: WritingIssue[] = WRITING_RULES.filter((rule) => rule.re.test(clean)).map((r) => ({
    title: r.title,
    detail: r.detail,
  }));
  const longSentences = sentences.filter((s) => tokenize(s).length > 26).length;
  const targetUsed = vocab
    .filter((card) => wordAppears(clean, headword(card.front)))
    .slice(0, 12)
    .map((card) => headword(card.front));
  const repeated = repeatedWords(words);
  const lexicalVariety = words.length ? new Set(words.map((w) => w.toLowerCase())).size / words.length : 0;
  const levelEstimate = estimateLevel(words.length, lexicalVariety, sentences.length);
  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        48 +
          Math.min(18, words.length / 5) +
          Math.min(12, targetUsed.length * 3) +
          Math.round(lexicalVariety * 14) -
          issues.length * 9 -
          longSentences * 4,
      ),
    ),
  );

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    issues,
    longSentences,
    targetUsed,
    repeated,
    lexicalVariety,
    levelEstimate,
    score,
  };
}

export function pickTargetWords(vocab: VocabCard[], count: number): VocabCard[] {
  return vocab.filter((card) => card.front.length > 2).slice(0, count);
}

export function writingPrompt(words: VocabCard[]): string {
  const selected = words.slice(0, 3).map((w) => headword(w.front)).join(', ');
  return `Write about your week in English. Include these words naturally: ${selected}.`;
}
