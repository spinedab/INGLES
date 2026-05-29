import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { StatBlock } from '@/components/StatBlock';
import { useLevel } from '@/lib/levelContext';
import { loadVocab } from '@/lib/content';
import { statsForDeck, type DeckStats } from '@/lib/srs';
import { spacing } from '@/lib/theme';

export default function FlashcardsIndex() {
  const { level } = useLevel();
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [total, setTotal] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        const cards = await loadVocab(level);
        const s = await statsForDeck(`vocab-${level}`, cards);
        if (cancelled) return;
        setStats(s);
        setTotal(cards.length);
      })();
      return () => {
        cancelled = true;
      };
    }, [level]),
  );

  const sessionSize = (stats?.dueToday ?? 0) + Math.min(20, stats?.fresh ?? 0);

  return (
    <Screen>
      <Text variant="h1">Flashcards</Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        Repaso espaciado con SuperMemo-2 (Wozniak, 1985). Los intervalos crecen exponencialmente cuando aciertas; resetean cuando fallas.
      </Text>

      {stats && (
        <View style={styles.statsRow}>
          <StatBlock label="Total" value={total} />
          <StatBlock label="Aprendidas" value={stats.learned} />
          <StatBlock label="Hoy" value={stats.dueToday} />
          <StatBlock label="Nuevas" value={stats.fresh} />
        </View>
      )}

      <Text variant="h3" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        Esta sesión: ~{sessionSize} cards
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        Atajos en móvil: tap para revelar. En web también con barra espaciadora.
      </Text>

      <Link href="/flashcards/session" asChild>
        <Button title={sessionSize > 0 ? 'Empezar sesión' : 'No hay cards pendientes'} disabled={sessionSize === 0} />
      </Link>

      <View style={{ marginTop: spacing.xl }}>
        <Text variant="h3" muted style={{ marginBottom: spacing.sm }}>
          Buenas prácticas
        </Text>
        <Text muted>
          15-25 cards nuevas/día. Si pasas más de 30 min, hay backlog: reduce hasta equilibrar. La honestidad en el rating es lo más importante.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
