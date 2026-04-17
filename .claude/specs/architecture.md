# Architektur

> Detaillierte technische Architektur von ng-prism.
> Siehe `SPEC.md` für die Produktspezifikation.

---

## Paketstruktur

`ng-prism` wird als ein einziges npm-Package ausgeliefert.
Es enthält Decorator, Builder, Schematics und die Styleguide-App.

```
packages/ng-prism/
├── src/
│   ├── decorator/
│   │   ├── showcase.decorator.ts       @Showcase Implementierung (reflect-metadata)
│   │   ├── showcase.types.ts           ShowcaseConfig, Variant
│   │   └── index.ts
│   │
│   ├── plugin/
│   │   ├── plugin.types.ts             NgPrismPlugin, PrismManifest, ScannedComponent,
│   │   │                               InputMeta, OutputMeta, RuntimeManifest,
│   │   │                               RuntimeComponent, NgPrismConfig,
│   │   │                               PanelDefinition, ControlDefinition
│   │   ├── page.types.ts               StyleguidePage, CustomPage, ComponentPage
│   │   ├── page-helpers.ts             customPage(), componentPage() Factory-Helpers
│   │   ├── define-config.ts            defineConfig() Identity-Helper
│   │   └── index.ts
│   │
│   ├── config/
│   │   └── index.ts                    Re-Exports: defineConfig, page-helpers, config types
│   │
│   ├── builder/
│   │   ├── serve/
│   │   │   ├── index.ts                Angular Builder: ng-prism:serve
│   │   │   ├── schema.json             Builder-Options-Schema
│   │   │   └── schema.ts
│   │   ├── build/
│   │   │   ├── index.ts                Angular Builder: ng-prism:build
│   │   │   ├── schema.json
│   │   │   └── schema.ts
│   │   ├── shared/
│   │   │   ├── prism-pipeline.ts       runPrismPipeline(): Config → Scan →
│   │   │   │                           Pages → Plugins → Manifest → Write
│   │   │   └── index.ts
│   │   ├── watcher/
│   │   │   ├── prism-watcher.ts        createChangeHandler() + startWatcher() (chokidar)
│   │   │   └── index.ts
│   │   ├── scanner/
│   │   │   ├── entry-point.scanner.ts  Liest public-api.ts, löst Re-Exports auf
│   │   │   ├── component.scanner.ts    Findet @Showcase-Klassen via TS Compiler API
│   │   │   ├── input.extractor.ts      Extrahiert input()/output() Signal-Properties
│   │   │   ├── manifest.generator.ts   Generiert statisches PrismManifest
│   │   │   ├── scanner.ts              scan() Orchestrator
│   │   │   └── index.ts
│   │   ├── manifest/
│   │   │   ├── runtime-manifest.generator.ts  Generiert TypeScript mit echten Klassen-Imports
│   │   │   └── index.ts
│   │   ├── config-loader/
│   │   │   ├── config-loader.ts        loadConfig() via ts.transpileModule → dynamic import
│   │   │   └── index.ts
│   │   └── plugin-runner/
│   │       ├── plugin-runner.ts        runPluginHooks() — 3 Hooks sequenziell
│   │       └── index.ts
│   │
│   ├── schematics/
│   │   └── ng-add/
│   │       ├── index.ts                4 Rules: addPrismAppProject, addBuilderTargets,
│   │       │                           addTsConfigPaths, createConfigFile
│   │       ├── schema.ts               NgAddSchemaOptions
│   │       └── schema.json             (statisch, nicht kompiliert)
│   │
│   ├── app/                            Styleguide-App (Angular Standalone Components)
│   │   ├── tokens/
│   │   │   └── prism-tokens.ts         InjectionTokens: PRISM_MANIFEST, PRISM_CONFIG
│   │   ├── theme/
│   │   │   └── prism-default-theme.ts  PRISM_DEFAULT_THEME (CSS Custom Property Map)
│   │   ├── services/
│   │   │   ├── prism-manifest.service.ts    components, pages, categories, groupedByCategory
│   │   │   ├── prism-search.service.ts      query, filteredComponents, filteredPages
│   │   │   ├── prism-navigation.service.ts  activeItem, activeComponent, activePage, categoryTree
│   │   │   ├── prism-renderer.service.ts    activeVariantIndex, inputValues, selectVariant, updateInput
│   │   │   ├── prism-event-log.service.ts   events, log, clear
│   │   │   ├── prism-plugin.service.ts      panels, controls (aggregiert aus Plugins)
│   │   │   └── navigation-item.types.ts     NavigationItem discriminated union
│   │   ├── controls/
│   │   │   ├── boolean-control.component.ts
│   │   │   ├── string-control.component.ts
│   │   │   ├── number-control.component.ts
│   │   │   ├── union-control.component.ts
│   │   │   └── json-control.component.ts
│   │   ├── panels/
│   │   │   ├── controls/               Controls-Panel + Plugin-Definition
│   │   │   ├── events/                 Events-Log-Panel + Plugin-Definition
│   │   │   └── panel-host/             Tab-Bar + NgComponentOutlet
│   │   ├── page-renderer/
│   │   │   └── prism-page-renderer.component.ts   Dispatcher: Custom | Component Page
│   │   ├── component-header/           Titel, Beschreibung, Tags
│   │   ├── renderer/
│   │   │   ├── prism-renderer.component.ts   ViewContainerRef.createComponent() + Output-Abo
│   │   │   ├── snippet-generator.ts          generateSnippet() — live Code-Snippet aus Inputs
│   │   │   └── highlight-xml.ts              highlightXml() — minimaler XML Syntax-Highlighter
│   │   ├── sidebar/                    Kategorie-Baum (Components + Pages)
│   │   ├── header/                     Logo + Such-Input
│   │   ├── shell/                      Root-Komponente (CSS Grid + Theming)
│   │   ├── provide-prism.ts            providePrism() Bootstrap-Helper
│   │   └── index.ts                    Public API Barrel-Export
│   │
│   └── index.ts                        Package Root: re-exports decorator + plugin + app
│
├── schematics/
│   └── collection.json                 Registriert ng-add Schematic (statisch)
├── builders.json                       Registriert serve + build Builder
└── package.json
```

