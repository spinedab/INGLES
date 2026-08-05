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
      {/* Una sola línea y encogiendo si hace falta: en la fila de 4 stats de
          Flashcards, "APRENDIDAS" no cabe y se partía como "APRENDID / AS". */}
      <Text
        variant="caption"
        muted
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={{ textTransform: 'uppercase' }}
      >
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
