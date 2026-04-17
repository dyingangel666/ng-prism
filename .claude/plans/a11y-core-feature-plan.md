# Plan: A11y als Kern-Feature

**Status:** Entwurf
**Datum:** 2026-03-23
**Scope:** Vollständige Integration von Accessibility-Audit in die ng-prism Core-Library

---

## Motivation

Accessibility ist kein optionales Add-on. Jeder Entwickler, der Komponenten in ng-prism dokumentiert, sollte sofort sehen, ob seine Komponente zugänglich ist — ohne Plugin zu installieren und zu konfigurieren. Der bestehende `@ng-prism/plugin-a11y` hat bewiesen, dass die Architektur funktioniert. Jetzt wird das Feature zu einem First-Class-Bürger.

**Kernaussage:** Wer eine Komponente dokumentiert, dokumentiert auch ihre Accessibility.

---

## Scope des Features

### Was reinkimmt (Core)

| Feature | Beschreibung |
|---|---|
| **A11y-Score** | 0–100 Score, kontinuierlich berechnet |
| **Violations Panel** | axe-core Audit (Violations / Needs Review / Passes) |
| **Keyboard Nav** | Tab-Order-Visualisierung als Canvas-Overlay + Panel |
| **ARIA Tree** | Accessibility-Baum aus dem live DOM, ohne externe API |
| **Screen Reader Output** | Simulierte Announcements in Dokument-Reihenfolge |
| **Perspektiv-Toggle** | Umschalter "Visuell ↔ Screen Reader" |

### Was herausbleibt

- Keine Anbindung an echte Screenreader-Software
- Kein CI-Reporting (kann per Plugin ergänzt werden)
- Keine WCAG-Level-Konfiguration im Core (bleibt über `@Showcase.meta.a11y`)

---

## UI Design

### Gesamtlayout — Neue Toolbar-Zeile im Renderer

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [Default]  [Disabled]  [Loading]          [</> Code]  [👁 Visual  🎧 SR]│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        ·  ·  ·  ·  ·  ·  ·                             │
│                      ·                       ·                          │
│                    ·     ┌────────────┐       ·                         │
│                    ·     │  <button>  │       ·                         │
│                    ·     └────────────┘       ·                         │
│                      ·                       ·                          │
│                        ·  ·  ·  ·  ·  ·  ·                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

Der **Perspektiv-Toggle** sitzt in der Renderer-Toolbar, rechts neben `</> Code`. Er ist global — er beeinflusst Canvas-Overlay und aktiven Panel-Inhalt gleichzeitig.

### Panel-Tab-Leiste mit Score-Ring

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Controls  Events  ●82 A11y                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

Der Score-Ring (●) ist direkt im Tab-Label. Farbe: Rot (<50) → Amber (50–79) → Grün (80+). Kein separates Widget — direkt eingebettet.

### A11y Panel — Sub-Navigation

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [Violations 3]  [Keyboard 4]  [ARIA Tree]  [Screen Reader]             │
├──────────────────────────────────────────────────────────────────────────┤
│  ...Sub-View-Inhalt...                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

Vier Sub-Views innerhalb des A11y-Panels. Badge-Zahlen bei Violations und Keyboard-Elementen.

---

### Sub-View 1: Violations

