# ng-prism — Design Handoff

**Ziel:** Das neue UI aus `ng-prism.html` in die bestehende Angular-20-App übertragen, ohne Core- oder Plugin-Verträge zu brechen.

Dieses Dokument ist so strukturiert, dass Claude Code es Section für Section abarbeiten kann. Jede Section endet mit einer **Implementation Checklist**.

---

## 0. TL;DR

- Neues UI ist in `ng-prism.html` als statisches Mockup.
- **Design-Tokens** (CSS Custom Properties) → `styles.scss`, global. Dark + Light Theme über `[data-theme]` Attribute am `<html>`.
- **Shell-Layout**: `header(52px) · body(sidebar | main)`; `main = comp-head · variant-ribbon · canvas-wrap(1fr) · resizer(4px) · panel-dock(var)`.
- **8 Panel-Tabs**: 3 Core (Controls, Events, A11y) + 5 Plugin (JSDoc, Figma, Box-Model, Perf, Coverage). Die Core-Komponenten sind Teil dieser Lieferung; Plugin-Panels sollen in den bestehenden Plugin-Packages übernommen werden.
- **Keine Änderungen an der Plugin-API** (`NgPrismPlugin`, `PanelDefinition`, `Showcase`-Decorator, Dual-Entry-Points). Das Handoff zeigt nur, welche Components pro Plugin-Panel ersetzt werden.
- Icons: **lucide-angular** ersetzt die Inline-SVGs des Mockups.
- Komponenten: **Standalone, signal-based, `ChangeDetectionStrategy.OnPush`**.

---

## 1. Design Tokens

Platziere in `apps/<shell>/src/styles.scss` (oder wohin die globalen Styles heute gehen):

```scss
:root[data-theme="dark"] {
  --prism-void: #07050f;
  --prism-bg: #0d0b1c;
  --prism-bg-surface: #131022;
  --prism-bg-elevated: #1a1535;

  --prism-text: #ede9f8;
  --prism-text-2: #b0a6c8;
  --prism-text-muted: #8476a2;
  --prism-text-ghost: #6a5d87;

  --prism-primary: #a78bfa;
  --prism-primary-from: #7c3aed;
  --prism-primary-to: #3b82f6;
  --prism-accent: #ec4899;

  --prism-border: rgba(255, 255, 255, 0.08);
  --prism-border-strong: rgba(255, 255, 255, 0.16);

  --prism-glow: rgba(139, 92, 246, 0.18);
  --prism-glow-strong: rgba(139, 92, 246, 0.35);

  --prism-input-bg: rgba(255, 255, 255, 0.05);
  --prism-dot: rgba(167, 139, 250, 0.18);

  --prism-success: #34d399;
  --prism-warn: #fbbf24;
  --prism-danger: #f87171;
}

:root[data-theme="light"] {
  --prism-void: #f7f5fc;
  --prism-bg: #ffffff;
  --prism-bg-surface: #faf9fd;
  --prism-bg-elevated: #ffffff;

  --prism-text: #1c1530;
  --prism-text-2: #4d4266;
  --prism-text-muted: #6b5e80;
  --prism-text-ghost: #b0a6c8;

  --prism-primary: #7c3aed;
  --prism-primary-from: #7c3aed;
  --prism-primary-to: #3b82f6;
  --prism-accent: #db2777;

  --prism-border: rgba(28, 21, 48, 0.08);
  --prism-border-strong: rgba(28, 21, 48, 0.16);

  --prism-glow: rgba(124, 58, 237, 0.12);
  --prism-glow-strong: rgba(124, 58, 237, 0.25);

  --prism-input-bg: rgba(28, 21, 48, 0.04);
  --prism-dot: rgba(124, 58, 237, 0.2);

  --prism-success: #059669;
  --prism-warn: #d97706;
  --prism-danger: #dc2626;
}
```

### Typography

```scss
:root {
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Font-sizes (baseline — siehe auch Component-Specs) */
  --fs-xs: 10px;
  --fs-sm: 11.5px;
  --fs-md: 12.5px;
  --fs-lg: 13.5px;
  --fs-xl: 15px;
  --fs-2xl: 22px;   /* comp-title */
}
```

Lade `Inter` (400, 500, 600, 700) und `JetBrains Mono` (400, 500, 600) via Google Fonts oder als lokale Webfonts.

### Radius / Spacing / Motion

```scss
:root {
  --radius-xs: 3px;
  --radius-sm: 5px;
  --radius-md: 7px;
  --radius-lg: 10px;

  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --dur-fast: 0.12s;
  --dur-base: 0.2s;
  --dur-slow: 0.3s;
}
```

### Theme-Switching

Setze `document.documentElement.dataset.theme = 'dark' | 'light'` und persistiere in `localStorage`. Kein Flash-of-Wrong-Theme: Theme per Inline-Script in `index.html` HEAD (vor Angular-Bootstrap) anwenden.

