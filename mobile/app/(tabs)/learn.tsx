// ═══ Learn hub ═══
// Hub central que enlaza a los 4 módulos de skills + search.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { LevelPicker } from '@/components/LevelPicker';
import { SectionHeader } from '@/components/SectionHeader';
import { StatBlock } from '@/components/StatBlock';
import { useLevel } from '@/lib/levelContext';
import { loadVocab, READING_INDEX, LISTENING_INDEX, GRAMMAR_TOPICS } from '@/lib/content';
import { statsForDeck, type DeckStats } from '@/lib/srs';
import { spacing, skillColors, radius, useTheme } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface SkillCardProps {
  href: string;
  icon: IconName;
  color: string;
  title: string;
  subtitle: string;
  badge?: string | number;
}

function SkillCard({ href, icon, color, title, subtitle, badge }: SkillCardProps) {
  const theme = useTheme();
  return (
    <Link href={href as any} asChild>
      <Card variant="elevated" onPress={() => {}}>
        <View style={styles.skillRow}>
          <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon} size={22} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyBold">{title}</Text>
            <Text variant="small" muted>{subtitle}</Text>
          </View>
          {badge != null && (
            <View style={[styles.badge, { backgroundColor: color + '22' }]}>
              <Text variant="smallBold" style={{ color }}>{String(badge)}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={theme.muted} />
        </View>
      </Card>
    </Link>
  );
}

export default function LearnHub() {
  const { level } = useLevel();
  const [stats, setStats] = useState<DeckStats | null>(null);

  useEffect(() => {
    (async () => {
      const cards = await loadVocab(level);
      const s = await statsForDeck(`vocab-${level}`, cards);
      setStats(s);
    })();
  }, [level]);

  const readingCount = (READING_INDEX[level] || []).length;
  const listeningCount = (LISTENING_INDEX[level] || []).length;
  const grammarCount = GRAMMAR_TOPICS.length;

  return (
    <>
      <Stack.Screen options={{ title: 'Aprender' }} />
      <Screen>
        <Text variant="h1" style={{ marginBottom: spacing.lg }}>Aprender</Text>

        <Text variant="small" muted style={{ marginBottom: spacing.sm }}>Tu nivel</Text>
        <LevelPicker />

        {stats && (
          <View style={styles.statsRow}>
            <StatBlock label="Total cards" value={stats.total} />
            <StatBlock label="Aprendidas" value={stats.learned} color={skillColors.flashcards} />
            <StatBlock label="Para hoy" value={stats.dueToday} />
          </View>
        )}

        <SectionHeader title="Destrezas" subtitle="Elige tu modulo y practica" />

        <SkillCard
          href="/flashcards"
          icon="flash"
          color={skillColors.flashcards}
          title="Flashcards SRS"
          subtitle="Vocabulario con repaso espaciado"
          badge={stats ? stats.dueToday + Math.min(20, stats.fresh) : undefined}
        />
        <SkillCard
          href="/reading"
          icon="reader"
          color={skillColors.reading}
          title="Lectura graduada"
          subtitle={`${readingCount} textos en ${level.toUpperCase()}`}
          badge={readingCount}
        />
        <SkillCard
          href="/listening"
          icon="headset"
          color={skillColors.listening}
          title="Listening"
          subtitle={`${listeningCount} ejercicios en ${level.toUpperCase()}`}
          badge={listeningCount}
        />
        <SkillCard
          href="/grammar"
          icon="construct"
          color={skillColors.grammar}
          title="Gramatica focalizada"
          subtitle={`${grammarCount} topicos para hispanohablantes`}
          badge={grammarCount}
        />

        <SectionHeader title="Explorar" />
        <Link href="/search" asChild>
          <Card variant="accent" onPress={() => {}}>
            <View style={styles.skillRow}>
              <Ionicons name="search" size={22} color={skillColors.coach} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text variant="bodyBold" accent>Busqueda global</Text>
                <Text variant="small" muted>Vocab, lecturas, listening, gramatica</Text>
              </View>
            </View>
          </Card>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
});
