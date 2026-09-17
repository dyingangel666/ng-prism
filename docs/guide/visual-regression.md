# Visual Regression Testing

A built Prism app already knows every component and every variant in your library, and can be driven to any one of them from a URL. That makes it a natural source of truth for per-variant screenshot testing: one baseline image per variant, re-captured on every build and compared pixel by pixel.

ng-prism does **not** ship a screenshot runner. Capturing and comparing belongs to your CI container, which owns the baselines, the browser version and the font stack — the three things that decide whether a diff is real. What ng-prism provides is a stable contract to drive the app and a rendering mode that makes the output deterministic.

> If you want the results rendered back inside the styleguide instead of only in a CI log, see the [Visual Regression plugin](plugins/visual-regression.md).

## The capture target

**`.demo-wrap` is the element to screenshot**, and it is [public API](guide/external-tooling.md) — not an implementation detail.

It is the innermost wrapper around your rendered component: it carries the `data-prism-rendered` marker you already wait on, and it hugs the component's own box rather than the canvas around it.

```js
const shot = await page.locator('.demo-wrap').screenshot();
```

## The three things that make screenshots flaky

### 1. The render marker means "instantiated", not "settled"

`data-prism-rendered` appears as soon as the component instance exists. At that moment fonts may still be swapping, transitions may still be running, and images may still be decoding. The attribute's name invites the assumption that it means "done" — it does not.

For pixel work, wait for the marker **and then** for the page to settle:

```js
await page.waitForFunction(/* … data-prism-rendered … */);
await page.evaluate(() => document.fonts.ready);
```

Web-font loading is the single most common source of one-off diffs: a variant captured before the face swaps in is rendered in the fallback family, and every glyph moves.

### 2. An element screenshot includes what is painted behind it

Playwright (and every other driver) clips the **composited page** to the element's box. It does not render the element in isolation. Library components usually have no background of their own, so whatever the canvas paints shows through: the dot grid, the centre crosshair, rulers, the zoom badge.

That is worse than merely noisy. The component is centred in the stage, so the grid phase underneath it shifts whenever the component changes size — meaning a change to one variant's padding makes **every pixel** under it differ, and a real regression disappears into the noise.

### 3. Motion and persisted UI state

Transitions inside your own component, a zoom level left over in `localStorage` from a previous session, an a11y overlay left active on the panel — all of them land in the image.

## Capture isolation mode

