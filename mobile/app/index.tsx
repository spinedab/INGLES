import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { StatBlock } from '@/components/StatBlock';
import { LevelPicker } from '@/components/LevelPicker';
import { MissionList } from '@/components/MissionList';
import { useLevel } from '@/lib/levelContext';
import { loadVocab } from '@/lib/content';
import { statsForDeck, type DeckStats } from '@/lib/srs';
import { buildDailyMission, eventTitle, summarizeActivity } from '@/lib/insights';
import { spacing } from '@/lib/theme';
import type { ActivitySummary, DailyMissionItem } from '@/lib/types';

export default function Dashboard() {
  const { level, ready } = useLevel();
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [mission, setMission] = useState<DailyMissionItem[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      if (!ready) return;
      let cancelled = false;
      (async () => {
        const cards = await loadVocab(level);
        const s = await statsForDeck(`vocab-${level}`, cards);
        const sum = await summarizeActivity();
        const m = buildDailyMission({ level, srsStats: s, summary: sum });
        if (cancelled) return;
        setStats(s);
        setSummary(sum);
        setMission(m);
      })();
      return () => {
        cancelled = true;
      };
    }, [level, ready]),
  );

  return (
    <Screen>
      <Text variant="h1">Aprende inglés,</Text>
      <Text variant="h1" accent style={{ marginBottom: spacing.sm }}>
        basado en evidencia.
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        Krashen, Swain, Long, Schmidt y Vygotsky aplicados en tu bolsillo. Sin gamificación tóxica.
      </Text>

      <Text variant="h3" muted style={{ marginBottom: spacing.sm }}>
        Tu nivel
      </Text>
      <LevelPicker />

      {summary && (
        <>
          <Text variant="h2" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            Misión de hoy
          </Text>
          <MissionList mission={mission} />

          <View style={[styles.statsRow, { marginTop: spacing.lg }]}>
            <StatBlock label="Racha" value={`${summary.streak}d`} />
            <StatBlock label="Hoy" value={`${Math.round(summary.totals.todayMinutes)}m`} />
            <StatBlock label="Meta" value={`${summary.goal}m`} />
            <StatBlock label="Progreso" value={`${summary.completion}%`} />
          </View>
        </>
      )}

      {stats && (
        <View style={[styles.statsRow, { marginTop: spacing.md }]}>
          <StatBlock label="Aprendidas" value={stats.learned} />
          <StatBlock label="Para hoy" value={stats.dueToday} />
          <StatBlock label="Nuevas" value={stats.fresh} />
        </View>
      )}

      <Text variant="h2" style={{ marginTop: spacing.xl }}>
        Módulos
      </Text>

      <Link href="/flashcards" asChild>
        <Card>
          <Text variant="h3">Flashcards SRS</Text>
          <Text muted style={styles.desc}>
            Vocabulario de alta frecuencia con SuperMemo-2.
          </Text>
          {stats && (
            <Text variant="caption" accent style={styles.stat}>
              {stats.dueToday} para repasar · {stats.fresh} nuevas
            </Text>
          )}
        </Card>
      </Link>

      <Link href="/reading" asChild>
        <Card>
          <Text variant="h3">Lectura graduada</Text>
          <Text muted style={styles.desc}>
            Textos i+1 con glosas y preguntas de comprensión.
          </Text>
          <Text variant="caption" accent style={styles.stat}>
            Nivel {level.toUpperCase()}
          </Text>
        </Card>
      </Link>

      <Link href="/listening" asChild>
        <Card>
          <Text variant="h3">Listening</Text>
          <Text muted style={styles.desc}>
            Audio + script revelado tras la escucha.
          </Text>
        </Card>
      </Link>

      <Link href="/grammar" asChild>
        <Card>
          <Text variant="h3">Gramática focalizada</Text>
          <Text muted style={styles.desc}>
            Puntos críticos para hispanohablantes.
          </Text>
        </Card>
      </Link>

      <Link href="/coach" asChild>
        <Card>
          <Text variant="h3">Coach</Text>
          <Text muted style={styles.desc}>
            Plan diario, writing coach, shadowing y analítica local.
          </Text>
        </Card>
      </Link>

      <Link href="/notebook" asChild>
        <Card>
          <Text variant="h3">Cuaderno léxico</Text>
          <Text muted style={styles.desc}>
            Guarda palabras y colocaciones. Recuperación activa con cloze.
          </Text>
        </Card>
      </Link>

      <Link href="/search" asChild>
        <Card>
          <Text variant="h3">Buscar</Text>
          <Text muted style={styles.desc}>
            Búsqueda global de vocab, lecturas, listening y gramática.
          </Text>
        </Card>
      </Link>

      <Link href="/settings" asChild>
        <Card>
          <Text variant="h3">Ajustes</Text>
          <Text muted style={styles.desc}>
            Backend, cuenta, export/import.
          </Text>
        </Card>
      </Link>

      {summary && summary.lastEvents.length > 0 && (
        <>
          <Text variant="h3" muted style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            Última actividad
          </Text>
          {summary.lastEvents.slice(0, 5).map((e) => (
            <View key={e.id} style={styles.activity}>
              <Text variant="small">{eventTitle(e)}</Text>
              <Text variant="caption" muted>
                {e.day}
              </Text>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  desc: { marginTop: spacing.xs },
  stat: { marginTop: spacing.sm, textTransform: 'uppercase' },
  activity: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
});
