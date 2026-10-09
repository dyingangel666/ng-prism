/** Matches anything that already addresses a location on its own. */
const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

const SLASH = '/'.charCodeAt(0);

/**
 * Drops every trailing `/` from the base.
 *
 * Not `replace(/\/+$/, '')`: that pattern backtracks quadratically on a run of
 * slashes followed by another character (in V8, 56ms at 10_000 slashes and
 * 902ms at 40_000). `assetBaseUrl` is build-time config, but
 * `resolveAssetUrl` is exported from both entries and takes any base, so the
 * backward scan keeps it linear.
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
 * in the build output is configured separately in `angular.json`. This joins
 * the two without assuming either layout.
 *
 * Paths that carry their own origin (`https:`, `data:` and protocol-relative)
 * are returned untouched. A root-relative path is *not* one of them: it is
 * still relative to wherever the styleguide is served from, so it is joined to
 * the base like any other path (without doubling the separator).
 */
export function resolveAssetUrl(baseUrl: string, path: string | undefined): string | undefined {
    if (!path) return undefined;
    if (ABSOLUTE.test(path)) return path;
    if (!baseUrl) return path;

    const base = withoutTrailingSlashes(baseUrl);

    return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}
