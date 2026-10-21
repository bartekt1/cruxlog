import { Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Share, Switch, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Text } from '../src/ui/Text';
import { getAscent, getCrag, getRoute, listAreas, listCragRoutes, listPhotos, type CragDetail, type RouteRow } from '../src/db/repo';
import { pathLabel } from '../src/domain/areas';
import { formatDay, isoDate } from '../src/domain/dates';
import { isLatLng } from '../src/domain/geo';
import { routeGrade } from '../src/domain/grades';
import { coordsLabel, shareMessage, type SharePlace } from '../src/domain/share';
import { sameName } from '../src/domain/text';
import { Button, Chip, ChipRow, EmptyState, Field, Label } from '../src/ui/kit';
import { photoUri } from '../src/ui/photos';
import { CARD_RATIO, ShareCard, type ShareCardData } from '../src/ui/ShareCard';
import { useSettings } from '../src/ui/settingsStore';
import { useTheme } from '../src/ui/theme';

type Kind = 'ascent' | 'route' | 'crag';
/** What the card and the text say, before the user's message and the position switch are applied. */
type Content = {
  tag: string; title: string; grade: string | null; style: string | null; rating: number | null;
  line: string; path: string; facts: string[]; date: string | null; headline: string; place: SharePlace | null;
};

const OUT_WIDTH = 1080;

