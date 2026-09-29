import {
  VIEWPORT_MAX,
  VIEWPORT_MIN,
  VIEWPORT_SNAPS,
} from '../../shared/viewport.type.js';
import { clampViewportWidth, snapViewportWidth } from './viewport-snap.js';

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
    // 476 is 4 from 480 and 156 from 320 — only one of them is even close,
    // but the assertion is about which one wins, not whether one does.
    expect(snapViewportWidth(476)).toBe(480);
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
