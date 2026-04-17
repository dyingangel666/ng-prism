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
