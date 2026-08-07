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

// Deliberadamente NO es forwardRef. `<Link asChild>` de expo-router clona el
// hijo y le pasa un ref, así que React avisa "Function components cannot be
// given refs" por consola. Envolverlo en React.forwardRef parece el arreglo
// obvio, pero el SlotClone de expo-router no acepta un componente exótico y
// revienta el render con "Component is not a function (it is Object)". El aviso
// es inocuo: el ref se descarta y el onPress sigue llegando por props.
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
