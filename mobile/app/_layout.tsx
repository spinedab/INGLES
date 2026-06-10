import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { LevelProvider } from '@/lib/levelContext';
import { apiClient } from '@/lib/api';
import { useTheme } from '@/lib/theme';

export default function RootLayout() {
  const theme = useTheme();

  useEffect(() => {
    void apiClient.init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LevelProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.bg },
              headerTitleStyle: { color: theme.fg, fontWeight: '700' },
              headerTintColor: theme.accent,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: theme.bg },
            }}
          >
            {/* Tab navigator — main entry point */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

            {/* Stack screens pushed over tabs */}
            <Stack.Screen name="flashcards" options={{ headerShown: false }} />
            <Stack.Screen name="reading" options={{ headerShown: false }} />
            <Stack.Screen name="listening" options={{ headerShown: false }} />
            <Stack.Screen name="grammar" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ title: 'Busqueda', presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          </Stack>
        </LevelProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
