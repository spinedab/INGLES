import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { radius, spacing, useTheme } from '@/lib/theme';
import { Text } from './Text';

interface Props {
  label: string;
  onPress?: () => void;
  active?: boolean;
  style?: ViewStyle;
}

export function Chip({ label, onPress, active, style }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? theme.accent : theme.accentSoft,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        variant="caption"
        style={{ color: active ? '#fff' : theme.accent, fontWeight: '600' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.lg,
    marginRight: 6,
    marginBottom: 6,
  },
});
