import '../src/i18n';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { migrate } from '../src/db/migrate';
import { AutoBackup } from '../src/ui/AutoBackup';
import { F, FONT_ASSETS } from '../src/ui/fonts';
import { UpdateCheck } from '../src/ui/UpdateCheck';
import { useIsDark, useTheme } from '../src/ui/theme';

export default function RootLayout() {
  const { t } = useTranslation();
  const th = useTheme();
  // Android draws the app under its navigation bar; screens keep that strip free (the tabs handle it themselves).
  const insets = useSafeAreaInsets();
  const dark = useIsDark();
  // Fonts are bundled, so this takes a moment; if they fail to load the app still starts in the system font.
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  if (!fontsLoaded && !fontError) return null;
  return (
    <SQLiteProvider databaseName="cruxlog.db" onInit={migrate}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <AutoBackup />
      <UpdateCheck />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: th.bg }, headerShadowVisible: false, headerTintColor: th.ink,
        headerTitleStyle: { fontFamily: F.display, fontSize: 24, color: th.ink }, contentStyle: { backgroundColor: th.bg, paddingBottom: insets.bottom },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: th.bg } }} />
        <Stack.Screen name="ascent/new" options={{ title: t('ascent.title'), presentation: 'modal' }} />
        <Stack.Screen name="ascent/[id]" options={{ title: t('ascent.detailTitle') }} />
        <Stack.Screen name="crag/[id]" options={{ title: t('crags.detailTitle') }} />
        <Stack.Screen name="photo" options={{ title: '', presentation: 'modal' }} />
        <Stack.Screen name="topo" options={{ title: t('topo.title') }} />
        <Stack.Screen name="share" options={{ title: t('share.title'), presentation: 'modal' }} />
        <Stack.Screen name="crag/locate" options={{ title: t('map.locateShort') }} />
        <Stack.Screen name="crag/edit" options={{ title: t('edit.cragTitle') }} />
        <Stack.Screen name="route/edit" options={{ title: t('edit.routeTitle') }} />
        <Stack.Screen name="route/[id]" options={{ title: t('route.title') }} />
        <Stack.Screen name="route/new" options={{ title: t('edit.addRoutesTitle') }} />
        <Stack.Screen name="route/search" options={{ title: t('routeSearch.title') }} />
        <Stack.Screen name="sector/new" options={{ title: t('edit.addSectorTitle') }} />
        <Stack.Screen name="sector/[id]" options={{ title: t('edit.sectorTitle') }} />
        <Stack.Screen name="region/[id]" options={{ title: t('areas.edit.region') }} />
        <Stack.Screen name="area/[id]" options={{ title: t('areas.level.region') }} />
        <Stack.Screen name="area/new" options={{ title: t('areas.add.region') }} />
        <Stack.Screen name="goal/[id]" options={{ title: t('goals.editTitle') }} />
        <Stack.Screen name="trip/[id]" options={{ title: t('trip.title') }} />
        <Stack.Screen name="trip/edit" options={{ title: t('trip.newTitle') }} />
        <Stack.Screen name="trip/share" options={{ title: t('share.title'), presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
        <Stack.Screen name="packs" options={{ title: t('packs.title') }} />
      </Stack>
    </SQLiteProvider>
  );
}
