import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Image, View, type LayoutChangeEvent } from 'react-native';
import {
  deleteTopoLine, getPhoto, listTopoLines, saveTopoLine, topoRoutes, type PhotoRow, type RouteRow, type TopoLineRow,
} from '../src/db/repo';
import { routeGrade } from '../src/domain/grades';
import {
  commit, FIT, insertAfter, loupeLeft, numberLines, redo, startHistory, undo, zoomAt, type History, type Pt, type TopoMode, type Zoom,
} from '../src/domain/topo';
import { F } from '../src/ui/fonts';
import { IconButton, type IconName } from '../src/ui/icons';
import { Chip, ChipRow, EmptyState, GradeBadge, LinkButton } from '../src/ui/kit';
import { photoUri } from '../src/ui/photos';
import { useSettings } from '../src/ui/settingsStore';
import { Text } from '../src/ui/Text';
import { useTheme } from '../src/ui/theme';
import { fitRect, TopoLines, type DrawnLine } from '../src/ui/TopoLines';
import { runOrAlert } from '../src/ui/errors';
import { CtaButton, RouteCard } from '../src/ui/rows';
import { useTopoGestures } from '../src/ui/useTopoGestures';

const BUTTON_ZOOM = 1.6;

/**
 * /topo?photoId=<photo>[&routeId=<route>]: draw a route on a wall photo. "Bolts": tap the start, then the bolts from the
 * bottom up, then the anchor; the line is a smooth curve through them, a point is moved by dragging it. "By hand": draw
 * the line with a finger, in one go or in pieces (each piece continues the line). Two fingers zoom and move the photo
 * (so do the buttons, and in bolts mode one finger on an empty spot). Every step can be undone.
 */
