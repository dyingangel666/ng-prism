# Theming

ng-prism uses CSS custom properties for all visual styling. Override any property via `defineConfig({ theme })` or a custom stylesheet.

## Quick Override

```typescript
// prism.config.ts
import { defineConfig } from '@ng-prism/core';

export default defineConfig({
  theme: {
    '--prism-primary':      '#0ea5e9',
    '--prism-primary-from': '#0ea5e9',
    '--prism-primary-to':   '#6366f1',
    '--prism-bg':           '#0f172a',
    '--prism-font-sans':    '"Inter", system-ui, sans-serif',
  },
});
```

Values in `theme` are merged on top of the built-in defaults. You only need to specify the properties you want to change.

## Theme-Specific Overrides

Use `darkTheme` and `lightTheme` to set values that only apply in one mode:

```typescript
export default defineConfig({
  theme: {
    '--prism-primary': '#0056CE',
    '--prism-font-sans': "'Inter', system-ui, sans-serif",
  },
  darkTheme: {
    '--prism-bg': '#0a1628',
    '--prism-bg-surface': '#112240',
  },
  lightTheme: {
    '--prism-bg': '#ffffff',
    '--prism-bg-surface': '#f5f6f7',
  },
});
```

**Merge order:** `built-in defaults → darkTheme/lightTheme → theme`. The `theme` property always wins when the same key appears in both.

## Custom Stylesheet

For more complex theming (custom fonts, additional utilities, SCSS variables), point `themeStylesheet` at a file in your showcase app:

```typescript
export default defineConfig({
  themeStylesheet: 'projects/my-lib-prism/src/theme.scss',
});
```

## Color Properties

| Property | Default (dark) | Default (light) | Description |
|----------|----------------|-----------------|-------------|
| `--prism-primary` | `#a78bfa` | `#7c3aed` | Accent color for interactive elements |
| `--prism-primary-from` | `#7c3aed` | `#7c3aed` | Gradient start for primary UI elements |
| `--prism-primary-to` | `#3b82f6` | `#3b82f6` | Gradient end for primary UI elements |
| `--prism-accent` | `#ec4899` | `#db2777` | Secondary accent / highlights |
| `--prism-bg` | `#0d0b1c` | `#ffffff` | Main background |
| `--prism-bg-surface` | `#131022` | `#faf9fd` | Elevated surface (panels, cards) |
| `--prism-bg-elevated` | `#1a1535` | `#ffffff` | Further elevated surface (dropdowns, tooltips) |
| `--prism-void` | `#07050f` | `#f7f5fc` | Deepest background (canvas backdrop) |

## Text Properties

| Property | Default (dark) | Default (light) | Description |
|----------|----------------|-----------------|-------------|
| `--prism-text` | `#ede9f8` | `#1c1530` | Primary text |
| `--prism-text-2` | `#b0a6c8` | `#4d4266` | Secondary text |
| `--prism-text-muted` | `#8476a2` | `#6b5e80` | Muted / placeholder text |
| `--prism-text-ghost` | `#6a5d87` | `#b0a6c8` | Disabled / ghost text |

## Status Colors

| Property | Default (dark) | Default (light) | Description |
|----------|----------------|-----------------|-------------|
| `--prism-success` | `#34d399` | `#059669` | Success state |
| `--prism-warn` | `#fbbf24` | `#d97706` | Warning state |
| `--prism-danger` | `#f87171` | `#dc2626` | Danger / error state |

## Code Syntax Colors

| Property | Default (dark) | Default (light) | Description |
|----------|----------------|-----------------|-------------|
| `--prism-code-tag` | `#f472b6` | `#be185d` | HTML/XML tag names |
| `--prism-code-attr` | `#60a5fa` | `#1d4ed8` | Attribute names, JSON keys |
| `--prism-code-str` | `#86efac` | `#047857` | String values |
| `--prism-code-com` | `#6a5d87` | `#6b5e80` | Comments |

## Border & Glow Properties

| Property | Description |
|----------|-------------|
| `--prism-border` | Default border color |
| `--prism-border-strong` | Emphasized border (focus rings, active state) |
| `--prism-glow` | Subtle glow for interactive focus |
| `--prism-glow-strong` | Stronger glow for primary focus rings |
| `--prism-input-bg` | Background for form inputs in the Controls panel |
| `--prism-dot` | Canvas dot-grid color |

## Base Tokens (theme-independent)

These tokens are set once and do not change between dark/light mode.

| Property | Default | Description |
|----------|---------|-------------|
| `--prism-void-light` | `#f7f5fc` | Fixed light canvas background (for explicit `light` canvas mode) |
| `--prism-void-dark` | `#07050f` | Fixed dark canvas background (for explicit `dark` canvas mode) |
| `--prism-text-light` | `#ede9f8` | Light text for overlays on dark backgrounds |
| `--prism-header-height` | `52px` | Height of the top header bar |

## Typography

| Property | Default | Description |
|----------|---------|-------------|
| `--font-sans` | `'Inter', system-ui, sans-serif` | Base sans-serif font stack |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` | Base monospace font stack |
| `--prism-font-sans` | `var(--font-sans)` | Sans-serif font stack (UI chrome) |
| `--prism-font-mono` | `var(--font-mono)` | Monospace font stack (code snippets, JSON editor) |

## Font Sizes

| Property | Size |
|----------|------|
| `--fs-xs` | 10px |
| `--fs-sm` | 11.5px |
| `--fs-md` | 12.5px |
| `--fs-lg` | 13.5px |
| `--fs-xl` | 15px |
| `--fs-2xl` | 22px |

## Border Radius

| Property | Size |
|----------|------|
| `--radius-xs` | 3px |
| `--radius-sm` | 5px |
| `--radius-md` | 7px |
| `--radius-lg` | 10px |

## Timing

| Property | Value |
|----------|-------|
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--dur-fast` | 0.12s |
| `--dur-base` | 0.2s |
| `--dur-slow` | 0.3s |

## Dark and Light Themes

ng-prism ships with a dark theme by default. A light theme variant is also available. To enable the light theme, add the `prism-theme-light` class to the document root or use the built-in theme toggle button in the header toolbar.

The light theme maps the same custom properties to lighter values — your `theme` overrides apply to both unless you target the `.prism-theme-light` selector explicitly in `themeStylesheet`.

## Scoping

All ng-prism CSS uses the `prism-` class prefix. Because the showcase renders without an iframe, your library's styles and ng-prism's chrome coexist in the same document. ng-prism's properties are scoped to `.prism-shell`, so they will not bleed into your rendered component canvas.
