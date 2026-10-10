import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, View } from 'react-native';
import { deleteAscent, getAscent, type AscentDetail } from '../../src/db/repo';
import { formatDay, isoDate } from '../../src/domain/dates';
import { formatGrade } from '../../src/domain/grades';
import { Button, EmptyState, GradeBadge, Label } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

export default function AscentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem, boulderSystem } = useSettings();
  const [a, setA] = useState<AscentDetail | null | undefined>(undefined);

  useFocusEffect(useCallback(() => { getAscent(db, id).then(setA); }, [db, id]));

  if (a === undefined) return <View style={{ flex: 1, backgroundColor: th.bg }} />;
  if (a === null) return <View style={{ flex: 1, backgroundColor: th.bg, padding: 16 }}><EmptyState title={t('ascent.notFound')} /></View>;

  const confirmDelete = () =>
    Alert.alert(t('ascent.deleteTitle'), t('ascent.deleteQuestion', { name: a.route_name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { await deleteAscent(db, a.id); router.back(); } },
    ]);

  const row = (label: string, value: string | null | undefined) =>
    value ? (
      <>
        <Label>{label}</Label>
        <Text style={{ color: th.ink, fontSize: 16 }}>{value}</Text>
      </>
    ) : null;

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, color: th.ink, fontSize: 22, fontWeight: '700' }}>{a.route_name}</Text>
        <GradeBadge text={formatGrade(a.grade_index, a.type === 'boulder' ? boulderSystem : routeSystem, a.type)} />
      </View>
      <Text style={{ color: th.muted, marginTop: 4 }}>{a.crag_name} · {a.route.sector_name} · {t(`types.${a.type}`)}</Text>

      {row(t('ascent.date'), formatDay(a.date, i18n.language, isoDate(new Date())))}
      {row(t('ascent.style'), t(`styles.${a.style}`))}
      {a.attempts > 1 ? row(t('ascent.attempts'), String(a.attempts)) : null}
      {a.rating ? row(t('ascent.rating'), '★'.repeat(a.rating)) : null}
      {row(t('ascent.partner'), a.partner_name)}
      {row(t('ascent.weather'), a.weather)}
      {row(t('ascent.notes'), a.notes)}

      <Button label={t('common.edit')} onPress={() => router.push({ pathname: '/ascent/new', params: { id: a.id } })} />
      <Button label={t('common.delete')} onPress={confirmDelete} variant="danger" />
    </ScrollView>
  );
}
