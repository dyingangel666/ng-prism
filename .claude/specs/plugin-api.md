# Plugin API

> Referenz für das Plugin-System von ng-prism.

---

## Überblick

Plugins sind einfache Objekte die das `NgPrismPlugin`-Interface implementieren.
Keine Klassen, keine Vererbung — plain objects mit Hook-Funktionen.
Das Design orientiert sich an Vite's Plugin-API: simpel, composable, vorhersehbar.

---

## Plugin erstellen

```typescript
import type { NgPrismPlugin } from 'ng-prism/plugin';

export function myPlugin(options?: MyPluginOptions): NgPrismPlugin {
  return {
    name: 'my-plugin',

    // Build-Zeit-Hooks
    onComponentScanned(component) {
      return { ...component, meta: { ...component.meta, custom: true } };
    },

    onPageScanned(page) {
      return page;
    },

    onManifestReady(manifest) {
      return manifest;
    },

    // Runtime-Beiträge
    panels: [
      {
        id: 'my-panel',
        label: 'My Panel',
        component: MyPanelComponent,
        position: 'bottom',
      },
    ],

    controls: [
      {
        matchType: (input) => input.type === 'object',
        component: MyCustomControlComponent,
      },
    ],

    wrapComponent: MyWrapperComponent,
  };
}
```

---

## `NgPrismPlugin` Interface

```typescript
import type { Provider, Type } from '@angular/core';

interface NgPrismPlugin {
  name: string;

  // Build-Zeit-Hooks (laufen im Angular Builder / Node.js)
  onComponentScanned?: (
    component: ScannedComponent
  ) => ScannedComponent | void | Promise<ScannedComponent | void>;

  onPageScanned?: (
    page: StyleguidePage
  ) => StyleguidePage | void | Promise<StyleguidePage | void>;

  onManifestReady?: (
    manifest: PrismManifest
  ) => PrismManifest | void | Promise<PrismManifest | void>;

  // Runtime-Beiträge
  panels?: PanelDefinition[];
  controls?: ControlDefinition[];
  wrapComponent?: Type<unknown>;
}
```

### Build-Zeit-Hooks

| Hook | Aufgerufen | Eingabe | Rückgabe |
|---|---|---|---|
| `onComponentScanned` | Pro gescannter Komponente | `ScannedComponent` | Modifiziert oder `void` |
| `onPageScanned` | Pro gescannter Page | `StyleguidePage` | Modifiziert oder `void` |
| `onManifestReady` | Einmal nach dem Scan | `PrismManifest` | Modifiziert oder `void` |

Hooks werden **sequenziell** durch alle Plugins in der Reihenfolge aus `defineConfig` ausgeführt.
Jeder Hook kann `void` (keine Änderung) oder ein neues Objekt zurückgeben.
Async Hooks (`Promise`) werden unterstützt.

### Runtime-Beiträge

| Feld | Typ | Beschreibung |
|---|---|---|
| `panels` | `PanelDefinition[]` | Zusätzliche UI-Panels (Tab-Bar unter dem Renderer) |
| `controls` | `ControlDefinition[]` | Eigene Control-Typen für Inputs |
| `wrapComponent` | `Type<unknown>` | Angular-Komponente die jede gerenderte Komponente umhüllt |

---

## Typen

### `PrismManifest`

```typescript
interface PrismManifest {
  components: ScannedComponent[];
  pages?: StyleguidePage[];
}
```

### `ShowcaseConfig`

```typescript
interface ShowcaseConfig {
  title: string;
  description?: string;
  category?: string;
  variants?: Variant[];
  tags?: string[];
  providers?: Provider[];
  meta?: Record<string, unknown>;   // Plugin metadata (e.g. { figma: 'https://...' })
}
```

### `ScannedComponent`

```typescript
interface ScannedComponent {
  className: string;
  filePath: string;
  showcaseConfig: ShowcaseConfig;
  inputs: InputMeta[];
  outputs: OutputMeta[];
  componentMeta: {
    selector: string;
    standalone: boolean;
  };
  meta?: Record<string, unknown>;
}
```

