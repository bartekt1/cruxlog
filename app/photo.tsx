import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Image, Pressable, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { listPhotos, listTopoLines, removePhotos, type PhotoOwner, type PhotoRow, type TopoLineRow } from '../src/db/repo';
import { numberLines } from '../src/domain/topo';
import { IconButton } from '../src/ui/icons';
import { photoUri } from '../src/ui/photos';
import { Text } from '../src/ui/Text';
import { useTheme } from '../src/ui/theme';
import { fitRect, TopoLines } from '../src/ui/TopoLines';

/**
 * /photo?ownerType=<ascent|crag|sector>&ownerId=<id>&index=<n> (or &photoId=<photo> to start at that photo): the photos of an
 * ascent, crag or wall full screen, swiping sideways; the bin deletes the one shown. Photos of a crag or wall show their topo
 * lines (tap a route number to open the route) and can be drawn on.
 */
export default function PhotoViewer() {
  const { ownerType, ownerId, index, photoId } = useLocalSearchParams<{ ownerType?: PhotoOwner; ownerId: string; index?: string; photoId?: string }>();
  const owner: PhotoOwner = ownerType ?? 'ascent';
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const { width } = useWindowDimensions();
  const [area, setArea] = useState(0); // the height left for the photo under the header (measured)
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [start, setStart] = useState(Math.max(0, Number(index) || 0));
  const [current, setCurrent] = useState(start);
  const list = useRef<FlatList<PhotoRow>>(null);

  useEffect(() => {
    listPhotos(db, owner, ownerId).then((rows) => {
      const at = photoId ? rows.findIndex((p) => p.id === photoId) : -1;
      if (at >= 0) { setStart(at); setCurrent(at); }
      setPhotos(rows);
    });
  }, [db, owner, ownerId, photoId]);
  // Topo lines per photo, read again when coming back from the editor.
  const drawable = owner !== 'ascent';
  const [lines, setLines] = useState<Record<string, TopoLineRow[]>>({});
  useFocusEffect(useCallback(() => {
    if (!drawable || !photos.length) return;
    Promise.all(photos.map(async (p) => [p.id, await listTopoLines(db, p.id)] as const)).then((all) => setLines(Object.fromEntries(all)));
  }, [db, drawable, photos]));
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));

  const askDelete = () => {
    const photo = photos[Math.min(current, photos.length - 1)];
    if (!photo) return;
    Alert.alert(t('photos.deleteTitle'), t('photos.deleteQuestion'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        await removePhotos(db, [photo.id]);
        const rest = photos.filter((p) => p.id !== photo.id);
        if (!rest.length) { router.back(); return; }
        setPhotos(rest);
        setCurrent(Math.min(current, rest.length - 1));
      } },
    ]);
  };

  // The list is shown once the photos are there, so it opens at the right one.
  if (!photos.length) return <View style={{ flex: 1, backgroundColor: th.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }} onLayout={(e) => setArea(e.nativeEvent.layout.height)}>
      <Stack.Screen options={{
        title: photos.length ? t('photos.viewerTitle', { n: current + 1, total: photos.length }) : '',
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            {drawable && photos[current] ? (
              <IconButton name="brush-outline" size={24} label={t('topo.draw')} onPress={() => router.push({ pathname: '/topo', params: { photoId: photos[current].id } })} />
            ) : null}
            <IconButton name="trash-outline" size={24} label={t('photos.delete')} onPress={askDelete} />
          </View>
        ),
      }} />
      <FlatList
        ref={list} data={photos} keyExtractor={(p) => p.id} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        initialScrollIndex={photos.length > start ? start : undefined} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={onEnd} extraData={lines}
        renderItem={({ item }) => {
          const uri = photoUri(item.id);
          const own = lines[item.id] ?? [];
          const rect = fitRect(item.width, item.height, width, area);
          const numbers = numberLines(own.map((l) => ({ routeId: l.route_id, points: l.points })));
          return (
            <View style={{ width, height: area, alignItems: 'center', justifyContent: 'center' }}>
              {uri ? <Image source={{ uri }} style={{ width, height: area }} resizeMode="contain" />
                : <Text style={{ color: th.ink }}>{t('photos.missing')}</Text>}
              {uri && own.length ? (
                <View pointerEvents="box-none" style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
                  <TopoLines lines={own.map((l) => ({ routeId: l.route_id, mode: l.mode, points: l.points, number: numbers.get(l.route_id) }))} width={rect.width} height={rect.height} />
                  {/* The number disc at each start opens the route. */}
                  {own.filter((l) => l.points.length).map((l) => (
                    <Pressable key={l.route_id} onPress={() => router.push(`/route/${l.route_id}`)} accessibilityRole="link"
                      accessibilityLabel={t('topo.openRoute', { n: numbers.get(l.route_id), name: l.route_name })}
                      style={{ position: 'absolute', left: l.points[0].x * rect.width - 22, top: l.points[0].y * rect.height - 22, width: 44, height: 44 }} />
                  ))}
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}
