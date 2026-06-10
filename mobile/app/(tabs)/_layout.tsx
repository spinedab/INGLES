import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme, spacing, layout } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          height: layout.tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.sm,
          paddingTop: spacing.xs,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
        headerStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { color: theme.fg, fontWeight: '700', fontSize: 18 },
        headerShadowVisible: false,
        headerTintColor: theme.accent,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Aprender',
          tabBarIcon: ({ color, size }) => <TabIcon name="book" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size }) => <TabIcon name="fitness" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notebook"
        options={{
          title: 'Cuaderno',
          tabBarIcon: ({ color, size }) => <TabIcon name="journal" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <TabIcon name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
