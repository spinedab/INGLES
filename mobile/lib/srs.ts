// Implementación del algoritmo SuperMemo-2 (Wozniak, 1985).
// Cada card: { ef, interval, reps, due }
import { get, set } from './storage';
import type { SrsState, VocabCard } from './types';

const DAY_MS = 86_400_000;

export function defaultState(): SrsState {
  return { ef: 2.5, interval: 0, reps: 0, due: Date.now() };
}

function keyOf(deck: string, cardId: string): string {
  return `srs:${deck}:${cardId}`;
}

export async function loadCardState(deck: string, cardId: string): Promise<SrsState> {
  return get<SrsState>(keyOf(deck, cardId), defaultState());
}

export async function saveCardState(deck: string, cardId: string, state: SrsState): Promise<void> {
  await set(keyOf(deck, cardId), state);
}

/**
 * Aplica un grading (0..5) al estado y devuelve el nuevo estado.
 * Convención SM-2:
 *  - q<3 → reset reps a 0, interval = 1
 *  - q≥3 → si reps==0 → interval=1; reps==1 → interval=6; sino → ceil(prev*ef)
 *  - EF nuevo = max(1.3, EF + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 */
export function review(state: SrsState, quality: number): SrsState {
  const q = Math.max(0, Math.min(5, quality));
  let { ef, interval, reps } = state;
  ef = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.ceil(interval * ef);
    reps += 1;
  }
  const due = Date.now() + interval * DAY_MS;
  return { ef, interval, reps, due };
}

export interface DeckStats {
  total: number;
  learned: number;
  dueToday: number;
  fresh: number;
}

export async function statsForDeck(deck: string, cards: VocabCard[]): Promise<DeckStats> {
  const now = Date.now();
  let learned = 0;
  let dueToday = 0;
  let fresh = 0;
  for (const card of cards) {
    const st = await loadCardState(deck, card.id);
    if (st.reps === 0 && st.interval === 0) fresh += 1;
    else if (st.due <= now) dueToday += 1;
    else learned += 1;
  }
  return { total: cards.length, learned, dueToday, fresh };
}

export interface QueueEntry {
  card: VocabCard;
  state: SrsState;
}

export async function selectQueue(
  deck: string,
  cards: VocabCard[],
  opts: { newPerDay?: number } = {},
): Promise<QueueEntry[]> {
  const newPerDay = opts.newPerDay ?? 20;
  const now = Date.now();
  const due: QueueEntry[] = [];
  const fresh: QueueEntry[] = [];
  for (const card of cards) {
    const state = await loadCardState(deck, card.id);
    if (state.reps === 0 && state.interval === 0) fresh.push({ card, state });
    else if (state.due <= now) due.push({ card, state });
  }
  due.sort((a, b) => a.state.due - b.state.due);
  return [...due, ...fresh.slice(0, newPerDay)];
}
