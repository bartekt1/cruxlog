import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { SQLiteDatabase } from 'expo-sqlite';
import { activePhotos, addPhotos, type PhotoOwner } from '../db/repo';
import { newId } from '../db/ids';
import { orphanFiles, PHOTO_EDGE, PHOTO_MAX_EDGE, photoFileName, PHOTO_QUALITY, scaleTo, slotsLeft } from '../domain/photos';

/** A photo that was chosen and shrunk but is not saved yet: its file is still in the cache. */
export type PreparedPhoto = { id: string; uri: string; width: number; height: number; bytes: number };

/** Where the app keeps its photos: files named <photo id>.jpg. */
export function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export const photoFile = (id: string): File => new File(photosDir(), photoFileName(id));

/** The picture's address if the file is there, else null (e.g. after restoring only the database). */
export function photoUri(id: string): string | null {
  const file = photoFile(id);
  return file.exists ? file.uri : null;
}

/** The system gallery picker. Needs no permission: the system hands over only what was chosen. Cancelled = []. */
export async function pickPhotos(limit: number): Promise<ImagePicker.ImagePickerAsset[]> {
  if (limit <= 0) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: limit, quality: 1, exif: false,
  });
  return res.canceled ? [] : res.assets.slice(0, limit);
}

/** Shrinks a chosen picture (longer side `maxEdge`, 1600 px for an ascent; JPEG) into a new cache file. The result carries no location data from the original. */
export async function preparePhoto(asset: ImagePicker.ImagePickerAsset, maxEdge = PHOTO_MAX_EDGE): Promise<PreparedPhoto> {
  let width = asset.width;
  let height = asset.height;
  if (!(width > 0 && height > 0)) { // the system did not say how big it is: load it once to find out
    const probe = await ImageManipulator.manipulate(asset.uri).renderAsync();
    ({ width, height } = probe);
  }
  let context = ImageManipulator.manipulate(asset.uri);
  const size = scaleTo(width, height, maxEdge);
  if (size) context = context.resize(size);
  const out = await (await context.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: PHOTO_QUALITY });
  return { id: newId(), uri: out.uri, width: out.width, height: out.height, bytes: new File(out.uri).size ?? 0 };
}

/**
 * For a crag or a wall (sector), which exist already: picks photos, shrinks them, stores them and records them in one go.
 * Returns how many were added; throws only when none could be.
 */
export async function addPhotosFromGallery(db: SQLiteDatabase, owner: PhotoOwner, ownerId: string, have: number): Promise<number> {
  const assets = await pickPhotos(slotsLeft(have, owner));
  const done: PreparedPhoto[] = [];
  let failure: unknown = null;
  for (const asset of assets) {
    try {
      const p = await preparePhoto(asset, PHOTO_EDGE[owner]);
      storePhoto(p);
      done.push(p);
    } catch (e) {
      failure = e;
    }
  }
  await addPhotos(db, owner, ownerId, done.map((p) => ({ id: p.id, width: p.width, height: p.height, bytes: p.bytes })));
  if (!done.length && failure) throw failure;
  return done.length;
}

/** Moves a prepared photo from the cache into the photos folder; a photo already moved (a save tried again) is left as it is. */
export function storePhoto(photo: PreparedPhoto): void {
  const target = photoFile(photo.id);
  if (target.exists) return;
  new File(photo.uri).move(target);
}

/** Deletes picture files that no photo needs: removed photos, and photos of deleted ascents. Runs when the app opens; never throws. */
export async function cleanOrphanPhotos(db: SQLiteDatabase): Promise<void> {
  try {
    const dir = photosDir();
    const active = (await activePhotos(db)).map((p) => p.id);
    const files = dir.list().filter((x): x is File => x instanceof File);
    const gone = new Set(orphanFiles(files.map((f) => f.name), active));
    for (const f of files) if (gone.has(f.name)) { try { f.delete(); } catch { /* it will be tried again next time */ } }
  } catch {
    // Tidying up is not important enough to disturb anything.
  }
}
