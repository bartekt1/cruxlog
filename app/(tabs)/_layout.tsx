import { Link, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';
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
        headerStyle: { backgroundColor: th.surface },
        headerTintColor: th.ink,
        headerRight: () => (
          <Link href="/settings" asChild>
            <Pressable hitSlop={HIT} accessibilityRole="button" accessibilityLabel={t('settings.title')} style={{ marginRight: 12, padding: 6 }}>
              <Text style={{ color: th.accent, fontSize: 22 }}>⚙</Text>
            </Pressable>
          </Link>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.journal') }} />
      <Tabs.Screen name="progress" options={{ title: t('tabs.progress') }} />
      <Tabs.Screen name="crags" options={{ title: t('tabs.crags') }} />
      <Tabs.Screen name="goals" options={{ title: t('tabs.goals') }} />
    </Tabs>
  );
}