Identisch zum bestehenden Plugin-Panel — aber oben der Score-Ring als Hero-Element:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│      ╭──────╮                                           │
│      │  82  │  82/100 · 3 Violations · 12 Passes       │
│      ╰──────╯  1 critical, 2 moderate                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ ▾ VIOLATIONS  [3]                                       │
│   ┌──────────────────────────────────────────────────┐  │
│   │ [critical] color-contrast                        │  │
│   │ Ensures the contrast between foreground and...   │  │
│   │ <button class="primary">Submit</button>          │  │
│   │ Learn more ↗                                     │  │
│   └──────────────────────────────────────────────────┘  │
│ ▸ NEEDS REVIEW  [1]                                     │
│ ▸ PASSES  [12]                                          │
└─────────────────────────────────────────────────────────┘
```

Score-Ring: SVG `<circle>` mit `stroke-dashoffset` animiert. Gradient-Stroke von `--a11y-red` über `--a11y-amber` nach `--a11y-green`.

---

### Sub-View 2: Keyboard

Panel-Inhalt zeigt die Tab-Reihenfolge als nummerierte Liste:

```
┌─────────────────────────────────────────────────────────┐
│  4 fokussierbare Elemente · Canvas-Overlay aktiv        │
│                                                         │
│  ①  button  "Absenden"                                  │
│     Accessible name via: Textinhalt                     │
│                                                         │
│  ②  input[type=text]  "E-Mail-Adresse"                 │
│     Accessible name via: <label for>                    │
│     Zustand: required                                   │
│                                                         │
│  ③  a[href]  "Mehr erfahren"                           │
│     Accessible name via: Textinhalt                     │
│                                                         │
│  ④  input[type=checkbox]  "Datenschutz akzeptieren"    │
│     Accessible name via: <label for>                    │
│     Zustand: unchecked                                  │
└─────────────────────────────────────────────────────────┘
```

**Canvas-Overlay (aktiv, wenn Sub-View = Keyboard):** Nummerierte Kreise (`①②③…`) werden über den fokussierbaren Elementen positioniert — via `getBoundingClientRect()` relativ zum Canvas-Container. Verbindungslinien zeigen die Reihenfolge. Die Overlay-Komponente nutzt den bestehenden `overlayComponent`-Mechanismus des Renderers.

---

### Sub-View 3: ARIA Tree

Baumdarstellung des Accessibility-Trees. Ohne externe Browser-API — eigener Walker.

```
┌─────────────────────────────────────────────────────────┐
│  landmark "main"                                        │
│  └─ form  (aria-label="Anmeldeformular")                │
│     ├─ textbox "E-Mail" · required                      │
│     ├─ textbox "Passwort" · required                    │
│     └─ button "Anmelden"                                │
│        (role: button, tabindex: 0)                      │
│                                                         │
│  ▸ Versteckte Elemente (aria-hidden)  [2]               │
└─────────────────────────────────────────────────────────┘
```

Schriftart: Monospace. Einrückung: 2 Zeichen pro Level. Farben: Role in `--prism-primary`, Zustände in `--a11y-amber`, Namen in `--prism-text`.

---

### Sub-View 4: Screen Reader

Sequentielle Liste aller Announcements in Dokument-Reihenfolge. Wie ein "Skript" für den Screen Reader.

**Visueller Modus:**
```
┌─────────────────────────────────────────────────────────┐
│  6 Announcements                                        │
│                                                         │
│  1  "Anmeldeformular"  form landmark                    │
│  2  "E-Mail" text field  required                       │
│  3  "Passwort" text field  required                     │
│  4  "Passwort verbergen" button                         │
│  5  "Anmelden" button                                   │
│  6  "Passwort vergessen?" link                          │
└─────────────────────────────────────────────────────────┘
```

**Screen-Reader-Modus** (Perspektiv-Toggle aktiv):

Canvas-Overlay: Nummerierte Badges auf jedem Element in Lesereihenfolge.

Panel wechselt zu einem sequentiellen "Player"-Layout:

```
┌─────────────────────────────────────────────────────────┐
│  ◀ ▶  Screen Reader Simulation                         │
│  ══════════════════════════════════════════             │
│                                                         │
│                    ┌───────────────┐                    │
│                    │  2 / 6        │                    │
│                    │               │                    │
│                    │  "E-Mail"     │                    │
│                    │  text field   │                    │
│                    │  required     │                    │
│                    └───────────────┘                    │
│                                                         │
│  ① form  ②[E-Mail]  ③ Passwort  ④ btn  ⑤ btn  ⑥ link│
└─────────────────────────────────────────────────────────┘
```

Navigation per ◀ ▶ oder Pfeil-Tasten. Das aktive Element wird im Canvas hervorgehoben (Outline-Overlay).

---

## Architektur

### Dateistruktur

```
packages/ng-prism/src/app/panels/a11y/
├── a11y-core.plugin.ts               # Plugin-Definition (builtIn)
├── a11y-panel.component.ts           # Äußerer Container, Sub-Tabs, Perspective-State
├── a11y-score.component.ts           # Score-Ring SVG-Komponente
├── a11y-violations.component.ts      # Violations-View (aus plugin-a11y portiert)
├── a11y-keyboard.component.ts        # Keyboard-Nav-View
├── a11y-tree.component.ts            # ARIA-Tree-View
├── a11y-sr.component.ts              # Screen-Reader-Simulation-View
├── a11y-keyboard-overlay.component.ts # Canvas-Overlay für Tab-Reihenfolge
├── a11y-sr-overlay.component.ts      # Canvas-Overlay für SR-Modus
├── a11y-audit.service.ts             # axe-core Integration
├── a11y-keyboard.service.ts          # Tab-Order-Extraktion
├── a11y-tree.service.ts              # ARIA-Tree-Extraktion
└── a11y-sr.service.ts                # Screen-Reader-Simulation
```

### Services

#### `A11yAuditService`

```typescript
@Injectable({ providedIn: 'root' })
export class A11yAuditService {
  readonly results = signal<AxeResults | null>(null);
  readonly running = signal(false);
  readonly score = computed(() => calculateScore(this.results()));