### `InputMeta`

```typescript
interface InputMeta {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'union' | 'array' | 'object' | 'unknown';
  values?: string[];           // Nur bei type === 'union'
  defaultValue?: unknown;
  required: boolean;
  doc?: string;
}
```

### `OutputMeta`

```typescript
interface OutputMeta {
  name: string;
  doc?: string;
}
```

### `RuntimeManifest` / `RuntimeComponent`

```typescript
interface RuntimeManifest {
  components: RuntimeComponent[];
  pages?: StyleguidePage[];
}

interface RuntimeComponent {
  meta: ScannedComponent;
  type: Type<unknown>;         // Echte Angular-Klasse
}
```

### `PanelDefinition`

```typescript
interface PanelDefinition {
  id: string;
  label: string;
  component?: Type<unknown>;   // Angular Standalone Component (eager)
  loadComponent?: () => Promise<Type<unknown>>; // Lazy-loaded component
  icon?: string;
  position?: 'bottom' | 'right';
}
```

Entweder `component` (eager) oder `loadComponent` (lazy) angeben.
Lazy-Loading ist nötig wenn die Komponente Browser-only Dependencies hat (z.B. `DomSanitizer`),
da die Config auch im Node.js Builder-Kontext geladen wird.

### `ControlDefinition`

```typescript
interface ControlDefinition {
  matchType: (input: InputMeta) => boolean;
  component: Type<unknown>;    // Angular Standalone Component
}
```

### Page Types

```typescript
type StyleguidePage = CustomPage | ComponentPage;

interface CustomPage {
  type: 'custom';
  title: string;
  category?: string;
  data: Record<string, unknown>;
}

interface ComponentPage {
  type: 'component';
  title: string;
  category?: string;
  component: Type<unknown>;
}
```

---

## `defineConfig()`

```typescript
import { defineConfig } from 'ng-prism/config';

export default defineConfig({
  plugins: [myPlugin()],
  pages: [customPage({ title: 'Changelog', data: { version: '1.0' } })],
  appProviders: [provideAnimationsAsync()],
  theme: { '--prism-primary': '#6366f1' },
});
```

`defineConfig()` ist ein reiner Identity-Helper für TypeScript-Typisierung.

### `NgPrismConfig` (vollständig)

```typescript
interface NgPrismConfig {
  plugins?: NgPrismPlugin[];
  pages?: StyleguidePage[];
  appProviders?: Provider[];
  theme?: Record<string, string>;
  themeStylesheet?: string;
  ui?: {
    header?: Type<unknown>;
    sidebar?: Type<unknown>;
    componentHeader?: Type<unknown>;
    renderer?: Type<unknown>;
    controlsPanel?: Type<unknown>;
    eventsPanel?: Type<unknown>;
    footer?: Type<unknown>;
  };
  headless?: boolean;
  appComponent?: Type<unknown>;
}
```

---

## Page-Helpers

### `customPage()`

Factory-Helper für beliebige Custom Pages. Das `data`-Objekt wird unverändert
ins Manifest übernommen.

```typescript
import { customPage } from 'ng-prism/config';

customPage({
  title: 'Changelog',
  category: 'Docs',
  data: { version: '2.0', date: '2026-03-01' },
})
```

### `componentPage()`

Factory-Helper für Component Pages. Registriert eine beliebige Angular-Komponente
als Styleguide-Seite — ideal für Composition-Demos und komplexe Multi-Component-Szenarien.

Component Pages werden **nicht** über die Build-Pipeline generiert (Angular-Klassen sind
nicht JSON-serialisierbar), sondern zur Runtime über `providePrism()` registriert.

**Wichtig:** Component Pages gehören in die Prism-App (`projects/{lib}-prism/`), nicht
in die Library. So werden sie nie Teil des Library-Builds.

```typescript
// projects/my-lib-prism/src/pages/button-patterns-page.component.ts
import { ButtonPatternsPageComponent } from './pages/button-patterns-page.component';

componentPage({
  title: 'Button Patterns',
  category: 'Patterns',
  component: ButtonPatternsPageComponent,
})
```

