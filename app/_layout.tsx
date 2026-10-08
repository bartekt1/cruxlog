import '../src/i18n';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { migrate } from '../src/db/migrate';
import { useTheme } from '../src/ui/theme';

export default function RootLayout() {
  const { t } = useTranslation();
  const th = useTheme();
  return (
    <SQLiteProvider databaseName="cruxlog.db" onInit={migrate}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: th.surface }, headerTintColor: th.ink, contentStyle: { backgroundColor: th.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ascent/new" options={{ title: t('ascent.title'), presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
      </Stack>
    </SQLiteProvider>
  );
}