export default function TopoEditor() {
  const { photoId, routeId: startRoute } = useLocalSearchParams<{ photoId: string; routeId?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();

  const [photo, setPhoto] = useState<PhotoRow | null>(null);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [lines, setLines] = useState<TopoLineRow[]>([]);
  const [routeId, setRouteId] = useState<string | null>(startRoute ?? null);
  const [history, setHistory] = useState<History>(startHistory([]));
  const [draft, setDraft] = useState<Pt[] | null>(null); // a point being dragged, before the step is recorded
  const [selected, setSelected] = useState(-1);
  const [zoom, setZoom] = useState<Zoom>(FIT);
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<TopoMode>('bolts');
  const [saving, setSaving] = useState(false);
  const [loupe, setLoupe] = useState<{ x: number; y: number; at: Pt } | null>(null);
  const leaving = useRef(false); // set once the line is saved or deleted, so the unsaved-changes question is skipped

  useEffect(() => {
    (async () => {
      const p = await getPhoto(db, photoId);
      if (!p) { router.back(); return; }
      setPhoto(p);
      setRoutes(await topoRoutes(db, p));
      setLines(await listTopoLines(db, photoId));
    })();
  }, [db, photoId, router]);

  // Picking a route loads its line, if it has one on this photo.
  useEffect(() => {
    if (!routeId) return;
    const line = lines.find((l) => l.route_id === routeId);
    setHistory(startHistory(line?.points ?? []));
    setMode(line?.mode ?? 'bolts');
    setSelected(-1);
    setDirty(false);
  }, [routeId, lines]);

  // Leaving with an unsaved line asks first.
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    if (!dirty || leaving.current) return;
    e.preventDefault();
    Alert.alert(t('topo.discardTitle'), t('topo.discardQuestion'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('topo.discard'), style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
    ]);
  }), [navigation, dirty, t]);

  const box = useMemo(() => (photo ? fitRect(photo.width, photo.height, canvas.w, canvas.h) : fitRect(0, 0, 0, 0)), [photo, canvas]);
  const points = draft ?? history.present;

  const step = (next: Pt[], sel: number) => { setHistory((h) => commit(h, next)); setSelected(sel); setDirty(true); };
  const responder = useTopoGestures({ zoom, box, canvas, points, history, mode }, { setZoom, setDraft, step, setSelected, setLoupe });

  if (!photo) return <View style={{ flex: 1, backgroundColor: th.bg }} />;
  const uri = photoUri(photo.id);
  const route = routes.find((r) => r.id === routeId) ?? null;
  const existing = lines.find((l) => l.route_id === routeId) ?? null;

  // First the route to draw.
  if (!route) {
    const drawn = new Set(lines.map((l) => l.route_id));
    return (
      <View style={{ flex: 1, backgroundColor: th.bg }}>
        <Stack.Screen options={{ title: t('topo.pickRoute') }} />
        <FlatList
          data={routes}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          ListEmptyComponent={<EmptyState title={t('topo.noRoutes')} />}
          renderItem={({ item }) => (
            <RouteCard grade={routeGrade(item, routeSystem)} name={item.name} note={drawn.has(item.id) ? t('topo.hasLine') : undefined} noteAccent
              onPress={() => setRouteId(item.id)} />
          )}
        />
      </View>
    );
  }

  const numbers = numberLines([...lines.filter((l) => l.route_id !== route.id).map((l) => ({ routeId: l.route_id, points: l.points })), { routeId: route.id, points }]);
  const shown = [
    ...lines.filter((l) => l.route_id !== route.id).map((l) => ({ routeId: l.route_id, mode: l.mode, points: l.points, number: numbers.get(l.route_id), dim: true })),
    { routeId: route.id, mode, points, number: numbers.get(route.id) },
  ];
  const scaledW = box.width * zoom.scale;
  const scaledH = box.height * zoom.scale;

  const zoomBy = (f: number) => setZoom((z) => zoomAt(z, f, { x: 0, y: 0 }, box.width, box.height));
  const save = async () => {
    if (saving) return; // a second tap while saving would save twice and go back two screens
    if (points.length < 2) { Alert.alert(t('topo.title'), t('topo.needTwo')); return; }
    setSaving(true);
    const ok = await runOrAlert(() => saveTopoLine(db, { photoId: photo.id, routeId: route.id, mode, points }));
    if (!ok) { setSaving(false); return; }
    leaving.current = true;
    router.back();
  };
  const removeLine = () => {
    if (!existing) return;
    Alert.alert(t('topo.deleteLineTitle'), t('topo.deleteLineQuestion', { name: route.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => runOrAlert(async () => { await deleteTopoLine(db, existing.id); leaving.current = true; router.back(); }) },
    ]);
  };

  const tool = (name: IconName, label: string, onPress: () => void, disabled = false) => (
    <View style={{ opacity: disabled ? 0.35 : 1 }}>
      <IconButton name={name} size={26} label={label} onPress={disabled ? () => {} : onPress} color={th.ink} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <Stack.Screen options={{
        title: t('topo.title'),
        headerRight: existing ? () => <IconButton name="trash-outline" size={24} label={t('topo.deleteLine')} onPress={removeLine} /> : undefined,
      }} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <GradeBadge text={routeGrade(route, routeSystem)} size="sm" />
        <Text style={{ flex: 1, color: th.ink, fontFamily: F.semi, fontSize: 16 }} numberOfLines={1}>{route.name}</Text>
        <LinkButton label={t('topo.changeRoute')} onPress={() => {
          if (!dirty) { setRouteId(null); return; }
          Alert.alert(t('topo.discardTitle'), t('topo.discardQuestion'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('topo.discard'), style: 'destructive', onPress: () => { setDirty(false); setRouteId(null); } },
          ]);
        }} />
      </View>

      <View style={{ flex: 1, overflow: 'hidden', backgroundColor: th.soft }} onLayout={(e: LayoutChangeEvent) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <View style={{ position: 'absolute', left: canvas.w / 2 - scaledW / 2 + zoom.tx, top: canvas.h / 2 - scaledH / 2 + zoom.ty, width: scaledW, height: scaledH }}>
          {uri ? <Image source={{ uri }} style={{ width: scaledW, height: scaledH }} resizeMode="stretch" /> : null}
        </View>
        {/* The lines are drawn on the visible canvas only, not on the whole enlarged photo (see TopoLines). */}
        <TopoLines lines={shown} width={scaledW} height={scaledH} selected={selected >= 0 ? { routeId: route.id, index: selected } : null}
          frame={{ width: canvas.w, height: canvas.h, left: canvas.w / 2 - scaledW / 2 + zoom.tx, top: canvas.h / 2 - scaledH / 2 + zoom.ty }} />
        {loupe ? <Loupe uri={uri} lines={shown} at={loupe.at} fingerX={loupe.x} canvasW={canvas.w} photoW={scaledW} photoH={scaledH} maxW={photo.width} /> : null}
        {/* On top of everything: catches the fingers. */}
        <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} {...responder.panHandlers}
          accessible accessibilityLabel={t('topo.canvasA11y')} />
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <ChipRow>
          <Chip label={t('topo.modeBolts')} on={mode === 'bolts'} onPress={() => { if (mode !== 'bolts') { setMode('bolts'); setDirty(true); } }} />
          <Chip label={t('topo.modeFree')} on={mode === 'free'} onPress={() => { if (mode !== 'free') { setMode('free'); setSelected(-1); setDirty(true); } }} />
        </ChipRow>
      </View>
      <Text style={{ color: th.muted, fontSize: 12, paddingHorizontal: 16 }}>
        {mode === 'free' ? t('topo.hintFree') : points.length ? t('topo.points', { count: points.length }) : t('topo.hint')}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 }}>
        {tool('remove-circle-outline', t('topo.zoomOut'), () => zoomBy(1 / BUTTON_ZOOM), zoom.scale <= 1)}
        {tool('scan-outline', t('topo.fit'), () => setZoom(FIT), zoom.scale <= 1)}
        {tool('add-circle-outline', t('topo.zoomIn'), () => zoomBy(BUTTON_ZOOM))}
        {tool('arrow-undo-outline', t('topo.undo'), () => { setHistory(undo); setSelected(-1); setDirty(true); }, !history.past.length)}
        {tool('arrow-redo-outline', t('topo.redo'), () => { setHistory(redo); setSelected(-1); setDirty(true); }, !history.future.length)}
        {tool('git-commit-outline', t('topo.insertPoint'), () => step(insertAfter(points, selected), selected + 1), selected < 0 || selected >= points.length - 1 || mode === 'free')}
        {tool('close-circle-outline', t('topo.deletePoint'), () => { step(points.filter((_, i) => i !== selected), -1); }, selected < 0 || mode === 'free')}
        {tool('refresh-outline', t('topo.clear'), () => step([], -1), !points.length)}
      </View>
      <CtaButton label={t('topo.save')} onPress={save} disabled={saving} style={{ margin: 16, marginTop: 8 }} />
    </View>
  );
}


