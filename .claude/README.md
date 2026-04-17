# ng-prism — Projektdokumentation

> Leichtgewichtige, Angular-native Alternative zu Storybook.
> Zero extra files. Ein Decorator. Alles andere wird abgeleitet.

---

## Was ist ng-prism?

`ng-prism` ist ein Component Styleguide für Angular Libraries. Komponenten werden
direkt mit einem `@Showcase`-Decorator annotiert — keine separaten Story-Dateien.
Der Builder scannt die Library automatisch, extrahiert Typen via TypeScript Compiler API
und generiert eine interaktive Styleguide-App mit Controls, Event-Log und Custom Pages.

**Kern-Prinzipien:**
- Zero extra files — ein Decorator auf der Komponente reicht
- Angular-only — kein Framework-Overhead, nutzt Angular CLI (esbuild)
- Plugin-fähig — erweiterbar ohne den Core zu modifizieren
- Signal-first — nur `input()` / `output()` Signals (Angular 20+)

---

## Dokumentationsstruktur

| Dokument | Inhalt |
|---|---|
| `docs/README.md` | Diese Datei — Überblick und Index |
| `docs/getting-started.md` | Installation, Einrichtung, erste Schritte |
| `docs/architecture.md` | Technische Architektur, Datenfluss, Module |
| `docs/plugin-api.md` | Plugin-System: Interfaces, Hooks, Beispiele |
| `docs/adr/001-decorator-based-discovery.md` | ADR: Warum Decorator statt Story-Dateien |
| `docs/adr/002-typescript-compiler-api.md` | ADR: Warum TypeScript Compiler API für Scanning |
| `docs/adr/003-plugin-architecture.md` | ADR: Plugin-System Design-Entscheidungen |
| `docs/adr/004-no-iframe-rendering.md` | ADR: Kein iframe — direktes DOM-Rendering |
| `SPEC.md` | Vollständige Produktspezifikation (Source of Truth) |

---

## Projektstatus

**Phase:** Implementierung — Core Feature-Complete (MVP)

### Implementierte Features

- `@Showcase`-Decorator mit Variants, Tags, Providers
- TypeScript Compiler API Scanner (Signal-based `input()` / `output()`)
- Styleguide App mit 6 Services, 5 Controls, Layout-Komponenten, Theming
- Custom Angular Builder (`ng-prism:serve` / `ng-prism:build`)
- Watch Mode (chokidar) mit Debounce + Auto-Re-Scan
- `ng add` Schematic (Prism-App, Builder-Targets, Config, tsconfig-Paths)
- Config-Loader (`ts.transpileModule` → dynamic import)
- Plugin-Runner mit 3 Build-Time Hooks
- Runtime-Manifest-Generator (echte Klassen-Imports)
- Config-basierte Pages (Custom Pages)
- Component Pages (freie Angular-Komponenten als Styleguide-Seiten, Runtime-Registration)
- `NavigationItem` Discriminated Union für unified Navigation
- Page Renderer (Custom Page, Component Page)
- Code-Snippet mit Syntax-Highlighting pro Variante

### Entscheidungen getroffen

- Demo-Format: `@Showcase`-Decorator direkt auf der Komponente
- Auto-Discovery via Entry-Point-Scan (`public-api.ts`)
- TypeScript Compiler API für Typ- und JSDoc-Extraktion
- Integration als `ng add`-Schematic + Custom Angular Builder
- Kein iframe — direktes DOM-Rendering (Dialoge/Overlays out of the box)
- Plugin-Architektur (Vite-Style plain objects)
- Drei Provider-Ebenen: `appProviders` → `@Showcase.providers` → `wrapComponent`
- Versionierung: Angular-Version-aligned (`ng-prism@21.x` → Angular 21)
- Only Signal-based Inputs/Outputs (Angular 20+)

---

## Schnellreferenz

### `@Showcase`-Decorator

```typescript
import { Showcase } from 'ng-prism';

@Component({ selector: 'my-button', ... })
@Showcase({
  title: 'Button',
  category: 'Inputs',
  variants: [
    { name: 'Primary', inputs: { variant: 'primary' } },
  ],
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary'>('primary');
}
```

### Kommandos

```bash
ng add ng-prism --project my-lib    # Setup (einmalig)
ng run my-lib:prism                 # Dev Server (Port 4400)
ng run my-lib:prism-build           # Static Build
```

### Config

```typescript
// ng-prism.config.ts
import { defineConfig } from 'ng-prism/config';

export default defineConfig({
  plugins: [],
  theme: { '--prism-primary': '#6366f1' },
});
```

---

## Technologie-Stack

| Bereich | Technologie |
|---|---|
| Metadaten | `reflect-metadata` |
| Component Scanning | TypeScript Compiler API (`ts.createProgram`) |
| Build-Integration | `@angular-devkit/architect` (Custom Builder) |
| Setup | `@angular-devkit/schematics` (ng add) |
| Dynamic Rendering | `ViewContainerRef.createComponent()` |
| Watch Mode | `chokidar` (File-Watcher) |
| Styleguide-App | Angular Standalone Components + Signals |
| Theming | CSS Custom Properties (`--prism-*`) |

---

## npm Package Exports

```
ng-prism                          Main entry: Decorator, App, Plugin types
  import { Showcase } from 'ng-prism'

ng-prism/config                   Config helpers
  import { defineConfig } from 'ng-prism/config'

ng-prism/plugin                   Plugin API types + helpers
  import type { NgPrismPlugin } from 'ng-prism/plugin'
  import { customPage, componentPage } from 'ng-prism/plugin'
```
