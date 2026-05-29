import { Stack } from 'expo-router';
import { useTheme } from '@/lib/theme';

export default function GrammarLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Gramática' }} />
      <Stack.Screen name="[id]" options={{ title: 'Tópico' }} />
    </Stack>
  );
}