const LOUPE = 128; // px, the magnifier's diameter
const LOUPE_ZOOM = 3;

/**
 * The magnifier: a round window in the top corner away from the finger, showing the photo and the lines under the finger
 * enlarged, with a cross on the exact point. Not enlarged beyond twice the photo's own pixels, where it would only blur.
 */
function Loupe({ uri, lines, at, fingerX, canvasW, photoW, photoH, maxW }: {
  uri: string | null; lines: DrawnLine[]; at: Pt; fingerX: number; canvasW: number; photoW: number; photoH: number; maxW: number;
}) {
  const th = useTheme();
  const k = Math.max(1, Math.min(LOUPE_ZOOM, (maxW * 2) / photoW));
  const w = photoW * k;
  const h = photoH * k;
  const left = LOUPE / 2 - at.x * w;
  const top = LOUPE / 2 - at.y * h;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 8, left: loupeLeft(fingerX, canvasW, LOUPE), width: LOUPE, height: LOUPE, borderRadius: LOUPE / 2, overflow: 'hidden', borderWidth: 3, borderColor: th.topoHalo, backgroundColor: th.soft, elevation: 6 }}>
      {uri ? <Image source={{ uri }} style={{ position: 'absolute', left, top, width: w, height: h }} resizeMode="stretch" /> : null}
      <TopoLines lines={lines} width={w} height={h} frame={{ width: LOUPE, height: LOUPE, left, top }} />
      <View style={{ position: 'absolute', left: LOUPE / 2 - 0.75, top: LOUPE / 2 - 14, width: 1.5, height: 28, backgroundColor: th.topo }} />
      <View style={{ position: 'absolute', top: LOUPE / 2 - 0.75, left: LOUPE / 2 - 14, height: 1.5, width: 28, backgroundColor: th.topo }} />
    </View>
  );
}
