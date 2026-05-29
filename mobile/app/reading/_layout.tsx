import { Stack } from 'expo-router';
import { useTheme } from '@/lib/theme';

export default function ReadingLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { color: theme.fg },
        headerTintColor: theme.accent,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Lectura' }} />
      <Stack.Screen name="[id]" options={{ title: 'Texto' }} />
    </Stack>
  );
}
