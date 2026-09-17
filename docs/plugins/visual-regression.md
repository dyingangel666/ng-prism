# Visual Regression Plugin

> **Status: implemented, not yet published.** The package lives in this repository and is wired into the test workspace, but it has not been released to npm yet — `ng add @ng-prism/plugin-visual-regression` will not resolve until it is. Everything else on this page describes shipped behaviour.

`@ng-prism/plugin-visual-regression` renders a visual regression report inside the styleguide, so per-variant screenshot diffs live next to the component they belong to instead of in a CI log.

## What It Does

- Adds a **Visual Regression** panel to the addon tab bar, shown only for components that actually have results
- Shows a **library-wide VRT pill** in the header, color-coded against your thresholds
- Opens with a **per-component summary** — changed, resized, unchanged, new, excluded, and the worst diff in the component
- Per variant: status, diff percentage, and a baseline / current / diff comparison
- Three comparison modes: **Wipe**, **Side by side**, and **Diff** (the last only when the report records a distinct diff mask alongside a current capture)
- **Zoom** at `Fit`, `1×`, `2×`, `4×`, with pixels kept as pixels — a diff is never drawn below 1:1, because a downscaled diff is one you cannot trust
- Treats a variant with no baseline yet (`new`) as a neutral state, never as a failure
- A `size-mismatch` variant opens in side-by-side, since wiping between two differently sized images overlays pixels that do not correspond

The plugin **only renders a report someone else produced**. It does no image comparison of its own — that belongs to the runner, which has the baselines and the pinned container. See [Visual Regression Testing](guide/visual-regression.md) for how to capture and compare.

> Not to be confused with the [Figma plugin](plugins/figma.md)'s Design Diff, which compares a live component against a Figma design in the browser. That is a different feature that happens to share the presentation problem.

## Install

```bash
ng add @ng-prism/plugin-visual-regression
```

## Configuration

```typescript
// prism.config.ts
import { defineConfig } from '@ng-prism/core';
import { visualRegressionPlugin } from '@ng-prism/plugin-visual-regression';

export default defineConfig({
  plugins: [
    visualRegressionPlugin({
      reportPath: 'coverage/my-lib/vrt-report.json',
      assetBaseUrl: 'assets/',
    }),
  ],
});
```

## Options

| Option         | Default             | Description                                                                                                                         |
| -------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `reportPath`   | `'vrt-report.json'` | Path to the report JSON, relative to the workspace root. Read at build time.                                                        |
| `assetBaseUrl` | `''`                | Prefix applied to the image paths in the report to resolve them against the served styleguide. Empty means paths are used as given. |
| `thresholds`   | `{ score: 100 }`    | Minimum acceptable score before the header pill turns orange, then red.                                                             |

### Serving the images

The report references images by path. Those files must be reachable from the built styleguide, which means copying them in via the `assets` array of your Prism app's `angular.json` target — the same way you already surface `coverage-summary.json` or `a11y-report.json`.

```jsonc
// angular.json — my-lib-prism build target
"assets": [
  { "glob": "**/*", "input": "vrt", "output": "assets/vrt" }
]
```

`assetBaseUrl` then bridges the gap between the paths recorded in the report and where the files actually land in the build output. Nothing about the layout is assumed.

It is **prepended to** the recorded path, not substituted for it, so the three values have to line up:

| Recorded in the report | `assetBaseUrl` | Requested URL                  |
| ---------------------- | -------------- | ------------------------------ |
| `vrt/baseline/x.png`   | `assets/`      | `assets/vrt/baseline/x.png` ✅ |
| `vrt/baseline/x.png`   | `vrt/`         | `vrt/vrt/baseline/x.png` ❌    |

The pairing above is the one this repository's own test workspace uses, and it is the reason the report records workspace-relative paths rather than URLs: the runner does not have to know where the styleguide will serve them from.

## Report Format

Your runner writes this file; the plugin reads it.

