import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PHOTO_LIMIT, type PhotoOwnerType } from '../domain/photos';
import { F } from './fonts';
import { Button, LinkButton } from './kit';
import { photoUri, type PreparedPhoto } from './photos';
import { Text } from './Text';
import { useTheme } from './theme';

const TILE = 96;

/** A small camera with the number of photos, shown on a journal or timeline row (no picture, as chosen). */
export function PhotoBadge({ count }: { count: number }) {
  const th = useTheme();
  const { t } = useTranslation();
  return (
    <View accessible accessibilityLabel={t('photos.usage', { count, max: PHOTO_LIMIT.ascent })} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ionicons name="camera-outline" size={15} color={th.muted} />
      <Text style={{ color: th.muted, fontSize: 12, fontFamily: F.semi }}>{count}</Text>
    </View>
  );
}

/** One picture tile; `uri` null = the file is not on this phone (a restored database without the pictures). */
function Tile({ uri, onPress, label }: { uri: string | null; onPress?: () => void; label: string }) {
  const th = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} disabled={!onPress || !uri} accessibilityRole="imagebutton" accessibilityLabel={label}
      style={{ width: TILE, height: TILE, borderRadius: 12, overflow: 'hidden', backgroundColor: th.soft, borderWidth: 1, borderColor: th.line, alignItems: 'center', justifyContent: 'center' }}>
      {uri ? <Image source={{ uri }} style={{ width: TILE, height: TILE }} resizeMode="cover" resizeMethod="resize" />
        : <Text style={{ color: th.muted, fontSize: 11, textAlign: 'center', padding: 6 }}>{t('photos.missing')}</Text>}
    </Pressable>
  );
}

/** Photos (of an ascent, crag or wall) in a row; tapping one opens it full screen. */
export function PhotoStrip({ ids, onOpen }: { ids: string[]; onOpen: (index: number) => void }) {
  const { t } = useTranslation();
  if (!ids.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {ids.map((id, i) => <Tile key={id} uri={photoUri(id)} onPress={() => onOpen(i)} label={t('photos.openA11y', { n: i + 1 })} />)}
    </ScrollView>
  );
}

/** The photos of a crag or a wall (sector): a row of tiles and the button to add more; they are saved at once. */
export function PhotoSection({ owner, ids, busy, onAdd, onOpen }: {
  owner: PhotoOwnerType; ids: string[]; busy: boolean; onAdd: () => void; onOpen: (index: number) => void;
}) {
  const th = useTheme();
  const { t } = useTranslation();
  return (
    <View>
      <PhotoStrip ids={ids} onOpen={onOpen} />
      {busy ? <Text style={{ color: th.muted, fontSize: 13 }}>{t('photos.preparing')}</Text> : null}
      {ids.length < PHOTO_LIMIT[owner] && !busy ? <LinkButton label={t('photos.add')} onPress={onAdd} /> : null}
    </View>
  );
}

export type EditorPhoto = { id: string; uri: string | null; added: boolean };

/** In the ascent form: the photos so far with a cross on each, and the button to add more. */
export function PhotoEditor({ photos, busy, onAdd, onRemove }: {
  photos: EditorPhoto[]; busy: boolean; onAdd: () => void; onRemove: (id: string) => void;
}) {
  const th = useTheme();
  const { t } = useTranslation();
  return (
    <View>
      {photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }} keyboardShouldPersistTaps="handled">
          {photos.map((p) => (
            <View key={p.id}>
              <Tile uri={p.uri} label={t('photos.title')} />
              <Pressable onPress={() => onRemove(p.id)} accessibilityRole="button" accessibilityLabel={t('photos.removeA11y')} hitSlop={8}
                style={{ position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: th.badge, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={16} color={th.onBadge} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <Text style={{ color: th.muted, fontSize: 13, marginTop: 2 }}>{busy ? t('photos.preparing') : t('photos.usage', { count: photos.length, max: PHOTO_LIMIT.ascent })}</Text>
      {photos.length < PHOTO_LIMIT.ascent ? <Button label={t('photos.add')} variant="plain" onPress={onAdd} disabled={busy} /> : null}
    </View>
  );
}

export const editorPhoto = (p: PreparedPhoto): EditorPhoto => ({ id: p.id, uri: p.uri, added: true });
