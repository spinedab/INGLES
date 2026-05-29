import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { useLevel } from '@/lib/levelContext';
import { loadVocab } from '@/lib/content';
import { review, saveCardState, selectQueue, type QueueEntry } from '@/lib/srs';
import { logActivity } from '@/lib/insights';
import { radius, spacing, useTheme } from '@/lib/theme';

type SessionStats = { again: number; hard: number; good: number; easy: number };

export default function FlashcardsSession() {
  const { level } = useLevel();
  const theme = useTheme();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ again: 0, hard: 0, good: 0, easy: 0 });

  const deck = `vocab-${level}`;
  const current = queue[idx];

  useEffect(() => {
    (async () => {
      const cards = await loadVocab(level);
      const q = await selectQueue(deck, cards, { newPerDay: 20 });
      setQueue(q);
      if (q.length === 0) setDone(true);
    })();
  }, [level, deck]);

  const reveal = () => setRevealed(true);

  const grade = async (q: number) => {
    if (!current) return;
    if (!revealed) {
      setRevealed(true);
      return;
    }
    const newState = review(current.state, q);
    await saveCardState(deck, current.card.id, newState);

    setStats((s) => ({
      again: s.again + (q < 3 ? 1 : 0),
      hard: s.hard + (q === 3 ? 1 : 0),
      good: s.good + (q === 4 ? 1 : 0),
      easy: s.easy + (q === 5 ? 1 : 0),
    }));

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(q < 3 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
    }

    // Si fallaste, vuelve al final para re-revisar en esta misma sesión.
    setQueue((prev) => (q < 3 ? [...prev, { card: current.card, state: newState }] : prev));

    if (idx + 1 >= queue.length + (q < 3 ? 1 : 0)) {
      setDone(true);
      void logActivity('flashcards_session', {
        skill: 'flashcards',
        count: idx + 1,
      });
    } else {
      setIdx((i) => i + 1);
      setRevealed(false);
    }
  };

  // Keyboard shortcuts en web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!revealed) reveal();
      } else if (revealed) {
        if (e.key === '1') void grade(1);
        else if (e.key === '2') void grade(3);
        else if (e.key === '3') void grade(4);
        else if (e.key === '4') void grade(5);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [revealed, idx, queue.length]);

  if (done) {
    return (
      <Screen>
        <Text variant="h1">Sesión completada</Text>
        <Text muted style={{ marginVertical: spacing.md }}>
          Has revisado {idx + (queue.length === 0 ? 0 : 1)} cards.
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg }}>
          <Stat label="Again" value={stats.again} />
          <Stat label="Hard" value={stats.hard} />
          <Stat label="Good" value={stats.good} />
          <Stat label="Easy" value={stats.easy} />
        </View>
        <Text muted style={{ marginBottom: spacing.lg }}>
          Vuelve mañana para los próximos repasos. El cerebro consolida durante el sueño (Walker, 2017).
        </Text>
        <Button title="Volver al inicio" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!current) {
    return (
      <Screen>
        <Text>Cargando…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="caption" muted>
        Card {idx + 1} de {queue.length} · {level.toUpperCase()}
      </Text>
      <ProgressBar progress={idx / queue.length} />

      <Pressable onPress={reveal} disabled={revealed}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={styles.front}>{current.card.front}</Text>

          {revealed && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.def}>{current.card.definition}</Text>
              <Text style={[styles.example, { color: theme.muted }]}>
                "{current.card.example}"
              </Text>
              <View style={[styles.divider, { borderColor: theme.border }]} />
              <Text muted style={{ textAlign: 'center' }}>
                ES: {current.card.translation}
              </Text>
              <View style={styles.tags}>
                {current.card.tags.map((tag) => (
                  <View
                    key={tag}
                    style={[styles.tag, { backgroundColor: theme.accentSoft }]}
                  >
                    <Text variant="caption" style={{ color: theme.accent }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </Pressable>

      {!revealed ? (
        <Button title="Mostrar respuesta" onPress={reveal} />
      ) : (
        <View style={styles.ratingRow}>
          <RatingBtn label="Again" subtitle="<1d" color={theme.bad} onPress={() => grade(1)} />
          <RatingBtn label="Hard" subtitle="corta" color={theme.warn} onPress={() => grade(3)} />
          <RatingBtn label="Good" subtitle="normal" color={theme.accent} onPress={() => grade(4)} />
          <RatingBtn label="Easy" subtitle="larga" color={theme.good} onPress={() => grade(5)} />
        </View>
      )}

      {Platform.OS === 'web' && (
        <Text variant="caption" muted style={{ marginTop: spacing.lg, textAlign: 'center' }}>
          Atajos: Space revelar · 1 again · 2 hard · 3 good · 4 easy
        </Text>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text variant="caption" muted style={{ textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 24, fontWeight: '600', color: theme.accent }}>{value}</Text>
    </View>
  );
}

function RatingBtn({
  label,
  subtitle,
  color,
  onPress,
}: {
  label: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ratingBtn,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={{ color, fontWeight: '700' }}>{label}</Text>
      <Text variant="caption" muted>
        {subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginVertical: spacing.lg,
    minHeight: 260,
    justifyContent: 'center',
  },
  front: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  def: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  example: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    marginVertical: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  ratingBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    alignItems: 'center',
  },
});
