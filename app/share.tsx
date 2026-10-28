import { Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Text } from '../src/ui/Text';
import { getAscent, getCrag, getRoute, listAreas, listCragRoutes, listPhotos, listTopoLines, drawnPhotoIds, type PhotoRow, type TopoLineRow, type CragDetail, type RouteRow } from '../src/db/repo';
import { pathLabel } from '../src/domain/areas';
import { formatDay, isoDate } from '../src/domain/dates';
import { isLatLng } from '../src/domain/geo';
import { otherGrades, routeGrade } from '../src/domain/grades';
import { CARD_STYLES } from '../src/domain/settings';
import { coordsLabel, shareMessage, type SharePlace } from '../src/domain/share';
import { numberLines } from '../src/domain/topo';
import { sectorLine } from '../src/domain/text';
import { Button, Chip, ChipRow, EmptyState, Field, Label } from '../src/ui/kit';
import { photoUri } from '../src/ui/photos';
import { CARD_RATIO, ShareCard, type ShareCardData } from '../src/ui/ShareCard';
import { useSettings } from '../src/ui/settingsStore';
import { useTheme } from '../src/ui/theme';
import { SwitchRow } from '../src/ui/rows';

type Kind = 'ascent' | 'route' | 'crag';
/** What the card and the text say, before the user's message and the position switch are applied. */
type Content = {
  tag: string; title: string; grade: string | null; style: string | null; rating: number | null;
  line: string; path: string; facts: string[]; date: string | null; headline: string; place: SharePlace | null;
  otherGrades: string; cragName: string; bolts: number | null;
};

const OUT_WIDTH = 1080;