  scheduleAudit(element: Element, config?: A11yCoreConfig): void { ... }
}

function calculateScore(results: AxeResults | null): number {
  if (!results) return -1;
  const deductions =
    results.violations.filter(v => v.impact === 'critical').length * 25 +
    results.violations.filter(v => v.impact === 'serious').length * 10 +
    results.violations.filter(v => v.impact === 'moderate').length * 5 +
    results.violations.filter(v => v.impact === 'minor').length * 1;
  return Math.max(0, 100 - deductions);
}
```

#### `A11yKeyboardService`

```typescript
export interface FocusableElement {
  element: Element;
  index: number;          // Tab-Reihenfolge (1-basiert)
  role: string;
  name: string;
  nameSource: string;     // 'aria-label' | 'label[for]' | 'text-content' | 'title' | 'alt'
  states: string[];       // ['required', 'disabled', ...]
  tabindex: number | null;
}

@Injectable({ providedIn: 'root' })
export class A11yKeyboardService {
  extractTabOrder(root: Element): FocusableElement[] { ... }
}
```

**Focusable-Selector:**
```
a[href], button:not([disabled]), input:not([disabled]),
select:not([disabled]), textarea:not([disabled]),
[tabindex]:not([tabindex="-1"]), [contenteditable="true"]
```

Sortierung: Positive `tabindex`-Werte zuerst (aufsteigend), dann `tabindex="0"` / kein tabindex in DOM-Reihenfolge.

#### `A11yTreeService`

```typescript
export interface A11yNode {
  role: string;
  name: string | null;
  nameSource?: string;
  description?: string;
  states: Record<string, string | boolean>;
  children: A11yNode[];
  hidden: boolean;
  element: Element;
}

@Injectable({ providedIn: 'root' })
export class A11yTreeService {
  buildTree(root: Element): A11yNode { ... }
}
```

Implizite Rollen werden über eine Mapping-Tabelle aufgelöst:
```typescript
const IMPLICIT_ROLES: Record<string, string> = {
  a: 'link', button: 'button', input: 'textbox', /* ... */
  h1: 'heading', h2: 'heading', /* ... */
  nav: 'navigation', main: 'main', header: 'banner', footer: 'contentinfo',
  ul: 'list', ol: 'list', li: 'listitem',
  form: 'form', table: 'table', /* ... */
};
```

#### `A11ySrService`

```typescript
export interface SrAnnouncement {
  index: number;
  text: string;       // Vollständige Announcement: "E-Mail text field required"
  name: string;       // Accessible name
  role: string;       // Menschenlesbare Rolle
  states: string[];
  element: Element;
}

