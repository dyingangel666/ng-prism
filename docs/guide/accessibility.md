# Built-in Accessibility Auditing

ng-prism includes a comprehensive accessibility panel powered by [axe-core](https://github.com/dequelabs/axe-core). No plugin required — it's part of the core.

## Features

The A11y panel has four sub-tabs:

### Violations

Runs an axe-core audit against the currently rendered component variant. Results are sorted by impact level:

| Level | Color | Meaning |
|---|---|---|
| Critical | Red | Must fix — blocks users entirely |
| Serious | Orange | Should fix — significant barrier |
| Moderate | Yellow | Consider fixing — some users affected |
| Minor | Blue | Nice to fix — minor inconvenience |

The audit re-runs automatically when you switch variants or change input values in the Controls panel. A score ring visualizes the pass rate.

### Keyboard Navigation

Analyzes the component's keyboard accessibility:

- Tab order visualization with numbered indicators
- Focus trap detection
- Missing `tabindex` warnings
- Overlay with indigo-colored focus indicators on the rendered component

### ARIA Tree

Displays the component's ARIA role hierarchy as a tree structure:

- Roles, states, and properties for each element
- Highlights missing or incorrect ARIA attributes
- Shows the accessible name computation

### Screen Reader

Simulates how a screen reader would interpret the component:

- **List mode** (visual perspective) — shows all announced elements
- **Player mode** (screen reader perspective) — step-by-step navigation with previous/next controls
- Violet overlay indicators on the rendered component

## Perspective Toggle

The renderer toolbar includes a perspective toggle:

- **Visual** — default view, component rendered normally
- **Screen Reader** — canvas dims, overlay shows SR-announced elements

The active perspective affects which overlays are visible (Keyboard uses indigo, Screen Reader uses violet).

## Configuration

### Per-component rules

Use the `meta` field on `@Showcase` to configure axe-core rules for specific components:

```typescript
@Showcase({
  title: 'Dialog',
  meta: {
    a11y: {
      rules: {
        'color-contrast': { enabled: false },  // disable specific rule
        'aria-required-attr': { enabled: true },
      },
    },
  },
})
```

### Disabling for a component

```typescript
@Showcase({
  title: 'Decorative Icon',
  meta: {
    a11y: { disable: true },
  },
})
```

When disabled, the A11y panel shows a message instead of running the audit.

## Library-Wide A11y Score & Header Badge

Beyond the live runtime audit, ng-prism can surface a **library-wide** A11y score as a color-coded **pill in the header** — green/orange/red depending on whether the library meets your thresholds.

ng-prism does **not** generate the score itself. Producing an aggregate audit is the consumer's responsibility (same pattern as `coverage-summary.json` for the coverage plugin). ng-prism only **reads** an `a11y-report.json` you place in your workspace.

### 1. Produce `a11y-report.json` in your library project

Write the report at build time using any tool you like — headless browsers + axe-core (Playwright/Puppeteer), an Nx target wrapping `@axe-core/cli`, or your own script. The Prism app exposes a global `window.__PRISM_MANIFEST__` with `{ components: [{ className, variants: [{ name, index }] }], pages: [{ title }] }` so audit scripts can discover what to audit.

The file must match this JSON shape:

```json
{
  "total": {
    "score": 92,
    "violations": 3,
    "critical": 0,
    "serious": 0,
    "moderate": 2,
    "minor": 1,
    "passes": 145,
    "incomplete": 0,
    "auditedComponents": 18,
    "auditedVariants": 47
  },
  "components": {
    "ButtonComponent": { "score": 100, "violations": 0, "critical": 0, "serious": 0, "moderate": 0, "minor": 0, "passes": 12, "incomplete": 0 }
  },
  "generatedAt": "2026-06-01T10:00:00.000Z"
}
```

`total` is required and drives the header pill. `components` is optional (per-component breakdown for tooltips/drilldown). `generatedAt` is informational.

### 2. Point ng-prism at the report

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core';

export default defineConfig({
  a11y: {
    reportPath: 'a11y-report.json', // relative to workspace root (default)
    thresholds: {
      score: 85,
      critical: 0,
      serious: 0,
      moderate: 5,
    },
  },
});
```

Thresholds are used **both** by the build pipeline (build fails on violation) and by the header pill (color-coding).

### 3. Build the Prism app

```bash
npx nx run my-lib-prism:build
```

The build pipeline reads `a11y-report.json` and embeds the aggregate data into the runtime manifest. The header pill renders if the file exists. If `reportPath` doesn't resolve, the pill is silently omitted.

### CI integration

```yaml
- run: npx nx run my-lib:test --coverage
- run: npx nx run my-lib:audit-a11y      # your audit script — writes a11y-report.json
- run: npx nx run my-lib-prism:build     # reads the report into the manifest
```

## Peer Dependency

`axe-core` must be installed in your workspace:

```bash
npm install axe-core
```

Add it to `allowedCommonJsDependencies` in your prism app's `angular.json` build options to suppress the CommonJS warning:

```json
"allowedCommonJsDependencies": ["axe-core"]
```

## How It Works

The A11y system consists of several services:

| Service | Responsibility |
|---|---|
| `A11yAuditService` | Runs axe-core against the rendered DOM element |
| `A11yKeyboardService` | Analyzes tab order and focus behavior |
| `A11yTreeService` | Builds the ARIA role tree from DOM |
| `A11ySrService` | Generates screen reader announcement sequence |
| `A11yPerspectiveService` | Manages visual/screen-reader perspective toggle |
| `A11yPanelStateService` | Tracks active sub-tab for overlay visibility |

The audit uses `PrismRendererService.renderedElement` signal to access the component's DOM element. When the element or input values change, the audit debounces (500ms) and re-runs automatically.
