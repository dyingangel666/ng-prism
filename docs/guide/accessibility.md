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

## Build-Time Audit & Header Badge

Beyond the live runtime audit, ng-prism ships a CLI tool that audits the **entire library** with headless Chromium and produces a JSON report. The report is consumed at build-time and surfaces as a color-coded **A11y pill** in the header — green/orange/red depending on whether the library meets your thresholds.

### 1. Install peer dependencies (audit-only)

```bash
npm install --save-dev playwright axe-core
npx playwright install chromium
```

Both `playwright` and `axe-core` are **optional** peerDeps — only required if you actually run the audit CLI.

### 2. Build the Prism app

```bash
npx nx run my-lib-prism:build
```

### 3. Run the audit

```bash
npx ng-prism-audit-a11y \
  --dist dist/my-lib-prism \
  --output a11y-report.json \
  --score 80 \
  --max-critical 0 \
  --max-serious 0
```

The CLI starts a static server on the built output, navigates Chromium to every `@Showcase` component × variant, runs axe-core on each, aggregates a library-wide score, and writes `a11y-report.json`. Exits non-zero when thresholds are violated.

### 4. Re-build to surface the report

```bash
npx nx run my-lib-prism:build
```

The build pipeline reads `a11y-report.json` and embeds the aggregate data into the runtime manifest. The header now shows the A11y pill.

### Configure thresholds in ng-prism.config.ts

```typescript
import { defineConfig } from '@ng-prism/core';

export default defineConfig({
  a11y: {
    thresholds: {
      score: 85,
      critical: 0,
      serious: 0,
      moderate: 5,
    },
    reportPath: 'a11y-report.json',
  },
});
```

These thresholds are used **both** by the build pipeline (build fails on violation) and by the header pill (color-coding).

### CLI options

| Flag | Default | Description |
|---|---|---|
| `--dist <path>` | _required_ | Path to the built Prism app (contains `index.html`) |
| `--output <file>` | `a11y-report.json` | Report output path |
| `--port <n>` | `4317` | Static-server port |
| `--include A,B` | _all_ | Only audit these component class names |
| `--exclude A,B` | none | Skip these component class names |
| `--score <n>` | `80` | Minimum library-wide avg score |
| `--max-critical <n>` | `0` | Allowed critical violations |
| `--max-serious <n>` | `0` | Allowed serious violations |
| `--max-moderate <n>` | unlimited | Allowed moderate violations |
| `--no-fail` | — | Write report but never exit non-zero |

### CI integration

```yaml
- run: npx nx run my-lib:test --coverage
- run: npx nx run my-lib-prism:build
- run: npx ng-prism-audit-a11y --dist dist/my-lib-prism
- run: npx nx run my-lib-prism:build   # second build embeds the report
```

The second build is intentional — the first build doesn't yet have the report. CI fails when the audit step fails, the second build only runs after a clean audit.

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
