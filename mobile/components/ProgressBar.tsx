import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/lib/theme';

interface Props {
  progress: number; // 0..1
}

export function ProgressBar({ progress }: Props) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.outer, { backgroundColor: theme.border }]}>
      <View
        style={[
          styles.inner,
          { backgroundColor: theme.accent, width: `${clamped * 100}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 8,
  },
  inner: {
    height: '100%',
  },
});
