import { frameWidthStyle, MAX_FIT_HEIGHT, MAX_FIT_SCALE } from './vrt-zoom.js';

describe('frameWidthStyle', () => {
  describe('numeric zoom steps', () => {
    it("renders 1x at the capture's natural width", () => {
      expect(frameWidthStyle(98, 35, 1)).toEqual({ width: '98px' });
    });

    it('doubles and quadruples exactly', () => {
      expect(frameWidthStyle(98, 35, 2)).toEqual({ width: '196px' });
      expect(frameWidthStyle(98, 35, 4)).toEqual({ width: '392px' });
    });

    it('gives every step a distinct width', () => {
      const widths = [1, 2, 4].map(
        (z) => frameWidthStyle(98, 35, z as 1 | 2 | 4)['width']
      );
      expect(new Set(widths).size).toBe(3);
    });

    it('sets no bounds, so 4x stays 4x even when it overflows', () => {
      // Asking for a fixed step means that step; the stage scrolls instead.
      expect(frameWidthStyle(800, 27, 4)).toEqual({ width: '3200px' });
    });
  });

  describe('fit', () => {
    it('never draws a capture below 1:1', () => {
      expect(frameWidthStyle(800, 27, 'fit')['min-width']).toBe('800px');
    });

    it('caps a small capture at the largest explicit step', () => {
      // 98 * 4 = 392, well under the height budget for a 35px-tall capture.
      expect(frameWidthStyle(98, 35, 'fit')['max-width']).toBe('392px');
    });

    it('caps a tall capture by height rather than by scale', () => {
      // 302 x 229 at the 4x scale cap would be 1208px wide and 916px tall, so
      // the height budget has to be the binding constraint here.
      const cap = Number(
        frameWidthStyle(302, 229, 'fit')['max-width']?.replace('px', '')
      );
      expect(cap).toBeLessThan(302 * MAX_FIT_SCALE);
      expect((cap / 302) * 229).toBeCloseTo(MAX_FIT_HEIGHT, 0);
    });

    it('falls back to the scale cap when there is no height', () => {
      expect(frameWidthStyle(98, undefined, 'fit')['max-width']).toBe(
        `${98 * MAX_FIT_SCALE}px`
      );
    });

    it('defers its share of the stage to the frame basis', () => {
      // Side by side the stage narrows this to half; the component must not
      // hard-code 100% or the two frames each claim the whole width.
      expect(frameWidthStyle(98, 35, 'fit')['width']).toBe(
        'var(--vrt-fit-basis, 100%)'
      );
    });
  });

  describe('unusable dimensions', () => {
    it('declares nothing without a width', () => {
      expect(frameWidthStyle(undefined, 35, 'fit')).toEqual({});
      expect(frameWidthStyle(undefined, 35, 2)).toEqual({});
    });

    it('declares nothing for a zero or negative width', () => {
      expect(frameWidthStyle(0, 35, 1)).toEqual({});
      expect(frameWidthStyle(-10, 35, 1)).toEqual({});
    });

    it('ignores a zero height instead of dividing by it', () => {
      expect(frameWidthStyle(98, 0, 'fit')['max-width']).toBe('392px');
    });
  });
});