@Injectable({ providedIn: 'root' })
export class A11ySrService {
  buildAnnouncementList(root: Element): SrAnnouncement[] { ... }
}
```

### Perspective-State

Der Toggle-Zustand (`visual` | `screen-reader`) wird in einem neuen **`A11yPerspectiveService`** gehalten:

```typescript
@Injectable({ providedIn: 'root' })
export class A11yPerspectiveService {
  readonly mode = signal<'visual' | 'screen-reader'>('visual');
}
```

Der Service ist `providedIn: 'root'` und damit global. Der Renderer-Toggle liest/schreibt ihn. Die Canvas-Overlays lesen ihn.

### Overlay-Mechanismus

Für Keyboard-View und SR-View werden separate Canvas-Overlays registriert:

```typescript
export const A11Y_CORE_PLUGIN: PanelDefinition = {
  id: 'a11y',
  label: 'A11y',
  loadComponent: () => import('./a11y-panel.component.js').then(m => m.A11yPanelComponent),
  loadOverlayComponent: () => import('./a11y-keyboard-overlay.component.js')
    .then(m => m.A11yKeyboardOverlayComponent),
};
```

Das Overlay wird nur gerendert, wenn Sub-View = Keyboard ODER Perspektiv = Screen-Reader.

### Integration in `PrismPanelHostComponent`

`a11y-core.plugin.ts` wird in `builtInPanels` eingetragen — analog zu `CONTROLS_PLUGIN` und `EVENTS_PLUGIN`:

```typescript
private readonly builtInPanels: PanelDefinition[] = [
  ...(CONTROLS_PLUGIN.panels ?? []),
  ...(EVENTS_PLUGIN.panels ?? []),
  ...(A11Y_CORE_PLUGIN.panels ?? []),
];
```

### Score im Tab-Label

Der Tab-Label ist bisher ein statischer String. Um den Score anzuzeigen, wird der Tab-Label zu einem Component-Template:

**Option A:** Label bleibt String, Score-Ring ist eine separate kleine Komponente im Tab-Button.

**Option B:** `PanelDefinition.labelComponent?: Type<unknown>` — optionales Component für das Label.

→ **Option A** ist einfacher und reicht für das Ziel. Der Score-Ring wird per `<prism-a11y-score-badge>` inline im Panel-Host tab gerendert, wenn `panel.id === 'a11y'`.

Oder eleganter: `PanelDefinition.badge?: Signal<string | number>` — ein optionales Signal das den Badge-Wert liefert. Der Panel-Host rendert es automatisch.

---

## Score-Ring — SVG Design

```
     ╭─────────╮
    │           │
    │    82     │
    │           │
     ╰─────────╯

Outer ring: stroke-opacity: 0.15 (track)
Colored arc: stroke-dasharray / stroke-dashoffset
            Farbe: color-mix(in srgb, --a11y-green 100%, --a11y-amber 0%)
            — interpoliert basierend auf Score
```

**SVG:**
```xml
<svg viewBox="0 0 36 36">
  <!-- Track -->
  <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor"
          stroke-opacity="0.12" stroke-width="3.8"/>
  <!-- Arc -->
  <circle cx="18" cy="18" r="15.9" fill="none"
          stroke="var(--score-color)" stroke-width="3.8"
          stroke-dasharray="100 100"
          stroke-dashoffset="calc(100 - var(--score))"
          stroke-linecap="round"
          transform="rotate(-90 18 18)"/>
  <!-- Value -->
  <text x="18" y="22" text-anchor="middle" font-size="9" fill="currentColor">82</text>
