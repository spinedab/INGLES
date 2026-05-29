import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, spacing, useTheme } from '@/lib/theme';
import { useLevel } from '@/lib/levelContext';
import type { CefrLevel } from '@/lib/types';
import { Text } from './Text';

const LEVELS: CefrLevel[] = ['a1', 'a2', 'b1', 'b2'];

export function LevelPicker() {
  const { level, setLevel } = useLevel();
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {LEVELS.map((l) => {
        const active = l === level;
        return (
          <Pressable
            key={l}
            onPress={() => setLevel(l)}
            style={[
              styles.btn,
              {
                backgroundColor: active ? theme.accent : theme.card,
                borderColor: active ? theme.accent : theme.border,
              },
            ]}
          >
            <Text style={{ color: active ? '#fff' : theme.fg, fontWeight: '600' }}>
              {l.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});
