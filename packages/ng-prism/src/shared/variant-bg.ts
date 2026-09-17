import type { CanvasBg } from './canvas-bg.type.js';

/**
 * The surface a variant is reported to render on when nothing declares one.
 *
 * `checker` is the "no opinion declared" answer: the checkerboard is the
 * universal signal for an undefined or transparent backdrop, it makes an
 * undeclared component visible as such while browsing, and it is exactly how
 * the visual-regression panel already frames a capture whose background it
 * cannot account for.
 *
 * Note what it does *not* buy. `checker` carries no colour of its own — it
 * patterns over `--prism-bg-surface`, a *theme* token — and capture mode
 * strips the pattern and keeps the colour. So the surface behind an undeclared
 * component in a screenshot still follows whichever theme the runner's browser
 * started in. A variant that is under visual regression should declare `light`
 * or `dark`, the two backgrounds whose colour is absolute.
 */
export const DEFAULT_VARIANT_BG: CanvasBg = 'checker';

/**
 * The parts of a `ShowcaseConfig` that decide a variant's background.
 *
 * Declared structurally rather than imported: `ShowcaseConfig` itself lives in
 * `decorator/`, which already imports from this folder.
 */
export interface VariantBgSource {
  bg?: CanvasBg;
  variants?: readonly { bg?: CanvasBg }[];
}

/**
 * The background a variant *declares*, or `null` when it declares none.
 *
 * Priority is variant, then component. `null` is a meaningful answer — it is
 * what lets the canvas keep the user's own background choice instead of
 * overwriting it, and what makes the background pill able to say "this is your
 * choice, not the component's".
 *
 * An index with no variant behind it still answers with the component's
 * declaration: the renderer clamps an unknown `?variant=` to index 0 rather
 * than rendering nothing, so reporting `null` here would describe a state that
 * cannot occur.
 */
export function declaredVariantBg(
  config: VariantBgSource,
  variantIndex: number
): CanvasBg | null {
  return config.variants?.[variantIndex]?.bg ?? config.bg ?? null;
}

/**
 * The background a variant renders on, always resolved to a concrete value.
 *
 * This is the answer external tooling needs — a screenshot runner cannot act
 * on "nothing declared" — and the one capture mode paints, so the value
 * reported by `__PRISM_MANIFEST__` and the pixels in the capture agree.
 */
export function resolveVariantBg(
  config: VariantBgSource,
  variantIndex: number
): CanvasBg {
  return declaredVariantBg(config, variantIndex) ?? DEFAULT_VARIANT_BG;
}
