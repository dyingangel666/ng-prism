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
});
