import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';
import { deleteTrip, getTrip, listAscentsBetween, type AscentRow, type TripDetail } from '../../src/db/repo';
import { isoDate } from '../../src/domain/dates';
import { formatGrade, routeGrade } from '../../src/domain/grades';
import { sectorLine } from '../../src/domain/text';
import { formatTripDates, tripStatus, tripSummary } from '../../src/domain/trips';
import { runOrAlert } from '../../src/ui/errors';
import { IconButton } from '../../src/ui/icons';
import { Button, Chip, ChipRow, EmptyState, Label, Loading, StatTile, Title } from '../../src/ui/kit';
import { CtaButton, RouteCard } from '../../src/ui/rows';
import { useSettings } from '../../src/ui/settingsStore';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

/** One trip: when and where, the proposed routes (ticked once sent during the trip), and from its first day what was climbed. */
export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [trip, setTrip] = useState<TripDetail | null | undefined>(undefined);
  const [ascents, setAscents] = useState<AscentRow[]>([]);

  useFocusEffect(useCallback(() => {
    let live = true;
    getTrip(db, id).then(async (x) => {
      if (!live) return;
      setTrip(x);
      if (x) { const a = await listAscentsBetween(db, x.start_date, x.end_date); if (live) setAscents(a); }
    });
    return () => { live = false; };
  }, [db, id]));

  if (trip === undefined) return <Loading />;
  if (trip === null) return <View style={{ flex: 1, backgroundColor: th.bg, padding: 16 }}><EmptyState title={t('trip.notFound')} /></View>;

  const status = tripStatus(trip, isoDate(new Date()));
  const summary = tripSummary(ascents, trip.routes.map((r) => r.id));
  const sentIds = new Set(summary.sent.map((a) => a.route_id));
  const askDelete = () => Alert.alert(t('trip.deleteTitle'), t('trip.deleteQuestion', { name: trip.name }), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.delete'), style: 'destructive', onPress: () => runOrAlert(async () => { await deleteTrip(db, trip.id); router.back(); }) },
  ]);

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{
        title: t('trip.title'),
        headerRight: () => <IconButton name="create-outline" size={26} label={t('trip.editTitle')} onPress={() => router.push({ pathname: '/trip/edit', params: { id: trip.id } })} />,
      }} />
      <Text style={{ color: th.accent, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' }}>{t(`trip.status.${status}`)}</Text>
      <Title size={36}>{trip.name}</Title>
      <Text style={{ color: th.ink, fontSize: 16, marginTop: 4 }}>{formatTripDates(trip.start_date, trip.end_date, i18n.language)}</Text>
      <ChipRow>{trip.crags.map((c) => <Chip key={c.id} label={c.name} onPress={() => router.push(`/crag/${c.id}`)} />)}</ChipRow>
      {trip.message ? <Text style={{ color: th.ink, borderLeftWidth: 3, borderLeftColor: th.accent, paddingLeft: 10, marginTop: 4 }}>{trip.message}</Text> : null}

      {/* Orange only for the screen's main action: the invitation before the trip, the summary once it has ascents. */}
      {status === 'planned' ? (
        <CtaButton label={t('trip.invite')} style={{ marginTop: 16 }} onPress={() => router.push({ pathname: '/trip/share', params: { id: trip.id, mode: 'invite' } })} />
      ) : (
        <Button label={t('trip.invite')} variant="plain" onPress={() => router.push({ pathname: '/trip/share', params: { id: trip.id, mode: 'invite' } })} />
      )}

      {status !== 'planned' ? (
        <>
          <Label>{t('trip.climbed')}</Label>
          {ascents.length ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StatTile value={String(summary.sends)} label={t('trip.sends')} strong />
                <StatTile value={String(summary.days)} label={t('trip.days')} />
                <StatTile value={summary.hardest ? formatGrade(summary.hardest.gradeIndex, routeSystem) : '–'} label={t('trip.hardest')} />
              </View>
              {summary.planned.total ? <Text style={{ color: th.muted, marginTop: 8 }}>{t('trip.plannedDone', { done: summary.planned.done, total: summary.planned.total })}</Text> : null}
              <Button label={t('trip.brag')} onPress={() => router.push({ pathname: '/trip/share', params: { id: trip.id, mode: 'summary' } })} />
            </>
          ) : <Text style={{ color: th.muted }}>{t('trip.nothingYet')}</Text>}
        </>
      ) : null}

      <Label>{t('trip.routes', { count: trip.routes.length })}</Label>
      {trip.routes.length ? trip.routes.map((r) => (
        <RouteCard key={r.id} grade={routeGrade(r, routeSystem)} name={r.name} subtitle={sectorLine(r.crag_name, r.sector_name)}
          note={sentIds.has(r.id) ? `✓ ${t('trip.sent')}` : undefined} noteAccent onPress={() => router.push(`/route/${r.id}`)} />
      )) : <Text style={{ color: th.muted }}>{t('trip.noRoutes')}</Text>}

      <Button label={t('trip.delete')} variant="danger" onPress={askDelete} />
    </ScrollView>
  );
}