/** /share?kind=ascent|route|crag&id=…: a picture and a text to send a friend, with the crag's position if wanted. */
export default function ShareScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: Kind; id: string }>();
  const db = useSQLiteContext();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const { width: screenWidth } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [content, setContent] = useState<Content | null | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [withPlace, setWithPlace] = useState(true);
  const [busy, setBusy] = useState(false);
  // A photo on the card (ascents with photos only): off unless chosen, because photos often show other people.
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [withPhoto, setWithPhoto] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loadedPhoto, setLoadedPhoto] = useState<string | null>(null);

  // Which photos can go on the card: those of the ascent; of the crag; for a route the photos of its wall, then of its crag.
  useEffect(() => {
    let live = true;
    (async () => {
      let rows: { id: string }[] = [];
      if (kind === 'ascent') rows = await listPhotos(db, 'ascent', id);
      else if (kind === 'crag') rows = await listPhotos(db, 'crag', id);
      else if (kind === 'route') {
        const r = await getRoute(db, id);
        if (r) rows = [...(await listPhotos(db, 'sector', r.sector_id)), ...(await listPhotos(db, 'crag', r.crag_id))];
      }
      if (live) setPhotoIds(rows.map((p) => p.id));
    })();
    return () => { live = false; };
  }, [db, kind, id]);

  useEffect(() => {
    let live = true;
    (async () => {
      const areas = await listAreas(db);
      const placeOf = (c: CragDetail | null): SharePlace | null =>
        c && isLatLng(c.lat, c.lng) ? { lat: c.lat!, lng: c.lng!, approx: c.pos_source === 'approx' } : null;
      const pathOf = (c: CragDetail) => (c.region_id ? pathLabel(areas, c.region_id) : c.region ?? '');
      // A crag's only sector is often named like the crag; then the name is said once.
      const sectorLine = (r: RouteRow) => (sameName(r.crag_name, r.sector_name) ? r.crag_name : [r.crag_name, r.sector_name].filter(Boolean).join(' › '));
      const routeFacts = (r: RouteRow) => [
        t(`types.${r.type}`), r.length_m != null ? t('route.length', { m: r.length_m }) : '', r.bolts != null ? t('route.bolts', { count: r.bolts }) : '',
      ].filter(Boolean);
      let out: Content | null = null;
      if (kind === 'ascent') {
        const a = await getAscent(db, id);
        const crag = a ? await getCrag(db, a.route.crag_id) : null;
        if (a && crag) {
          const grade = routeGrade(a.route, routeSystem);
          const style = t(`styles.${a.style}`);
          const date = formatDay(a.date, i18n.language, isoDate(new Date()));
          out = {
            tag: t('share.tagAscent'), title: a.route.name, grade, style, rating: a.rating || null,
            line: sectorLine(a.route), path: pathOf(crag), facts: [t(`types.${a.route.type}`)], date,
            headline: `${a.route.name} ${grade} – ${style}`, place: placeOf(crag),
          };
        }
      } else if (kind === 'route') {
        const r = await getRoute(db, id);
        const crag = r ? await getCrag(db, r.crag_id) : null;
        if (r && crag) {
          const grade = routeGrade(r, routeSystem);
          out = {
            tag: t('share.tagRoute'), title: r.name, grade, style: null, rating: null,
            line: sectorLine(r), path: pathOf(crag), facts: routeFacts(r), date: null,
            headline: `${r.name} ${grade}`, place: placeOf(crag),
          };
        }
      } else if (kind === 'crag') {
        const crag = await getCrag(db, id);
        if (crag) {
          const routes = await listCragRoutes(db, id);
          out = {
            tag: t('share.tagCrag'), title: crag.name, grade: null, style: null, rating: null,
            line: t('crags.routes', { count: routes.length }), path: pathOf(crag), facts: [], date: null,
            headline: crag.name, place: placeOf(crag),
          };
        }
      }
      if (live) setContent(out);
    })();
    return () => { live = false; };
  }, [db, kind, id, routeSystem, i18n.language, t]);

  if (content === undefined) return <View style={{ flex: 1, backgroundColor: th.bg }} />;
  if (content === null) return <View style={{ flex: 1, backgroundColor: th.bg, padding: 16 }}><EmptyState title={t('share.notFound')} /></View>;

  const place = withPlace ? content.place : null;
  const cardWidth = Math.min(screenWidth - 32, 380);
  const card: ShareCardData = {
    tag: content.tag, title: content.title, grade: content.grade, style: content.style, rating: content.rating,
    line: content.line, path: content.path, facts: content.facts, date: content.date, message: message.trim(),
    place: place ? { coords: coordsLabel(place), approx: place.approx } : null, approxLabel: t('share.approxCard'),
    photoUri: withPhoto && photoIds.length ? photoUri(photoIds[Math.min(photoIndex, photoIds.length - 1)]) : null,
  };
  // The picture is captured only once the photo has loaded into the card.
  const photoPending = card.photoUri != null && loadedPhoto !== card.photoUri;

  const sendImage = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile', width: OUT_WIDTH, height: OUT_WIDTH * CARD_RATIO });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('share.title') });
    } catch {
      Alert.alert(t('share.title'), t('share.failed'));
    } finally {
      setBusy(false);
    }
  };
  const sendText = async () => {
    const text = shareMessage({
      headline: content.headline, details: [content.line, content.path, content.date ?? ''], message, place,
      mapLabel: t('share.mapLabel'), approxLabel: t('share.approxText'),
    });
    try { await Share.share({ message: text }); } catch { Alert.alert(t('share.title'), t('share.failed')); }
  };

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t('share.title') }} />
      <View style={{ alignItems: 'center' }}>
        <View ref={cardRef} collapsable={false} style={{ borderWidth: 1, borderColor: th.line }}>
          <ShareCard data={card} width={cardWidth} onPhotoLoaded={setLoadedPhoto} />
        </View>
      </View>

      {photoIds.length ? (
        <>
          <Pressable onPress={() => setWithPhoto(!withPhoto)} accessibilityRole="switch" accessibilityState={{ checked: withPhoto }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, minHeight: 44 }}>
            <Switch value={withPhoto} onValueChange={setWithPhoto} trackColor={{ false: th.line, true: th.accent }} thumbColor={th.surface} importantForAccessibility="no" />
            <Text style={{ color: th.ink, flex: 1 }}>{t('photos.useOnCard')}</Text>
          </Pressable>
          <Text style={{ color: th.muted, fontSize: 13 }}>{t('photos.cardHint')}</Text>
          {withPhoto && photoIds.length > 1 ? (
            <ChipRow>{photoIds.map((pid, i) => <Chip key={pid} label={String(i + 1)} on={photoIndex === i} onPress={() => setPhotoIndex(i)} />)}</ChipRow>
          ) : null}
        </>
      ) : null}

      <Label>{t('share.message')}</Label>
      <Field value={message} onChangeText={setMessage} maxLength={90} placeholder={t('share.messagePlaceholder')} accessibilityLabel={t('share.message')} />

      {content.place ? (
        <>
          <Pressable onPress={() => setWithPlace(!withPlace)} accessibilityRole="switch" accessibilityState={{ checked: withPlace }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, minHeight: 44 }}>
            <Switch value={withPlace} onValueChange={setWithPlace} trackColor={{ false: th.line, true: th.accent }} thumbColor={th.surface} importantForAccessibility="no" />
            <Text style={{ color: th.ink, flex: 1 }}>{t('share.withPlace')}</Text>
          </Pressable>
          <Text style={{ color: th.muted, fontSize: 13 }}>{content.place.approx ? t('share.approxHint') : t('share.placeHint')}</Text>
        </>
      ) : (
        <Text style={{ color: th.muted, marginTop: 10 }}>{t('share.noPlace')}</Text>
      )}

      <View style={{ marginTop: 12 }}>
        <Button label={t('share.sendImage')} onPress={sendImage} disabled={busy || photoPending} />
        <Button label={t('share.sendText')} variant="plain" onPress={sendText} disabled={busy} />
      </View>
    </ScrollView>
  );
}