### Implementation Checklist (Tokens)

- [ ] `styles.scss`: Tokens wie oben eintragen.
- [ ] Google Fonts einbinden (oder lokal hosten).
- [ ] Theme-Init-Script in `index.html` (liest `localStorage.prism-theme`, fallback `'dark'`).
- [ ] Service `ThemeService` mit Signal `theme = signal<'dark' | 'light'>()`, effect schreibt `[data-theme]` + `localStorage`.

---

## 2. Shell-Layout

Die gesamte App sitzt in einer festen Grid-Struktur:

```
┌──────────────────────────────────────────────────┐
│ header (52px)                                    │
├─────────┬────────────────────────────────────────┤
│         │ comp-head (auto)                       │
│ sidebar │ variant-ribbon (42px)                  │
│  (var)  │ canvas-wrap (1fr, min 180px)           │
│         │ ─── resizer (4px) ───                  │
│         │ panel-dock (var, default 260px)        │
└─────────┴────────────────────────────────────────┘
```

### CSS-Grid-Setup

```scss
.prism-shell {
  height: 100vh;
  display: grid;
  grid-template-rows: 52px 1fr;
  background: var(--prism-void);
}

.prism-body {
  display: grid;
  grid-template-columns: var(--sidebar-width, 264px) 1fr;
  min-height: 0;
}

.prism-main {
  display: grid;
  /* comp-head, variant-ribbon, canvas, resizer, panel */
  grid-template-rows: auto auto minmax(180px, 1fr) 4px var(--panel-height, 260px);
  min-height: 0;
  background: var(--prism-void);
  overflow: auto; /* safety net bei sehr kleinen Viewports */
}
```

**Wichtig:** Das Mockup hatte einen Bug wo `grid-template-rows` nur 4 Einträge hatte aber 5 Kinder da waren → canvas-wrap kollabierte auf 4px. Bei der Implementation darauf achten: **Anzahl Grid-Rows = Anzahl direkter Kinder**.

### Resizer

Eine einfache 4px-Zeile (`.prism-resizer`) mit `cursor: row-resize`. Drag aktualisiert `--panel-height` am Shell-Element via Pointer-Events.

Implementation als Standalone-Direktive `[prismResizer]` mit Inputs: `axis: 'x' | 'y'`, `cssVar: string`, `min: number`, `max: number`, `target: HTMLElement`.

### Implementation Checklist (Shell)

- [ ] Component `prism-shell` (standalone, OnPush) mit Grid aus `<prism-header>`, `<prism-sidebar>`, `<prism-main>`.
- [ ] Direktive `[prismResizer]` für horizontale (Sidebar) und vertikale (Panel) Resize.
- [ ] Persistenz: `sidebarWidth` und `panelHeight` in `localStorage` via Signal-Service.

---

## 3. Header (52px)

Zonen: **Brand** (links) · **Global Search** (mitte) · **Actions** (rechts).

### Brand

- Logo + Wordmark `ng-prism` · Untertitel `acme/design-system` (zweizeilig, letzterer `--prism-text-muted`, `--fs-xs`).
- Klick = Route nach `/`.

### Global Search

Input, mittig, max-width 520px:
- Placeholder: "Search components, variants, tokens…"
- Rechts: `⌘ K` Shortcut-Hint in `kbd`-Style (monospaced, 1px border).
- Cmd/Ctrl+K öffnet Command-Palette (noch nicht im Mockup — Platzhalter-Action).

### Actions

32×32 Icon-Buttons, in dieser Reihenfolge:
1. Refresh
2. Notifications (mit Dot-Indicator via `::after` wenn ungelesen)
3. Theme-Toggle (Sun/Moon — wechselt via ThemeService)
4. Menu/More

### Styles

```scss
.prism-header {
  height: 52px;
  display: grid;
  grid-template-columns: var(--sidebar-width, 264px) 1fr auto;
  align-items: center;
  padding: 0 14px 0 0;
  background: var(--prism-bg);
  border-bottom: 1px solid var(--prism-border);
}
```

### Implementation Checklist (Header)

- [ ] `prism-header.component.ts` — standalone, `<lucide-icon>` statt inline SVG.
- [ ] Search-Input mit Signal-Binding, Cmd/Ctrl+K HostListener global.
- [ ] Theme-Toggle Button ruft `themeService.toggle()`.

---

## 4. Sidebar

Breite: `var(--sidebar-width, 264px)`, resizable 200–360px.

### Struktur