/** /share?kind=ascent|route|crag&id=…: a picture and a text to send a friend, with the crag's position if wanted. */
export default function ShareScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: Kind; id: string }>();
  const db = useSQLiteContext();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem, cardStyle, setCardStyle, photoFit, setPhotoFit } = useSettings();
  const { width: screenWidth } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [content, setContent] = useState<Content | null | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [withPlace, setWithPlace] = useState(true);
  const [busy, setBusy] = useState(false);
  // A photo on the card (ascents with photos only): off unless chosen, because photos often show other people.
  const [photoRows, setPhotoRows] = useState<PhotoRow[]>([]);
  const photoIds = photoRows.map((p) => p.id);
  // Topo lines of the chosen photo (wall or crag photos), drawn on the card unless switched off.
  const [photoLines, setPhotoLines] = useState<TopoLineRow[]>([]);
  const [withTopo, setWithTopo] = useState(true);
  const [withPhoto, setWithPhoto] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loadedPhoto, setLoadedPhoto] = useState<string | null>(null);

  // Which photos can go on the card: those of the ascent, then the wall or crag photos its route is drawn on; of the crag;
  // for a route the photos of its wall, then of its crag. `lineRoute` is the route whose topo line is drawn on the card.
  const [lineRoute, setLineRoute] = useState<string | null>(kind === 'route' ? id : null);
  useEffect(() => {
    let live = true;
    (async () => {
      let rows: PhotoRow[] = [];
      if (kind === 'ascent') {
        const a = await getAscent(db, id);
        const own = await listPhotos(db, 'ascent', id);
        let drawnRows: PhotoRow[] = [];
        if (a) {
          const drawn = new Set(await drawnPhotoIds(db, a.route_id));
          const walls = [...(await listPhotos(db, 'sector', a.route.sector_id)), ...(await listPhotos(db, 'crag', a.route.crag_id))];
          drawnRows = walls.filter((p) => drawn.has(p.id));
          if (live) setLineRoute(a.route_id);
        }
        // The topo look shows a photo with the line first; the others the climber's own photos first.
        rows = cardStyle === 'topo' ? [...drawnRows, ...own] : [...own, ...drawnRows];
      } else if (kind === 'crag') rows = await listPhotos(db, 'crag', id);
      else if (kind === 'route') {
        const r = await getRoute(db, id);
        if (r) {
          // Photos the route is drawn on come first, so the default photo shows its line.
          const drawn = new Set(await drawnPhotoIds(db, id));
          const all = [...(await listPhotos(db, 'sector', r.sector_id)), ...(await listPhotos(db, 'crag', r.crag_id))];
          rows = [...all.filter((p) => drawn.has(p.id)), ...all.filter((p) => !drawn.has(p.id))];
        }
      }
      if (live) { setPhotoRows(rows); setPhotoIndex(0); }
    })();
    return () => { live = false; };
  }, [db, kind, id, cardStyle]);

  const chosenPhoto = withPhoto && photoRows.length ? photoRows[Math.min(photoIndex, photoRows.length - 1)] : null;
  useEffect(() => {
    if (!chosenPhoto || chosenPhoto.owner_type === 'ascent') { setPhotoLines([]); return; }
    let live = true;
    listTopoLines(db, chosenPhoto.id).then((all) => { if (live) setPhotoLines(lineRoute ? all.filter((l) => l.route_id === lineRoute) : all); });
    return () => { live = false; };
  }, [db, chosenPhoto?.id, chosenPhoto?.owner_type, lineRoute]);

  useEffect(() => {
    let live = true;
    (async () => {
      const areas = await listAreas(db);
      const placeOf = (c: CragDetail | null): SharePlace | null =>
        c && isLatLng(c.lat, c.lng) ? { lat: c.lat!, lng: c.lng!, approx: c.pos_source === 'approx' } : null;
      const pathOf = (c: CragDetail) => (c.region_id ? pathLabel(areas, c.region_id) : c.region ?? '');
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
            line: sectorLine(a.route.crag_name, a.route.sector_name), path: pathOf(crag), facts: [t(`types.${a.route.type}`)], date,
            headline: `${a.route.name} ${grade} – ${style}`, place: placeOf(crag),
            otherGrades: otherGrades(a.route, routeSystem), cragName: crag.name, bolts: a.route.bolts,
          };
        }
      } else if (kind === 'route') {
        const r = await getRoute(db, id);
        const crag = r ? await getCrag(db, r.crag_id) : null;
        if (r && crag) {
          const grade = routeGrade(r, routeSystem);
          out = {
            tag: t('share.tagRoute'), title: r.name, grade, style: null, rating: null,
            line: sectorLine(r.crag_name, r.sector_name), path: pathOf(crag), facts: routeFacts(r), date: null,
            headline: `${r.name} ${grade}`, place: placeOf(crag),
            otherGrades: otherGrades(r, routeSystem), cragName: crag.name, bolts: r.bolts,
          };
        }
      } else if (kind === 'crag') {
        const crag = await getCrag(db, id);
        if (crag) {
          const routes = await listCragRoutes(db, id);
          out = {
            tag: t('share.tagCrag'), title: crag.name, grade: null, style: null, rating: null,
            line: t('crags.routes', { count: routes.length }), path: pathOf(crag), facts: [], date: null,
            headline: crag.name, place: placeOf(crag), otherGrades: '', cragName: crag.name, bolts: null,
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
    otherGrades: content.otherGrades, cragName: content.cragName, bolts: content.bolts,
    line: content.line, path: content.path, facts: content.facts, date: content.date, message: message.trim(),
    place: place ? { coords: coordsLabel(place), approx: place.approx } : null, approxLabel: t('share.approxCard'),
    photoUri: chosenPhoto ? photoUri(chosenPhoto.id) : null,
    photoSize: chosenPhoto ? { w: chosenPhoto.width, h: chosenPhoto.height } : null, photoFit,
    topo: chosenPhoto && withTopo && photoLines.length ? {
      photoW: chosenPhoto.width, photoH: chosenPhoto.height,
      lines: (() => {
        const numbers = numberLines(photoLines.map((l) => ({ routeId: l.route_id, points: l.points })));
        return photoLines.map((l) => ({ routeId: l.route_id, mode: l.mode, points: l.points, number: numbers.get(l.route_id) }));
      })(),
    } : null,
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
          <ShareCard look={cardStyle} data={card} width={cardWidth} onPhotoLoaded={setLoadedPhoto} />
        </View>
      </View>
      <Button label={t('share.sendImage')} onPress={sendImage} disabled={busy || photoPending} />

      <Label>{t('cards.look')}</Label>
      <ChipRow>{CARD_STYLES.map((s) => <Chip key={s} label={t(`cards.styles.${s}`)} on={cardStyle === s} onPress={() => setCardStyle(s)} />)}</ChipRow>

      {photoIds.length ? (
        <>
          <SwitchRow label={t('photos.useOnCard')} value={withPhoto} onChange={setWithPhoto} marginTop={14} />
          <Text style={{ color: th.muted, fontSize: 13 }}>{t('photos.cardHint')}</Text>
          {withPhoto && photoIds.length > 1 ? (
            <ChipRow>{photoIds.map((pid, i) => <Chip key={pid} label={String(i + 1)} on={photoIndex === i} onPress={() => setPhotoIndex(i)} />)}</ChipRow>
          ) : null}
          {withPhoto ? (
            <ChipRow>
              <Chip label={t('cards.fitWhole')} on={photoFit === 'whole'} onPress={() => setPhotoFit('whole')} />
              <Chip label={t('cards.fitFill')} on={photoFit === 'fill'} onPress={() => setPhotoFit('fill')} />
            </ChipRow>
          ) : null}
          {withPhoto && photoLines.length ? (
            <SwitchRow label={t('topo.onCard')} value={withTopo} onChange={setWithTopo} marginTop={6} />
          ) : null}
        </>
      ) : null}

      <Label>{t('share.message')}</Label>
      <Field value={message} onChangeText={setMessage} maxLength={90} placeholder={t('share.messagePlaceholder')} accessibilityLabel={t('share.message')} />

      {content.place ? (
        <>
          <SwitchRow label={t('share.withPlace')} value={withPlace} onChange={setWithPlace} />
          <Text style={{ color: th.muted, fontSize: 13 }}>{content.place.approx ? t('share.approxHint') : t('share.placeHint')}</Text>
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
