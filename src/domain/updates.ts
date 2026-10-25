// Updates outside Google Play: every build of main is published as a GitHub release "v1.0.<n>" with the APK;
// <n> is also the build's Android versionCode, so the app compares it with its own.

export const RELEASES_URL = 'https://api.github.com/repos/bartekt1/cruxlog/releases/latest';

export type Release = { code: number; name: string; apkUrl: string; notes: string };

/** The build number from a tag such as "v1.0.46" (46); null for other tags. */
export function codeOfTag(tag: unknown): number | null {
  const m = typeof tag === 'string' ? /^v?\d+\.\d+\.(\d+)$/.exec(tag.trim()) : null;
  return m ? Number(m[1]) : null;
}

/** The latest release from the GitHub answer, or null when it has no version tag or no APK. */
export function parseRelease(json: unknown): Release | null {
  if (!json || typeof json !== 'object') return null;
  const r = json as { tag_name?: unknown; body?: unknown; assets?: unknown };
  const code = codeOfTag(r.tag_name);
  const assets = Array.isArray(r.assets) ? r.assets : [];
  const apk = assets.find((a): a is { browser_download_url: string } =>
    !!a && typeof a === 'object' && typeof a.name === 'string' && a.name.endsWith('.apk')
    && typeof a.browser_download_url === 'string' && a.browser_download_url.startsWith('https://'));
  if (code == null || !apk) return null;
  return { code, name: String(r.tag_name).trim().replace(/^v/, ''), apkUrl: apk.browser_download_url, notes: typeof r.body === 'string' ? r.body.trim() : '' };
}

/** Whether to offer `release` to a phone with build `installed`; `skipped` is a version the user said "later" to. */
export function shouldOffer(release: Release | null, installed: number | null, skipped: number | null): boolean {
  return release != null && installed != null && release.code > installed && release.code !== skipped;
}
