import {
  clampViewportWidth,
  VIEWPORT_MAX,
  VIEWPORT_MIN,
  VIEWPORT_SNAPS,
} from '../../shared/viewport.type.js';
import { snapViewportWidth } from './viewport-snap.js';

describe('clampViewportWidth', () => {
  it('should hold a width that is already in range', () => {
    expect(clampViewportWidth(390)).toBe(390);
  });

  it('should raise a width below the floor', () => {
    expect(clampViewportWidth(10)).toBe(VIEWPORT_MIN);
  });

  it('should lower a width above the ceiling', () => {
    expect(clampViewportWidth(99999)).toBe(VIEWPORT_MAX);
  });

  it('should round a fractional width, because a pixel is the unit here', () => {
    expect(clampViewportWidth(390.6)).toBe(391);
  });
});

describe('snapViewportWidth', () => {
  it('should pull a width inside the tolerance onto the preset', () => {
    expect(snapViewportWidth(385)).toBe(390);
  });

  it('should leave a width outside the tolerance alone', () => {
    expect(snapViewportWidth(360)).toBe(360);
  });

  it('should pick the nearest preset when two are in reach', () => {
    // The shipped presets are at least 60 apart and the tolerance is 8, so no
    // two of them can ever both be in reach — against VIEWPORT_SNAPS this
    // branch is unreachable and the previous version of this test said so in
    // its own comment while claiming to cover it. The function takes the snap
    // list as a parameter, so the nearest-wins rule is exercised with a list
    // that actually puts two candidates inside the tolerance.
    expect(snapViewportWidth(404, [400, 410], 8)).toBe(400);
    expect(snapViewportWidth(406, [400, 410], 8)).toBe(410);
  });

  it('should keep the first of two equidistant presets', () => {
    // A tie is decided by `distance < bestDistance` being strict, which is an
    // arbitrary but stable choice — pinned so a refactor to `<=` cannot flip
    // the result of a drag that lands exactly between two named widths.
    expect(snapViewportWidth(405, [400, 410], 8)).toBe(400);
  });

  it('should hold a width that is already exactly a preset', () => {
    expect(snapViewportWidth(768)).toBe(768);
  });

  it('should respect a caller-supplied tolerance', () => {
    expect(snapViewportWidth(370, VIEWPORT_SNAPS, 0)).toBe(370);
  });

  it('should be a no-op against an empty preset list', () => {
    expect(snapViewportWidth(385, [], 8)).toBe(385);
  });
});
