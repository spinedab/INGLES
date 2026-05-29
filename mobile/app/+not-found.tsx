import { Link, Stack } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: '404' }} />
      <Screen>
        <Text variant="h1">Esta pantalla no existe.</Text>
        <Link href="/" style={{ marginTop: 16 }}>
          <Text accent>← Ir al inicio</Text>
        </Link>
      </Screen>
    </>
  );
}
