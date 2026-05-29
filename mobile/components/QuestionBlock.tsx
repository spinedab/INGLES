import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, spacing, useTheme } from '@/lib/theme';
import { Text } from './Text';
import type { Question } from '@/lib/types';

interface Props {
  question: Question;
  number: number;
  onAnswer?: (correct: boolean) => void;
}

export function QuestionBlock({ question, number, onAnswer }: Props) {
  const theme = useTheme();
  const [picked, setPicked] = useState<number | null>(null);

  const handlePick = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    onAnswer?.(i === question.answer);
  };

  return (
    <View style={[styles.box, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={{ fontWeight: '600', marginBottom: spacing.sm }}>
        {number}. {question.q}
      </Text>
      <View style={{ gap: spacing.xs }}>
        {question.options.map((opt, i) => {
          const isCorrect = picked != null && i === question.answer;
          const isWrong = picked === i && i !== question.answer;
          const bg = isCorrect
            ? theme.good + '33'
            : isWrong
            ? theme.bad + '22'
            : theme.bg;
          const borderColor = isCorrect ? theme.good : isWrong ? theme.bad : theme.border;
          return (
            <Pressable
              key={i}
              onPress={() => handlePick(i)}
              style={({ pressed }) => [
                styles.opt,
                { backgroundColor: bg, borderColor },
                pressed && picked == null && { opacity: 0.7 },
              ]}
            >
              <Text>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  opt: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
