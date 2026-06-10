// ═══ Home / Dashboard ═══
// Muestra: saludo, misión del día, progress ring, stats SRS, módulos rápidos.
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { StatBlock } from '@/components/StatBlock';
import { ProgressRing } from '@/components/ProgressRing';
import { MissionList } from '@/components/MissionList';
import { SectionHeader } from '@/components/SectionHeader';
import { useLevel } from '@/lib/levelContext';
import { loadVocab } from '@/lib/content';
import { statsForDeck, type DeckStats } from '@/lib/srs';
import { buildDailyMission, eventTitle, summarizeActivity } from '@/lib/insights';
import { spacing, skillColors, useTheme } from '@/lib/theme';
import type { ActivitySummary, DailyMissionItem } from '@/lib/types';

export default function HomeScreen() {
  const { level, ready } = useLevel();
  const theme = useTheme();
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
      return () => { cancelled = true; };
    }, [level, ready]),
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos dias' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <Screen>
      {/* Hero */}
      <Text variant="small" muted>{greeting}</Text>
      <Text variant="hero" style={{ marginBottom: spacing.xs }}>
        Tu inglés,{'\n'}
        <Text variant="hero" accent>hoy.</Text>
      </Text>
      <Text variant="small" muted style={{ marginBottom: spacing.xl }}>
        Nivel {level.toUpperCase()} · Basado en evidencia (Krashen, Swain, Long)
      </Text>

      {/* Progress ring + stats row */}
      {summary && (
        <View style={styles.heroRow}>
          <ProgressRing
            progress={summary.completion}
            size={110}
            strokeWidth={10}
            sublabel={`${Math.round(summary.totals.todayMinutes)}/${summary.goal}m`}
          />
          <View style={styles.heroStats}>
            <StatBlock label="Racha" value={`${summary.streak}d`} />
            <StatBlock label="Semana" value={`${Math.round(summary.totals.weekMinutes)}m`} />
            {stats && <StatBlock label="SRS hoy" value={stats.dueToday} color={skillColors.flashcards} />}
          </View>
        </View>
      )}

      {/* Mission */}
      <SectionHeader title="Mision de hoy" subtitle={`3 pasos para avanzar en ${level.toUpperCase()}`} />
      <MissionList mission={mission} />

      {/* Quick access cards */}
      <SectionHeader title="Modulos" />

      <Link href="/flashcards" asChild>
        <Card variant="elevated" onPress={() => {}}>
          <View style={styles.moduleRow}>
            <View style={[styles.dot, { backgroundColor: skillColors.flashcards }]} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">Flashcards SRS</Text>
              <Text variant="small" muted>SuperMemo-2 · Repaso espaciado</Text>
            </View>
            {stats && <Text variant="h3" accent>{stats.dueToday + Math.min(20, stats.fresh)}</Text>}
          </View>
        </Card>
      </Link>

      <Link href="/reading" asChild>
        <Card variant="elevated" onPress={() => {}}>
          <View style={styles.moduleRow}>
            <View style={[styles.dot, { backgroundColor: skillColors.reading }]} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">Lectura graduada</Text>
              <Text variant="small" muted>Textos i+1 con glosas</Text>
            </View>
          </View>
        </Card>
      </Link>

      <Link href="/listening" asChild>
        <Card variant="elevated" onPress={() => {}}>
          <View style={styles.moduleRow}>
            <View style={[styles.dot, { backgroundColor: skillColors.listening }]} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">Listening</Text>
              <Text variant="small" muted>Audio + script revelado</Text>
            </View>
          </View>
        </Card>
      </Link>

      <Link href="/grammar" asChild>
        <Card variant="elevated" onPress={() => {}}>
          <View style={styles.moduleRow}>
            <View style={[styles.dot, { backgroundColor: skillColors.grammar }]} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">Gramatica</Text>
              <Text variant="small" muted>Puntos criticos para hispanohablantes</Text>
            </View>
          </View>
        </Card>
      </Link>

      {/* Recent activity */}
      {summary && summary.lastEvents.length > 0 && (
        <>
          <SectionHeader title="Actividad reciente" />
          {summary.lastEvents.slice(0, 5).map((e) => (
            <View key={e.id} style={styles.activity}>
              <View style={[styles.actDot, { backgroundColor: skillColors[(e.skill as keyof typeof skillColors) || 'focus'] || theme.muted }]} />
              <Text variant="small" style={{ flex: 1 }}>{eventTitle(e)}</Text>
              <Text variant="caption" muted>{e.day.slice(5)}</Text>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  heroStats: {
    flex: 1,
    gap: spacing.sm,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  actDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
