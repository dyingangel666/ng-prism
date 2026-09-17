/** Matches anything that already addresses a location on its own. */
const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Resolves an image path from the report against the served styleguide.
 *
 * The report records whatever paths the runner chose; where those files end up
 * in the build output is a separate decision made in `angular.json`. This is
 * the seam between the two, and it assumes nothing about either layout.
 *
 * Paths that already address a location on their own — `https:`, `data:`,
 * protocol-relative, or root-relative — are returned untouched.
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
