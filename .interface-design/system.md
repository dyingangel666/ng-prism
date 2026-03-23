# ng-prism Design System

**Direction:** Spektralkammer — tiefes Indigo-Void als Basis, prismatische Gradient-Akzente auf aktiven Elementen, Dot-Grid Canvas. Entspricht dem prism.svg Logo (Violett/Indigo/Magenta).

**Intent:** Ein Entwickler-Tool, das Spaß macht zu benutzen. Präzise wie ein Terminal, aber lebendig durch die Prisma-Farben. Man soll gerne darin arbeiten.

---

## Tokens

```ts
// Surfaces (dark)
'--prism-void': '#07050f'        // Tiefster Hintergrund
'--prism-bg': '#0d0b1c'          // Haupt-Canvas
'--prism-bg-surface': '#131022'  // Karten / Panel-Backgrounds
'--prism-bg-elevated': '#1a1535' // Panel Host, Dropdowns

// Text (4 Ebenen) — Dark-Mode-Werte
'--prism-text': '#ede9f8'        // Primary          contrast vs bg: ~17:1
'--prism-text-2': '#b0a6c8'      // Secondary        contrast vs bg: ~9:1
'--prism-text-muted': '#8476a2'  // Labels, Meta     contrast vs bg: ~4.8:1
'--prism-text-ghost': '#6a5d87'  // Category Titles  contrast vs bg: ~3.1:1

// Hinweis: Light-Mode nutzt andere Werte für ghost/muted (helles bg)
// → ghost im Light: #b0a6c8, muted im Light: #6b5e80

// Prisma-Gradient
'--prism-primary': '#a78bfa'     // Solid Akzent
'--prism-primary-from': '#7c3aed'
'--prism-primary-to': '#3b82f6'
'--prism-accent': '#ec4899'      // Magenta (selten einsetzen)

// Borders
'--prism-border': 'rgba(255,255,255,0.08)'
'--prism-border-strong': 'rgba(255,255,255,0.16)'

// Glow
'--prism-glow': 'rgba(139,92,246,0.18)'
'--prism-glow-strong': 'rgba(139,92,246,0.35)'

// Input
'--prism-input-bg': 'rgba(255,255,255,0.05)'

// Spacing / Sizing
'--prism-header-height': '52px'
'--prism-toolbar-height': '40px'

// Typography
'--prism-font-sans': "'Inter', system-ui, -apple-system, sans-serif"
'--prism-font-mono': "'Cascadia Code', 'Fira Code', ui-monospace, monospace"

// Radius Scale
'--prism-radius-xs': '3px'   // Tags, Inputs
'--prism-radius-sm': '5px'   // Buttons
'--prism-radius': '8px'      // Cards
'--prism-radius-lg': '12px'  // Modals, Dropdowns
```

---

## Depth Strategy

**Borders-only** — kein Box-Shadow auf Cards. Subtile Surface-Shifts etablieren Hierarchie.

- Sidebar/Header: `--prism-bg` (keine Sonderfarbe)
- Canvas: `--prism-bg-surface`
- Panel Host / Dropdowns: `--prism-bg-elevated`
- Borders: `rgba(255,255,255,0.08)` standard, `0.16` für Emphasis

---

## Spacing Base

Kein formales Spacing-Token-System. Praktische Werte:
- Micro: 4px (icon-gap in pills)
- Component: 6–8px (padding in items)
- Control row: 16px horizontal padding, min-height 36px
- Section: 20px (header padding)
- Canvas: 48px vertikal / 40px horizontal

---

## Signature Elements

### 1. Prismatischer Gradient-Underline auf aktiven Tabs
```css
.tab::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 8px; right: 8px;
  height: 2px;
  background: linear-gradient(90deg, var(--prism-primary-from), var(--prism-primary-to));
  opacity: 0;
  transition: opacity 0.12s;
}
.tab--active::after { opacity: 1; }
```
Verwendet in: Panel Host, Renderer Variant Tabs.

### 2. Linker Gradient-Akzentbalken auf Component Header
```css
.prism-component-header {
  border-left: 3px solid;
  border-image: linear-gradient(180deg, var(--prism-primary-from), var(--prism-primary-to)) 1;
}
```

### 3. Dot-Grid Canvas
```css
.canvas {
  background-color: var(--prism-bg-surface);
  background-image: radial-gradient(
    circle,
    color-mix(in srgb, var(--prism-primary) 15%, transparent) 1px,
    transparent 1px
  );
  background-size: 20px 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
```

### 4. Sidebar Active Item: Left Border + Violet Tint
```css
.item { border-left: 3px solid transparent; }
.item--active {
  border-left-color: var(--prism-primary);
  background: color-mix(in srgb, var(--prism-primary) 10%, transparent);
  color: var(--prism-text);
  font-weight: 500;
}
.item--active:hover {
  background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
}
```
Hover (nicht aktiv): `color-mix(...primary... 6%, transparent)`

---

## Layout