```jsonc
{
  "total": {
    "auditedVariants": 85,
    "auditedComponents": 10,
    "unchanged": 84,
    "changed": 1,
    "sizeMismatch": 0,
    "new": 0,
    "maxDiffRatio": 0.5,
    "score": 99 // percent of comparable variants that are unchanged
  },
  "byVariant": [
    {
      "className": "ButtonComponent",
      "title": "Button",
      "variantName": "Primary",
      "variantIndex": 0,
      "status": "changed", // unchanged | changed | size-mismatch | new | excluded
      "width": 800,
      "height": 2,
      "diffPixels": 800,
      "totalPixels": 1600,
      "diffRatio": 0.5,
      "baselinePath": "vrt/baseline/ButtonComponent/00-primary.png",
      "currentPath": "vrt/current/ButtonComponent/00-primary.png",
      "diffPath": "vrt/diff/ButtonComponent/00-primary.png",
      "bg": "light", // the surface this run captured on
      "baselineBg": "light" // the surface the stored baseline was captured on
    }
  ]
}
```

`total` is required and drives the header pill. `byVariant` is matched to components by `className`.

### Status values

| Status          | Meaning                                    | Rendering                              |
| --------------- | ------------------------------------------ | -------------------------------------- |
| `unchanged`     | Pixel-identical to the baseline            | Green                                  |
| `changed`       | Differs from the baseline                  | Red, with the diff percentage          |
| `size-mismatch` | Dimensions changed, so no pixel comparison | Orange                                 |
| `new`           | No baseline recorded yet                   | **Neutral** — explicitly not a failure |

`new` is neutral by design. A newly added variant has nothing to regress against, and a runner that does not fail its build on it should not be contradicted by a red panel.

### Image paths

| Field          | Required | Purpose                        |
| -------------- | -------- | ------------------------------ |
| `baselinePath` | no       | The committed reference image  |
| `currentPath`  | no       | The image captured on this run |
| `diffPath`     | no       | The generated diff mask        |

All three are optional and the panel degrades gracefully:

- **`baselinePath` + `currentPath`** — a before/after comparison, with the diff available as a toggle. This is the useful view.
- **`baselinePath` + `diffPath` only** — comparison falls back to baseline against the diff mask.
- **`new` status** — shows `currentPath` alone, or a "no baseline yet" note.
- **`excluded` status** — for variants a runner deliberately skipped, because they cannot be captured meaningfully (a tooltip that only renders on hover would be screenshotted as its trigger). Shown as a neutral row with the runner's `reason`, and no comparison modes, since nothing was captured. Reported rather than dropped so the skipped set stays visible instead of quietly shrinking coverage. Neither `new` nor `excluded` is framed as a fault.

### Backgrounds

| Field        | Required | Purpose                                            |
| ------------ | -------- | -------------------------------------------------- |
| `bg`         | no       | The canvas background this run captured on         |
| `baselineBg` | no       | The background the stored baseline was captured on |

Both take a `CanvasBg` value (`light`, `dark`, `dots`, `plain`, `checker`). A runner gets `bg` for free: it is the resolved [`bg` on the variant](guide/external-tooling.md#reading-the-background) it already read from `__PRISM_MANIFEST__` to drive the app. `baselineBg` requires the runner to store the background next to the baseline image.

They buy two things in the panel:

- **The frame under a capture** is painted in the recorded colour instead of the transparency checkerboard. This matters for the diff mask, whose unchanged pixels a comparator typically leaves transparent — on a checkerboard a dark variant's diff is unreadable. Only `light` and `dark` produce a colour; `dots`, `plain` and `checker` resolve to the themed surface, which the panel cannot know the runner's value for, so those keep the checkerboard. For `checker` — which is also what a variant with no declared background resolves to — that is simply the honest rendering.
- **A named cause for a 100% diff.** With both fields present and different, the panel says the background moved from one surface to the other instead of leaving a reviewer to hunt a regression in an untouched component.

Both are optional throughout. A report without them renders exactly as before.

## Related

- [Visual Regression Testing](guide/visual-regression.md) — capturing screenshots that do not flake
- [External Tooling API](guide/external-tooling.md) — the contract for driving the app
- [Coverage Plugin](plugins/coverage.md) — the same build-time-report pattern for test coverage
