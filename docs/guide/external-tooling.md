# External Tooling API

A built Prism app is a static site. That makes it a convenient target for tools that drive it from the outside — accessibility audits, visual regression runners, link checkers, screenshot generators for a design system site.

ng-prism exposes a small, deliberately stable contract for those tools. This page is the canonical reference for it; the [Accessibility](guide/accessibility.md) and [Visual Regression](guide/visual-regression.md) guides build on it.

> These anchors are **public API**. They are covered by the same semver policy as the TypeScript surface — renaming `.demo-wrap` or `data-prism-rendered` is a breaking change, not an implementation detail.

## The Anchors

| Anchor                                                               | Where                           | Purpose                                                                                                                                            |
| -------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `window.__PRISM_MANIFEST__`                                          | global, set by `providePrism()` | Shape: `{ components: [{ className, title, meta?, variants: [{ name, index, meta? }] }], pages: [{ title }] }`. Use it to enumerate what to visit. |
| URL params `?component=<className>&variant=<index>`                  | navigation state                | Drive the app to a specific component+variant from the outside. `variant` is the array index; omit it for index `0`.                               |
| `[data-prism-rendered="<className>:<variantIndex>"]` on `.demo-wrap` | renderer host element           | Render marker — wait for this attribute to match the expected key before inspecting the variant.                                                   |
| `?capture=1`                                                         | URL param                       | [Capture isolation mode](#capture-isolation-mode) — strips canvas chrome and freezes the render for deterministic screenshots.                     |

### Enumerating what exists

`__PRISM_MANIFEST__` is a thin **discovery** view, not the full runtime manifest — it deliberately carries no Angular class references.

```js
await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.waitForFunction(() => globalThis.__PRISM_MANIFEST__ !== undefined);
const manifest = await page.evaluate(() => globalThis.__PRISM_MANIFEST__);

// manifest.components -> [{ className: 'ButtonComponent', title: 'Button',
//                          variants: [{ name: 'Primary', index: 0 }, …] }]
// manifest.pages      -> [{ title: 'Button Patterns' }]
```

`title` is the `@Showcase` display name; `className` is the class. A component with no declared variants still reports one entry: `[{ name: 'Default', index: 0 }]`.

The type is exported as `DiscoveryManifest` from `@ng-prism/core/plugin`.

### Reading `@Showcase` metadata

`meta` from the decorator is exposed on both levels, so a tool can decide how to treat a component or a single variant without a separate config file on its side. It is omitted when the decorator declares none.

```ts
@Showcase({
  title: 'Tooltip',
  variants: [
    // A tooltip only renders after hover, so a screenshot would capture the trigger.
    { name: 'Top Position', meta: { vrt: { skip: true } } },
    { name: 'Disabled' },
  ],
})
```

```js
const skip = (component, variant) =>
  variant.meta?.['vrt']?.skip ?? component.meta?.['vrt']?.skip ?? false;
```

Build-time plugin hooks write into the same `meta`, so plugin output (for example the Coverage plugin's per-component numbers) is visible here too.

> **Only JSON-safe values cross over.** The global is read through a structured-clone bridge, and `meta` is an open `Record<string, unknown>`. Primitives, arrays and plain objects are passed through; class instances (Angular types included), functions, symbols, non-finite numbers, `Date`, `Map` and DOM nodes are dropped rather than half-serialised, and cycles are broken. Unrepresentable array entries become `null` so indices stay stable. Keep anything a tool must read to plain data.

### Navigating

Set `component` (and optionally `variant`) on the URL and reload. `variant` is a 0-based index into the `variants` array; values outside the array are ignored and the app falls back to index `0`.

```js
const url = new URL(baseUrl);
url.searchParams.set('component', 'ButtonComponent');
url.searchParams.set('variant', '2');
await page.goto(url.toString(), { waitUntil: 'load' });
```

> On a bare URL with no `component` or `page` parameter, nothing is selected and **`.demo-wrap` does not exist**. Always navigate to a component before waiting for the render marker.

### Waiting for a render

`data-prism-rendered` appears on `.demo-wrap` once the component instance has been created:

```js
await page.waitForFunction(
  ([expected]) =>
    document
      .querySelector('.demo-wrap')
      ?.getAttribute('data-prism-rendered')
      ?.startsWith(expected),
  [`${comp.className}:`]
);
```

> **The marker means "instantiated", not "visually settled".** Fonts may still be swapping and transitions may still be running when it appears. For anything pixel-sensitive, see [Visual Regression](guide/visual-regression.md).

## Capture Isolation Mode

Element-scoped screenshots composite whatever is painted **behind** and **inside** the target element. For `.demo-wrap` that means the canvas dot grid, rulers, the zoom badge, the centre crosshair and any active panel overlay all end up in the image — and because the component is centred, the grid phase beneath it shifts whenever the component changes size, so an unrelated size change makes every pixel under the component differ.

Add `capture=1` to the URL to render in an isolated mode built for screenshotting:

```
http://localhost:4200/?component=ButtonComponent&variant=2&capture=1
```

Accepted as "on": `?capture`, `?capture=1`, `?capture=true`. Anything else — including `?capture=0` and `?capture=false` — is off.

When active, ng-prism:

| Effect                             | Detail                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Flattens the canvas**            | Forces the `plain` background: no dot grid, checker, rulers, crosshair, zoom badge or background pill. The background colour stays opaque. |
| **Overrides declared backgrounds** | Beats `@Showcase({ bg })`, a per-variant `bg` and any manual user override — all resolve to `plain`.                                       |
| **Locks zoom to 1**                | Persisted canvas state in `localStorage` (zoom, guides, rulers, background) is neither read nor written.                                   |
| **Suppresses overlays**            | Panel overlays render _inside_ `.demo-wrap`; in capture mode they are not rendered and lazy overlay components are never even fetched.     |
| **Freezes motion**                 | Transitions and animations are disabled document-wide — including inside your own component, via a document-level stylesheet.              |
| **Skips state restore**            | `sessionStorage` state (control-panel input overrides, a11y sub-tab) is not restored, so a previous session cannot alter what you capture. |

The mode is a single switch: there is nothing else to configure, and no config change is required — which matters when a CI job drives a prebuilt styleguide it cannot reconfigure per run.

### Detecting it

While active, the document element carries a marker attribute:

```js
await page.evaluate(() =>
  document.documentElement.hasAttribute('data-prism-capture')
);
```

You can hook your own rules onto it, for example to neutralise something specific to your library:

```css
[data-prism-capture] .my-lib-live-clock {
  visibility: hidden;
}
```

### It is read once, and never written back

The flag is parsed from the URL a single time when the app boots. ng-prism rebuilds the query string from scratch whenever navigation state changes, so `capture=1` **disappears from the address bar** on the first in-app navigation while the mode itself stays on for the lifetime of the document.

Two consequences for tooling:

- Navigating with a full page load per variant (the normal pattern) works exactly as expected — pass `capture=1` on every URL.
- Driving navigation **in-page** (clicking the sidebar, pushing history) keeps capture mode on, but the URL no longer advertises it. Do not read the mode back off `window.location`; use the `data-prism-capture` attribute instead.

### What it does not change

Capture mode leaves the surrounding shell — header, sidebar, panel area — untouched. Those sit outside `.demo-wrap` and never appear in an element-scoped screenshot. If you want to strip the whole shell for an embedding scenario, that is a different concern; see [Custom UI Sections](guide/custom-ui.md).

## Related

- [Accessibility](guide/accessibility.md) — producing an `a11y-report.json` with an external audit
- [Visual Regression](guide/visual-regression.md) — capturing and comparing screenshots
- [State Preservation](guide/url-state.md) — the full URL parameter list