`?capture=1` solves all three of the state-related problems in one switch. See [Capture Isolation Mode](guide/external-tooling.md#capture-isolation-mode) for the full behaviour table; in short it strips the canvas down to an opaque, patternless background — keeping the colour a `@Showcase({ bg })` or per-variant `bg` declared — locks zoom to 1, suppresses panel overlays, freezes transitions and animations document-wide, and ignores persisted session state.

### The background is part of the baseline

A variant declares `bg` because that is the surface it has to work on — an outlined button on `dark` proves nothing screenshotted on a light default. Capture mode therefore keeps the declared colour, and the manifest tells you which one it is: every variant carries a resolved [`bg`](guide/external-tooling.md#reading-the-background), so the value you read and the pixels you get agree.

Two consequences for a runner:

- **Record it next to the baseline.** A variant whose `bg` changes compares a capture on one surface against a baseline on another: every pixel differs while the component is untouched. Storing the background alongside the baseline image is what lets you tell that apart from a regression — and the report has fields for both (`bg`, `baselineBg`).
- **Declare `light` or `dark` on anything you baseline.** They are absolute colours (`--prism-void-light`, `--prism-void-dark`) and flat. `dots`, `plain` and `checker` resolve to `--prism-bg-surface`, a theme token, so a capture on one of them is only as stable as the browser profile's theme.

With nothing declared a variant resolves to `checker` (`DEFAULT_VARIANT_BG`) — an honest "no surface declared", but not a stable one for a baseline: capture mode strips the pattern and leaves the themed colour behind it. Treat an undeclared `bg` on a variant you are baselining as a gap to fill, not as a default to rely on.

```
http://localhost:4200/?component=ButtonComponent&variant=2&capture=1
```

No config change is required, which is the point: a CI job can drive a styleguide that was built without knowing it would ever be screenshotted.

## A worked example

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

// 1. Discover what exists.
await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.waitForFunction(() => globalThis.__PRISM_MANIFEST__ !== undefined);
const manifest = await page.evaluate(() => globalThis.__PRISM_MANIFEST__);

for (const comp of manifest.components) {
  for (const variant of comp.variants) {
    // 2. Navigate, in capture mode.
    const url = new URL(baseUrl);
    url.searchParams.set('component', comp.className);
    if (variant.index > 0)
      url.searchParams.set('variant', String(variant.index));
    url.searchParams.set('capture', '1');
    await page.goto(url.toString(), { waitUntil: 'load' });

    // 3. Wait for the component instance…
    await page.waitForFunction(
      ([expected]) =>
        document
          .querySelector('.demo-wrap')
          ?.getAttribute('data-prism-rendered')
          ?.startsWith(expected),
      [`${comp.className}:`]
    );

    // 4. …and then for the page to settle.
    await page.evaluate(() => document.fonts.ready);

    // 5. Capture. `variant.bg` is the surface it was captured on — record it
    //    with the baseline so a background change is not read as a regression.
    const png = await page.locator('.demo-wrap').screenshot();
    await compareAgainstBaseline(
      comp.className,
      variant.index,
      png,
      variant.bg
    );
  }
}

await browser.close();
```

Pin `deviceScaleFactor` explicitly. A retina default doubles every dimension and invalidates every baseline captured without it.

## Baselines are environment-specific

Font hinting, subpixel rendering and text rasterisation differ between macOS and Linux, and between browser versions. The same component captured on a developer laptop and in CI will differ by hundreds of pixels while being visually identical.

**Baselines belong in the same container that runs the comparison.** In practice:

- Capture and compare inside one pinned container image (the Playwright images pin both the browser and the font set).
- Commit baselines produced by that image, never ones produced locally.
- Treat a browser or base-image bump as a deliberate baseline refresh, in its own commit.

## CI integration: keep the gate away from the deploy

A screenshot runner produces two independent things: the **report** and an **exit code**. Wiring them into one chain is the most common way to make visual regression testing useless.

Consider the obvious pipeline:

```bash
# Broken: && stops the chain on the first regression
ng run my-lib:prism-build && npm run test:vrt && ng run my-lib:prism-build && deploy
```

The moment a variant changes, the runner exits non-zero, `&&` aborts, the second build never embeds the report and the styleguide is never deployed. The report exists on disk and nobody can look at it — precisely when you need it. The gate has eaten the tool that explains the gate.

Separate the two concerns. The gate blocks the _merge_; it must not block the _deploy_:

```bash
# 1. Build once so the runner has something to drive
ng run my-lib:prism-build

# 2. Capture and compare — always write the report, never fail here
npm run test:vrt -- --no-fail

# 3. Rebuild so the plugin embeds the report, then publish
ng run my-lib:prism-build
npm run deploy:styleguide

# 4. Now evaluate the result and fail the job
npm run test:vrt:gate
```

The job still turns red and the pull request is still blocked — but the styleguide is deployed, and the link you open shows exactly the diffs that turned it red.

Two practical notes:

- **Your runner needs a way to not fail.** Write the report before checking thresholds, and put the threshold check behind a flag (`--no-fail`, or a separate gate command that re-reads the report). If the runner can only ever exit non-zero, nothing above can help you.
- **In GitHub Actions, put `if: always()` on the build and deploy steps.** Without it a failing earlier step skips them even when the shell chain would have continued.

As two jobs instead of one sequence, the same idea reads more clearly: a `styleguide` job that always deploys, and a `vrt-gate` job marked as a required check. Both read the same report.

### Which audience looks where

The styleguide report and the pull request serve different readers, and conflating them causes disappointment:

- **In the pull request** you want to answer "is this change intended?". That wants the diff images close to the review — a job artifact or a PR comment. Unless you deploy a styleguide per pull request, the deployed report describes a different commit than the one under review.
- **In the styleguide** the report describes the state of your main branch: which variants drifted, which have no baseline yet. That is documentation, not gate feedback.

If you already deploy a preview styleguide per pull request, the two collapse into one and the separation above pays off twice.

## Sizing caveat: stretch variants

A variant using `canvasLayout: 'stretch'` renders as `width: 100%; max-width: 800px`. Above 800px of available canvas the width is clamped and fully deterministic. Below it — a narrow viewport, a wide sidebar, a tall open panel — the captured width follows the canvas.

Capture mode deliberately leaves the shell alone, so if you have stretch variants, pin the viewport size in your runner (as the example above does) and keep it stable across runs.

## Report format

If you want the results surfaced in the styleguide itself, the [Visual Regression plugin](plugins/visual-regression.md) reads a JSON report your runner writes. The shape is documented there.

## Related

- [External Tooling API](guide/external-tooling.md) — the anchors and capture mode in full
- [Accessibility](guide/accessibility.md) — the same pattern applied to axe-core audits
- [Visual Regression plugin](plugins/visual-regression.md) — rendering the report in the styleguide
