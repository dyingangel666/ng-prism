/** Matches anything that already addresses a location on its own. */
const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

const SLASH = '/'.charCodeAt(0);

/**
 * Drops every trailing `/` from the base.
 *
 * Deliberately not `replace(/\/+$/, '')`. That pattern is quadratic on a run
 * of slashes followed by anything else: `\/+` consumes the whole run, `$`
 * fails, and the engine retries the run one slash shorter — from every
 * starting offset in it. Measured in V8 on `'/'.repeat(n) + 'a'`, it costs
 * 56ms at n=10_000 and 902ms at n=40_000, so the growth is real and not a
 * theoretical reading of the pattern.
 *
 * Reaching it takes a base that no deployment would have: `assetBaseUrl` is
 * build-time configuration, not request data. But `resolveAssetUrl` is
 * exported from both package entries, so the base is whatever a consumer
 * hands over, and scanning backwards is both linear and a plainer statement
 * of the intent than a regex was.
 */
function withoutTrailingSlashes(base: string): string {
  let end = base.length;
  while (end > 0 && base.charCodeAt(end - 1) === SLASH) end--;
  return base.slice(0, end);
}

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

  const base = withoutTrailingSlashes(baseUrl);
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}
