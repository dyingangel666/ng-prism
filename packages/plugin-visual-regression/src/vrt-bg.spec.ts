import { bgChange, shotSurfaceStyle } from './vrt-bg.js';
import type { VrtVariantResult } from './visual-regression.types.js';

function result(patch: Partial<VrtVariantResult> = {}): VrtVariantResult {
  return {
    className: 'ButtonComponent',
    variantIndex: 0,
    status: 'unchanged',
    ...patch,
  };
}

describe('shotSurfaceStyle', () => {
  it('paints the declared light surface and drops the checkerboard', () => {
    expect(shotSurfaceStyle('light')).toEqual({
      'background-color': 'var(--prism-void-light, #f7f5fc)',
      'background-image': 'none',
    });
  });

  it('paints the declared dark surface', () => {
    expect(shotSurfaceStyle('dark')).toEqual({
      'background-color': 'var(--prism-void-dark, #07050f)',
      'background-image': 'none',
    });
  });

  it('keeps the checkerboard for theme-dependent backgrounds', () => {
    // `dots`, `plain` and `checker` all paint `--prism-bg-surface` — a theme
    // token. The panel cannot know which theme the runner's browser was in, so
    // claiming a colour here would be a guess painted as fact.
    expect(shotSurfaceStyle('dots')).toEqual({});
    expect(shotSurfaceStyle('plain')).toEqual({});
    expect(shotSurfaceStyle('checker')).toEqual({});
  });

  it('keeps the checkerboard when the report recorded no background', () => {
    expect(shotSurfaceStyle(undefined)).toEqual({});
  });

  it('declares no background at all for a transparent capture', () => {
    // Worth nailing down precisely because it works by omission: `SURFACE` has
    // no `transparent` entry, so the lookup falls through. Turn `SURFACE` into
    // a total record, or give it a default, and every transparent capture gets
    // painted over — with the panel still looking entirely plausible, because
    // a flat surface behind a capture is exactly what the other values want.
    expect(shotSurfaceStyle('transparent')).toEqual({});
  });
});

describe('bgChange', () => {
  it('reports a background that moved between baseline and this run', () => {
    expect(bgChange(result({ baselineBg: 'dark', bg: 'light' }))).toEqual({
      from: 'dark',
      to: 'light',
    });
  });

  it('returns null when the background held', () => {
    expect(bgChange(result({ baselineBg: 'dark', bg: 'dark' }))).toBeNull();
  });

  it('returns null unless the runner recorded both', () => {
    // A single value cannot show a change: `bg` is this run, and without the
    // baseline's own there is nothing to compare it against.
    expect(bgChange(result({ bg: 'light' }))).toBeNull();
    expect(bgChange(result({ baselineBg: 'dark' }))).toBeNull();
    expect(bgChange(result())).toBeNull();
  });
});
