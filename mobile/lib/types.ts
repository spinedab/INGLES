export type CefrLevel = 'a1' | 'a2' | 'b1' | 'b2';

export interface VocabCard {
  id: string;
  front: string;
  definition: string;
  example: string;
  translation: string;
  tags: string[];
}

export interface SrsState {
  ef: number;       // Easiness factor (SuperMemo-2)
  interval: number; // Días hasta próximo repaso
  reps: number;     // Repeticiones exitosas consecutivas
  due: number;      // Timestamp ms del próximo repaso
}

export interface Question {
  q: string;
  options: string[];
  answer: number;
}

export interface ReadingText {
  id?: string; // derivado del nombre del archivo
  title: string;
  summary: string;
  text: string;
  glosses: { word: string; tip: string }[];
  collocations: string[];
  questions: Question[];
}

export interface ListeningItem {
  id?: string; // derivado del nombre del archivo
  title: string;
  summary: string;
  duration: string;
  audio: string | null;
  externalUrl?: string;
  script: string;
  vocabulary: { word: string; meaning: string }[];
  questions: Question[];
}

export interface GrammarTopic {
  id: string;
  title: string;
  level: CefrLevel;
  why: string;
  rule: string;
  examples: [string, string][];
  exercises: Question[];
}

export interface Progress {
  level: CefrLevel;
  vocabStates: Record<string, SrsState>;       // key: "vocab-{level}:{cardId}"
  readingDone: Record<string, boolean>;        // key: id
  readingScores: Record<string, { correct: number; total: number; ts: number }>;
  listeningRevealed: Record<string, number>;   // key: id → ts
  grammarScores: Record<string, { correct: number; total: number; ts: number }>;
  lastSync?: number;
}

export interface SyncDelta {
  vocabStates?: Record<string, SrsState>;
  readingDone?: Record<string, boolean>;
  readingScores?: Record<string, { correct: number; total: number; ts: number }>;
  listeningRevealed?: Record<string, number>;
  grammarScores?: Record<string, { correct: number; total: number; ts: number }>;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  userId: string;
  email: string;
  expiresAt: number;
}

// ─── Insights / activity tracking ─────────────────────────────────────────
export type Skill =
  | 'flashcards'
  | 'reading'
  | 'listening'
  | 'grammar'
  | 'writing'
  | 'speaking'
  | 'focus';

export interface ActivityEvent {
  id: string;
  type: string;
  ts: number;
  day: string;            // YYYY-MM-DD local
  skill?: Skill;
  minutes?: number;
  // payload-specific fields
  count?: number;         // flashcards_session
  correct?: number;       // *_score
  total?: number;         // *_score
  id_?: string;           // referenced content id
  title?: string;
  words?: number;         // writing_analysis
  issues?: number;        // writing_analysis
  targetUsed?: number;    // writing_analysis
  match?: number;         // speaking_shadow
  term?: string;          // lexicon_*
}

export interface DailyMissionItem {
  label: string;
  detail: string;
  href: string;
  skill: Skill;
}

export interface ActivitySummary {
  goal: number;
  streak: number;
  completion: number;
  totals: {
    todayMinutes: number;
    weekMinutes: number;
    sessions: number;
    skills: Record<Skill, number>;
  };
  week: { key: string; minutes: number; events: number }[];
  lastEvents: ActivityEvent[];
}

// ─── Lexicon (notebook) ───────────────────────────────────────────────────
export interface LexiconEntry {
  id: string;
  term: string;
  meaning: string;
  example: string;
  notes: string;
  source: string;
  level: string;
  tags: string[];
  mastered: boolean;
  hits: number;
  addedAt: number;
  updatedAt: number;
}

// ─── Writing coach ────────────────────────────────────────────────────────
export interface WritingIssue {
  title: string;
  detail: string;
}

export interface WritingAnalysis {
  wordCount: number;
  sentenceCount: number;
  issues: WritingIssue[];
  longSentences: number;
  targetUsed: string[];
  repeated: string[];
  lexicalVariety: number;
  levelEstimate: string;
  score: number;
}

// ─── Search ────────────────────────────────────────────────────────────────
export interface SearchItem {
  type: 'vocab' | 'reading' | 'listening' | 'grammar';
  level: CefrLevel;
  title: string;
  subtitle: string;
  body: string;
  href: string;
  haystack?: string;
  save?: {
    term: string;
    meaning: string;
    example: string;
    source: string;
    level: string;
    tags: string[];
  };
}
