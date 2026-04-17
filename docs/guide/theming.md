# Theming

ng-prism uses CSS custom properties for all visual styling. Override any property via `defineConfig({ theme })` or a custom stylesheet.

## Quick Override

```typescript
// prism.config.ts
import { defineConfig } from 'ng-prism';

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

## Custom Stylesheet

For more complex theming (custom fonts, additional utilities, SCSS variables), point `themeStylesheet` at a file in your showcase app:

```typescript
export default defineConfig({
  themeStylesheet: 'projects/my-lib-prism/src/theme.scss',
});
```

## Color Properties

| Property | Default (dark) | Description |
|----------|----------------|-------------|
| `--prism-primary` | `#6366f1` | Accent color for interactive elements |
| `--prism-primary-from` | `#6366f1` | Gradient start for primary UI elements |
| `--prism-primary-to` | `#8b5cf6` | Gradient end for primary UI elements |
| `--prism-accent` | `#a78bfa` | Secondary accent / highlights |
| `--prism-bg` | `#0f172a` | Main background |
| `--prism-bg-surface` | `#1e293b` | Elevated surface (panels, cards) |
| `--prism-bg-elevated` | `#334155` | Further elevated surface (dropdowns, tooltips) |
| `--prism-void` | `#020617` | Deepest background (canvas backdrop) |
| `--prism-sidebar-bg` | `#0f172a` | Sidebar background (can differ from main bg) |

## Text Properties

| Property | Default (dark) | Description |
|----------|----------------|-------------|
| `--prism-text` | `#f1f5f9` | Primary text |
| `--prism-text-2` | `#cbd5e1` | Secondary text |
| `--prism-text-muted` | `#94a3b8` | Muted / placeholder text |
| `--prism-text-ghost` | `#475569` | Disabled / ghost text |

## Border & Glow Properties

| Property | Description |
|----------|-------------|
| `--prism-border` | Default border color |
| `--prism-border-strong` | Emphasized border (focus rings, active state) |
| `--prism-glow` | Subtle glow for interactive focus |
| `--prism-glow-strong` | Stronger glow for primary focus rings |

## Layout Properties

| Property | Description |
|----------|-------------|
| `--prism-header-height` | Height of the top header bar |
| `--prism-toolbar-height` | Height of the renderer toolbar |
| `--prism-input-bg` | Background for form inputs in the Controls panel |

## Typography

| Property | Description |
|----------|-------------|
| `--prism-font-sans` | Sans-serif font stack (UI chrome) |
| `--prism-font-mono` | Monospace font stack (code snippets, JSON editor) |

## Border Radius

| Property | Size |
|----------|------|
| `--prism-radius-xs` | 2px |
| `--prism-radius-sm` | 4px |
| `--prism-radius` | 6px |
| `--prism-radius-lg` | 10px |

## Dark and Light Themes

ng-prism ships with a dark theme by default. A light theme variant is also available. To enable the light theme, add the `prism-theme-light` class to the document root or use the built-in theme toggle button in the header toolbar.

The light theme maps the same custom properties to lighter values — your `theme` overrides apply to both unless you target the `.prism-theme-light` selector explicitly in `themeStylesheet`.

## Scoping

All ng-prism CSS uses the `prism-` class prefix. Because the showcase renders without an iframe, your library's styles and ng-prism's chrome coexist in the same document. ng-prism's properties are scoped to `.prism-shell`, so they will not bleed into your rendered component canvas.
