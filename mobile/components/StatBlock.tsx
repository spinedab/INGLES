import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, spacing, useTheme } from '@/lib/theme';
import { Text } from './Text';

interface Props {
  label: string;
  value: string | number;
}

export function StatBlock({ label, value }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text variant="caption" muted style={{ textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 24, fontWeight: '600', color: theme.accent, marginTop: spacing.xs }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    minWidth: 90,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
