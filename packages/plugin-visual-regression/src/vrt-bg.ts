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
 * The captures themselves are opaque, so this is mostly invisible — except
 * under a diff mask, where the unchanged pixels a comparator leaves
 * transparent let it through. There the surface decides whether a diff reads
 * as a diff or as a chequered mess.
 *
 * Only `light` and `dark` produce a colour. `dots`, `plain` and `checker` all
 * paint `--prism-bg-surface`, a *theme* token, and the panel cannot know which
 * theme the runner's browser ran in — so those keep the checkerboard, which
 * reads as "transparent" rather than as a guess painted as fact. For `checker`
 * that is also the literal rendering, and since it is what an undeclared
 * variant resolves to, an undeclared capture frames itself correctly. Same for
 * a report that recorded no background at all.
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
