import { Stack } from 'expo-router';
import { useTheme } from '@/lib/theme';

export default function FlashcardsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Flashcards' }} />
      <Stack.Screen name="session" options={{ title: 'Sesión SRS', presentation: 'modal' }} />
    </Stack>
  );
}
