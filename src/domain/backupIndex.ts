// What the app remembers about its backup folder. Google Drive gives files no readable names through the system
// folder access (only opaque addresses), so the app keeps the addresses of what it wrote, and recognises its own
// files by their content when it has to look (a new phone, a folder chosen again).
import { BACKUP_KEEP } from './autoBackup';

export type FolderCopy = { uri: string; at: number; size: number };
export type BackupIndex = {
  /** The database copies in the folder, newest first. */
  copies: FolderCopy[];
  /** The photo subfolder and where each photo (by id) is in it. */
  photoDir: string | null;
  photos: Record<string, string>;
  /** The folder has been looked through once (so earlier copies and photos are known). */
  scanned: boolean;
};

export const emptyIndex = (): BackupIndex => ({ copies: [], photoDir: null, photos: {}, scanned: false });

/** Reads the stored index; anything damaged becomes an empty one (the folder is then simply looked through again). */
export function parseIndex(raw: string | null): BackupIndex {
  try {
    const d = JSON.parse(raw ?? '{}') as Partial<BackupIndex>;
    const copies = Array.isArray(d.copies)
      ? d.copies.filter((c) => c && typeof c.uri === 'string' && typeof c.at === 'number' && typeof c.size === 'number').map((c) => ({ uri: c.uri, at: c.at, size: c.size }))
      : [];
    const photos: Record<string, string> = {};
    if (d.photos && typeof d.photos === 'object') for (const [id, uri] of Object.entries(d.photos)) if (typeof uri === 'string') photos[id] = uri;
    return { copies: sortCopies(copies), photoDir: typeof d.photoDir === 'string' ? d.photoDir : null, photos, scanned: d.scanned === true };
  } catch {
    return emptyIndex();
  }
}

const sortCopies = (copies: FolderCopy[]) => [...copies].sort((a, b) => b.at - a.at);

/** Adds a copy (replacing one with the same address) and keeps the newest first. */
export function addCopy(index: BackupIndex, copy: FolderCopy): BackupIndex {
  return { ...index, copies: sortCopies([copy, ...index.copies.filter((c) => c.uri !== copy.uri)]) };
}

/** The copies to delete so that only the `keep` newest remain. */
export function expiredCopies(index: BackupIndex, keep = BACKUP_KEEP): FolderCopy[] {
  return index.copies.slice(keep);
}

export function dropCopies(index: BackupIndex, uris: string[]): BackupIndex {
  const gone = new Set(uris);
  return { ...index, copies: index.copies.filter((c) => !gone.has(c.uri)) };
}

/** What a look through the folder found, merged into what is already known. */
export function mergeScan(index: BackupIndex, found: { copies: FolderCopy[]; photos: Record<string, string>; photoDir: string | null }): BackupIndex {
  const byUri = new Map([...found.copies, ...index.copies].map((c) => [c.uri, c]));
  return {
    copies: sortCopies([...byUri.values()]),
    photoDir: index.photoDir ?? found.photoDir,
    photos: { ...found.photos, ...index.photos },
    scanned: true,
  };
}

// ---- Photo files carry their id inside, as a JPEG comment right after the start marker, so they can be recognised
// ---- (and matched to the database) without their names. Viewers ignore the comment.

const TAG = 'cruxlog:';

/** The photo's bytes with its id added as a JPEG comment; not a JPEG = unchanged. */
export function withPhotoMarker(jpeg: Uint8Array, id: string): Uint8Array {
  if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return jpeg;
  const payload = new TextEncoder().encode(TAG + id);
  const length = payload.length + 2; // the length field counts itself
  const out = new Uint8Array(jpeg.length + payload.length + 4);
  out.set([0xff, 0xd8, 0xff, 0xfe, length >> 8, length & 0xff], 0);
  out.set(payload, 6);
  out.set(jpeg.subarray(2), 6 + payload.length);
  return out;
}

/** The id from the first bytes of a photo file written by withPhotoMarker; null for any other file. */
export function readPhotoMarker(head: Uint8Array): string | null {
  if (head.length < 6 || head[0] !== 0xff || head[1] !== 0xd8) return null;
  let o = 2;
  while (o + 4 <= head.length && head[o] === 0xff) {
    const marker = head[o + 1];
    const length = (head[o + 2] << 8) | head[o + 3];
    if (marker === 0xfe) {
      const text = new TextDecoder().decode(head.subarray(o + 4, Math.min(head.length, o + 2 + length)));
      return text.startsWith(TAG) ? text.slice(TAG.length) : null;
    }
    o += 2 + length;
  }
  return null;
}
