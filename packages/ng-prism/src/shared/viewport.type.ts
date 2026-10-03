/**
 * The canvas viewport: one nullable number, not a device list.
 *
 * The tool is for finding where a layout breaks, so the presets are plain
 * widths without device names. A device name would suggest a simulation; the
 * constraint only narrows the box. Media queries still read the real browser
 * viewport; only `@container` rules respond.
 */

/**
 * The narrowest the constraint will go.
 *
 * Below any real device. The presets cover the widths people design against;
 * the floor lets a drag go past them to find where a layout breaks. A floor at
 * the narrowest real phone would hide that point for the components most worth
 * checking.
 */
export const VIEWPORT_MIN = 100;

/** Wide enough for a desktop breakpoint, short of the point where the stage scrolls on any realistic screen. */
export const VIEWPORT_MAX = 1600;

/** Where the toggle lands when no width has been set this session. */
export const VIEWPORT_DEFAULT = 390;

/** How near a drag has to come before it rests on a preset, in pixels. */
export const VIEWPORT_SNAP_TOLERANCE = 8;

/**
 * The named widths, as numbers.
 *
 * Common CSS breakpoints plus the two phone widths that actually differ from
 * them. Rendered as the "Width" group in the canvas tools menu, like the zoom
 * chooser next to it.
 */
export const VIEWPORT_SNAPS: readonly number[] = [320, 390, 480, 640, 768, 1024];

/**
 * `width` brought inside the legal range and onto a whole pixel.
 *
 * Lives next to the bounds, not the canvas snapping, because the service uses
 * it to keep stored and programmatic widths legal and should not import from
 * the canvas UI folder.
 *
 * Rounded, not truncated: the value is shown as a label on the canvas, and
 * `389.6 px` during a drag looks like a rendering bug.
 */
export function clampViewportWidth(width: number): number {
    return Math.round(Math.max(VIEWPORT_MIN, Math.min(VIEWPORT_MAX, width)));
}
