import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { spacing, useTheme } from '@/lib/theme';
import { Text } from './Text';

interface Props {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, subtitle, action }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text variant="h2">{title}</Text>
        {subtitle && (
          <Text variant="small" muted style={{ marginTop: spacing.xxs }}>
            {subtitle}
          </Text>
        )}
      </View>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={12}>
          <Text variant="smallBold" accent>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
});
