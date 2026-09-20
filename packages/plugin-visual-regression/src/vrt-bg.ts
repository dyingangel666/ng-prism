import type { CanvasBg } from '@ng-prism/core/plugin';
import type { VrtVariantResult } from './visual-regression.types.js';

/**
 * Colours the two theme-independent backgrounds resolve to.
 *
 * Mirrors what the canvas paints in capture mode, tokens included, so the
 * frame around a capture is the same colour as the capture's own edge.
 * `--prism-void-light` and `--prism-void-dark` are absolute in both themes;
 * the literals are the tokens' own fallbacks.
 */
const SURFACE: Partial<Record<CanvasBg, string>> = {
  light: 'var(--prism-void-light, #f7f5fc)',
  dark: 'var(--prism-void-dark, #07050f)',
};

/**
 * Background declarations for the box that holds a capture.
 *
 * Mostly invisible behind an opaque capture — but not behind every one. It
 * shows through a diff mask, where the unchanged pixels a comparator leaves
 * transparent let it past, and through a `transparent` capture, which is see-
 * through by design. In both places the surface decides whether the image
 * reads as itself or as a chequered mess.
 *
 * Only `light` and `dark` produce a colour. The rest keep the checkerboard,
 * for two different reasons. `dots`, `plain` and `checker` paint
 * `--prism-bg-surface`, a *theme* token, and the panel cannot know which theme
 * the runner's browser ran in — so a colour here would be a guess painted as
 * fact. `transparent` is the opposite case: its capture genuinely has an alpha
 * channel, and the checkerboard is what makes that legible instead of
 * inventing a surface the capture deliberately omitted. A report that recorded
 * no background at all is treated the same way.
 */
export function shotSurfaceStyle(
  bg: CanvasBg | undefined
): Record<string, string> {
  const surface = bg ? SURFACE[bg] : undefined;
  if (!surface) return {};
  return { 'background-color': surface, 'background-image': 'none' };
}

/**
 * The background move between the baseline and this run, or `null`.
 *
 * A variant whose declared `bg` changed compares a capture on one surface
 * against a baseline on another, which is a 100%-different image with an
 * innocent component in it. Naming the move is the difference between a
 * reviewer re-recording a baseline and a reviewer hunting a regression that
 * was never there.
 *
 * Needs both values, and only the runner can supply them: `bg` is what this
 * run captured on, `baselineBg` what the stored baseline was captured on.
 * Runners that do not track the second simply get no note.
 */
export function bgChange(
  variant: VrtVariantResult
): { from: CanvasBg; to: CanvasBg } | null {
  const { baselineBg, bg } = variant;
  if (!baselineBg || !bg || baselineBg === bg) return null;
  return { from: baselineBg, to: bg };
}