```
┌─ Filter-Input (Height 30px, margin 12px) ──────┐
│ 🔍 Filter components…              [ / ]       │
├────────────────────────────────────────────────┤
│ 📌 PAGES                                   n   │
│  ▼ [●] DOCS                               3    │
│       🚀 Getting Started                       │
│       📖 Design Principles                     │
│       🎨 Theming Guide                         │
│  ▼ [●] RESOURCES                          3    │
│       ⏱  Changelog                    0.8.2   │
│       🚀 Roadmap                              │
│       📖 Contributing                         │
├────────────────────────────────────────────────┤
│  ▼ [●] DATA DISPLAY                       4   │
│       ▢ Avatar                            1   │
│       ▢ Badge                             3   │
│       ...                                     │
│  ▼ [●] FEEDBACK                          3    │
│  ▼ [●] INPUTS                            6    │
│       ▢ Button ◀ active                  7    │
│          • Filled                              │
│          • Outlined ...                        │
│  ...                                           │
├────────────────────────────────────────────────┤
│ 22 components · 58 variants          v0.8.2   │
└────────────────────────────────────────────────┘
```

### Data-Sourcing

- **Pages** kommen aus dem `StyleguidePage`-Scan (bereits vorhanden in ng-prism-Core). Gruppierung via `page.category` (default: "Docs").
- **Components** aus dem `PrismManifest`. Kategorie = `ScannedComponent.showcaseConfig.category`.
- **Variants** (Sub-Items) aus `showcaseConfig.variants[].name`.

### Kategorie-Chip-Farben

Pro Kategorie eine Farbe aus der Palette — persistent durch hashing (siehe unten) oder hart kodiert im Core. Mockup benutzt:

```
Data Display → #f472b6 (pink)
Feedback     → #60a5fa (blue)
Inputs       → #a78bfa (purple)
Layout       → #34d399 (green)
Navigation   → #fbbf24 (amber)
Overlay      → #f97316 (orange)
Directives   → #06b6d4 (cyan)
```

Expose als `--chip` CSS-Variable am `.prism-sb-group-head`.

### Verhalten

- **Filter-Input** filtert über `category`, `name` und `variants[].name` (fuzzy, simple `includes`).
- **Collapsible Groups** — Klick auf Group-Head togglet `.is-collapsed`. Persist state per Group in `localStorage`.
- **Active Item** visuell: subtiler `background` + `color: var(--prism-text)`.
- **Variants unter aktiver Component** werden als Sub-Items gezeigt mit kleinem Dot (Farbe = Variant-Chip).

### Implementation Checklist (Sidebar)

- [ ] `prism-sidebar.component.ts` mit Children: `prism-sidebar-filter`, `prism-sidebar-group`, `prism-sidebar-item`.
- [ ] `SidebarStore` (Signal-based) mit computed `visibleGroups` abhängig vom Filter-Signal.
- [ ] Router-Integration: Item-Click → `router.navigate(['/component', comp.id])`.
- [ ] Collapsed-State pro Group in `localStorage.prism-sidebar-collapsed` (Set von Group-IDs).

---

## 5. Component Head

Oberer Block im Main-Bereich.

### Layout

```
┌─ 3px vertical gradient accent ─┐
│                                 │
│  [crumb] Inputs  /  Button      │        ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│                                 │        │ 7  [A] │ │ 98%[OK]│ │ 1.2 kb │ │ 92[Ally]
│  Button  <acme-button>          │        │ VARIAN │ │ COVERA │ │ BUNDLE │ │ SCORE  │
│                                 │        └────────┘ └────────┘ └────────┘ └────────┘
│  [Primary interactive surface…]│
│  [form] [action] [interactive] [standalone]
└─────────────────────────────────┘
```

### Struktur

- **Breadcrumb**: Category → ComponentName (chevron separator).
- **Title**: h1, 22px, 700, `--prism-text`.
- **Selector-Badge**: mono, purple tint, `padding: 3px 8px`, border radius 5px.
- **Description**: `showcaseConfig.description` oder leer.
- **Tags**: `showcaseConfig.meta.tags ?? []` als Chips.
- **Stats** (rechts): 4 kompakte Karten mit Label unterhalb, Wert + Pill.
  - **Variants** — count aus `showcaseConfig.variants.length`.
  - **Coverage** — aus Coverage-Plugin (`meta.coverage.percent`), Pill `OK/WARN`.
  - **Bundle** — aus Bundle-Analyzer (könnte Build-time Hook sein), Wert kb.
  - **A11y** — aus built-in A11y-Plugin (`meta.a11y.score`), Pill `OK/WARN/FAIL`.

### Kompaktes Layout bei kleinem Viewport

- Unter ~800px Höhe: Description + Tags ausblenden (`display: none`).
- Stats bleiben immer sichtbar (rechts).

### Accent-Bar

Linker 3px-Gradient: `linear-gradient(180deg, var(--prism-primary-from), var(--prism-accent) 50%, var(--prism-primary-to))`. Positioniert `::before` mit `top: 14px; bottom: 14px`.

### Implementation Checklist (Comp-Head)

- [ ] `prism-component-head.component.ts` — Input: `component: RuntimeComponent`.
- [ ] Stats als separate Component `prism-stat` mit `@Input value, label, pill?, pillVariant?`.
- [ ] Stats lesen aus `component.meta` (Plugin-agnostisch). Wenn Key fehlt → Stat-Karte ausblenden (nicht leere Karte).

