# ng-prism — SPEC

> Leichtgewichtige, Angular-native Alternative zu Storybook.
> Zero extra files. Ein Decorator. Alles andere wird abgeleitet.

---

## Vision

Entwickler annotieren ihre Angular-Komponenten direkt mit einem `@Showcase`-Decorator.
Der Living Styleguide entdeckt automatisch alle annotierten Komponenten aus dem
Library-Entry-Point, extrahiert Typen und Dokumentation via TypeScript Compiler API
und rendert eine interaktive Komponenten-Übersicht — ohne eine einzige extra Story-Datei.

---

## Developer Experience (Ziel-DX)

### 1. Installation (einmalig pro Workspace)

```bash
ng add ng-prism
```

Das Schematic übernimmt:
- Erstellt `projects/<libname>-prism/` als separate Angular-App
- Trägt einen Custom Builder in `angular.json` ein
- Installiert `ng-prism` als `devDependency`
- Fügt `reflect-metadata`-Import in `polyfills.ts` ein (falls noch nicht vorhanden)

### 2. Komponente annotieren

```typescript
// button.component.ts — keine extra Datei nötig!
import { Showcase } from 'ng-prism';

@Component({
  selector: 'my-button',
  standalone: true,
  template: `<button [class]="variant" [disabled]="disabled">{{ label }}</button>`,
})
@Showcase({
  title: 'Button',
  description: 'Vielseitiger Button für alle Aktionen.',
  category: 'Inputs',
  variants: [
    { name: 'Primary',  inputs: { variant: 'primary',   label: 'Speichern' } },
    { name: 'Danger',   inputs: { variant: 'danger',    label: 'Löschen'   } },
    { name: 'Disabled', inputs: { variant: 'primary',   disabled: true     } },
  ],
})
export class ButtonComponent {
  /** Visuelle Ausprägung des Buttons */
  @Input() variant: 'primary' | 'secondary' | 'danger' = 'primary';
  /** Deaktiviert den Button */
  @Input() disabled = false;
  /** Button-Beschriftung */
  @Input() label = 'Button';

  @Output() clicked = new EventEmitter<void>();
}
```

### 3. Styleguide starten

```bash
ng run my-lib:prism
# oder mit npm script: npm run prism
```

### 4. Static Build für Hosting (z.B. GitHub Pages)

```bash
ng run my-lib:prism:build
```

---

## Architektur

```
packages/
├── ng-prism/                   npm: ng-prism (Kern-Package)
│   ├── decorator/              @Showcase, Typen (ShowcaseConfig, Variant, ...)
│   ├── plugin/                 Plugin-API: NgPrismPlugin Interface, defineConfig
│   ├── builder/                Custom Angular Builder (@angular-devkit/architect)
│   │   ├── scanner/            TypeScript Compiler API — scannt public-api.ts
│   │   ├── manifest/           Generiert prism-manifest.ts zur Laufzeit
│   │   ├── plugin-runner/      Führt Build-Zeit-Plugin-Hooks aus
│   │   └── server/             Startet Angular Dev Server für die Prism-App
│   ├── schematics/             ng add schematic
│   │   ├── ng-add/             Erstellt Prism-App-Projekt, patcht angular.json
│   │   └── templates/          Prism-App-Template (wird ins Workspace kopiert)
│   └── app/                    Die Prism-App selbst (Template, wird bei ng add generiert)
│       ├── shell/              Layout: Sidebar, Header, Viewport
│       ├── renderer/           Dynamisches Rendering via NgComponentOutlet
│       ├── controls/           Auto-generiertes Controls-Panel (intern ein Plugin)
│       ├── events/             Event-Log Panel (intern ein Plugin)
│       ├── plugin-host/        Lädt Runtime-Plugins, rendert Panel- und Control-Beiträge
│       └── manifest-loader/    Lädt das generierte Manifest
│
├── plugin-a11y/                npm: @ng-prism/plugin-a11y
├── plugin-viewport/            npm: @ng-prism/plugin-viewport
├── plugin-theme/               npm: @ng-prism/plugin-theme
└── plugin-measure/             npm: @ng-prism/plugin-measure
```

### Workspace-Struktur nach `ng add`

