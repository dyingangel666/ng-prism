import {
  VIEWPORT_MAX,
  VIEWPORT_MIN,
  VIEWPORT_SNAP_TOLERANCE,
  VIEWPORT_SNAPS,
} from '../../shared/viewport.type.js';

/**
 * `width` brought inside the legal range and onto a whole pixel.
 *
 * Rounded rather than truncated: the value is read back out as a label on the
 * canvas, and `389.6 px` under a drag reads as a rendering fault rather than as
 * the sub-pixel arithmetic it is.
 */
export function clampViewportWidth(width: number): number {
  return Math.round(Math.max(VIEWPORT_MIN, Math.min(VIEWPORT_MAX, width)));
}

/**
 * `width`, pulled onto the nearest preset it comes within `tolerance` of.
 *
 * The tolerance is what makes a drag land on 390 instead of 388: without it,
 * hitting a named width by hand is a game of pixels, and the presets in the
 * menu would be the only way to reach them exactly. Outside the tolerance the
 * width is returned untouched — searching for a breakpoint between the presets
 * is the other half of what this tool is for, and a grid that always snapped
 * would make that impossible.
 */
export function snapViewportWidth(
  width: number,
  snaps: readonly number[] = VIEWPORT_SNAPS,
  tolerance: number = VIEWPORT_SNAP_TOLERANCE
): number {
  let best: number | null = null;
  let bestDistance = Infinity;

  for (const snap of snaps) {
    const distance = Math.abs(snap - width);
    if (distance <= tolerance && distance < bestDistance) {
      best = snap;
      bestDistance = distance;
    }
  }

  return best ?? width;
}