### Shell Grid (CSS Grid + Data-Attributes)
```css
.prism-shell {
  display: grid;
  grid-template-columns: var(--sw) 4px 1fr;
  grid-template-rows: var(--prism-header-height) 1fr 4px var(--ph);
  grid-template-areas:
    "header  header  header"
    "sidebar shdrag  main"
    "sidebar shdrag  phdrag"
    "sidebar shdrag  panel";
}

/* --sw / --ph / --pw werden via PrismLayoutService + inline-style gesetzt */
```
Data-Attribute steuern Varianten: `data-sidebar`, `data-addons`, `data-orientation`, `data-toolbar`.

### Resizable Panels
- Drag-Handles: 4px breite Grid-Bereiche (`shdrag`, `phdrag`)
- `cursor: col-resize` / `row-resize`
- Native `mousemove`/`mouseup` auf `document`
- Verwaltung in `PrismLayoutService`

### localStorage Persistenz
```
Key: 'ng-prism-layout'
Fields: sidebarVisible, addonsVisible, toolbarVisible, addonsOrientation,
        sidebarWidth (160–600), panelHeight (100–600), panelWidth (200–600)
```

### Keyboard Shortcuts
- `⌥S` — Sidebar toggle
- `⌥T` — Toolbar toggle
- `⌥A` — Addons-Panel toggle
- `⌥D` — Orientation bottom ↔ right

---

## Komponenten-Patterns

### Control Row (Controls Panel)
```css
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 16px;
  min-height: 36px;
  border-bottom: 1px solid var(--prism-border);
}
/* Label: width 140px, flex-shrink 0, font-size 13px, color --prism-text-muted */
/* Input: flex 1, min-width 0 */
```

### Boolean Toggle Switch
```css
/* button role="switch" [attr.aria-checked] */
.toggle { width: 36px; height: 20px; border-radius: 10px; }
.toggle--on { background: var(--prism-primary); }
.thumb { width: 14px; height: 14px; border-radius: 50%; top: 2px; left: 2px; }
.toggle--on .thumb { transform: translateX(16px); background: var(--prism-bg-elevated); }
```

### Union Control (Pill Buttons)
```css
.option {
  padding: 3px 10px;
  font-size: 12px;
  border: 1px solid var(--prism-border);
  border-radius: var(--prism-radius-xs);
}
.option--active {
  background: color-mix(in srgb, var(--prism-primary) 15%, transparent);
  color: var(--prism-primary);
  border-color: color-mix(in srgb, var(--prism-primary) 40%, transparent);
}
.option--active:hover { /* gleich wie --active */ }
```

### Tags (Component Header)
```css
.tag {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: var(--prism-radius-xs);
  background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
  color: var(--prism-primary);
  border: 1px solid color-mix(in srgb, var(--prism-primary) 20%, transparent);
}
```

### Dropdown Menu
```css
.dropdown {
  background: var(--prism-bg-elevated);
  border: 1px solid var(--prism-border-strong);
  border-radius: var(--prism-radius);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  padding: 4px;
}
/* Backdrop-Div (fixed inset-0 z-40) für click-outside close */
/* Kein CDK Overlay nötig */
```

### Focus Ring (Inputs)
```css
input:focus {
  outline: none;
  border-color: var(--prism-primary);
  box-shadow: 0 0 0 2px var(--prism-primary-from);
}
```

### Trigger Buttons (Header-Bereich)
```css
.trigger {
  border: 1px solid var(--prism-border);
  border-radius: var(--prism-radius-sm);
  background: transparent;
  color: var(--prism-text-muted);
}
.trigger:hover {
  border-color: var(--prism-border-strong);
  color: var(--prism-text);
  background: var(--prism-bg-surface);
}
```

---

## Typography-Hierarchie

| Ebene | Size | Weight | Color |
|-------|------|--------|-------|
| Heading (Component Title) | 18px | 600 | `--prism-text` |
| Body / Item | 13px | 400/500 | `--prism-text` / `--prism-text-muted` |
| Label / Meta | 13px | 500 | `--prism-text-muted` |
| Category Title | 11px | 600 | `--prism-text-ghost` (uppercase, ls 0.08em) — Dark: ~3.1:1 |
| Tag / Pill | 11–12px | 500 | `--prism-primary` |

`font-family: var(--prism-font-sans)` explizit auf allen text-bearing Elementen setzen (kein Verlass auf Vererbung in Komponenten-Scope).

---

## Nicht verwenden

- `box-shadow` auf Cards (nur auf Dropdowns)
- Mehrere Accent-Farben gleichzeitig
- Unterschiedliche Hues für verschiedene Surfaces (nur Helligkeit variieren)
- `gap: 0` (ist no-op, weglassen)
- `padding: 0` auf flex-Containern ohne Default-Padding (weglassen)
- Hardcoded Farben (`white`, `#fff` etc.) — immer Token
- `--prism-sidebar-width` / `--prism-panel-height` / `--prism-font-family` (veraltet, entfernt)