```
my-angular-workspace/
├── projects/
│   ├── my-lib/
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   └── button/
│   │   │   │       └── button.component.ts   ← @Showcase hier
│   │   │   └── public-api.ts                 ← Entry Point für Scanner
│   │   └── ng-package.json
│   │
│   └── my-lib-prism/                         ← von Schematic generiert
│       └── src/
│           ├── app/                          ← Prism-App
│           └── main.ts
│
├── ng-prism.config.ts                        ← von Schematic generiert
├── angular.json                              ← um Custom Builder erweitert
└── package.json
```

### angular.json nach `ng add`

```json
{
  "projects": {
    "my-lib": {
      "architect": {
        "prism": {
          "builder": "ng-prism:serve",
          "options": {
            "libraryProject": "my-lib",
            "entryPoint": "projects/my-lib/src/public-api.ts",
            "prismProject": "my-lib-prism",
            "port": 4400
          }
        },
        "prism-build": {
          "builder": "ng-prism:build",
          "options": {
            "libraryProject": "my-lib",
            "entryPoint": "projects/my-lib/src/public-api.ts",
            "outputPath": "dist/my-lib-prism"
          }
        }
      }
    }
  }
}
```

---

## Plugin-Architektur

Das Plugin-System ist der Erweiterungspunkt für alle optionalen Features.
Intern sind auch die eingebauten Panels (Controls, Events) als Plugins implementiert
— das garantiert, dass die Plugin-API vollständig und praxistauglich ist.

### Konfigurationsdatei

```typescript
// ng-prism.config.ts (Workspace-Root)
import { defineConfig } from 'ng-prism/config';
import { a11yPlugin } from '@ng-prism/plugin-a11y';

export default defineConfig({
  /**
   * Providers die beim Bootstrap der Styleguide-App registriert werden.
   * Für library-weite Services (z.B. Animations, HTTP, Library-Setup).
   */
  appProviders: [
    provideAnimationsAsync(),
    provideHttpClient(),
    provideMyLibrary({ theme: 'light' }),
  ],

  plugins: [
    a11yPlugin(),
    themePlugin({ themes: ['light', 'dark', 'high-contrast'] }),
  ],
});
```

### `NgPrismPlugin` Interface

```typescript
interface NgPrismPlugin {
  /** Eindeutiger Name des Plugins (für Debugging und Konflikterkennung) */
  name: string;

  // --- Build-Zeit-Hooks (laufen im Angular Builder) ---

  /** Wird für jede gefundene Showcase-Komponente aufgerufen.
   *  Kann Metadaten anreichern oder transformieren. */
  onComponentScanned?: (component: ScannedComponent) => ScannedComponent | void;

  /** Wird nach Abschluss des gesamten Scans aufgerufen.
   *  Kann das Manifest als Ganzes transformieren. */
  onManifestReady?: (manifest: ShowcaseManifest) => ShowcaseManifest | void;

  // --- Runtime-Beiträge (werden in die Styleguide-App eingebettet) ---

  /** Zusätzliche UI-Panels (z.B. A11y-Panel, Theme-Switcher) */
  panels?: PanelDefinition[];

  /** Eigene Control-Typen (z.B. Color Picker für CSS-Farb-Inputs) */
  controls?: ControlDefinition[];

  /** Angular-Komponente die jede gerenderte Komponente umhüllt
   *  (z.B. für Theme-Provider oder Kontext-Injection) */
  wrapComponent?: Type<unknown>;
}
```

### Panel- und Control-Definition

```typescript
interface PanelDefinition {
  id: string;
  label: string;
  /** Angular Standalone Component die den Panel-Inhalt rendert */
  component: Type<unknown>;
  icon?: string;
  /** Wo der Panel-Tab erscheint */
  position?: 'bottom' | 'right';
}

interface ControlDefinition {
  /** Gibt true zurück wenn dieses Control für den gegebenen Input zuständig ist */
  matchType: (input: InputMeta) => boolean;
  /** Angular Standalone Component die das Control rendert */
  component: Type<unknown>;
}
```

### Eigenes Plugin schreiben (Beispiel)

```typescript
// my-theme-plugin.ts
import { NgPrismPlugin } from 'ng-prism/plugin';
import { ThemePanelComponent } from './theme-panel.component';

export function themePlugin(options: { themes: string[] }): NgPrismPlugin {
  return {
    name: 'theme-plugin',
    panels: [
      {
        id: 'theme',
        label: 'Theme',
        component: ThemePanelComponent,
        position: 'bottom',
      },
    ],
    wrapComponent: ThemeWrapperComponent,
  };
}
```

### Offizielle Plugins (Roadmap)