</svg>
```

---

## Konfiguration

### Via `@Showcase.meta.a11y`

Bleibt kompatibel mit dem bestehenden Plugin:

```typescript
@Showcase({
  meta: {
    a11y: {
      disable: false,          // Audit komplett deaktivieren
      rules: {                  // Einzelne Regeln übersteuern
        'color-contrast': { enabled: false }
      }
    }
  }
})
```

### Via `defineConfig()`

Globale Defaults für alle Komponenten:

```typescript
defineConfig({
  a11y: {
    rules: { 'color-contrast': { enabled: true } }
  }
})
```

Das `a11y`-Feld in `NgPrismConfig` ist neu — wird vom Core ausgelesen.

---

## Migration von `@ng-prism/plugin-a11y`

Das Plugin bleibt erhalten, aber:
1. `@ng-prism/plugin-a11y` wird als **deprecated** markiert (README-Hinweis)
2. Core-A11y ersetzt die Plugin-Funktionalität vollständig
3. Plugin wird in einer Major-Version entfernt

Übergangsphase: Wenn Core-A11y UND `a11yPlugin()` beide registriert sind, wird `a11yPlugin()` ignoriert (Warnung in der Konsole).

---

## Implementierungsplan

### Phase 1 — Services (kein UI)

1. `a11y-keyboard.service.ts` + Tests (Tab-Order-Extraktion)
2. `a11y-tree.service.ts` + Tests (ARIA-Tree-Extraktion mit Implicit-Role-Mapping)
3. `a11y-sr.service.ts` + Tests (Announcement-Generierung)
4. `a11y-audit.service.ts` + Tests (axe-core-Wrapper mit Score-Berechnung)

### Phase 2 — Violations-Panel (Port aus Plugin)

5. `a11y-violations.component.ts` — direkter Port von `A11yPanelComponent` aus plugin-a11y
6. `a11y-score.component.ts` — Score-Ring als eigenständige Komponente
7. `a11y-panel.component.ts` — Outer-Container mit Sub-Tabs (nur Violations zunächst)
8. `a11y-core.plugin.ts` — Plugin-Definition, in `builtInPanels` eintragen
9. Score im Tab-Label: `PanelDefinition.badge?: Signal<string>` + Panel-Host-Update

### Phase 3 — Keyboard-Nav

10. `a11y-keyboard.component.ts` — Panel-Sub-View
11. `a11y-keyboard-overlay.component.ts` — Canvas-Overlay
12. Overlay-Aktivierung: Sub-View-Wechsel → `overlayComponent` dynamisch setzen

### Phase 4 — ARIA Tree

13. `a11y-tree.component.ts` — Baumdarstellung mit Expand/Collapse
14. Hidden-Elemente-Sektion (zusammengeklappt)

### Phase 5 — Screen Reader & Perspective Toggle

15. `a11y-perspective.service.ts`
16. `a11y-sr.component.ts` — Player-Layout im SR-Modus
17. `a11y-sr-overlay.component.ts` — Nummerierte Badges im SR-Modus
18. Perspective-Toggle in Renderer-Toolbar
19. Score-Ring-Farbe und Canvas-Blur-Effekt im SR-Modus

### Phase 6 — Deprecation & Tests

20. `@ng-prism/plugin-a11y` README: Deprecation-Hinweis
21. Integration-Tests im test-workspace
22. Konsolenwarnung wenn Plugin + Core gleichzeitig aktiv

---

## Technische Risiken & Offene Fragen

| Risiko | Einschätzung | Strategie |
|---|---|---|
| `getBoundingClientRect()` für Canvas-Overlay — relativ zum richtigen Container | Mittel | Canvas-Container als Referenz per `ElementRef` injizieren |
| ARIA-Tree-Extraktion ohne Browser-Accessibility-API ist unvollständig | Mittel | Implizite Rollen + aria-* abdecken, JAWS/NVDA nicht emulieren |
| axe-core als Pflicht-Dependency im Core (bisher peerDep im Plugin) | Hoch | axe-core als direktes peerDependency des Core hinzufügen |
| SR-Simulation ist notwendigerweise unvollständig | Niedrig | Klar als "Simulation" labeln, kein 100%-Anspruch |
| Canvas-Overlay + SR-Overlay gleichzeitig aktiv | Niedrig | Immer nur eines aktiv (Keyboard-Overlay ODER SR-Overlay) |

---

## Design-Tokens (neu)

```css
/* Score-Farben — interpoliert nach Score */
--a11y-score-critical: var(--a11y-red);    /* < 50 */
--a11y-score-warning: var(--a11y-amber);   /* 50–79 */
--a11y-score-good: var(--a11y-green);      /* 80+ */

/* Keyboard-Overlay */
--a11y-focus-badge-bg: #6366f1;      /* Indigo — "Fokus"-Farbe */
--a11y-focus-badge-text: #ffffff;
--a11y-focus-line: rgba(99, 102, 241, 0.4);

/* ARIA Tree */
--a11y-tree-role: var(--prism-primary);
--a11y-tree-name: var(--prism-text);
--a11y-tree-state: var(--a11y-amber);
--a11y-tree-hidden: var(--prism-text-muted);
--a11y-tree-indent: 20px;

/* SR-Overlay */
--a11y-sr-badge-bg: #7c3aed;         /* Violett — "Stimme" */
--a11y-sr-badge-text: #ffffff;
--a11y-sr-active-outline: 2px solid #7c3aed;
```

**Begründung Indigo/Violett für Keyboard/SR:**
- Blau ist bereits für `--prism-primary` (interaktive Elemente) reserviert
- Indigo/Violett hat Assoziation mit "Accessibility" (a11y-Community nutzt oft lila)
- Trennt die Overlay-Ebene klar von der Komponente selbst

---

## Referenzen

- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [Accessible Name Computation Algorithm](https://www.w3.org/TR/accname-1.1/)
- [HTML AAM — Implicit Roles](https://www.w3.org/TR/html-aam-1.0/)
