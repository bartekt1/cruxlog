import { Link, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { useTheme } from '../../src/ui/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const th = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: th.accent,
        tabBarStyle: { backgroundColor: th.surface, borderTopColor: th.line },
        headerStyle: { backgroundColor: th.surface },
        headerTintColor: th.ink,
        headerRight: () => (
          <Link href="/settings" style={{ marginRight: 16 }}>
            <Text style={{ color: th.accent }}>⚙</Text>
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
