/**
 * A surface the canvas can paint behind a component.
 *
 * Three groups, and the distinction only matters once a variant is under
 * visual regression. `light` and `dark` are absolute colours. `dots` and
 * `plain` follow the active theme. `transparent` has no colour at all and is
 * the only one whose capture carries an alpha channel.
 */
export type CanvasBg =
  | 'dots'
  | 'plain'
  | 'light'
  | 'dark'
  /**
   * @deprecated Deprecated since 22.2.0, removed in 23.0.0. It draws the same
   * checkerboard as `transparent` while browsing, so the canvas cannot tell
   * the two apart — but it captures as `--prism-bg-surface`, a *theme* token,
   * which makes a baseline recorded on it depend on the theme the runner's
   * browser started in. Use `transparent` for the same look with a capture
   * that keeps its alpha, or `light`/`dark` for an absolute colour.
   */
  | 'checker'
  | 'transparent';

/**
 * Every value {@link CanvasBg} accepts, deprecated ones included.
 *
 * Also the list the canvas toolbar renders. That group is a readout as much as
 * a control — it marks the active and the recommended background — so a value
 * missing from it is a value the UI cannot *show*, not merely one it declines
 * to offer. Persisted canvas state is validated against this list too, so a
 * value only a decorator can reach still round-trips.
 */
export const CANVAS_BGS: readonly CanvasBg[] = [
  'dots',
  'plain',
  'light',
  'dark',
  'checker',
  'transparent',
] as const;