---

## npm Package Exports

| Export-Path | Inhalt |
|---|---|
| `ng-prism` (`.`) | Decorator, App-Komponenten, Services, Plugin-Types |
| `ng-prism/config` | `defineConfig()`, `customPage()`, `componentPage()`, Config-Types |
| `ng-prism/plugin` | Alle Plugin/Manifest-Types + Page-Helpers |

---

## Build-Zeit Pipeline

```
angular.json / project.json
  └── ng-prism:serve (oder ng-prism:build) Builder
        │
        ├─► 1. Config-Loader
        │     ├── Sucht ng-prism.config.ts im Workspace-Root
        │     ├── ts.transpileModule() → temp .mjs Datei
        │     ├── import(pathToFileURL(tempPath)) → NgPrismConfig
        │     └── Cleanup temp .mjs im finally-Block
        │
        ├─► 2. Component Scanner
        │     ├── Parst public-api.ts via ts.createProgram()
        │     ├── Löst alle Re-Exports rekursiv auf
        │     ├── Findet Klassen mit @Showcase-Decorator-Metadaten
        │     └── Extrahiert pro Klasse:
        │           input() Signals → Name, Typ, Default, JSDoc
        │           output() Signals → Name, JSDoc
        │           @Component Metadata → selector, standalone
        │
        ├─► 3. Page Resolver (optional, wenn pages konfiguriert)
        │     └── Config-Pages werden direkt durchgereicht
        │
        ├─► 4. Plugin Runner
        │     ├── onComponentScanned() pro Komponente (sequenziell durch alle Plugins)
        │     ├── onPageScanned() pro Page (sequenziell durch alle Plugins)
        │     └── onManifestReady() auf das fertige Manifest
        │
        ├─► 5. Runtime-Manifest-Generator
        │     ├── Generiert prism-manifest.ts mit echten Klassen-Imports
        │     │   import { ButtonComponent } from 'my-lib';
        │     ├── Komponenten-Metadaten als JSON-Literale
        │     ├── Pages als JSON-Literale
        │     └── Schreibt nach {prismProject}/src/prism-manifest.ts
        │
        ├─► 6. File Watcher (nur serve, nicht build)
        │     ├── chokidar watched: dirname(entryPoint) + configFile
        │     ├── Filter: .ts | .scss | .css | .svg
        │     ├── Debounce: 300ms
        │     ├── isRebuilding-Guard verhindert parallele Re-Scans
        │     ├── Bei Änderung: Pipeline re-run + Cache-Bust Timestamp
        │     └── Cleanup bei Observable-Complete (Server-Stop)
        │
        └─► 7. Angular Dev Server delegieren
              ├── context.scheduleTarget({ project: prismProject, target: 'serve' })
              ├── run.output (Observable) hält Builder am Leben
              └── Serve Builder returned Observable, Build Builder returned Promise
```

