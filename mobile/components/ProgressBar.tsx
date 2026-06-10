import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { radius, useTheme, motion } from '@/lib/theme';

interface Props {
  progress: number; // 0..1
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({ progress, color, height = 6, style }: Props) {
  const theme = useTheme();
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(1, progress)) * 100, {
      duration: motion.durationStandard,
    });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={[styles.outer, { backgroundColor: theme.borderLight, height, borderRadius: height / 2 }, style]}>
      <Animated.View
        style={[
          styles.inner,
          { backgroundColor: color || theme.accent, borderRadius: height / 2 },
          barStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    marginVertical: 8,
  },
  inner: {
    height: '100%',
  },
});
