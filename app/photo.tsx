import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { listPhotos, type PhotoRow } from '../src/db/repo';
import { photoUri } from '../src/ui/photos';
import { Text } from '../src/ui/Text';
import { useTheme } from '../src/ui/theme';

/** /photo?ownerId=<ascent>&index=<n>: the photos of an ascent full screen, swiping sideways. */
export default function PhotoViewer() {
  const { ownerId, index } = useLocalSearchParams<{ ownerId: string; index?: string }>();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const { width, height } = useWindowDimensions();
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const start = Math.max(0, Number(index) || 0);
  const [current, setCurrent] = useState(start);
  const list = useRef<FlatList<PhotoRow>>(null);

  useEffect(() => { listPhotos(db, 'ascent', ownerId).then(setPhotos); }, [db, ownerId]);
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <Stack.Screen options={{ title: photos.length ? t('photos.viewerTitle', { n: current + 1, total: photos.length }) : '' }} />
      <FlatList
        ref={list} data={photos} keyExtractor={(p) => p.id} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        initialScrollIndex={photos.length > start ? start : undefined} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={onEnd}
        renderItem={({ item }) => {
          const uri = photoUri(item.id);
          return (
            <View style={{ width, height: height - 120, alignItems: 'center', justifyContent: 'center' }}>
              {uri ? <Image source={{ uri }} style={{ width, height: height - 120 }} resizeMode="contain" />
                : <Text style={{ color: th.ink }}>{t('photos.missing')}</Text>}
            </View>
          );
        }}
      />
    </View>
  );
}
