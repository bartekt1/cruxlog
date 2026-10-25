import type { SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { listPhotos } from '../../db/repo';
import { slotsLeft } from '../../domain/photos';
import { errorMessage } from '../errors';
import { getPhotos, photoUri, preparePhoto, type PreparedPhoto } from '../photos';
import { editorPhoto, type EditorPhoto } from '../PhotoViews';

/**
 * The photos in the ascent form: the ones the ascent already has (editing) and the ones chosen now.
 * Nothing is saved until the ascent is; `changes()` says what to remove and which prepared files to add.
 */
export function useAscentPhotos(db: SQLiteDatabase, ascentId: string | undefined) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<EditorPhoto[]>([]);
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [prepared, setPrepared] = useState<Record<string, PreparedPhoto>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ascentId) return;
    let live = true;
    listPhotos(db, 'ascent', ascentId).then((rows) => {
      if (!live) return;
      setOriginalIds(rows.map((p) => p.id));
      setPhotos(rows.map((p) => ({ id: p.id, uri: photoUri(p.id), added: false })));
    });
    return () => { live = false; };
  }, [db, ascentId]);

  async function add() {
    setBusy(true);
    try {
      const assets = await getPhotos(slotsLeft(photos.length));
      for (const asset of assets) {
        const p = await preparePhoto(asset);
        setPrepared((all) => ({ ...all, [p.id]: p }));
        setPhotos((all) => [...all, editorPhoto(p)]);
      }
    } catch (e) {
      Alert.alert(t('photos.title'), t('photos.failed', { message: errorMessage(e) }));
    } finally {
      setBusy(false);
    }
  }

  const remove = (id: string) => setPhotos((all) => all.filter((p) => p.id !== id));

  function changes(): { fresh: PreparedPhoto[]; removeIds: string[] } {
    const keep = new Set(photos.filter((p) => !p.added).map((p) => p.id));
    return {
      fresh: photos.filter((p) => p.added).map((p) => prepared[p.id]).filter(Boolean),
      removeIds: originalIds.filter((id) => !keep.has(id)),
    };
  }

  return { photos, busy, add, remove, changes };
}