---

## 6. Variant Ribbon

42px-Höhe, horizontal scrollbar (scrollbar hidden), direkt unter comp-head.

- Jeder Tab hat: farbigen Dot (6×6, `--vc` als CSS-Var), Label, underline-gradient bei `active`.
- Dot-Farbe pro Variant aus `variant.meta.chip` oder Hash vom Variant-Namen.
- Rechts: Prev/Next Tool-Buttons (Pfeile).

Aus Plugin-Perspektive: Variants sind bereits im `ScannedComponent`-Tree. Nichts Neues zu tun außer das UI zu mappen.

### Implementation Checklist (Ribbon)

- [ ] `prism-variant-ribbon.component.ts` — Inputs: `variants: Variant[]`, `activeId: string`; Output: `variantChange`.
- [ ] Prev/Next-Buttons mit `(click)` auf `activeIndex ± 1`.

---

## 7. Canvas-Wrap (Toolbar + Stage + Code-Drawer)

Drei-Zeilen-Grid:

```scss
.prism-canvas-wrap {
  display: grid;
  grid-template-rows: auto minmax(200px, 1fr) auto;
  background: var(--prism-bg-surface);
  overflow: hidden;
}
```

### 7a. Canvas-Toolbar (Background / Zoom / Guides / A11y-Persp)

Linear horizontal, 44px Höhe:

- **Bg-Group** (toggle-buttons): `dots · light · void · checker`.
- **Zoom-Group**: `75% · 100% · 150% · 200%` — setzt `--zoom` CSS-Var.
- **Center**, **Guides** Icon-Buttons.
- **A11y Perspective Switch** (rechts): grüner Pill-Button mit integriertem Toggle. Toggelt `data-overlay="true"` am `.demo-wrap` → zeigt ARIA-Overlay-Marks.

### 7b. Canvas-Stage

```scss
.prism-canvas-stage {
  position: relative;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  min-height: 200px;
}

.prism-canvas-stage[data-bg="dots"] {
  background-color: var(--prism-bg-surface);
  background-image: radial-gradient(circle, var(--prism-dot) 1px, transparent 1px);
  background-size: var(--dot-size, 20px) var(--dot-size, 20px);
}
/* light / void / checker — siehe Mockup ng-prism.html L194–197 */
```

- **Crosshair-Overlay** — sichtbar wenn Guides aktiv.
- **Canvas-Badges** (top-left): `1280 × 720`, `100%`, `sRGB` — Mono-Chip, `backdrop-filter: blur(8px)`.

### 7c. Rendering-Slot

Hier wird die echte Component gerendert. In der heutigen App macht das der `PrismRendererService` + `PrismRendererComponent`. Der Slot bleibt derselbe, nur im neuen Wrapper:

```html
<div class="prism-demo-wrap" [attr.data-overlay]="a11yPersp()" [style.--zoom]="zoom()">
  <prism-renderer />
  <!-- Overlay-Slots: wird vom Plugin-Host gefüllt -->
  <ng-container prismPanelOverlayHost />
</div>
```

`prismPanelOverlayHost` rendert alle `overlayComponent`s der aktiven Plugins (z.B. Box-Model-Plugin).

### 7d. Code-Drawer (unten)

Standardmäßig **aufgeklappt** (`max-height: 260px`), Klick auf Header collapst auf 40px.

```scss
.prism-code-drawer {
  border-top: 1px solid var(--prism-border);
  background: var(--prism-bg);
  max-height: 260px;
  transition: max-height 0.25s var(--ease-default), opacity 0.2s;
  overflow: hidden;
}
.prism-code-drawer.is-collapsed { max-height: 40px; }
.prism-code-drawer.is-collapsed .prism-code-body { opacity: 0; }

.prism-code-head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  background: linear-gradient(180deg, var(--prism-bg-surface), var(--prism-bg));
  border-bottom: 1px solid var(--prism-border);
  cursor: pointer;
}

.prism-code-body {
  padding: 12px 20px 16px;
  font: 12.5px/1.7 var(--font-mono);
  color: var(--prism-text-2);
  overflow-x: auto;
}
```

**Syntax-Highlighting-Tokens** (Klassen):
- `.tok-tag` → `#f472b6`
- `.tok-attr` → `#60a5fa`
- `.tok-str` → `#86efac`
- `.tok-num` → `#fbbf24`
- `.tok-com` → `--prism-text-ghost` italic

Quelle des Codes: Basis = Angular-Template-Snippet mit Current-Variant + aktuellen Control-Werten gebunden. Siehe `renderCode()` im Mockup (L1141+).

Rechts im Head: `Copy` (clipboard) + `StackBlitz`-Buttons.

### Implementation Checklist (Canvas)

