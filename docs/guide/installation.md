# Installation & Setup

## Prerequisites

- Angular 21+ workspace
- Node.js 20+, npm 10+

## Automatic Setup — `ng add`

The fastest path is the `ng add` schematic. It creates a showcase app project, wires up the Angular builder targets, and generates a config file in one command.

```bash
ng add @ng-prism/core
```

The schematic prompts for:

| Prompt            | Default             | Description                                       |
| ----------------- | ------------------- | ------------------------------------------------- |
| Library project   | _(first lib found)_ | The library whose components you want to showcase |
| Showcase app name | `{lib}-prism`       | Name of the generated Angular app project         |

After running, your workspace contains:

```
projects/
  my-lib-prism/
    src/
      main.ts          ← bootstraps the Prism app
      prism.config.ts  ← your configuration file
    angular.json       ← builder targets added here
```

The schematic also adds a `strip-showcase` npm script to your `package.json`. This strips `@Showcase` decorators from compiled library output before publishing. See [Publishing Libraries](guide/library-publishing.md) for details.

## Verify

```bash
ng run my-lib:prism        # or whatever the schematic named it
```

The showcase opens at `http://localhost:4400`.

## Zoneless Mode (optional, recommended)

ng-prism supports Angular's zoneless change detection. Pass `--zoneless` during setup to skip the `zone.js` polyfill:

```bash
ng add @ng-prism/core --zoneless
```

This removes ~30 KB from the bundle and aligns with the modern Angular direction. ng-prism itself is fully signal-based, and the scanner already requires `input()`/`output()` signals on every showcased component — so zoneless is safe by design.

### Migrating an existing setup to zoneless

Three manual edits are needed:

**1. `projects/<lib>-prism/src/main.ts`** — add `provideZonelessChangeDetection()`:

```diff
+import { provideZonelessChangeDetection } from '@angular/core';
 import { bootstrapApplication } from '@angular/platform-browser';
 import { PrismShellComponent, providePrism } from '@ng-prism/core';
 import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';
 import config from 'ng-prism.config';

 bootstrapApplication(PrismShellComponent, {
-  providers: [providePrism(PRISM_RUNTIME_MANIFEST, config)],
+  providers: [
+    provideZonelessChangeDetection(),
+    providePrism(PRISM_RUNTIME_MANIFEST, config),
+  ],
 });
```

Order matters: `provideZonelessChangeDetection()` must come before `providePrism()`.

**2. `angular.json`** — remove the `zone.js` polyfill from the Prism app's build target:

```diff
 "projects": {
   "<lib>-prism": {
     "architect": {
       "build": {
         "options": {
-          "polyfills": ["zone.js"],
+          "polyfills": [],
```

**3. `ng-prism.config.ts`** — if your `appProviders` contains zone-dependent providers (e.g. older animation modules, `provideZoneChangeDetection`), remove them or swap for zoneless-compatible alternatives.

**Verify:** Run `ng run <lib>:prism` — the app should boot without errors and all showcases should render. Bundle size drops by ~30 KB (zone.js is no longer loaded).

## Angular Builder Targets

The schematic adds two targets to the **library project** in `angular.json`:

```json
"prism": {
  "builder": "@ng-prism/core:serve",
  "options": {
    "entryPoint": "projects/my-lib",
    "prismProject": "my-lib-prism",
    "libraryProject": "my-lib",
    "port": 4400
  }
},
"prism-build": {
  "builder": "@ng-prism/core:build",
  "options": {
    "entryPoint": "projects/my-lib",
    "prismProject": "my-lib-prism",
    "libraryProject": "my-lib",
    "outputPath": "dist/my-lib-prism"
  }
}
```

- **`@ng-prism/core:serve`** — runs the TypeScript scanner, generates a runtime manifest, then delegates to the Angular dev server. Watches for file changes and re-scans incrementally.
- **`@ng-prism/core:build`** — same pipeline but runs the Angular production build and exits.

### Builder Options

| Option              | Required      | Description                                                                              |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------- |
| `entryPoint`        | Yes           | Path to the library directory (recommended) or to its barrel `public-api.ts` file. When pointed at a file, the pipeline walks upward to find the nearest `ng-package.json` and treats that directory as the library root, so secondary entry points are still discovered automatically. |
| `prismProject`      | Yes           | Angular project name for the generated showcase app                                      |
| `libraryProject`    | No            | Angular project name of the library being showcased — only used as a fallback for `libraryImportPath` |
| `libraryImportPath` | No            | Override the import path used in the generated manifest (defaults to `libraryProject`)   |
| `configFile`        | No            | Path to your config file (default: `ng-prism.config.ts` at workspace root)               |
| `port`              | No            | Dev server port for `:serve` (default: `4400`)                                           |
| `outputPath`        | `:build` only | Output directory for the production build                                                |

## Showcase App Target Configuration

The schematic also adds a separate **showcase app project** (`my-lib-prism`) to `angular.json` with its own build and serve targets:

