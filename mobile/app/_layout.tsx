import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { LevelProvider, useLevel } from '@/lib/levelContext';
import { apiClient } from '@/lib/api';
import { useTheme } from '@/lib/theme';

// El splash se retiene a mano para que cubra la lectura del nivel guardado en
// storage. Sin esto el arranque enseña un spinner sobre fondo vacío mientras
// `LevelProvider` resuelve, y en iOS el splash nativo se quedaba colgado
// indefinidamente porque nadie lo cerraba.
void SplashScreen.preventAutoHideAsync();

function StackNavigator() {
  const theme = useTheme();
  const { ready } = useLevel();

  // La fuente de Ionicons se carga explícitamente. En el build de release de
  // Android, la carga automática de @expo/vector-icons no llegaba a tiempo y
  // NINGÚN icono se dibujaba: ni el del onboarding ni los del tab bar, que
  // quedaban invisibles. En iOS colaba por casualidad de timing.
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  // Red de seguridad: si la fuente ni carga ni falla, el splash se quedaría
  // colgado para siempre y la app sería inusable. Pasado el plazo se sigue
  // adelante — es preferible arrancar sin iconos que no arrancar.
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const fontsSettled = fontsLoaded || !!fontError || fontTimeout;

  useEffect(() => {
    if (ready && fontsSettled) void SplashScreen.hideAsync();
  }, [ready, fontsSettled]);

  return (
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
  );
}

export default function RootLayout() {
  useEffect(() => {
    void apiClient.init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LevelProvider>
          <StatusBar style="auto" />
          <StackNavigator />
        </LevelProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