| Package | Funktion |
|---|---|
| `@ng-prism/plugin-a11y` | Accessibility-Checks via axe-core |
| `@ng-prism/plugin-viewport` | Viewport-Switcher (Mobile/Tablet/Desktop) |
| `@ng-prism/plugin-theme` | CSS-Theme-Switcher mit Custom Properties |
| `@ng-prism/plugin-measure` | Spacing/Size-Overlays für Designs |

---

## Kern-Mechanismen

### 1. `@Showcase` Decorator (Runtime-Metadaten)

```typescript
export function Showcase(config: ShowcaseConfig): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata('ngPrism:config', config, target);
  };
}

// Lesen zur Laufzeit:
const config = Reflect.getMetadata('ngPrism:config', ButtonComponent);
```

### 2. Scanner (TypeScript Compiler API, Build-Zeit)

Der Builder scannt `public-api.ts` des Library-Projekts:

1. Alle Re-Exports aus `public-api.ts` auflösen
2. Alle Klassen mit `@Showcase`-Decorator finden
3. Pro Klasse extrahieren:
   - Alle `@Input()`-Properties mit Typ, Default-Wert, JSDoc
   - Alle `@Output()`-Properties
   - `@Component`-Metadaten (selector, standalone, imports)
4. Generiert `showcase-manifest.ts` mit dynamischen Imports

### 3. Generiertes Manifest (Beispiel)

```typescript
// prism-manifest.ts — auto-generiert, nicht committen!
export const prismManifest: PrismManifest = [
  {
    component: () => import('my-lib').then(m => m.ButtonComponent),
    inputs: [
      { name: 'variant', type: 'union', values: ['primary','secondary','danger'], default: 'primary', doc: 'Visuelle Ausprägung' },
      { name: 'disabled', type: 'boolean', default: false, doc: 'Deaktiviert den Button' },
      { name: 'label',   type: 'string',  default: 'Button', doc: 'Button-Beschriftung' },
    ],
    outputs: [
      { name: 'clicked', doc: 'Wird beim Klick ausgelöst' }
    ],
  },
];
```

### 4. Dynamisches Rendering (Runtime)

Komponenten werden **direkt im DOM** gerendert — **kein `<iframe>`**.
Das ist eine bewusste Entscheidung: Dialoge, Overlays und Services wie `MatDialog`
oder CDK `Overlay` funktionieren dadurch out of the box, weil sie im `document.body`
der Styleguide-App arbeiten — exakt wie in einer echten Anwendung.

```html
<!-- renderer.component.html -->
<ng-container *ngComponentOutlet="
  activeComponent;
  inputs: activeInputs;
  injector: componentInjector
" />
```

Angular's `NgComponentOutlet` mit `inputs`-Binding (verfügbar seit Angular 16)
übernimmt das dynamische Rendering ohne manuellen `ComponentRef`-Aufwand.

Der `componentInjector` ist ein Kind-Injector der bei Bedarf komponentenspezifische
Providers aus `@Showcase({ providers })` enthält.

---

## UI der Styleguide-App

```
┌─────────────────────────────────────────────────────────────────┐
│  ◈ ng-prism                      [Light | Dark]  [360 768 1440] │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│  INPUTS          │   Button                                     │
│  ├─ Button       │   Vielseitiger Button für alle Aktionen.     │
│  └─ Input        │                                              │
│                  │   ┌─────────┬──────────┬──────────┐         │
│  LAYOUT          │   │ Primary │  Danger  │ Disabled │         │
│  ├─ Card         │   └─────────┴──────────┴──────────┘         │
│  └─ Grid         │                                              │
│                  │   ┌──────────────────────────────────┐       │
│  FEEDBACK        │   │         [ Speichern ]            │       │
│  ├─ Toast        │   └──────────────────────────────────┘       │
│  └─ Dialog       │                                              │
│                  ├──────────────────────────────────────────────┤
│                  │  CONTROLS                                    │
│                  │  variant   ○ primary  ○ secondary  ○ danger  │
│                  │  disabled  □                                 │
│                  │  label     [Speichern________________]       │
│                  │                                              │
│                  ├──────────────────────────────────────────────┤
│                  │  EVENTS                                      │
│                  │  → clicked (14:32:01)                        │
└──────────────────┴──────────────────────────────────────────────┘
```

**Controls werden automatisch aus dem extrahierten Typ generiert:**

