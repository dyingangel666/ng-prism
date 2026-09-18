import type { CanvasBg } from './canvas-bg.type.js';

/**
 * The surface a variant is reported to render on when nothing declares one.
 *
 * An undeclared variant is the "no opinion" case, and `transparent` is the
 * honest capture of no opinion. The alternative, `checker`, patterns over
 * `--prism-bg-surface` — a *theme* token — and capture mode strips the pattern
 * and keeps the colour, so an undeclared variant used to be photographed on
 * whichever theme the runner's browser happened to start in. That is not a
 * neutral default; it is the runner's theme leaking into a baseline. Alpha
 * carries no such dependency, and it is not the thing capture mode's
 * determinism argument rules out: a pattern has a phase that shifts when a
 * centred component resizes, an alpha channel is a per-pixel value that does
 * not move.
 *
 * In the app both values look identical — `transparent` renders as the same
 * checkerboard, which is the UI's way of saying "no surface here". The change
 * is only visible in a capture.
 *
 * The cost is real and worth stating plainly: a runner that does not pass
 * `omitBackground: true` gets an opaque capture over whatever the browser
 * painted, because the page's own backdrop is below every stylesheet. See
 * `docs/guide/visual-regression.md#capturing-transparency`.
 *
 * What to declare, now that the default no longer decides it for you:
 *
 * - `light` or `dark` when the component was designed against a surface.
 *   Their colours are absolute rather than theme tokens, which is what makes
 *   them stable across runners.
 * - `transparent` when the component's own transparency is the thing under
 *   test — an outlined button, an icon, a divider. Flattening one onto an
 *   opaque colour makes a transparent fill and a painted fill produce the
 *   same pixels.
 * - `dots`, `plain` or `checker` for browsing. All three follow the active
 *   theme, so a baseline recorded on one is only as stable as the theme.
 */
export const DEFAULT_VARIANT_BG: CanvasBg = 'transparent';

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
