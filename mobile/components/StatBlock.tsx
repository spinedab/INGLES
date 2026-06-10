import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { radius, spacing, elevation, useTheme } from '@/lib/theme';
import { Text } from './Text';

interface Props {
  label: string;
  value: string | number;
  color?: string;
  style?: ViewStyle;
}

export function StatBlock({ label, value, color, style }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: theme.card, borderColor: theme.cardBorder }, elevation.sm, style]}>
      <Text variant="caption" muted style={{ textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text
        variant="h2"
        style={{ color: color || theme.accent, marginTop: spacing.xxs }}
      >
        {String(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    minWidth: 76,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
