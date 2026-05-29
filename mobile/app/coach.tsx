import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatBlock } from '@/components/StatBlock';
import { WeekBars } from '@/components/WeekBars';
import { Chip } from '@/components/Chip';
import { MissionList } from '@/components/MissionList';
import { useLevel } from '@/lib/levelContext';
import { loadVocab } from '@/lib/content';
import { statsForDeck, type DeckStats } from '@/lib/srs';
import {
  buildDailyMission,
  eventTitle,
  getDailyGoal,
  logActivity,
  setDailyGoal,
  skillLabel,
  summarizeActivity,
} from '@/lib/insights';
import { lexiconEntries } from '@/lib/notebook';
import {
  analyzeWriting,
  headword,
  pickTargetWords,
  writingPrompt,
} from '@/lib/writingCoach';
import {
  compareSpeech,
  nextPromptIndex,
  promptFor,
  speakModel,
  type ShadowComparison,
} from '@/lib/shadowing';
import { get, set } from '@/lib/storage';
import { radius, spacing, useTheme } from '@/lib/theme';
import type {
  ActivitySummary,
  DailyMissionItem,
  LexiconEntry,
  VocabCard,
  WritingAnalysis,
} from '@/lib/types';

export default function Coach() {
  const { level } = useLevel();
  const theme = useTheme();
  const [vocab, setVocab] = useState<VocabCard[]>([]);
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [mission, setMission] = useState<DailyMissionItem[]>([]);
  const [notebook, setNotebook] = useState<LexiconEntry[]>([]);

  // Writing
  const [draft, setDraft] = useState('');
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);

  // Timer
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shadowing
  const [promptIndex, setPromptIndex] = useState(0);
  const [spoken, setSpoken] = useState('');
  const [comparison, setComparison] = useState<ShadowComparison | null>(null);

  // Daily goal
  const [goalDraft, setGoalDraft] = useState('30');

  useEffect(() => {
    (async () => {
      const cards = await loadVocab(level);
      setVocab(cards);
      const s = await statsForDeck(`vocab-${level}`, cards);
      const sum = await summarizeActivity();
      setStats(s);
      setSummary(sum);
      setMission(buildDailyMission({ level, srsStats: s, summary: sum }));
      const nb = await lexiconEntries();
      setNotebook(nb.filter((e) => !e.mastered).slice(0, 6));
      const d = await get<string>('coach:writingDraft', '');
      setDraft(d);
      const tm = await get<number>('coach:timerMinutes', 25);
      setTimerMinutes(tm);
      setRemaining(tm * 60);
      const pi = await get<number>(`coach:shadowPrompt:${level}`, 0);
      setPromptIndex(pi);
      const g = await getDailyGoal();
      setGoalDraft(String(g));
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [level]);

  // Timer effect
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setRunning(false);
          void logActivity('focus_timer', { skill: 'focus', minutes: timerMinutes });
          return timerMinutes * 60;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, timerMinutes]);

  const targetWords = pickTargetWords(vocab, 10);
  const shadowText = promptFor(level, promptIndex);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  const startTimer = () => {
    if (!running) setRunning(true);
  };
  const pauseTimer = () => {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const resetTimer = () => {
    pauseTimer();
    setRemaining(timerMinutes * 60);
  };
  const logManualTimer = () => {
    void logActivity('focus_timer', { skill: 'focus', minutes: 10 });
  };

  const onChangeDraft = (text: string) => {
    setDraft(text);
    void set('coach:writingDraft', text);
  };
  const addWord = (word: string) => {
    const next = `${draft}${draft.trim() ? ' ' : ''}${word}`;
    onChangeDraft(next);
  };
  const usePrompt = () => {
    const prompt = writingPrompt(targetWords);
    onChangeDraft(draft.trim() ? `${draft.trim()}\n\n${prompt}` : prompt);
  };
  const doAnalyze = () => {
    const a = analyzeWriting(draft, vocab);
    setAnalysis(a);
    void logActivity('writing_analysis', {
      skill: 'writing',
      words: a.wordCount,
      issues: a.issues.length,
      targetUsed: a.targetUsed.length,
    });
  };

  const nextShadow = async () => {
    const next = nextPromptIndex(level, promptIndex);
    setPromptIndex(next);
    setSpoken('');
    setComparison(null);
    await set(`coach:shadowPrompt:${level}`, next);
  };
  const doCompare = () => {
    const c = compareSpeech(shadowText, spoken);
    setComparison(c);
    void logActivity('speaking_shadow', { skill: 'speaking', match: c.match, minutes: 4 });
  };

  const onGoalBlur = async () => {
    const value = Number(goalDraft) || 30;
    await setDailyGoal(value);
    const g = await getDailyGoal();
    setGoalDraft(String(g));
    const fresh = await summarizeActivity();
    setSummary(fresh);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Coach' }} />
      <Screen>
        <Text variant="h1">Coach</Text>
        <Text muted style={{ marginBottom: spacing.lg }}>
          Plan diario, analítica local, writing coach y shadowing — práctica deliberada en bloques cortos.
        </Text>

        {summary && (
          <>
            <Text variant="caption" muted style={{ textTransform: 'uppercase' }}>
              Misión de hoy · {level.toUpperCase()}
            </Text>
            <View style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
              <MissionList mission={mission} />
            </View>

            <View style={styles.statsRow}>
              <StatBlock label="Hoy" value={`${Math.round(summary.totals.todayMinutes)}m`} />
              <StatBlock label="Meta" value={`${summary.goal}m`} />
              <StatBlock label="Racha" value={`${summary.streak}d`} />
              <StatBlock label="Semana" value={`${Math.round(summary.totals.weekMinutes)}m`} />
            </View>

            <Text variant="h2" style={{ marginTop: spacing.xl }}>
              Esta semana
            </Text>
            <WeekBars week={summary.week} goal={summary.goal} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Text muted style={{ flex: 1 }}>
                Meta diaria (minutos):
              </Text>
              <TextInput
                value={goalDraft}
                onChangeText={setGoalDraft}
                onBlur={onGoalBlur}
                keyboardType="number-pad"
                style={[
                  styles.smallInput,
                  { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card },
                ]}
              />
            </View>
          </>
        )}

        <Text variant="h2" style={{ marginTop: spacing.xl }}>
          Temporizador de foco
        </Text>
        <Text muted style={{ marginBottom: spacing.sm }}>
          Bloques cortos con registro automático.
        </Text>
        <View style={[styles.timerBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.timerDisplay, { color: theme.accent }]}>
            {mm}:{ss}
          </Text>
        </View>
        <View style={styles.btnRow}>
          <Button title={running ? 'En curso' : 'Iniciar'} onPress={startTimer} disabled={running} style={{ flex: 1 }} />
          <Button title="Pausar" variant="secondary" onPress={pauseTimer} style={{ flex: 1 }} />
          <Button title="Reset" variant="secondary" onPress={resetTimer} style={{ flex: 1 }} />
        </View>
        <Button title="Registrar 10 min manualmente" variant="secondary" onPress={logManualTimer} style={{ marginTop: spacing.sm }} />

        <Text variant="h2" style={{ marginTop: spacing.xl }}>
          Writing coach
        </Text>
        <Text muted style={{ marginBottom: spacing.sm }}>
          Feedback inmediato para errores frecuentes de hispanohablantes.
        </Text>

        <Text variant="caption" muted style={{ textTransform: 'uppercase' }}>
          Vocabulario objetivo
        </Text>
        <View style={styles.chipRow}>
          {targetWords.map((c) => {
            const word = headword(c.front);
            return <Chip key={c.id} label={word} onPress={() => addWord(word)} />;
          })}
        </View>

        {notebook.length > 0 && (
          <>
            <Text variant="caption" muted style={{ textTransform: 'uppercase' }}>
              Cuaderno léxico
            </Text>
            <View style={styles.chipRow}>
              {notebook.map((e) => (
                <Chip key={e.id} label={e.term} onPress={() => addWord(e.term)} />
              ))}
            </View>
          </>
        )}

        <TextInput
          value={draft}
          onChangeText={onChangeDraft}
          multiline
          placeholder="Write 80-120 words in English. Try to use 3 target words."
          placeholderTextColor={theme.muted}
          style={[
            styles.textarea,
            { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card },
          ]}
        />
        <View style={styles.btnRow}>
          <Button title="Analizar" onPress={doAnalyze} style={{ flex: 1 }} />
          <Button title="Consigna" variant="secondary" onPress={usePrompt} style={{ flex: 1 }} />
          <Button title="Limpiar" variant="secondary" onPress={() => onChangeDraft('')} style={{ flex: 1 }} />
        </View>

        {analysis && (
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.statsRow}>
              <StatBlock label="Claridad" value={analysis.score} />
              <StatBlock label="Palabras" value={analysis.wordCount} />
              <StatBlock label="Nivel" value={analysis.levelEstimate} />
              <StatBlock label="Targets" value={analysis.targetUsed.length} />
            </View>
            {analysis.issues.length > 0 ? (
              <>
                <Text variant="h3" style={{ marginTop: spacing.md }}>
                  Correcciones prioritarias
                </Text>
                {analysis.issues.map((issue, i) => (
                  <View key={i} style={{ marginVertical: spacing.xs }}>
                    <Text style={{ fontWeight: '600' }}>{issue.title}</Text>
                    <Text variant="small" muted>
                      {issue.detail}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <Text muted style={{ marginTop: spacing.sm }}>
                Sin interferencias típicas detectadas. Revisa precisión fina y naturalidad.
              </Text>
            )}
            {analysis.longSentences > 0 && (
              <Text muted style={{ marginTop: spacing.sm }}>
                {analysis.longSentences} oración(es) muy largas: divide ideas para sonar más claro.
              </Text>
            )}
            {analysis.repeated.length > 0 && (
              <Text muted style={{ marginTop: spacing.sm }}>
                Repeticiones: {analysis.repeated.join(', ')}
              </Text>
            )}
            {analysis.targetUsed.length > 0 && (
              <Text muted style={{ marginTop: spacing.sm }}>
                Vocabulario usado: {analysis.targetUsed.join(', ')}
              </Text>
            )}
          </Card>
        )}

        <Text variant="h2" style={{ marginTop: spacing.xl }}>
          Shadowing lab
        </Text>
        <Text muted style={{ marginBottom: spacing.sm }}>
          Escucha el modelo, repítelo y transcribe lo que dijiste. La comparación destaca lo que faltó.
        </Text>
        <Card>
          <Text style={{ fontStyle: 'italic', lineHeight: 24 }}>"{shadowText}"</Text>
        </Card>
        <View style={styles.btnRow}>
          <Button title="Escuchar modelo" onPress={() => void speakModel(shadowText)} style={{ flex: 1 }} />
          <Button title="Cambiar frase" variant="secondary" onPress={nextShadow} style={{ flex: 1 }} />
        </View>
        <TextInput
          value={spoken}
          onChangeText={setSpoken}
          multiline
          placeholder="Escribe lo que dijiste (o transcríbelo a mano)"
          placeholderTextColor={theme.muted}
          style={[
            styles.textarea,
            { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card, minHeight: 80 },
          ]}
        />
        <Button title="Comparar" onPress={doCompare} />
        {comparison && (
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.statsRow}>
              <StatBlock label="Match" value={`${comparison.match}%`} />
            </View>
            {comparison.missing.length > 0 ? (
              <Text style={{ marginTop: spacing.sm }}>
                <Text style={{ fontWeight: '600' }}>Faltó:</Text> {comparison.missing.join(', ')}
              </Text>
            ) : (
              <Text style={{ marginTop: spacing.sm }}>
                Muy bien: cubriste todas las palabras clave.
              </Text>
            )}
            {comparison.extra.length > 0 && (
              <Text muted style={{ marginTop: spacing.sm }}>
                Extra: {comparison.extra.slice(0, 8).join(', ')}
              </Text>
            )}
          </Card>
        )}

        {summary && (
          <>
            <Text variant="h2" style={{ marginTop: spacing.xl }}>
              Balance de destrezas
            </Text>
            <View style={styles.skillsGrid}>
              {Object.entries(summary.totals.skills)
                .filter(([, m]) => m > 0)
                .map(([skill, mins]) => (
                  <View
                    key={skill}
                    style={[styles.skillBox, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Text style={{ fontWeight: '700', color: theme.accent, fontSize: 22 }}>
                      {Math.round(mins)}
                    </Text>
                    <Text variant="caption" muted>
                      {skillLabel(skill)}
                    </Text>
                  </View>
                ))}
              {Object.values(summary.totals.skills).every((m) => m === 0) && (
                <Text muted>Aún sin actividad registrada esta semana.</Text>
              )}
            </View>

            <Text variant="h3" muted style={{ marginTop: spacing.lg }}>
              Última actividad
            </Text>
            {summary.lastEvents.length === 0 ? (
              <Text muted>Sin registros todavía. Hoy puede ser el primero.</Text>
            ) : (
              summary.lastEvents.map((e) => (
                <View key={e.id} style={styles.activity}>
                  <Text variant="small">{eventTitle(e)}</Text>
                  <Text variant="caption" muted>
                    {e.day}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginVertical: spacing.sm,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  timerBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: spacing.sm,
  },
  textarea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 140,
    fontSize: 15,
    marginTop: spacing.md,
    textAlignVertical: 'top',
  },
  smallInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    width: 70,
    textAlign: 'center',
    fontSize: 15,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  skillBox: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    minWidth: 80,
  },
  activity: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
});
