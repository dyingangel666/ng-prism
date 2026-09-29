/**
 * The canvas viewport: one nullable number, not a device list.
 *
 * The question this tool answers is "where does the layout break", not "how
 * does it look on a Pixel 8" — so the presets below are plain widths and carry
 * no device names. A name would imply a simulation the constraint does not
 * perform: it narrows the box and nothing else. Media queries still read the
 * real browser viewport; only `@container` rules respond.
 */

/** Narrower than this and the stage shows a scrollbar, not a component. */
export const VIEWPORT_MIN = 240;

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
 * them. Rendered as the "Width" group in the canvas tools menu, exactly like
 * the zoom chooser next to it.
 */
export const VIEWPORT_SNAPS: readonly number[] = [
  320, 390, 480, 640, 768, 1024,
] as const;
