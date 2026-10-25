import { codeOfTag, parseRelease, shouldOffer } from '../src/domain/updates';

const apk = { name: 'cruxlog-1.0.52.apk', browser_download_url: 'https://github.com/bartekt1/cruxlog/releases/download/v1.0.52/cruxlog-1.0.52.apk' };

describe('updates', () => {
  it('reads the build number from the tag', () => {
    expect(codeOfTag('v1.0.52')).toBe(52);
    expect(codeOfTag('1.0.7')).toBe(7);
    expect(codeOfTag('latest')).toBeNull();
    expect(codeOfTag(5)).toBeNull();
  });
  it('reads the release with its APK', () => {
    expect(parseRelease({ tag_name: 'v1.0.52', body: ' Nowe karty ', assets: [{ name: 'notes.txt', browser_download_url: 'https://x/n' }, apk] }))
      .toEqual({ code: 52, name: '1.0.52', apkUrl: apk.browser_download_url, notes: 'Nowe karty' });
  });
  it('ignores releases without a version tag or an APK', () => {
    expect(parseRelease({ tag_name: 'v1.0.52', assets: [] })).toBeNull();
    expect(parseRelease({ tag_name: 'test', assets: [apk] })).toBeNull();
    expect(parseRelease({ tag_name: 'v1.0.52', assets: [{ ...apk, browser_download_url: 'http://x/a.apk' }] })).toBeNull();
    expect(parseRelease(null)).toBeNull();
  });
  it('offers only a newer version the user has not put off', () => {
    const r = parseRelease({ tag_name: 'v1.0.52', assets: [apk] });
    expect(shouldOffer(r, 50, null)).toBe(true);
    expect(shouldOffer(r, 52, null)).toBe(false);
    expect(shouldOffer(r, 60, null)).toBe(false);
    expect(shouldOffer(r, 50, 52)).toBe(false);
    expect(shouldOffer(r, null, null)).toBe(false);
    expect(shouldOffer(null, 50, null)).toBe(false);
  });
});
