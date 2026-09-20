import { resolveAssetUrl } from './asset-url.js';

describe('resolveAssetUrl', () => {
  it('returns undefined when there is no path', () => {
    expect(resolveAssetUrl('vrt/', undefined)).toBeUndefined();
  });

  it('returns the path unchanged when no base is configured', () => {
    expect(resolveAssetUrl('', 'vrt/baseline/a.png')).toBe(
      'vrt/baseline/a.png'
    );
  });

  it('joins base and path', () => {
    expect(resolveAssetUrl('assets/', 'vrt/a.png')).toBe('assets/vrt/a.png');
  });

  it('inserts a separator when the base has no trailing slash', () => {
    expect(resolveAssetUrl('assets', 'vrt/a.png')).toBe('assets/vrt/a.png');
  });

  it('does not double up separators', () => {
    expect(resolveAssetUrl('assets/', '/vrt/a.png')).toBe('assets/vrt/a.png');
  });

  it('leaves an absolute http URL alone', () => {
    expect(resolveAssetUrl('assets/', 'https://cdn.example/a.png')).toBe(
      'https://cdn.example/a.png'
    );
  });

  it('leaves a data URI alone', () => {
    expect(resolveAssetUrl('assets/', 'data:image/png;base64,AAAA')).toBe(
      'data:image/png;base64,AAAA'
    );
  });

  it('leaves a root-relative path alone when no base is configured', () => {
    expect(resolveAssetUrl('', '/vrt/a.png')).toBe('/vrt/a.png');
  });

  it('collapses a run of trailing slashes on the base', () => {
    expect(resolveAssetUrl('assets///', 'vrt/a.png')).toBe('assets/vrt/a.png');
    expect(resolveAssetUrl('assets///', '/vrt/a.png')).toBe('assets/vrt/a.png');
  });

  it('trims the base in linear time', () => {
    // Guards the reason `replace(/\/+$/, '')` is not used here. That pattern
    // backtracks over the whole slash run from every offset in it, so this
    // input took ~22s to resolve; the backward scan takes well under a
    // millisecond. The bound is four orders of magnitude above the linear
    // cost and four below the quadratic one, so it cannot flake either way.
    const base = '/'.repeat(200_000) + 'a';

    const started = performance.now();
    expect(resolveAssetUrl(base, 'vrt/a.png')).toBe(`${base}/vrt/a.png`);
    expect(performance.now() - started).toBeLessThan(500);
  });
});