- [ ] `prism-canvas-toolbar.component.ts` mit Signals: `bg`, `zoom`, `guides`, `a11yPerspective`. Persistieren.
- [ ] `prism-canvas-stage.component.ts` hostet den Renderer + Overlay-Slot.
- [ ] `prism-code-drawer.component.ts` — Input `code: Signal<string>`, Output `copy`, `openInStackblitz`.
- [ ] Code-Generator-Service: baut Template-String aus `variant + controls`, highlightet mit Mini-Tokenizer (oder prism.js/shiki als optional dep).

---

## 8. Panel-Dock (unten)

Höhe: `var(--panel-height, 260px)`, resizable 200–560px.

### Panel-Tabs (40px Höhe)

8 Tabs + right-side Action-Buttons (orient-right, maximize).

Jeder Tab zeigt: Icon · Label · optional Badge.

**Badge-Varianten:**
- Default: `color: --prism-text-ghost; bg: --prism-input-bg`.
- `.ok`: green tint (A11y 4/4, Coverage 98).

### Active-Underline

`::after` mit 2px Höhe, `--prism-primary`, Linie zwischen `left: 8px` und `right: 8px`.

### Panel-Tabs-Right

Icon-Buttons (orient-right → setzt Panel-Position auf `right`; maximize → vollflächiges Panel, versteckt canvas).

### Core-Panels (Built-in)

Diese werden **nicht** als Plugin geliefert — sie leben im Core-Package. Sie müssen der `PanelDefinition`-Shape entsprechen, wurden intern aber direkt in den `PrismPanelHostComponent` hardcoded registriert (siehe heutigen Code).

| id | Label | Icon | Komponente |
|---|---|---|---|
| `controls` | Controls | `sliders-horizontal` | `PrismControlsPanelComponent` |
| `events` | Events | `zap` | `PrismEventsPanelComponent` |
| `a11y` | A11y | `accessibility` | `PrismA11yPanelComponent` (bereits existent) |

### Plugin-Panels

Alle 5 Plugin-Panels folgen dem bestehenden Pattern — nur die Templates/Components tauschen ihr Design gegen das aus dem Mockup. Siehe Section 9 für plugin-spezifische Specs.

### Implementation Checklist (Panel-Dock)

- [ ] `prism-panel-dock.component.ts` hostet Tabs + aktiven Content-Slot.
- [ ] `PrismPanelHostComponent` iteriert über alle `PanelDefinition`s (Core + Plugins), respektiert `position`, `placement`, `isVisible`.
- [ ] Lazy-Load-Logik: wenn `loadComponent` gesetzt → `defer` über `@defer` oder manueller `ComponentRef.createComponent`.

---

## 9. Core Panels (Detail-Specs)

### 9a. Controls Panel

**Zweck:** Alle `@Input`s der aktiven Component als Form-Controls, plus Live-Code-Output.

**Layout:** Tabelle-artige Rows, `grid-template-columns: 180px 1fr`.

**Row-Struktur:**

```
┌───────────────────┬────────────────────────────────────────┐
│ variant           │ [Filled][outlined][elevated][text][…]  │
│ ButtonVariantType │                                        │
├───────────────────┼────────────────────────────────────────┤
│ label             │ ┌────────────────────────────────────┐ │
│ string            │ │ Filled                             │ │
│                   │ └────────────────────────────────────┘ │
├───────────────────┼────────────────────────────────────────┤
│ icon              │ ★                                      │
│ string            │                                        │
├───────────────────┼────────────────────────────────────────┤
│ size              │ [sm][md][lg]                           │
│                   │                                        │
├───────────────────┼────────────────────────────────────────┤
│ radius            │ ───●──────────────  8 px               │
│ number            │                                        │
├───────────────────┼────────────────────────────────────────┤
│ color             │ ■ #7c3aed                              │
├───────────────────┼────────────────────────────────────────┤
│ disabled          │ ○ ←→ ●                                 │
├───────────────────┼────────────────────────────────────────┤
│ readonly          │ ○ ←→ ●                                 │
├───────────────────┼────────────────────────────────────────┤
│ aria-label        │ Favorite this item                     │
└───────────────────┴────────────────────────────────────────┘
```

**Label-Spalte:**
- `ctl-name` (13px, 500, `--prism-text`)
- `ctl-type` (11px, mono, `--prism-text-ghost`; `<b>` für Type-Namen)

**Hover:** row-bg `color-mix(var(--prism-primary) 3%, transparent)`.

**Control-Varianten** (die `ControlDefinition.matchType` auflösen):
- `segment` (enum): Tab-Gruppe aus 2–5 Optionen.
- `text`: Input, mono-font optional.
- `number`: Input mit Stepper oder Slider wenn `meta.min/max`.
- `slider`: Range-Input mit Wert-Label rechts.
- `color`: Swatch + Hex-Display.
- `toggle`: Pill-Switch (28×16).
- `select`: Dropdown (wenn viele Optionen).
- `object` / `json`: monospaced textarea (expanded).

