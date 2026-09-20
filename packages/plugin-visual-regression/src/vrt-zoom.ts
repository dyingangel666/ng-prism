/** `'fit'` scales to the stage within bounds; the numbers are exact multiples. */
export type Zoom = 'fit' | 1 | 2 | 4;

export const ZOOMS: readonly Zoom[] = ['fit', 1, 2, 4];

/**
 * How far `fit` may enlarge a capture.
 *
 * Without a ceiling a 98px-wide button blown up to a 900px stage lands at 9×,
 * which is a mosaic, not a comparison. Capping at the largest explicit step
 * keeps `fit` inside the range the zoom buttons already offer.
 */
export const MAX_FIT_SCALE = 4;

/**
 * Tallest a capture is drawn under `fit`, in CSS pixels.
 *
 * Width alone is not enough of a bound: a 302×229 card stretched to a 1200px
 * stage is 900px tall and pushes its own comparison slider off screen.
 */
export const MAX_FIT_HEIGHT = 400;

/**
 * Width declarations for the frame that holds a capture.
 *
 * The frame — not the image — carries the width, so the comparison slider and
 * the legend below it stay exactly as wide as the image they describe.
 *
 * `fit` fills the frame's share of the stage, bounded on both sides:
 * `min-width` holds the capture's natural size, because a diff read below 1:1
 * is a diff you cannot trust, and `max-width` stops a small capture from being
 * blown up past {@link MAX_FIT_SCALE} or taller than {@link MAX_FIT_HEIGHT}.
 * The share itself comes from `--vrt-fit-basis`, which the stage sets to the
 * full width, or to half of it side by side.
 *
 * The numeric steps are deliberately unbounded: asking for 4× means 4×, even
 * when that overflows the stage and scrolls.
 */
export function frameWidthStyle(
  width: number | undefined,
  height: number | undefined,
  zoom: Zoom
): Record<string, string> {
  if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) {
    return {};
  }

  if (zoom !== 'fit') return { width: `${width * zoom}px` };

  // The height budget expressed as a width, so one `max-width` enforces both.
  const heightCap =
    typeof height === 'number' && Number.isFinite(height) && height > 0
      ? width * (MAX_FIT_HEIGHT / height)
      : Infinity;

  return {
    width: 'var(--vrt-fit-basis, 100%)',
    'min-width': `${width}px`,
    'max-width': `${Math.round(Math.min(width * MAX_FIT_SCALE, heightCap))}px`,
  };
}
