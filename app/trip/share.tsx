import { Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { getTrip, listAreas, listAscentsBetween, type AscentRow, type AreaRow, type TripDetail } from '../../src/db/repo';
import { pathLabel } from '../../src/domain/areas';
import { isLatLng } from '../../src/domain/geo';
import { formatGrade, routeGrade } from '../../src/domain/grades';
import { coordsLabel, shareMessage, type SharePlace } from '../../src/domain/share';
import { formatTripDates, tripSummary } from '../../src/domain/trips';
import { Button, EmptyState, Field, Label } from '../../src/ui/kit';
import { SwitchRow } from '../../src/ui/rows';
import { useSettings } from '../../src/ui/settingsStore';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';
import { TRIP_CARD_RATIO, TripCard, type TripCardData, type TripCardRow } from '../../src/ui/TripCard';

const OUT_WIDTH = 1080;
// How many routes fit on the card; the rest are counted ("and 4 more").
const ROWS = { invite: 10, summary: 8 };

/** /trip/share?id=<trip>&mode=invite|summary: the trip as a picture and a text to send, before (invite) or after (summary). */
export default function TripShare() {
  const { id, mode: rawMode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const mode = rawMode === 'summary' ? 'summary' : 'invite';
  const db = useSQLiteContext();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const { width: screenWidth } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [trip, setTrip] = useState<TripDetail | null | undefined>(undefined);
  const [ascents, setAscents] = useState<AscentRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [message, setMessage] = useState<string | null>(null); // null until the trip's own message is filled in
  const [withPlace, setWithPlace] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const x = await getTrip(db, id);
      const [a, ar] = x ? await Promise.all([listAscentsBetween(db, x.start_date, x.end_date), listAreas(db)]) : [[], []];
      if (!live) return;
      setTrip(x); setAscents(a); setAreas(ar);
      setMessage((m) => m ?? (mode === 'invite' ? x?.message ?? '' : ''));
    })();
    return () => { live = false; };
  }, [db, id, mode]);

  if (trip === undefined) return <View style={{ flex: 1, backgroundColor: th.bg }} />;
  if (trip === null) return <View style={{ flex: 1, backgroundColor: th.bg, padding: 16 }}><EmptyState title={t('trip.notFound')} /></View>;

  // The first crag with a position stands for the meeting place.
  const pinned = trip.crags.find((c) => isLatLng(c.lat, c.lng));
  const placeOf: SharePlace | null = pinned ? { lat: pinned.lat!, lng: pinned.lng!, approx: pinned.pos_source === 'approx' } : null;
  const place = withPlace ? placeOf : null;
  const dates = formatTripDates(trip.start_date, trip.end_date, i18n.language);
  const crags = trip.crags.map((c) => c.name).join(', ');
  const path = trip.crags[0]?.region_id ? pathLabel(areas, trip.crags[0].region_id) : '';
  const summary = tripSummary(ascents, trip.routes.map((r) => r.id));
  const styleOf = new Map(ascents.filter((a) => a.style !== 'attempt').map((a) => [a.route_id, a.style]));

  const all: TripCardRow[] = mode === 'invite'
    ? trip.routes.map((r) => ({ grade: routeGrade(r, routeSystem), name: r.name, detail: trip.crags.length > 1 ? r.crag_name : r.sector_name === r.crag_name ? '' : r.sector_name }))
    : summary.sent.map((a) => {
      const row = ascents.find((x) => x.route_id === a.route_id)!;
      return { grade: routeGrade(row, routeSystem), name: a.route_name, detail: t(`styles.${styleOf.get(a.route_id) ?? a.style}`), done: true };
    });
  const rows = all.slice(0, ROWS[mode]);
  const rest = all.length - rows.length;
  const stats = mode === 'summary' ? [
    { value: String(summary.sends), label: t('trip.sends') },
    { value: String(summary.days), label: t('trip.days') },
    { value: summary.hardest ? formatGrade(summary.hardest.gradeIndex, routeSystem) : '–', label: t('trip.hardest') },
  ] : null;
  const note = mode === 'summary' && summary.planned.total ? t('trip.plannedDone', { done: summary.planned.done, total: summary.planned.total }) : '';
  const text = (message ?? '').trim();

  const card: TripCardData = {
    tag: mode === 'invite' ? t('trip.cardInvite') : t('trip.cardSummary'), title: trip.name, dates, crags, path, stats, rows,
    more: rest > 0 ? t('trip.more', { count: rest }) : '', note, message: text,
    place: place ? { coords: coordsLabel(place), approx: place.approx } : null, approxLabel: t('share.approxCard'),
  };
  const cardWidth = Math.min(screenWidth - 32, 380);

  const sendImage = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile', width: OUT_WIDTH, height: OUT_WIDTH * TRIP_CARD_RATIO });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('share.title') });
    } catch {
      Alert.alert(t('share.title'), t('share.failed'));
    } finally {
      setBusy(false);
    }
  };
  const sendText = async () => {
    const lines = all.map((r) => `• ${r.name} ${r.grade}${r.detail ? ` (${r.detail})` : ''}`);
    const body = shareMessage({
      headline: `${card.tag}: ${trip.name}`,
      details: [dates, crags, stats ? stats.map((s) => `${s.label}: ${s.value}`).join(' · ') : '', ...lines, note],
      message: text, place, mapLabel: t('share.mapLabel'), approxLabel: t('share.approxText'),
    });
    try { await Share.share({ message: body }); } catch { Alert.alert(t('share.title'), t('share.failed')); }
  };

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: mode === 'invite' ? t('trip.invite') : t('trip.brag') }} />
      <View style={{ alignItems: 'center' }}>
        <View ref={cardRef} collapsable={false} style={{ borderWidth: 1, borderColor: th.line }}>
          <TripCard data={card} width={cardWidth} />
        </View>
      </View>
      {mode === 'summary' && !summary.sends ? <Text style={{ color: th.muted, marginTop: 10 }}>{t('trip.nothingYet')}</Text> : null}

      <Label>{t('share.message')}</Label>
      <Field value={message ?? ''} onChangeText={setMessage} maxLength={140} multiline placeholder={mode === 'invite' ? t('trip.messagePlaceholder') : t('trip.bragPlaceholder')}
        accessibilityLabel={t('share.message')} textAlignVertical="top" style={{ minHeight: 60 }} />

      {placeOf ? (
        <>
          <SwitchRow label={t('share.withPlace')} value={withPlace} onChange={setWithPlace} />
          <Text style={{ color: th.muted, fontSize: 13 }}>{placeOf.approx ? t('share.approxHint') : t('trip.placeHint', { crag: pinned!.name })}</Text>
        </>
      ) : (
        <Text style={{ color: th.muted, marginTop: 10 }}>{t('share.noPlace')}</Text>
      )}

      <View style={{ marginTop: 12 }}>
        <Button label={t('share.sendImage')} onPress={sendImage} disabled={busy} />
        <Button label={t('share.sendText')} variant="plain" onPress={sendText} disabled={busy} />
      </View>
    </ScrollView>
  );
}
