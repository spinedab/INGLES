import { Stack } from 'expo-router';
import { useTheme } from '@/lib/theme';

export default function ListeningLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Listening' }} />
      <Stack.Screen name="[id]" options={{ title: 'Audio' }} />
    </Stack>
  );
}
