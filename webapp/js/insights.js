import { get, set } from './storage.js';

const DAY = 86400000;
const MAX_EVENTS = 700;

const SKILL_LABELS = {
  flashcards: 'Flashcards',
  reading: 'Lectura',
  listening: 'Listening',
  grammar: 'Gramática',
  writing: 'Writing',
  speaking: 'Speaking',
  focus: 'Foco',
};

export function localDayKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function logActivity(type, payload = {}) {
  const event = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    ts: Date.now(),
    day: localDayKey(),
    ...payload,
  };
  const events = get('activity:events', []);
  set('activity:events', [...events, event].slice(-MAX_EVENTS));
  return event;
}

export function activityEvents() {
  return get('activity:events', []).slice().sort((a, b) => a.ts - b.ts);
}

export function getDailyGoal() {
  return get('settings:dailyGoalMinutes', 30);
}

export function setDailyGoal(minutes) {
  set('settings:dailyGoalMinutes', Math.max(10, Math.min(180, Number(minutes) || 30)));
}

export function summarizeActivity(now = Date.now()) {
  const events = activityEvents();
  const today = localDayKey(now);
  const goal = getDailyGoal();
  const last7Keys = Array.from({ length: 7 }, (_, i) => localDayKey(now - (6 - i) * DAY));
  const daySet = new Set(events.map(e => e.day));

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = localDayKey(now - i * DAY);
    if (!daySet.has(key)) break;
    streak++;
  }

  const totals = {
    todayMinutes: 0,
    weekMinutes: 0,
    sessions: 0,
    skills: Object.fromEntries(Object.keys(SKILL_LABELS).map(k => [k, 0])),
  };

  const week = last7Keys.map(key => ({ key, minutes: 0, events: 0 }));
  const weekByKey = new Map(week.map(d => [d.key, d]));

  for (const event of events) {
    const minutes = estimateMinutes(event);
    const skill = event.skill || skillFromType(event.type);
    if (event.day === today) totals.todayMinutes += minutes;
    if (weekByKey.has(event.day)) {
      totals.weekMinutes += minutes;
      totals.sessions++;
      totals.skills[skill] = (totals.skills[skill] || 0) + minutes;
      const day = weekByKey.get(event.day);
      day.minutes += minutes;
      day.events += 1;
    }
  }

  return {
    goal,
    streak,
    totals,
    week,
    lastEvents: events.slice(-8).reverse(),
    completion: Math.min(100, Math.round((totals.todayMinutes / goal) * 100)),
  };
}

export function eventTitle(event) {
  const skill = SKILL_LABELS[event.skill || skillFromType(event.type)] || 'Sesión';
  if (event.type === 'flashcards_session') return `${skill}: ${event.count || 0} cards`;
  if (event.type === 'reading_done') return `${skill}: ${event.title || event.id || 'lectura'}`;
  if (event.type === 'reading_score') return `${skill}: ${event.correct}/${event.total}`;
  if (event.type === 'listening_score') return `${skill}: ${event.correct}/${event.total}`;
  if (event.type === 'grammar_score') return `${skill}: ${event.correct}/${event.total}`;
  if (event.type === 'writing_analysis') return `${skill}: ${event.words || 0} palabras`;
  if (event.type === 'speaking_shadow') return `${skill}: ${event.match || 0}% match`;
  if (event.type === 'lexicon_saved') return `Cuaderno: ${event.term || 'entrada'}`;
  if (event.type === 'lexicon_quiz') return 'Cuaderno: quiz rápido';
  if (event.type === 'focus_timer') return `${skill}: ${event.minutes || 0} min`;
  return skill;
}

export function skillLabel(skill) {
  return SKILL_LABELS[skill] || skill;
}

export function buildDailyMission({ level, srsStats, summary }) {
  const weakSkill = weakestSkill(summary.totals.skills);
  const mission = [];

  if (srsStats.dueToday > 0) {
    mission.push({
      label: 'Repaso SRS',
      detail: `${srsStats.dueToday} cards pendientes en ${level.toUpperCase()}`,
      href: '#/flashcards',
      skill: 'flashcards',
    });
  } else {
    mission.push({
      label: 'Vocabulario nuevo',
      detail: `${Math.min(10, srsStats.fresh)} cards nuevas para mantener ritmo`,
      href: '#/flashcards',
      skill: 'flashcards',
    });
  }

  mission.push({
    label: weakSkill === 'listening' ? 'Input auditivo' : 'Lectura i+1',
    detail: weakSkill === 'listening' ? 'Una escucha sin script y una con script' : 'Un texto graduado con glosas y comprensión',
    href: weakSkill === 'listening' ? '#/listening' : '#/reading',
    skill: weakSkill === 'listening' ? 'listening' : 'reading',
  });

  mission.push({
    label: 'Output guiado',
    detail: '80-120 palabras usando vocabulario del deck actual',
    href: '#/coach',
    skill: 'writing',
  });

  return mission;
}

function weakestSkill(skills) {
  const candidates = ['reading', 'listening', 'grammar', 'writing', 'speaking'];
  return candidates.slice().sort((a, b) => (skills[a] || 0) - (skills[b] || 0))[0];
}

function skillFromType(type) {
  if (type.startsWith('flashcards')) return 'flashcards';
  if (type.startsWith('reading')) return 'reading';
  if (type.startsWith('listening')) return 'listening';
  if (type.startsWith('grammar')) return 'grammar';
  if (type.startsWith('writing')) return 'writing';
  if (type.startsWith('speaking')) return 'speaking';
  if (type.startsWith('focus')) return 'focus';
  return 'focus';
}

function estimateMinutes(event) {
  if (Number.isFinite(event.minutes)) return event.minutes;
  if (event.type === 'flashcards_session') return Math.max(3, Math.round((event.count || 0) * 0.35));
  if (event.type === 'reading_done') return 15;
  if (event.type === 'listening_score') return 12;
  if (event.type === 'grammar_score') return 10;
  if (event.type === 'writing_analysis') return Math.max(5, Math.round((event.words || 0) / 12));
  if (event.type === 'speaking_shadow') return 4;
  return 5;
}
