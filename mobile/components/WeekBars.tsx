import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing, useTheme } from '@/lib/theme';
import { Text } from './Text';

interface Props {
  week: { key: string; minutes: number; events: number }[];
  goal: number;
}

export function WeekBars({ week, goal }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {week.map((day) => {
        const pct = Math.min(100, Math.round((day.minutes / goal) * 100));
        return (
          <View key={day.key} style={styles.col}>
            <View style={[styles.bar, { backgroundColor: theme.border }]}>
              <View style={[styles.fill, { backgroundColor: theme.accent, height: `${pct}%` }]} />
            </View>
            <Text variant="caption" muted>
              {day.key.slice(5)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  bar: {
    width: 18,
    height: 70,
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
  },
});
