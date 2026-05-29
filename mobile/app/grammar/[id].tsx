import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { QuestionBlock } from '@/components/QuestionBlock';
import { StatBlock } from '@/components/StatBlock';
import { grammarById } from '@/lib/content';
import { set } from '@/lib/storage';
import { logActivity } from '@/lib/insights';
import { radius, spacing, useTheme } from '@/lib/theme';

export default function GrammarDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const topic = id ? grammarById(id) : undefined;
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});

  if (!topic) {
    return (
      <Screen>
        <Text>Tópico no encontrado.</Text>
      </Screen>
    );
  }

  const handleAnswer = (qi: number, correct: boolean) => {
    setAnswers((prev) => {
      const next = { ...prev, [qi]: correct };
      if (Object.keys(next).length === topic.exercises.length) {
        const c = Object.values(next).filter(Boolean).length;
        setScore({ correct: c, total: topic.exercises.length });
        void set(`grammar:score:${topic.id}`, { correct: c, total: topic.exercises.length, ts: Date.now() });
        void logActivity('grammar_score', {
          skill: 'grammar',
          id_: topic.id,
          title: topic.title,
          correct: c,
          total: topic.exercises.length,
        });
      }
      return next;
    });
  };

  return (
    <Screen>
      <Text variant="h1">{topic.title}</Text>
      <Text accent style={{ marginBottom: spacing.lg, textTransform: 'uppercase' }}>
        Nivel {topic.level.toUpperCase()}
      </Text>

      <Text variant="h2">¿Por qué importa?</Text>
      <Text>{topic.why}</Text>

      <Text variant="h2" style={{ marginTop: spacing.lg }}>
        Regla
      </Text>
      <View style={[styles.ruleBox, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
        <Text>{topic.rule}</Text>
      </View>

      <Text variant="h2" style={{ marginTop: spacing.lg }}>
        Ejemplos
      </Text>
      {topic.examples.map(([s, comment], i) => (
        <View key={i} style={{ marginVertical: spacing.xs }}>
          <Text style={{ fontWeight: '600' }}>{s}</Text>
          <Text muted variant="small">
            — {comment}
          </Text>
        </View>
      ))}

      <Text variant="h2" style={{ marginTop: spacing.lg }}>
        Práctica
      </Text>
      {topic.exercises.map((ex, i) => (
        <QuestionBlock key={i} question={ex} number={i + 1} onAnswer={(c) => handleAnswer(i, c)} />
      ))}

      {score && (
        <View style={{ flexDirection: 'row', marginVertical: spacing.md }}>
          <StatBlock label="Tu puntuación" value={`${score.correct}/${score.total}`} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ruleBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    marginTop: spacing.xs,
  },
});
