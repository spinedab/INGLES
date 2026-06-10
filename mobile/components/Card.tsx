import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { radius, spacing, elevation, motion, useTheme } from '@/lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'accent';
}

export function Card({ children, onPress, style, variant = 'default' }: Props) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyles: ViewStyle = {
    default: { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: StyleSheet.hairlineWidth, ...elevation.sm },
    elevated: { backgroundColor: theme.card, borderColor: 'transparent', borderWidth: 0, ...elevation.md },
    outlined: { backgroundColor: 'transparent', borderColor: theme.border, borderWidth: 1.5 },
    accent: { backgroundColor: theme.accentSoft, borderColor: theme.accent + '33', borderWidth: 1 },
  }[variant];

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, motion.fast); }}
        onPressOut={() => { scale.value = withSpring(1, motion.fast); }}
        style={[styles.card, variantStyles, animStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }
  return <View style={[styles.card, variantStyles, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
});
