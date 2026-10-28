import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { HIT } from '../../src/ui/kit';
import { F } from '../../src/ui/fonts';
import { useTheme } from '../../src/ui/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const th = useTheme();
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: th.ink,
        tabBarInactiveTintColor: th.muted,
        tabBarStyle: { backgroundColor: th.surface, borderTopColor: th.line },
        tabBarLabelStyle: { fontSize: 11, fontFamily: F.semi, letterSpacing: 0.6, textTransform: 'uppercase' },
        headerStyle: { backgroundColor: th.bg },
        headerShadowVisible: false,
        headerTintColor: th.ink,
        headerTitleStyle: { fontFamily: F.display, fontSize: 30, color: th.ink },
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
        name="add"
        options={{
          title: t('journal.addShort'),
          // Not a real tab: a raised orange button in the middle of the bar that opens a new ascent from any tab.
          tabBarButton: () => (
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Pressable
                onPress={() => router.push('/ascent/new')}
                accessibilityRole="button"
                accessibilityLabel={t('journal.add')}
                style={({ pressed }) => ({
                  top: -18, width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: th.cta, borderWidth: 4, borderColor: th.surface,
                  elevation: 8, shadowColor: th.ink, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                })}
              >
                <Ionicons name="add" size={36} color={th.onCta} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="crags"
        options={{ title: t('tabs.crags'), tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'image-filter-hdr' : 'image-filter-hdr-outline'} size={size + 2} color={color} /> }}
      />
      <Tabs.Screen
        name="goals"
        options={{ title: t('tabs.plans'), tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'flag' : 'flag-outline'} size={size} color={color} /> }}
      />
    </Tabs>
  );
}