Jede Control-Komponente ist via `ControlDefinition` registrierbar — also **plugin-able**. Core liefert Defaults für alle primitive Typen.

**Implementation-Hint:** Die Controls sind Forms-bound an den internen Controls-State-Service; dieser triggert Renderer-Update (`@Input()`s setzen) und Code-Drawer-Update.

### 9b. Events Panel

**Zweck:** Live-Log aller `@Output()`s.

**Layout:** Monospace-Rows:

```
┌──────────────┬──────┬────────────────────────┬───────┐
│ 14:22:07.121 │ #003 │ click                  │ {x:12} │
├──────────────┼──────┼────────────────────────┼───────┤
│ 14:22:06.998 │ #002 │ mouseenter             │       │
│ 14:22:06.105 │ #001 │ focus                  │       │
└──────────────┴──────┴────────────────────────┴───────┘
```

Grid: `auto auto 1fr auto`, padding `6px 20px`, mono 12px.

**Zeit** `--prism-text-ghost`, **idx** `--prism-text-muted`, **name** `--prism-primary`, **args** `--prism-text-2`.

Toolbar oben: `Clear`, `Filter`, `Pause/Resume` — Icon-Buttons rechtsbündig.

### 9c. A11y Panel (built-in, exists)

4 Sub-Tabs: `Overview · Rules · ARIA Tree · Keyboard`.

**Overview (default view):**
- Links: **Score-Ring** (128×128 SVG), farbcodiert (grün/amber/rot), Prozent zentriert, Label unter Ring.
- Rechts: Violations-Liste — kompakte Cards mit Severity-Chip, Rule-ID, Impact-Beschreibung.

**Sub-Tabs-Styling:** 7px padding, 12px font, underline `::after` auf aktiven Tab.

Die A11y-Checks laufen über axe-core oder bestehende Integration — **nur die UI** wird angepasst.

Overlay-Marks auf der Canvas (siehe 7b `data-overlay="true"`) werden vom A11y-Panel gesteuert: aktiviert "Visual Perspective" → Panel zeigt die Roles/Focus/Tab-Order direkt am Komponenten-Bounding-Box.

---

## 10. Plugin-Panel Designs

Alle Plugins behalten ihre bestehende Plugin-Package-Struktur (`packages/plugin-{name}/src/...`). Nur die Panel-Components bekommen neues Styling.

### 10a. JSDoc Plugin (`@ng-prism/plugin-jsdoc`)

**Dual Entry-Point:** Ja (Build-time Hook liest `.d.ts` und extrahiert JSDoc).

**Panel-Inhalt:**
- Tabelle mit Spalten: `Name · Type · Required · Default · Description`.
- Rows gruppiert nach `Inputs | Outputs | Methods`.
- Type-Cell: mono, `--prism-primary`.
- Required: `*` in `--prism-danger` wenn true.
- Beschreibung (multiline): `--prism-text-2`, 13.5px.

**Data-Flow:** `onComponentScanned` extrahiert JSDoc → `meta.jsdoc = { inputs, outputs, methods }`. Panel liest via `PrismRendererService`.

**Stats-Integration:** `meta.jsdoc.coverage` (wieviel % der Inputs dokumentiert sind) könnte später als `Docs` Pill neben A11y in comp-head erscheinen (aktuell nicht im Mockup).

### 10b. Figma Plugin (`@ng-prism/plugin-figma`)

**Dual Entry-Point:** Nein (rein Runtime).

**Panel-Layout:** Split-View — links Component-Preview (Angular-rendered), rechts Figma-Mock-Preview.

```
┌────────────────────────────┬──────────────────────────┐
│ ┌────── CODE ──────────┐  │ ┌──── FIGMA ──────┐      │
│ │                       │  │ │                  │     │
│ │      [Button]         │  │ │      [Button]    │     │
│ │                       │  │ │                  │     │
│ └───────────────────────┘  │ └──────────────────┘     │
│                            │ ◆ 2 diffs               │
│                            │  • padding-x: 18 vs 20  │
│                            │  • radius: 8 vs 10      │
└────────────────────────────┴──────────────────────────┘
```

**Diff-Marks:** absolut positionierte Pills mit dashed amber border, mono font, zeigen Code-vs-Figma-Differenzen.

**Sidebar:** Liste aller Token-Diffs, klickbar → Jump to mark auf Canvas.

**Data:** `isVisible: (c) => !!c.meta.figma`. Das Plugin liest Figma-URL aus `showcaseConfig.meta.figma`.

### 10c. Box-Model Plugin (`@ng-prism/plugin-box-model`)

**Dual Entry-Point:** Nein.

**Panel-Inhalt:**
- Links: ineinander verschachtelte Boxes (Margin → Border → Padding → Content) mit Werten pro Seite (top/right/bottom/left).
- Farbcodiert: margin=amber, border=grey, padding=green, content=purple tint.
- Rechts: Computed-Styles-Liste (key-value, filterbar).

