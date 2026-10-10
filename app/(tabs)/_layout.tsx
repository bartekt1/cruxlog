import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { HIT } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const th = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: th.accent,
        tabBarInactiveTintColor: th.muted,
        tabBarStyle: { backgroundColor: th.surface, borderTopColor: th.line },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: th.surface },
        headerTintColor: th.ink,
        headerRight: () => (
          <Link href="/settings" asChild>
            <Pressable hitSlop={HIT} accessibilityRole="button" accessibilityLabel={t('settings.title')} style={({ pressed }) => ({ marginRight: 8, padding: 8, opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="settings-outline" size={28} color={th.ink} />
            </Pressable>
          </Link>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.journal'), tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: t('tabs.progress'), tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="crags"
        options={{ title: t('tabs.crags'), tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'image-filter-hdr' : 'image-filter-hdr-outline'} size={size + 2} color={color} /> }}
      />
      <Tabs.Screen
        name="goals"
        options={{ title: t('tabs.goals'), tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'flag' : 'flag-outline'} size={size} color={color} /> }}
      />
    </Tabs>
  );
}
