// Tracking de actividad, racha, meta diaria, misión del día.
// Port directo de webapp/js/insights.js a TypeScript con la misma semántica.
import { get, set } from './storage';
import type {
  ActivityEvent,
  ActivitySummary,
  CefrLevel,
  DailyMissionItem,
  Skill,
} from './types';
import type { DeckStats } from './srs';

const DAY_MS = 86_400_000;
const MAX_EVENTS = 700;

const SKILL_LABELS: Record<Skill, string> = {
  flashcards: 'Flashcards',
  reading: 'Lectura',
  listening: 'Listening',
  grammar: 'Gramática',
  writing: 'Writing',
  speaking: 'Speaking',
  focus: 'Foco',
};

export function localDayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function logActivity(
  type: string,
  payload: Partial<ActivityEvent> = {},
): Promise<ActivityEvent> {
  const event: ActivityEvent = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    ts: Date.now(),
    day: localDayKey(),
    ...payload,
  };
  const events = await get<ActivityEvent[]>('activity:events', []);
  await set('activity:events', [...events, event].slice(-MAX_EVENTS));
  return event;
}

export async function activityEvents(): Promise<ActivityEvent[]> {
  const events = await get<ActivityEvent[]>('activity:events', []);
  return events.slice().sort((a, b) => a.ts - b.ts);
}

export async function getDailyGoal(): Promise<number> {
  return get<number>('settings:dailyGoalMinutes', 30);
}

export async function setDailyGoal(minutes: number): Promise<void> {
  const clamped = Math.max(10, Math.min(180, Number(minutes) || 30));
  await set('settings:dailyGoalMinutes', clamped);
}

export async function summarizeActivity(now: number = Date.now()): Promise<ActivitySummary> {
  const events = await activityEvents();
  const today = localDayKey(now);
  const goal = await getDailyGoal();
  const last7Keys = Array.from({ length: 7 }, (_, i) => localDayKey(now - (6 - i) * DAY_MS));
  const daySet = new Set(events.map((e) => e.day));

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = localDayKey(now - i * DAY_MS);
    if (!daySet.has(key)) break;
    streak++;
  }

  const skills: Record<Skill, number> = {
    flashcards: 0,
    reading: 0,
    listening: 0,
    grammar: 0,
    writing: 0,
    speaking: 0,
    focus: 0,
  };

  const totals = {
    todayMinutes: 0,
    weekMinutes: 0,
    sessions: 0,
    skills,
  };

  const week = last7Keys.map((key) => ({ key, minutes: 0, events: 0 }));
  const weekByKey = new Map(week.map((d) => [d.key, d]));

  for (const event of events) {
    const minutes = estimateMinutes(event);
    const skill = (event.skill || skillFromType(event.type)) as Skill;
    if (event.day === today) totals.todayMinutes += minutes;
    if (weekByKey.has(event.day)) {
      totals.weekMinutes += minutes;
      totals.sessions += 1;
      totals.skills[skill] = (totals.skills[skill] || 0) + minutes;
      const day = weekByKey.get(event.day)!;
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

export function eventTitle(event: ActivityEvent): string {
  const skill = SKILL_LABELS[(event.skill || skillFromType(event.type)) as Skill] || 'Sesión';
  if (event.type === 'flashcards_session') return `${skill}: ${event.count || 0} cards`;
  if (event.type === 'reading_done') return `${skill}: ${event.title || event.id_ || 'lectura'}`;
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

export function skillLabel(skill: Skill | string): string {
  return SKILL_LABELS[skill as Skill] || skill;
}

export interface MissionInput {
  level: CefrLevel;
  srsStats: DeckStats;
  summary: ActivitySummary;
}

export function buildDailyMission({ level, srsStats, summary }: MissionInput): DailyMissionItem[] {
  const weakSkill = weakestSkill(summary.totals.skills);
  const mission: DailyMissionItem[] = [];

  if (srsStats.dueToday > 0) {
    mission.push({
      label: 'Repaso SRS',
      detail: `${srsStats.dueToday} cards pendientes en ${level.toUpperCase()}`,
      href: '/flashcards',
      skill: 'flashcards',
    });
  } else {
    mission.push({
      label: 'Vocabulario nuevo',
      detail: `${Math.min(10, srsStats.fresh)} cards nuevas para mantener ritmo`,
      href: '/flashcards',
      skill: 'flashcards',
    });
  }

  mission.push({
    label: weakSkill === 'listening' ? 'Input auditivo' : 'Lectura i+1',
    detail:
      weakSkill === 'listening'
        ? 'Una escucha sin script y una con script'
        : 'Un texto graduado con glosas y comprensión',
    href: weakSkill === 'listening' ? '/listening' : '/reading',
    skill: weakSkill === 'listening' ? 'listening' : 'reading',
  });

  mission.push({
    label: 'Output guiado',
    detail: '80-120 palabras usando vocabulario del deck actual',
    href: '/coach',
    skill: 'writing',
  });

  return mission;
}

function weakestSkill(skills: Record<Skill, number>): Skill {
  const candidates: Skill[] = ['reading', 'listening', 'grammar', 'writing', 'speaking'];
  return candidates.slice().sort((a, b) => (skills[a] || 0) - (skills[b] || 0))[0];
}

function skillFromType(type: string): Skill {
  if (type.startsWith('flashcards')) return 'flashcards';
  if (type.startsWith('reading')) return 'reading';
  if (type.startsWith('listening')) return 'listening';
  if (type.startsWith('grammar')) return 'grammar';
  if (type.startsWith('writing')) return 'writing';
  if (type.startsWith('speaking')) return 'speaking';
  if (type.startsWith('focus')) return 'focus';
  return 'focus';
}

function estimateMinutes(event: ActivityEvent): number {
  if (Number.isFinite(event.minutes)) return event.minutes!;
  if (event.type === 'flashcards_session') return Math.max(3, Math.round((event.count || 0) * 0.35));
  if (event.type === 'reading_done') return 15;
  if (event.type === 'listening_score') return 12;
  if (event.type === 'grammar_score') return 10;
  if (event.type === 'writing_analysis') return Math.max(5, Math.round((event.words || 0) / 12));
  if (event.type === 'speaking_shadow') return 4;
  return 5;
}
