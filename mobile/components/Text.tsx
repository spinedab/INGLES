import React from 'react';
import { StyleSheet, Text as RNText, TextProps, StyleProp, TextStyle } from 'react-native';
import { typography, useTheme } from '@/lib/theme';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';

interface Props extends TextProps {
  variant?: Variant;
  muted?: boolean;
  accent?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Text({ variant = 'body', muted, accent, style, ...rest }: Props) {
  const theme = useTheme();
  const base = typography[variant];
  const color = accent ? theme.accent : muted ? theme.muted : theme.fg;
  return <RNText {...rest} style={[base, { color }, style]} />;
}
