/** Matches anything that already addresses a location on its own. */
const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Resolves an image path from the report against the served styleguide.
 *
 * The report records whatever paths the runner chose; where those files end up
 * in the build output is a separate decision made in `angular.json`. This is
 * the seam between the two, and it assumes nothing about either layout.
 *
 * Paths that carry their own origin — `https:`, `data:` and protocol-relative
 * — are returned untouched. A root-relative path is *not* one of them: it is
 * still relative to wherever the styleguide is served from, so it is joined to
 * the base like any other path (without doubling the separator).
 */
export function resolveAssetUrl(
  baseUrl: string,
  path: string | undefined
): string | undefined {
  if (!path) return undefined;
  if (ABSOLUTE.test(path)) return path;
  if (!baseUrl) return path;
  if (path.startsWith('/')) return `${baseUrl.replace(/\/+$/, '')}${path}`;
  return `${baseUrl.replace(/\/+$/, '')}/${path}`;
}