| TypeScript-Typ | Control |
|---|---|
| `boolean` | Checkbox |
| `string` | Text-Input |
| `number` | Number-Input |
| `'a' \| 'b' \| 'c'` | Radio-Group / Select |
| `string[]` | Textarea (JSON) |
| komplexe Objekte | Textarea (JSON) |

---

## `@Showcase` API

```typescript
interface ShowcaseConfig {
  /** Anzeigename im Styleguide */
  title: string;

  /** Beschreibungstext (Markdown unterstützt) */
  description?: string;

  /** Gruppe/Kategorie in der Sidebar */
  category?: string;

  /** Vordefinierte Varianten */
  variants?: Variant[];

  /** Tags für Suche/Filterung */
  tags?: string[];

  /**
   * Providers für den Kind-Injector dieser Komponente.
   * Nützlich für Komponenten die Services benötigen (z.B. DialogService, OverlayService).
   * Werden als Child-Injector an NgComponentOutlet übergeben.
   *
   * Für library-weite Providers: defineConfig.appProviders nutzen.
   */
  providers?: Provider[];
}

interface Variant {
  /** Anzeigename des Tabs */
  name: string;

  /** @Input()-Werte für diese Variante */
  inputs?: Record<string, unknown>;

  /** Beschreibung dieser spezifischen Variante */
  description?: string;
}
```

---

## Package-Struktur (npm)

**Nx-Monorepo** — alle Packages in einem Repo, versioniert nach Angular-Version (wie ngrx).

```
ng-prism                          Kern: Decorator, Builder, Schematic, App-Template
  import { Showcase } from 'ng-prism'
  ng add ng-prism
  ng-prism:serve / ng-prism:build

@ng-prism/plugin-a11y             Offizielles Plugin: Accessibility-Checks
@ng-prism/plugin-viewport         Offizielles Plugin: Viewport-Switcher
@ng-prism/plugin-theme            Offizielles Plugin: CSS-Theme-Switcher
@ng-prism/plugin-measure          Offizielles Plugin: Spacing-Overlays
```

**Versionierung:** Orientiert sich an der Angular-Version (wie ngrx, analog).
`ng-prism@19.x` → Angular 19, `ng-prism@20.x` → Angular 20 etc.

---

## MVP — Scope Phase 1

- [x] `@Showcase`-Decorator mit Variants
- [x] `ng add`-Schematic (Workspace-Setup)
- [x] Scanner via TypeScript Compiler API (Entry Point → Manifest)
- [x] Styleguide-App: Sidebar-Navigation, Variant-Tabs, Component-Rendering
- [x] Auto-Controls für `boolean`, `string`, `number`, `union`-Typen
- [x] Event-Log für `@Output()`-Events
- [x] `ng run lib:styleguide` (Dev Server)

## Backlog — Phase 2

- [ ] Static Build (`ng run lib:prism:build`) + GitHub Pages Deploy-Schematic
- [ ] JSDoc-Markdown-Rendering in der Dokumentations-Sektion
- [ ] Viewport-Switcher (Mobile / Tablet / Desktop)
- [ ] Dark-Mode-Toggle (injiziert CSS-Custom-Properties in den Component-Frame)
- [ ] Suche / Tag-Filterung
- [ ] Multi-Library-Support (mehrere Libraries in einem Workspace)
- [ ] `@ShowcaseModule`-Support für nicht-standalone Components

---

## Technologie-Stack

| Bereich | Technologie | Begründung |
|---|---|---|
| Decorator / Runtime | `reflect-metadata` | Angular-Standard, kein Extra-Overhead |
| Scanner | TypeScript Compiler API (`ts.createProgram`) | Präzise Typ-Extraktion ohne eigenen Parser |
| Builder | `@angular-devkit/architect` | Native Angular CLI Integration |
| Schematic | `@angular-devkit/schematics` | Standard `ng add`-Flow |
| Styleguide-App | Angular Standalone Components | Minimal, modern, kein NgModule-Overhead |
| Dynamic Rendering | `NgComponentOutlet` + `inputs` | Seit Angular 16, kein `ComponentRef` nötig |
| Build | Angular CLI (esbuild) | Kein extra Vite-Setup nötig |

---

## Nicht-Ziele (explizit außerhalb des Scope)

- Kein React-, Vue- oder Web-Component-Support
- Kein eigener Test-Runner / Visual-Regression-Testing
- Keine MDX / Markdown-Story-Dateien
- Keine automatische Chromatic/Percy-Integration (kann via Plugin gebaut werden)
