import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { radius, spacing, useTheme } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, onPress, style }: Props) {
  const theme = useTheme();
  const cardStyle: ViewStyle = {
    backgroundColor: theme.card,
    borderColor: theme.border,
    ...styles.card,
    ...(style ?? {}),
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && { transform: [{ scale: 0.99 }], opacity: 0.9 },
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
});
