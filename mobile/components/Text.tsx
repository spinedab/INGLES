import React from 'react';
import { Text as RNText, TextProps, StyleProp, TextStyle } from 'react-native';
import { typography, useTheme } from '@/lib/theme';

type Variant = keyof typeof typography;

interface Props extends TextProps {
  variant?: Variant;
  muted?: boolean;
  accent?: boolean;
  good?: boolean;
  bad?: boolean;
  warn?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Text({
  variant = 'body',
  muted,
  accent,
  good,
  bad,
  warn,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const base = typography[variant];
  let color = theme.fg;
  if (muted) color = theme.muted;
  if (accent) color = theme.accent;
  if (good) color = theme.good;
  if (bad) color = theme.bad;
  if (warn) color = theme.warn;
  return <RNText {...rest} style={[base, { color }, style]} />;
}
