// Root index — redirección.
// Si es primera vez → onboarding. Si ya pasó → (tabs).
import { useEffect } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { get } from '@/lib/storage';
import { useTheme } from '@/lib/theme';

export default function RootIndex() {
  const theme = useTheme();
  useEffect(() => {
    (async () => {
      const done = await get<boolean>('onboarding:done', false);
      if (done) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={theme.accent} size="large" />
    </View>
  );
}