**Overlay auf Canvas:** Box-Model-Plugin exponiert `overlayComponent` — rendert halbtransparente Rechtecke über der Live-Component. State wird via `providers` (scoped `BoxModelStateService`) zwischen Panel und Overlay geteilt.

### 10d. Performance Plugin (`@ng-prism/plugin-performance`)

**Dual Entry-Point:** Ja wenn Bundle-Analyzer Build-time erforderlich.

**Panel-Grid:** 2×3 Karten:

| Card | Metrik |
|---|---|
| Initial Render | ms, trend sparkline |
| Change Detection | cycles/s |
| Bundle Size | kb (gzip) |
| DOM Nodes | count |
| Listeners | count + leak-Warning |
| Rerenders | heatmap |

**Card-Styling:** `bg: var(--prism-bg-surface)`, 1px border, radius 10px, padding 14px. Wert groß, mono.

**Responsive:** bei `max-width: 1100px` → 2 Spalten.

### 10e. Coverage Plugin (`@ng-prism/plugin-coverage`)

**Dual Entry-Point:** Ja (liest Jest/Vitest Coverage-Report).

**Panel-Inhalt:**
- Top: Gesamt-% Ring (wie A11y-Score).
- Unten: File-Tree mit inline Bars (uncovered=red, covered=green), Klick → öffnet File-Detail mit gehighlightetem Source (rote Zeilen = nicht covered).

**Data:** `onManifestReady` hook merged Coverage-JSON ins Manifest. Panel liest aus `component.meta.coverage = { percent, lines, branches, functions, uncoveredLines }`.

### Plugin-Panel Checklist (pro Plugin)

- [ ] Ersetze das Template + SCSS der vorhandenen `{name}-panel.component.ts`.
- [ ] SCSS nutzt nur die globalen `--prism-*`-Tokens (kein Hart-Kodieren von Farben).
- [ ] Keine Breaking-Changes an `PanelDefinition`, `meta`-Struktur, `loadComponent`-Factory.
- [ ] Icons: lucide-angular, semantisch (z.B. `accessibility`, `zap`, `sliders-horizontal`).

---

## 11. Icons (lucide-angular)

Map der im Mockup verwendeten Inline-SVGs zu Lucide-Namen:

| Context | Lucide |
|---|---|
| Search | `search` |
| Refresh | `refresh-cw` |
| Notifications | `bell` |
| Sun / Moon | `sun` / `moon` |
| Menu more | `more-horizontal` |
| Chevron | `chevron-down` / `chevron-right` |
| Pin (Pages) | `pin` |
| Pages icons | `rocket`, `book-open`, `clock`, `palette` |
| Component squares | `box` / `component` |
| Controls tab | `sliders-horizontal` |
| Events tab | `zap` |
| A11y tab | `accessibility` |
| JSDoc tab | `file-text` |
| Figma tab | `figma` |
| Box-Model tab | `box-select` |
| Performance tab | `activity` |
| Coverage tab | `shield-check` |
| Zoom center | `move` |
| Crosshair/Guides | `crosshair` |
| Copy | `copy` |
| StackBlitz | `plus-circle` |
| Orient right | `panel-right` |
| Maximize | `maximize-2` |
| Eye (A11y persp) | `eye` |

Import-Pattern:

```ts
import { LucideAngularModule, Search, Bell, Sun, Moon } from 'lucide-angular';

@Component({
  imports: [LucideAngularModule],
  template: `<lucide-icon [img]="Search" [size]="16" />`,
})
export class MyComp {
  readonly Search = Search;
}
```

---

## 12. Interaktions- und Animations-Specs

| Element | Verhalten | Dauer | Easing |
|---|---|---|---|
| Theme toggle | Farben interpolieren via CSS-transition auf `color, background-color, border-color` | 0.2s | default |
| Sidebar group expand | `display: none` ↔ `block` (kein height-animate — Performance) | — | — |
| Code drawer collapse | `max-height` 260px ↔ 40px + body `opacity` | 0.25s | default |
| Variant-Ribbon active | underline `::after` opacity 0→1 | 0.12s | default |
| Panel-Tab active | underline appear + color change | 0.12s | default |
| Zoom change | `transform: scale()` auf `.prism-demo-wrap` | 0.18s | default |
| A11y overlay reveal | `.a11y-mark` opacity 0→1 | 0.2s | default |
| Resize handles | kein transition — Live-Drag |||
| Tweaks panel open | slide-in von rechts | 0.25s | default |

---

## 13. Responsive / Small-Viewport Handling

- Shell: kein echtes Mobile-Design — dieses Tool ist desktop-first. Unter ~900px: Sidebar zuklappbar (Toggle im Header).
- Unter 540px Höhe: Comp-Head komprimiert (Description + Tags ausblenden). Panel-Dock default-Height auf 220px.
- Canvas-Wrap hat `minmax(180px, 1fr)` → schrumpft, kollabiert aber nie.
- Main-Container hat `overflow: auto` als Safety-Net.

