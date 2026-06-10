import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { radius, spacing, motion, layout, useTheme } from '@/lib/theme';
import { Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent-soft';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  style,
  fullWidth,
}: Props) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeStyles = {
    sm: { paddingVertical: 6, paddingHorizontal: spacing.md, minHeight: 34 },
    md: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.xl, minHeight: layout.buttonHeight },
    lg: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xxl, minHeight: 56 },
  }[size];

  const { bg, fg, borderColor } = {
    primary: { bg: theme.accent, fg: '#ffffff', borderColor: 'transparent' },
    secondary: { bg: theme.card, fg: theme.fg, borderColor: theme.border },
    danger: { bg: theme.bad, fg: '#ffffff', borderColor: 'transparent' },
    ghost: { bg: 'transparent', fg: theme.accent, borderColor: 'transparent' },
    'accent-soft': { bg: theme.accentSoft, fg: theme.accentText, borderColor: theme.accent + '22' },
  }[variant];

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => { scale.value = withSpring(0.96, motion.fast); }}
      onPressOut={() => { scale.value = withSpring(1, motion.fast); }}
      style={[
        styles.btn,
        sizeStyles,
        {
          backgroundColor: bg,
          borderColor,
          opacity: disabled ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : undefined,
        },
        animStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon}
          <Text variant={size === 'sm' ? 'smallBold' : 'bodyBold'} style={{ color: fg }}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
