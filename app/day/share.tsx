import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { getCrag, listAreas, listAscentsBetween, type AreaRow, type AscentRow, type CragDetail } from '../../src/db/repo';
import { pathLabel } from '../../src/domain/areas';
import { formatDay } from '../../src/domain/dates';
import { isLatLng } from '../../src/domain/geo';
import { formatGrade, routeGrade } from '../../src/domain/grades';
import { coordsLabel, shareMessage, type SharePlace } from '../../src/domain/share';
import { tripSummary } from '../../src/domain/trips';
import { Button, Chip, ChipRow, EmptyState, Field, Label } from '../../src/ui/kit';
import { SwitchRow } from '../../src/ui/rows';
import { useSettings } from '../../src/ui/settingsStore';
import { shareCardImage } from '../../src/ui/shareImage';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';
import { TRIP_CARD_RATIO, TripCard, type TripCardData, type TripCardRow } from '../../src/ui/TripCard';

const ROWS = 8; // routes that fit on the card; the rest are counted

/** /day/share?date=YYYY-MM-DD: one day of the journal as a picture and a text, like a trip summary without a trip. */
export default function DayShare() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const db = useSQLiteContext();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem, cardStyle } = useSettings();
  const { width: screenWidth } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [ascents, setAscents] = useState<AscentRow[] | undefined>(undefined);
  const [crags, setCrags] = useState<CragDetail[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [night, setNight] = useState(cardStyle === 'night');
  const [withPlace, setWithPlace] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  // The card's shape: it grows with its list (TripCard measures it).
  const [ratio, setRatio] = useState(TRIP_CARD_RATIO);

  useEffect(() => {
    let live = true;
    (async () => {
      const a = await listAscentsBetween(db, date, date);
      const ids = [...new Set(a.map((x) => x.crag_id))];
      const c = (await Promise.all(ids.map((id) => getCrag(db, id)))).filter((x): x is CragDetail => x != null);
      const ar = await listAreas(db);
      if (live) { setAscents(a); setCrags(c); setAreas(ar); }
    })();
    return () => { live = false; };
  }, [db, date]);

  if (ascents === undefined) return <View style={{ flex: 1, backgroundColor: th.bg }} />;
  if (!ascents.length) return <View style={{ flex: 1, backgroundColor: th.bg, padding: 16 }}><EmptyState title={t('dayShare.empty')} /></View>;

  // The first crag with a position stands for the place.
  const pinned = crags.find((c) => isLatLng(c.lat, c.lng));
  const placeOf: SharePlace | null = pinned ? { lat: pinned.lat!, lng: pinned.lng!, approx: pinned.pos_source === 'approx' } : null;
  const place = withPlace ? placeOf : null;
  const day = formatDay(date, i18n.language, '');
  const title = crags.map((c) => c.name).join(', ');
  const path = crags[0]?.region_id ? pathLabel(areas, crags[0].region_id) : '';
  const summary = tripSummary(ascents, []);
  const styleOf = new Map(ascents.filter((a) => a.style !== 'attempt').map((a) => [a.route_id, a.style]));
  const all: TripCardRow[] = summary.sent.map((s) => {
    const row = ascents.find((x) => x.route_id === s.route_id)!;
    return { grade: routeGrade(row, routeSystem), name: s.route_name, detail: t(`styles.${styleOf.get(s.route_id) ?? s.style}`), done: true };
  });
  const rows = all.slice(0, ROWS);
  const rest = all.length - rows.length;
  const stats = [
    { value: String(summary.sends), label: t('trip.sends') },
    { value: String(summary.attempts), label: t('dayShare.attempts') },
    { value: summary.hardest ? formatGrade(summary.hardest.gradeIndex, routeSystem) : '–', label: t('trip.hardest') },
  ];
  const text = message.trim();
  const card: TripCardData = {
    tag: t('dayShare.tag'), title, dates: day, crags: '', path, stats, rows,
    more: rest > 0 ? t('trip.more', { count: rest }) : '', note: '', message: text,
    place: place ? { coords: coordsLabel(place), approx: place.approx } : null, approxLabel: t('share.approxCard'),
  };
  const cardWidth = Math.min(screenWidth - 32, 380);

  const sendImage = async () => { setBusy(true); await shareCardImage(cardRef, ratio); setBusy(false); };
  const sendText = async () => {
    const body = shareMessage({
      headline: `${card.tag}: ${title}`,
      details: [day, stats.map((s) => `${s.label}: ${s.value}`).join(' · '), ...all.map((r) => `• ${r.name} ${r.grade} (${r.detail})`)],
      message: text, place, mapLabel: t('share.mapLabel'), approxLabel: t('share.approxText'),
    });
    try { await Share.share({ message: body }); } catch { Alert.alert(t('share.title'), t('share.failed')); }
  };

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t('dayShare.title') }} />
      <View style={{ alignItems: 'center' }}>
        <View ref={cardRef} collapsable={false} style={{ borderWidth: 1, borderColor: th.line }}>
          <TripCard data={card} width={cardWidth} night={night} onRatio={setRatio} />
        </View>
      </View>
      <Button label={t('share.sendImage')} onPress={sendImage} disabled={busy} />
      {!summary.sends ? <Text style={{ color: th.muted, marginTop: 10 }}>{t('dayShare.noSends')}</Text> : null}
      <Label>{t('cards.look')}</Label>
      <ChipRow>
        <Chip label={t('cards.styles.guide')} on={!night} onPress={() => setNight(false)} />
        <Chip label={t('cards.styles.night')} on={night} onPress={() => setNight(true)} />
      </ChipRow>
      <Label>{t('share.message')}</Label>
      <Field value={message} onChangeText={setMessage} maxLength={140} multiline placeholder={t('trip.bragPlaceholder')}
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
        <Button label={t('share.sendText')} variant="plain" onPress={sendText} disabled={busy} />
      </View>
    </ScrollView>
  );
}
