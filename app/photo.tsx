import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Image, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { listPhotos, removePhotos, type PhotoOwner, type PhotoRow } from '../src/db/repo';
import { IconButton } from '../src/ui/icons';
import { photoUri } from '../src/ui/photos';
import { Text } from '../src/ui/Text';
import { useTheme } from '../src/ui/theme';

/** /photo?ownerType=<ascent|crag|sector>&ownerId=<id>&index=<n>: the photos of an ascent, crag or wall full screen, swiping sideways; the bin deletes the one shown. */
export default function PhotoViewer() {
  const { ownerType, ownerId, index } = useLocalSearchParams<{ ownerType?: PhotoOwner; ownerId: string; index?: string }>();
  const owner: PhotoOwner = ownerType ?? 'ascent';
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const { width, height } = useWindowDimensions();
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const start = Math.max(0, Number(index) || 0);
  const [current, setCurrent] = useState(start);
  const list = useRef<FlatList<PhotoRow>>(null);

  useEffect(() => { listPhotos(db, owner, ownerId).then(setPhotos); }, [db, owner, ownerId]);
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

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <Stack.Screen options={{
        title: photos.length ? t('photos.viewerTitle', { n: current + 1, total: photos.length }) : '',
        headerRight: () => <IconButton name="trash-outline" size={24} label={t('photos.delete')} onPress={askDelete} />,
      }} />
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
