import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { radius, spacing, useTheme } from '@/lib/theme';
import { Text } from './Text';
import type { DailyMissionItem } from '@/lib/types';

interface Props {
  mission: DailyMissionItem[];
}

export function MissionList({ mission }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      {mission.map((item, i) => (
        <Pressable
          key={i}
          onPress={() => router.push(item.href as any)}
          style={({ pressed }) => [
            styles.item,
            { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[styles.step, { backgroundColor: theme.accent }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600' }}>{item.label}</Text>
            <Text variant="small" muted>
              {item.detail}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