Registrierung in `main.ts` der Prism-App:

```typescript
// projects/my-lib-prism/src/main.ts
import { ButtonPatternsPageComponent } from './pages/button-patterns-page.component';

providePrism(PRISM_RUNTIME_MANIFEST, config, {
  componentPages: [
    { title: 'Button Patterns', category: 'Patterns', component: ButtonPatternsPageComponent },
  ],
})
```

---

## Plugin-Ausführungsreihenfolge

1. Interne Built-in-Plugins (Controls, Events)
2. Nutzer-Plugins in der Reihenfolge aus `defineConfig`

Bei Controls: Das erste `matchType` das `true` zurückgibt gewinnt.
Nutzer-Plugins können Built-in-Controls überschreiben wenn sie zuerst registriert sind.

---

## Eingebaute Plugins (intern)

Diese Panels sind selbst als interne Plugins implementiert und immer aktiv:

| Name | Panel-ID | Funktion |
|---|---|---|
| `built-in:controls` | `controls` | Auto-generiertes Controls-Panel |
| `built-in:events` | `events` | Event-Log für output()-Events |

---

## Beispiel: Color-Picker Plugin

```typescript
// color-control.component.ts
@Component({
  standalone: true,
  selector: 'prism-color-control',
  template: `<input type="color" [value]="value()" (input)="onChange($event)" />`,
})
export class ColorControlComponent {
  input = input.required<InputMeta>();
  value = input<string>();
  valueChange = output<string>();

  onChange(event: Event) {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}

// color.plugin.ts
import type { NgPrismPlugin } from 'ng-prism/plugin';

export function colorPlugin(): NgPrismPlugin {
  return {
    name: 'color-picker',
    controls: [
      {
        matchType: (input) => input.doc?.includes('@color') ?? false,
        component: ColorControlComponent,
      },
    ],
  };
}
```

## Beispiel: Build-Zeit Enrichment Plugin

```typescript
import type { NgPrismPlugin } from 'ng-prism/plugin';

export function statusBadgePlugin(): NgPrismPlugin {
  return {
    name: 'status-badge',

    onComponentScanned(component) {
      const status = component.showcaseConfig.tags?.includes('deprecated')
        ? 'deprecated'
        : 'stable';

      return {
        ...component,
        meta: { ...component.meta, status },
      };
    },
  };
}
```

## Beispiel: Page-Transformation Plugin

```typescript
import type { NgPrismPlugin } from 'ng-prism/plugin';

export function pageSortPlugin(): NgPrismPlugin {
  return {
    name: 'page-sort',

    onPageScanned(page) {
      return page;
    },
  };
}
```

---

## Offizielle Plugins

### `@ng-prism/plugin-figma`

Embeds Figma designs per component as an interactive iframe panel.
The Figma URL is read from `@Showcase({ meta: { figma: '...' } })` — no API token required.

```typescript
// ng-prism.config.ts
import { defineConfig } from 'ng-prism/config';
import { figmaPlugin } from '@ng-prism/plugin-figma';

export default defineConfig({
  plugins: [figmaPlugin()],
});
```

```typescript
// button.component.ts
@Showcase({
  title: 'Button',
  meta: { figma: 'https://www.figma.com/file/abc123/my-design' },
})
```

---

## Import-Pfade

| Import | Inhalt |
|---|---|
| `import { Showcase } from 'ng-prism'` | Decorator |
| `import type { NgPrismPlugin, ScannedComponent } from 'ng-prism/plugin'` | Plugin-Types |
| `import type { NgPrismConfig } from 'ng-prism/config'` | Config-Types |
| `import { defineConfig, customPage, componentPage } from 'ng-prism/config'` | Config-Helpers |
| `import type { StyleguidePage } from 'ng-prism/plugin'` | Page-Types |
| `import { figmaPlugin } from '@ng-prism/plugin-figma'` | Figma-Plugin |