---

## Runtime Datenfluss

```
Browser lädt Styleguide-App
  │
  ├─► providePrism(manifest, config, options?) → stellt RuntimeManifest + Config bereit
  │     └── options.componentPages werden zur Runtime ins Manifest gemergt
  │
  ├─► PrismShellComponent (Root)
  │     ├── Merged PRISM_DEFAULT_THEME + config.theme → CSS Custom Properties
  │     └── CSS-Grid-Layout: Header | Sidebar | Main | Panels
  │
  ├─► Services (alle Signal-basiert):
  │
  │   PrismManifestService
  │     ├── components: Signal<RuntimeComponent[]>
  │     ├── pages: Signal<StyleguidePage[]>
  │     ├── categories: Signal<string[]>
  │     └── groupedByCategory: Signal<Map<string, RuntimeComponent[]>>
  │
  │   PrismSearchService
  │     ├── query: WritableSignal<string>
  │     ├── filteredComponents: Signal<RuntimeComponent[]>  (case-insensitive)
  │     └── filteredPages: Signal<StyleguidePage[]>
  │
  │   PrismNavigationService
  │     ├── activeItem: WritableSignal<NavigationItem | null>
  │     ├── activeComponent: Signal<RuntimeComponent | null>  (computed)
  │     ├── activePage: Signal<StyleguidePage | null>  (computed)
  │     └── categoryTree: Signal<Map<string, NavigationItem[]>>  (respektiert Search)
  │
  │   PrismRendererService
  │     ├── activeVariantIndex, inputValues
  │     ├── selectVariant(), updateInput(), resetForComponent()
  │     └── Wird vom PrismRendererComponent-Effect gesteuert
  │
  │   PrismEventLogService
  │     ├── events: Signal<EventLogEntry[]>
  │     └── log(), clear()
  │
  │   PrismPluginService
  │     ├── panels: Signal<PanelDefinition[]>
  │     └── controls: Signal<ControlDefinition[]>
  │
  ├─► PrismSidebarComponent
  │     ├── Zeigt categoryTree (Components + Pages)
  │     └── NavigationItem: { kind: 'component', data } | { kind: 'page', data }
  │
  ├─► PrismRendererComponent (wenn activeComponent)
  │     ├── ViewContainerRef.createComponent() für Output-Zugriff via ComponentRef
  │     ├── Effect 1: Component-Wechsel → destroy + recreate + Output-Subscription
  │     ├── Effect 2: Input-Änderung → setInput() (kein Recreate)
  │     ├── Varianten-Tabs
  │     └── Code-Snippet: generateSnippet() + highlight.js (live-reaktiv via inputValues)
  │
  ├─► PrismPageRendererComponent (wenn activePage)
  │     ├── Dispatcht nach page.type: 'custom' | 'component'
  │     └── NgComponentOutlet → Freie Angular-Komponente (Component Page)
  │
  └─► PrismPanelHostComponent
        ├── Built-in: Controls-Panel + Events-Panel
        ├── Plugin-Panels angehängt
        └── Tab-Bar + NgComponentOutlet
```

---

## Component Scanner — TypeScript Compiler API

Der Scanner nutzt `ts.createProgram()` für rein statische Analyse (kein Code-Ausführen).

```typescript
const program = ts.createProgram([entryPoint], compilerOptions);
const checker = program.getTypeChecker();
```

### Typ-Mapping (TypeScript → Control)

| TypeScript-Typ | Erkannter `type` | UI Control |
|---|---|---|
| `boolean` | `'boolean'` | Checkbox |
| `string` | `'string'` | Text-Input |
| `number` | `'number'` | Number-Input |
| `'a' \| 'b'` | `'union'` + `values[]` | Radio / Select |
| `string[]` | `'array'` | JSON-Textarea |
| `MyInterface` | `'object'` | JSON-Textarea |
| unbekannt | `'unknown'` | Text-Input (raw) |

### Input-Extraktion

Der Scanner erkennt Signal-based Inputs (`input()`, `input.required()`) und extrahiert:
- Name des Properties
- TypeScript-Typ → gemappter Typ (siehe Tabelle)
- Default-Wert (aus `input(defaultValue)`)
- JSDoc-Kommentar

---

## Config Loader

Lädt `ng-prism.config.ts` zur Build-Zeit:

