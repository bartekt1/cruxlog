import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Image, PanResponder, Pressable, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import {
  deleteTopoLine, getPhoto, listTopoLines, saveTopoLine, topoRoutes, type PhotoRow, type RouteRow, type TopoLineRow,
} from '../src/db/repo';
import { routeGrade } from '../src/domain/grades';
import {
  clampZoom, commit, FIT, hitPoint, numberLines, redo, startHistory, toPhoto, undo, zoomAt, type History, type Pt, type Zoom,
} from '../src/domain/topo';
import { F } from '../src/ui/fonts';
import { IconButton, type IconName } from '../src/ui/icons';
import { EmptyState, GradeBadge, LinkButton } from '../src/ui/kit';
import { photoUri } from '../src/ui/photos';
import { useSettings } from '../src/ui/settingsStore';
import { Text } from '../src/ui/Text';
import { useTheme } from '../src/ui/theme';
import { fitRect, TopoLines } from '../src/ui/TopoLines';

const HIT_RADIUS = 24; // px: how near a finger must be to grab a point
const TAP_SLOP = 8; // px: a touch that moves less than this is a tap
const BUTTON_ZOOM = 1.6;

type Gesture =
  | { kind: 'pinch'; dist: number; mid: { x: number; y: number }; zoom: Zoom }
  | { kind: 'drag'; index: number; moved: boolean }
  | { kind: 'pan'; start: { x: number; y: number }; zoom: Zoom; moved: boolean; at: number };