---

## 14. Tweaks-Panel (optional, nur Dev-Tool)

Floating-Panel (bottom-right), togglebar. Enthält:
- Theme-Select
- Sidebar-Width-Slider (200–360)
- Panel-Height-Slider (200–560)
- Dot-Size-Slider (Canvas-Background)
- Overlay-Force-Toggle

Im Mockup vorhanden. Empfehlung: **nicht in Produktion exportieren**, nur als `?tweaks=1`-Query-Flag aktivieren oder ganz weglassen.

---

## 15. Accessibility-Anforderungen (für die neue Shell)

- Shell-Fokus-Reihenfolge: Header-Brand → Search → Header-Actions → Sidebar-Filter → Sidebar-Items → Main → Panel-Tabs → Panel-Body.
- Alle Icon-Buttons brauchen `aria-label`.
- Resizer: `role="separator"`, `aria-orientation`, Pfeil-Keys zum Anpassen.
- Panel-Tabs: `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls`.
- Sidebar-Group-Heads: `aria-expanded`.
- Theme-Toggle: `aria-pressed`.
- Fokus-Sichtbarkeit: 2px Outline in `--prism-primary`, offset 2px, auf allen interaktiven Elementen.

---

## 16. Dateistruktur-Vorschlag

Bestehende Struktur bleibt. Neue Komponenten so anlegen:

```
packages/ng-prism/src/lib/ui/
  shell/
    prism-shell.component.ts
    prism-shell.component.scss
  header/
    prism-header.component.ts
    ...
  sidebar/
    prism-sidebar.component.ts
    prism-sidebar-group.component.ts
    prism-sidebar-item.component.ts
    prism-sidebar-filter.component.ts
    sidebar-store.ts
  component-head/
    prism-component-head.component.ts
    prism-stat.component.ts
  variant-ribbon/
    prism-variant-ribbon.component.ts
  canvas/
    prism-canvas-wrap.component.ts
    prism-canvas-toolbar.component.ts
    prism-canvas-stage.component.ts
    prism-code-drawer.component.ts
  panel-dock/
    prism-panel-dock.component.ts
    prism-panel-host.component.ts    # existiert bereits — Template tauschen
  directives/
    prism-resizer.directive.ts
  services/
    theme.service.ts
    layout.service.ts                # sidebarWidth, panelHeight Signals
```

Built-in-Panels leben weiter im Core:

```
packages/ng-prism/src/lib/panels/
  controls/prism-controls-panel.component.ts
  events/prism-events-panel.component.ts
  a11y/  (bereits da)
```

Plugin-Panels (JSDoc, Figma, Box-Model, Perf, Coverage) werden in ihren jeweiligen `packages/plugin-{name}/src/{name}-panel.component.ts` angepasst — keine neuen Dateien dort.

---

## 17. Migration Order (empfohlen)

1. **Tokens & Theme Service** — keine Breaking Changes, läuft parallel.
2. **Shell-Grid + Header + Sidebar** — ersetzt heutigen Chrome.
3. **Comp-Head + Variant-Ribbon** — reines Design-Refresh der Detail-View.
4. **Canvas-Wrap + Toolbar + Stage** — Renderer-Slot bleibt identisch.
5. **Code-Drawer** — neu; wird unter Canvas eingefügt.
6. **Panel-Dock** — Tabs-Layout + Host.
7. **Core-Panels** (Controls, Events) — UI refreshen.
8. **A11y-Panel** — UI refreshen, Checks bleiben.
9. **Plugin-Panels einzeln** — jedes Plugin separat mergen, Contract unverändert.
10. **Tweaks-Panel** — optional, am Ende.

---

## 18. Mockup als Referenz

Das HTML-Mockup (`ng-prism.html`) liegt bei. Alle exakten Pixel-Werte, Farb-Abstufungen, Hover-States und Micro-Interactions sind dort nachvollziehbar. Bei Unklarheiten: **erst ins Mockup schauen, dann fragen**.

Im Mockup relevante Zeilen:
- `L11–60` Tokens dark / `L31–60` light
- `L64` Shell-Grid
- `L87` Body-Grid
- `L90–134` Sidebar
- `L142` Main-Grid (⚠ Bug-Historie: 4 vs 5 rows — siehe Section 2)
- `L145` Comp-Head
- `L165` Variant-Ribbon
- `L179` Canvas-Wrap
- `L231` Code-Drawer
- `L252+` Panel
- `L271+` Controls
- `L302+` A11y-Panel
- `L333+` Events
- `L362+` Figma
- Weitere Plugins analog.

---

**Fragen / Unklarheiten?** Diese Spec ist absichtlich defensiv — bei Design-Entscheidungen die im Mockup nicht eindeutig sind, lieber eine kleine Frage stellen als raten.
