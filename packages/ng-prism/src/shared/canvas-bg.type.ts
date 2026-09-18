export type CanvasBg =
  | 'dots'
  | 'plain'
  | 'light'
  | 'dark'
  | 'checker'
  | 'transparent';

/**
 * Every value {@link CanvasBg} accepts.
 *
 * This is the type's value list, not the list a user can cycle through — the
 * canvas toolbar keeps its own, deliberately shorter one. Persisted canvas
 * state is validated against *this* list, so a value that only a decorator can
 * declare still round-trips rather than being discarded as unknown.
 */
export const CANVAS_BGS: readonly CanvasBg[] = [
  'dots',
  'plain',
  'light',
  'dark',
  'checker',
  'transparent',
] as const;
