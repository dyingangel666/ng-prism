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

| Prompt | Default | Description |
|--------|---------|-------------|
| Library project | _(first lib found)_ | The library whose components you want to showcase |
| Showcase app name | `{lib}-prism` | Name of the generated Angular app project |

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

## Angular Builder Targets

The schematic adds two targets to the **library project** in `angular.json`:

```json
"prism": {
  "builder": "@ng-prism/core:serve",
  "options": {
    "entryPoint": "projects/my-lib/src/public-api.ts",
    "prismProject": "my-lib-prism",
    "libraryProject": "my-lib",
    "port": 4400
  }
},
"prism-build": {
  "builder": "@ng-prism/core:build",
  "options": {
    "entryPoint": "projects/my-lib/src/public-api.ts",
    "prismProject": "my-lib-prism",
    "libraryProject": "my-lib",
    "outputPath": "dist/my-lib-prism"
  }
}
```

- **`@ng-prism/core:serve`** — runs the TypeScript scanner, generates a runtime manifest, then delegates to the Angular dev server. Watches for file changes and re-scans incrementally.
- **`@ng-prism/core:build`** — same pipeline but runs the Angular production build and exits.

### Builder Options

| Option | Required | Description |
|--------|----------|-------------|
| `entryPoint` | Yes | Path to your library's barrel `public-api.ts` (or directory with secondary entry points) |
| `prismProject` | Yes | Angular project name for the generated showcase app |
| `libraryProject` | Yes | Angular project name of the library being showcased |
| `libraryImportPath` | No | Override the import path used in the generated manifest (defaults to `libraryProject`) |
| `configFile` | No | Path to your config file (default: `ng-prism.config.ts` at workspace root) |
| `port` | No | Dev server port for `:serve` (default: `4400`) |
| `outputPath` | `:build` only | Output directory for the production build |

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
        "hmr": true
      }
    }
  }
}
```

The configuration split is intentional and required for HMR to work:

- `outputHashing` lives only in the `production` configuration. Hashed filenames (`main.abc123.js`) are needed for production cache-busting but are incompatible with HMR — the dev server refuses to enable HMR with `outputHashing: "all"` and prints `Hot Module Replacement (HMR) is disabled because the 'outputHashing' option is set to 'all'.` in the terminal.
- The `development` configuration disables hashing, turns off optimization, and enables source maps — the usual Angular dev defaults.
- The `serve` target points explicitly at `:build:development` and sets `hmr: true`. `liveReload` is left at its default (`true`) so that non-HMR-able changes still trigger an automatic page refresh as a fallback.

After running `ng add @ng-prism/core` you should see Vite/Angular HMR updates in the browser console when you edit library code or styles — no full reload required. See [State Preservation](guide/url-state.md) for what survives a reload if one does happen.

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

| Package | Required for |
|---------|-------------|
| `highlight.js` + `ngx-highlightjs` | Code snippet highlighting in the renderer |
| `axe-core` | Built-in accessibility auditing |

Install them only if you use those features:

```bash
npm install highlight.js ngx-highlightjs
```