1. TypeScript-Quelle lesen
2. `ts.transpileModule()` → JavaScript (ESM)
3. Temporäre `.mjs`-Datei neben Original schreiben (relative Imports funktionieren)
4. `import(pathToFileURL(tempPath))` → `module.default`
5. Temp-Datei im `finally`-Block aufräumen

---

## Plugin Runner

Führt die 3 Build-Time Hooks sequenziell aus:

1. **`onComponentScanned(component)`** — Pro Komponente, durch alle Plugins in Reihenfolge.
   Kann die Komponente anreichern oder transformieren.
2. **`onPageScanned(page)`** — Pro Page, durch alle Plugins in Reihenfolge.
   Kann Pages anreichern oder transformieren.
3. **`onManifestReady(manifest)`** — Einmal auf das fertige Manifest.
   Kann das Manifest als Ganzes transformieren.

Jeder Hook kann `void` (keine Änderung) oder ein neues Objekt zurückgeben.

---

## Runtime-Manifest-Generator

Generiert eine TypeScript-Datei mit echten Klassen-Imports:

```typescript
// AUTO-GENERATED by ng-prism — do not edit!
import type { RuntimeManifest } from 'ng-prism/plugin';
import { ButtonComponent, CardComponent } from 'my-lib';

export const PRISM_RUNTIME_MANIFEST: RuntimeManifest = {
  components: [
    {
      type: ButtonComponent,
      meta: {
        className: "ButtonComponent",
        filePath: "...",
        showcaseConfig: { title: "Button", ... },
        inputs: [...],
        outputs: [...],
        componentMeta: { selector: "my-button", standalone: true },
      },
    },
  ],
  pages: [...],
};
```

---

## Watch Mode

Basiert auf `chokidar` (nicht `fs.watch` — das hat auf macOS keine `recursive` Events).

**`createChangeHandler()`** — Pure Logik:
- Debounce: 300ms (konfigurierbar)
- Extension-Filter: `.ts`, `.scss`, `.css`, `.svg`
- `isRebuilding`-Guard verhindert parallele Rebuilds
- `dispose()` für Cleanup

**`startWatcher()`** — chokidar-Wrapper:
- Watched: `dirname(entryPoint)` + optional `configFile`
- Ignored: `node_modules`, `.git`
- Events: `change`, `add`, `unlink`
- Cache-Bust: Timestamp-Kommentar ans Manifest nach Re-Scan

---

## NavigationItem

Discriminated Union für die einheitliche Navigation von Components und Pages:

```typescript
type NavigationItem =
  | { kind: 'component'; data: RuntimeComponent }
  | { kind: 'page'; data: StyleguidePage };
```

Die Sidebar und der Navigation-Service arbeiten mit `NavigationItem` statt separaten
Listen. `PrismNavigationService.activeComponent` und `activePage` sind `computed()`-
Wrapper über `activeItem` für Backward-Kompatibilität.

---

## Rendering

Komponenten werden **direkt im DOM** gerendert — kein `<iframe>` (siehe ADR 004).

`PrismRendererComponent` nutzt `ViewContainerRef.createComponent()` statt
`NgComponentOutlet`, um Zugriff auf die `ComponentRef` zu erhalten. Das ermöglicht:
- Direkte Output-Subscription via `componentRef.instance[outputName].subscribe()`
- Feingranulares Input-Update via `componentRef.setInput()` ohne Recreate

Zwei Effects steuern das Lifecycle:
1. **Component-Wechsel Effect:** Destroy + Recreate + neue Output-Subscriptions
2. **Input-Änderungs Effect:** Nur `setInput()` (kein Destroy/Recreate)

---

## ng add Schematic

Das Schematic führt 4 Rules in Reihenfolge aus:

1. **`addPrismAppProject`** — Erstellt `projects/{lib}-prism/` mit:
   - `src/main.ts` (bootstrapApplication mit PrismShellComponent)
   - `src/index.html` (minimal)
   - `tsconfig.app.json`
   - Projekt-Eintrag in `angular.json` (build + serve Targets)

2. **`addBuilderTargets`** — Fügt `prism` und `prism-build` Targets zum Library-Projekt hinzu

3. **`addTsConfigPaths`** — Registriert Path-Mappings in `tsconfig.json`:
   - `ng-prism.config` → `ng-prism.config.ts`
   - `{project}` → `{sourceRoot}/public-api.ts`

4. **`createConfigFile`** — Erstellt `ng-prism.config.ts` mit Default-Config (falls nicht vorhanden)
