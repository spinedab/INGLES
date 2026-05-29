// Implementación del algoritmo SuperMemo-2 (Wozniak, 1985).
// Cada card: {ef, interval, reps, due (timestamp ms)}.
//
// review(card, quality):
//   quality 0..5
//   - quality < 3 → reset reps a 0, interval = 1 día
//   - quality >= 3 → si reps == 0 → interval=1; reps==1 → interval=6; sino → ceil(prev * ef)
//   - EF nuevo = max(1.3, EF + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
//   - reps += 1 cuando quality >= 3
// due = ahora + interval días

import { get, set } from './storage.js';

const DAY = 86400000;

export function defaultState() {
  return { ef: 2.5, interval: 0, reps: 0, due: Date.now() };
}

export function loadCardState(deck, cardId) {
  return get(`srs:${deck}:${cardId}`, defaultState());
}

export function saveCardState(deck, cardId, st) {
  set(`srs:${deck}:${cardId}`, st);
}

export function review(state, quality) {
  let { ef, interval, reps } = state;
  ef = Math.max(1.3, ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (quality < 3) {
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.ceil(interval * ef);
    reps += 1;
  }
  const due = Date.now() + interval * DAY;
  return { ef, interval, reps, due };
}

// Devuelve cards a revisar hoy + nuevas hasta `newPerDay`.
export function selectQueue(deck, allCards, { newPerDay = 20 } = {}) {
  const now = Date.now();
  const due = [];
  const fresh = [];
  for (const card of allCards) {
    const st = loadCardState(deck, card.id);
    if (st.reps === 0 && st.interval === 0) fresh.push({ card, st });
    else if (st.due <= now) due.push({ card, st });
  }
  // Shuffle each pool deterministically per session.
  due.sort((a, b) => a.st.due - b.st.due);
  return [...due, ...fresh.slice(0, newPerDay)];
}

export function dueCount(deck, allCards) {
  return selectQueue(deck, allCards, { newPerDay: 9999 }).length;
}

export function statsForDeck(deck, allCards) {
  let learned = 0, dueToday = 0, fresh = 0;
  const now = Date.now();
  for (const card of allCards) {
    const st = loadCardState(deck, card.id);
    if (st.reps === 0 && st.interval === 0) fresh++;
    else if (st.due <= now) dueToday++;
    else learned++;
  }
  return { learned, dueToday, fresh, total: allCards.length };
}