```json
"my-lib-prism": {
  "architect": {
    "build": {
      "builder": "@angular-devkit/build-angular:application",
      "options": {
        "outputPath": { "base": "dist/my-lib-prism", "browser": "" },
        "index": "projects/my-lib-prism/src/index.html",
        "browser": "projects/my-lib-prism/src/main.ts",
        "tsConfig": "projects/my-lib-prism/tsconfig.app.json",
        "styles": ["node_modules/highlight.js/styles/base16/solarized-dark.min.css"],
        "polyfills": ["zone.js"],
        "allowedCommonJsDependencies": ["highlight.js"],
        "preserveSymlinks": true
      },
      "configurations": {
        "production": {
          "outputHashing": "all"
        },
        "development": {
          "outputHashing": "none",
          "optimization": false,
          "sourceMap": true
        }
      },
      "defaultConfiguration": "production"
    },
    "serve": {
      "builder": "@angular-devkit/build-angular:dev-server",
      "options": {
        "buildTarget": "my-lib-prism:build:development",
        "port": 4400,
        "hmr": true,
        "liveReload": true
      }
    }
  }
}
```

The configuration split is intentional:

- `outputHashing` lives only in the `production` configuration. Hashed filenames (`main.abc123.js`) are needed for production cache-busting but are incompatible with HMR — the dev server prints `Hot Module Replacement (HMR) is disabled because the 'outputHashing' option is set to 'all'.` in the terminal when hashing is on.
- The `development` configuration disables hashing, turns off optimization, and enables source maps — the usual Angular dev defaults.
- The `serve` target explicitly points at `:build:development` so iteration uses the dev configuration.
- The `polyfills` array shown above is the zone-based default. When set up with `--zoneless`, this field is `[]` instead — see [Zoneless Mode](#zoneless-mode-optional-recommended) above.

## Dev Reload Behavior

Angular's `@angular/build:application` builds the entire app into a single bundle (`main.js`). True module-level HMR — where individual modules get hot-swapped — is not possible against a monolithic bundle. In practice that means **edits trigger a full page refresh**, even with `hmr: true`. ng-prism turns this from a workflow blocker into an acceptable iteration loop through two layers:

1. **The dev configuration skips minification and source-map optimization.** Library and showcase rebuilds typically complete in 300-900ms.
2. **State preservation across reloads** (built into ng-prism): the active component, variant, view tab, addon panel tab, control panel overrides, and a11y sub-state are restored after the page reloads, so iterating on a specific variant doesn't lose context. See [State Preservation](guide/url-state.md).

`liveReload: true` is the recommended default — it triggers the reload automatically. Setting `liveReload: false` is only useful if you want to refresh manually (for example to inspect server-side state between edits).

### What ng-prism's watcher does

The `@ng-prism/core:serve` builder runs its own incremental scanner on the library entry point. The scanner only reacts to **`.ts` file changes** — style and template edits don't need a manifest rescan and are handled directly by Angular's dev server. Concretely:

| Edit                                       | ng-prism scanner                                  | Angular dev server |
| ------------------------------------------ | ------------------------------------------------- | ------------------ |
| `.ts` (component logic, `@Showcase`, etc.) | re-scan + regenerate manifest if metadata changed | rebuild + reload   |
| `.scss` / `.css` / `.svg`                  | skipped                                           | rebuild + reload   |
| `.html` template                           | skipped                                           | rebuild + reload   |
| `ng-prism.config.ts`                       | re-scan + regenerate manifest                     | rebuild + reload   |

Skipping the scan for style and template changes shaves ~300-500ms off every save, since the TypeScript compiler API doesn't need to traverse the library source tree for those edits.

## Manual Setup

If you prefer not to use the schematic, follow these steps:

**1. Install the package**

```bash
npm install @ng-prism/core
```

**2. Create a showcase app project** in your workspace (a standard Angular app is fine).

**3. Create `prism.config.ts`** in the showcase app:

```typescript
import { defineConfig } from '@ng-prism/core';

export default defineConfig({
  plugins: [],
});
```

**4. Update `main.ts`** to use `providePrism`:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { PrismShellComponent, providePrism } from '@ng-prism/core';
import manifest from './prism-manifest.js'; // generated by the builder
import config from './prism.config.js';

bootstrapApplication(PrismShellComponent, {
  providers: [providePrism(manifest, config)],
});
```

**5. Add builder targets** to `angular.json` as shown in the [Builder Targets](#angular-builder-targets) section above.

## Peer Dependencies

Some features require additional peer dependencies:

| Package                            | Required for                              |
| ---------------------------------- | ----------------------------------------- |
| `highlight.js` + `ngx-highlightjs` | Code snippet highlighting in the renderer |
| `axe-core`                         | Built-in accessibility auditing           |

Install them only if you use those features:

```bash
npm install highlight.js ngx-highlightjs
```