/**
 * /topo?photoId=<photo>[&routeId=<route>]: draw a route on a wall photo. Tap the start, then the bolts from the bottom up,
 * then the anchor; the line is a smooth curve through them. Two fingers zoom and move the photo (so do the buttons and one
 * finger on an empty spot); a point is moved by dragging it. Every step can be undone.
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
    setHistory(startHistory(lines.find((l) => l.route_id === routeId)?.points ?? []));
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

  // The touch handler is made once, so it reads the latest values through a ref.
  const live = useRef({ zoom, box, canvas, points, history });
  live.current = { zoom, box, canvas, points, history };
  const gesture = useRef<Gesture | null>(null);

  const rel = (x: number, y: number) => ({ x: x - live.current.canvas.w / 2, y: y - live.current.canvas.h / 2 });
  const touchesOf = (e: GestureResponderEvent) => e.nativeEvent.touches.map((tch) => rel(tch.locationX, tch.locationY));
  const step = (next: Pt[], sel: number) => { setHistory((h) => commit(h, next)); setSelected(sel); setDirty(true); };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const touches = touchesOf(e);
      const { zoom: z, box: b, points: pts } = live.current;
      if (touches.length >= 2) { gesture.current = pinchStart(touches, z); return; }
      const at = toPhoto(touches[0], z, b.width, b.height);
      const hit = at ? hitPoint(pts, at, b.width * z.scale, b.height * z.scale, HIT_RADIUS) : -1;
      gesture.current = hit >= 0
        ? { kind: 'drag', index: hit, moved: false }
        : { kind: 'pan', start: touches[0], zoom: z, moved: false, at: Date.now() };
    },
    onPanResponderMove: (e) => {
      const touches = touchesOf(e);
      const g = gesture.current;
      const { zoom: z, box: b, points: pts } = live.current;
      if (!g) return;
      if (touches.length >= 2) {
        // A second finger turns any gesture into a pinch; a point being dragged stays where it was.
        if (g.kind !== 'pinch') {
          if (g.kind === 'drag') setDraft(null);
          gesture.current = pinchStart(touches, z);
          return;
        }
        const mid = midpoint(touches);
        const zoomed = zoomAt(g.zoom, distance(touches) / g.dist, g.mid, b.width, b.height);
        setZoom(clampZoom({ ...zoomed, tx: zoomed.tx + mid.x - g.mid.x, ty: zoomed.ty + mid.y - g.mid.y }, b.width, b.height));
        return;
      }
      if (g.kind === 'drag') {
        const at = toPhoto(touches[0], z, b.width, b.height);
        if (!at) return;
        g.moved = true;
        setDraft(pts.map((p, i) => (i === g.index ? at : p)));
      } else if (g.kind === 'pan') {
        const dx = touches[0].x - g.start.x;
        const dy = touches[0].y - g.start.y;
        if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
        g.moved = true;
        setZoom(clampZoom({ ...g.zoom, tx: g.zoom.tx + dx, ty: g.zoom.ty + dy }, b.width, b.height));
      }
    },
    onPanResponderRelease: () => {
      const g = gesture.current;
      gesture.current = null;
      if (!g) return;
      const { zoom: z, box: b, points: pts, history: h } = live.current;
      if (g.kind === 'drag') {
        if (g.moved) step(pts, g.index); else setSelected(g.index); // a tap on a point only selects it
        setDraft(null);
      } else if (g.kind === 'pan' && !g.moved && Date.now() - g.at < 600) {
        const at = toPhoto(g.start, z, b.width, b.height);
        if (at) step([...h.present, at], h.present.length);
      }
    },
    onPanResponderTerminate: () => { gesture.current = null; setDraft(null); },
  }), []); // it reads everything through refs, so it never needs to be made again

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
          contentContainerStyle={{ padding: 16, gap: 8 }}
          ListEmptyComponent={<EmptyState title={t('topo.noRoutes')} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => setRouteId(item.id)} accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: th.line, backgroundColor: th.surface, opacity: pressed ? 0.6 : 1 })}>
              <GradeBadge text={routeGrade(item, routeSystem)} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 16 }}>{item.name}</Text>
                {drawn.has(item.id) ? <Text style={{ color: th.accent, fontSize: 13 }}>{t('topo.hasLine')}</Text> : null}
              </View>
            </Pressable>
          )}
        />
      </View>
    );
  }

  const numbers = numberLines([...lines.filter((l) => l.route_id !== route.id).map((l) => ({ routeId: l.route_id, points: l.points })), { routeId: route.id, points }]);
  const shown = [
    ...lines.filter((l) => l.route_id !== route.id).map((l) => ({ routeId: l.route_id, mode: l.mode, points: l.points, number: numbers.get(l.route_id), dim: true })),
    { routeId: route.id, mode: 'bolts' as const, points, number: numbers.get(route.id) },
  ];
  const scaledW = box.width * zoom.scale;
  const scaledH = box.height * zoom.scale;

  const zoomBy = (f: number) => setZoom((z) => zoomAt(z, f, { x: 0, y: 0 }, box.width, box.height));
  const save = async () => {
    if (points.length < 2) { Alert.alert(t('topo.title'), t('topo.needTwo')); return; }
    await saveTopoLine(db, { photoId: photo.id, routeId: route.id, mode: 'bolts', points });
    leaving.current = true;
    router.back();
  };
  const removeLine = () => {
    if (!existing) return;
    Alert.alert(t('topo.deleteLineTitle'), t('topo.deleteLineQuestion', { name: route.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { await deleteTopoLine(db, existing.id); leaving.current = true; router.back(); } },
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
          <TopoLines lines={shown} width={scaledW} height={scaledH} selected={selected >= 0 ? { routeId: route.id, index: selected } : null} />
        </View>
        {/* On top of everything: catches the fingers. */}
        <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} {...responder.panHandlers}
          accessible accessibilityLabel={t('topo.canvasA11y')} />
      </View>

      <Text style={{ color: th.muted, fontSize: 12, paddingHorizontal: 16, paddingTop: 6 }}>
        {points.length ? t('topo.points', { count: points.length }) : t('topo.hint')}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 }}>
        {tool('remove-circle-outline', t('topo.zoomOut'), () => zoomBy(1 / BUTTON_ZOOM), zoom.scale <= 1)}
        {tool('scan-outline', t('topo.fit'), () => setZoom(FIT), zoom.scale <= 1)}
        {tool('add-circle-outline', t('topo.zoomIn'), () => zoomBy(BUTTON_ZOOM))}
        {tool('arrow-undo-outline', t('topo.undo'), () => { setHistory(undo); setSelected(-1); setDirty(true); }, !history.past.length)}
        {tool('arrow-redo-outline', t('topo.redo'), () => { setHistory(redo); setSelected(-1); setDirty(true); }, !history.future.length)}
        {tool('close-circle-outline', t('topo.deletePoint'), () => { step(points.filter((_, i) => i !== selected), -1); }, selected < 0)}
        {tool('refresh-outline', t('topo.clear'), () => step([], -1), !points.length)}
      </View>
      <Pressable onPress={save} accessibilityRole="button"
        style={({ pressed }) => ({ margin: 16, marginTop: 8, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: th.cta, opacity: pressed ? 0.85 : 1 })}>
        <Text style={{ color: th.onCta, fontFamily: F.display, fontSize: 20, letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('topo.save')}</Text>
      </Pressable>
    </View>
  );
}

function distance(t: { x: number; y: number }[]): number {
  return Math.max(1, Math.hypot(t[1].x - t[0].x, t[1].y - t[0].y));
}

function midpoint(t: { x: number; y: number }[]): { x: number; y: number } {
  return { x: (t[0].x + t[1].x) / 2, y: (t[0].y + t[1].y) / 2 };
}

function pinchStart(touches: { x: number; y: number }[], zoom: Zoom): Gesture {
  return { kind: 'pinch', dist: distance(touches), mid: midpoint(touches), zoom };
}
