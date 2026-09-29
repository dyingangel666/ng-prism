/**
 * The arithmetic behind `prismResizer`, kept out of the directive.
 *
 * Not for tidiness: a directive whose inputs are `input()` signals has to be
 * rendered inside a host component to be exercised, and this package's specs
 * run under jsdom against SWC-compiled sources, where JIT cannot instantiate
 * one. Extracted, the maths is ordinary and testable — the same reason
 * `known-inputs.ts` and `overlay-resolver.ts` sit beside their components.
 */

/**
 * Where a drag lands.
 *
 * `scale` maps pointer movement onto the value. `1` is a panel edge, where a
 * pixel of travel is a pixel of size. `2` and `-2` are the viewport grips,
 * where the box is centred and therefore grows at both edges at once — so one
 * edge moving by `d` is a width change of `2d`, and the sign says which edge is
 * being held.
 */
export function resizeValue(
  startValue: number,
  delta: number,
  scale: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, startValue + delta * scale));
}

/**
 * How far one arrow key moves the value.
 *
 * Only the sign of `scale` carries over. A drag on a centred box covers twice
 * the distance it travels, but an arrow key is a nudge with an intended size,
 * and doubling it would make the keyboard coarser than the mouse on exactly the
 * control where precision is the point.
 */
export function resizeStep(scale: number, step = 10): number {
  return scale < 0 ? -step : step;
}
