import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { addRouteGoal, deleteAscent, getAscent, listPhotos, routeGoals, type AscentDetail } from '../../src/db/repo';
import { formatDay, isoDate } from '../../src/domain/dates';
import { feltGrade, formatGrade, routeGrade } from '../../src/domain/grades';
import { Button, EmptyState, GradeBadge, Label, Loading, Title } from '../../src/ui/kit';
import { IconButton } from '../../src/ui/icons';
import { PhotoStrip } from '../../src/ui/PhotoViews';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';
import { runOrAlert } from '../../src/ui/errors';
import { sectorLine } from '../../src/domain/text';

export default function AscentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [a, setA] = useState<AscentDetail | null | undefined>(undefined);
  const [isProject, setIsProject] = useState(false);
  const [photoIds, setPhotoIds] = useState<string[]>([]);

  useFocusEffect(useCallback(() => {
    getAscent(db, id).then(async (x) => {
      setA(x);
      if (x) listPhotos(db, 'ascent', x.id).then((rows) => setPhotoIds(rows.map((p) => p.id)));
      if (x) setIsProject((await routeGoals(db, x.route_id)).some((g) => g.kind === 'project'));
    });
  }, [db, id]));

  if (a === undefined) return <Loading />;
  if (a === null) return <View style={{ flex: 1, backgroundColor: th.bg, padding: 16 }}><EmptyState title={t('ascent.notFound')} /></View>;

  const confirmDelete = () =>
    Alert.alert(t('ascent.deleteTitle'), t('ascent.deleteQuestion', { name: a.route_name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => runOrAlert(async () => { await deleteAscent(db, a.id); router.back(); }) },
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
      <Stack.Screen options={{
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            <IconButton name="share-social-outline" size={26} label={t('share.title')} onPress={() => router.push({ pathname: '/share', params: { kind: 'ascent', id: a.id } })} />
            <IconButton name="create-outline" size={26} label={t('ascent.editTitle')} onPress={() => router.push({ pathname: '/ascent/new', params: { id: a.id } })} />
          </View>
        ),
      }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push(`/route/${a.route_id}`)} accessibilityRole="link" accessibilityHint={t('route.openHint')}>
          <Title size={32}>{a.route_name}</Title>
        </Pressable>
        <GradeBadge text={routeGrade(a, routeSystem)} size="lg" />
      </View>
      <Text style={{ color: th.muted, marginTop: 4 }}>{sectorLine(a.crag_name, a.route.sector_name)} · {t(`types.${a.type}`)}</Text>

      {row(t('ascent.date'), formatDay(a.date, i18n.language, isoDate(new Date())))}
      {row(t('ascent.style'), t(`styles.${a.style}`))}
      {feltGrade(a.felt_grade_index, a.grade_index) != null ? row(t('ascent.felt'), formatGrade(a.felt_grade_index!, routeSystem)) : null}
      {a.attempts > 1 ? row(t('ascent.attempts'), String(a.attempts)) : null}
      {a.rating ? row(t('ascent.rating'), '★'.repeat(a.rating)) : null}
      {row(t('ascent.partner'), a.partner_name)}
      {row(t('ascent.weather'), a.weather)}
      {row(t('ascent.notes'), a.notes)}
      {photoIds.length ? (
        <>
          <Label>{t('photos.title')}</Label>
          <PhotoStrip ids={photoIds} onOpen={(i) => router.push({ pathname: '/photo', params: { ownerType: 'ascent', ownerId: a.id, index: String(i) } })} />
        </>
      ) : null}

      {a.style === 'attempt' ? (
        isProject ? (
          <Text style={{ color: th.muted, marginTop: 16 }}>{t('goals.isProject')}</Text>
        ) : (
          <Button label={t('goals.addAsProject')} variant="plain" onPress={() => runOrAlert(async () => { await addRouteGoal(db, a.route_id, 'project'); setIsProject(true); })} />
        )
      ) : null}
      <Button label={t('common.delete')} onPress={confirmDelete} variant="danger" />
    </ScrollView>
  );
}
