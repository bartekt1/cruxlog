import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { F } from '../src/ui/fonts';
import { Title } from '../src/ui/kit';
import { ProBadge } from '../src/ui/ProTeaser';
import { Text } from '../src/ui/Text';
import { useTheme } from '../src/ui/theme';
import { PRO_VISIBLE } from '../src/pro';

const ITEMS = ['stats', 'years', 'trips', 'topoMap', 'cards'] as const;

/** What Cruxlog Pro adds. In this build it is not available yet: the screen only tells what is coming. */
export default function ProScreen() {
  const th = useTheme();
  const { t } = useTranslation();
  if (!PRO_VISIBLE) return <Redirect href="/" />; // Pro is frozen: no Pro screen
  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: t('pro.title') }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Title size={34}>{t('pro.title')}</Title>
        <ProBadge />
      </View>
      <Text style={{ color: th.ink, fontSize: 16, marginTop: 8 }}>{t('pro.intro')}</Text>
      <View style={{ marginTop: 16, gap: 12 }}>
        {ITEMS.map((k) => (
          <View key={k} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Ionicons name="checkmark-circle" size={22} color={th.accent} />
            <Text style={{ flex: 1, color: th.ink, fontSize: 16 }}>{t(`pro.items.${k}`)}</Text>
          </View>
        ))}
      </View>
      <Text style={{ color: th.muted, marginTop: 12 }}>{t('pro.more')}</Text>
      <View style={{ marginTop: 24, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: th.line, backgroundColor: th.surface }}>
        <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 16 }}>{t('pro.soon')}</Text>
        <Text style={{ color: th.muted, marginTop: 4 }}>{t('pro.soonHint')}</Text>
      </View>
    </ScrollView>
  );
}
