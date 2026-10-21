// Rules for photos: how many, how big, and which are missing from a folder.

export const MAX_PHOTOS = 5;
/** The longer side of a stored photo, in pixels ("standard" quality). */
export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_QUALITY = 0.75;
/** The folder inside the backup folder that holds the pictures. */
export const BACKUP_PHOTO_DIR = 'zdjecia';

/** How many more photos can be added. */
export function slotsLeft(count: number): number {
  return Math.max(0, MAX_PHOTOS - count);
}

/** The size to scale to so that the longer side is `max`; null when the photo is small enough (or its size is unknown) and stays as it is. */
export function scaleTo(width: number, height: number, max = PHOTO_MAX_EDGE): { width: number } | { height: number } | null {
  if (!(width > 0) || !(height > 0) || Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}

export const photoFileName = (id: string) => `${id}.jpg`;

/** The photo id from a file name in the backup folder, or null for other files. */
export function photoIdFromFile(name: string): string | null {
  const m = /^([0-9a-zA-Z-]+)\.jpg$/.exec(name);
  return m ? m[1] : null;
}

/** Ids that are wanted but not present, in the order they are wanted. */
export function missingIds(wanted: string[], present: Iterable<string>): string[] {
  const have = new Set(present);
  return wanted.filter((id) => !have.has(id));
}

/** Local files that no active photo needs any more. */
export function orphanFiles(fileNames: string[], activeIds: string[]): string[] {
  const keep = new Set(activeIds.map(photoFileName));
  return fileNames.filter((n) => photoIdFromFile(n) != null && !keep.has(n));
}

/** "3,4 MB", "820 KB". */
export function formatBytes(bytes: number, lang = 'pl'): string {
  const mb = bytes / 1_048_576;
  if (mb >= 1) return `${mb.toLocaleString(lang, { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(lang)} KB`;
}
