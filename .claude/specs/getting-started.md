# Getting Started

Guide for setting up and using ng-prism in an Angular workspace.

---

## Prerequisites

- Angular >= 20.0.0
- Node.js >= 18
- TypeScript >= 5.5
- The library must use `input()` / `output()` signals (no `@Input()` / `@Output()` decorators)

---

## Installation

```bash
ng add ng-prism --project my-lib
npm install highlight.js ngx-highlightjs
```

> `highlight.js` and `ngx-highlightjs` are peer dependencies of ng-prism (used for code snippet syntax highlighting).

### What `ng add` does

The schematic performs four steps:

1. **Create the Prism app** — Scaffolds `projects/my-lib-prism/` with `main.ts`, `index.html`, and `tsconfig.app.json`
2. **Add builder targets** — Adds `prism` (serve) and `prism-build` (build) targets to the library project in `angular.json`
3. **Add tsconfig paths** — Registers `ng-prism.config` and the library path in `tsconfig.json`
4. **Create config file** — Generates `ng-prism.config.ts` in the workspace root with a default configuration

### Result in `angular.json`

```json
{
  "projects": {
    "my-lib": {
      "architect": {
        "prism": {
          "builder": "ng-prism:serve",
          "options": {
            "entryPoint": "projects/my-lib/src/public-api.ts",
            "prismProject": "my-lib-prism",
            "libraryProject": "my-lib",
            "port": 4400
          }
        },
        "prism-build": {
          "builder": "ng-prism:build",
          "options": {
            "entryPoint": "projects/my-lib/src/public-api.ts",
            "prismProject": "my-lib-prism",
            "libraryProject": "my-lib",
            "outputPath": "dist/my-lib-prism"
          }
        }
      }
    }
  }
}
```

---

## Annotating your first component

```typescript
// button.component.ts
import { Component, input, output } from '@angular/core';
import { Showcase } from 'ng-prism';

@Component({
  selector: 'my-button',
  standalone: true,
  template: `<button [class]="variant()" [disabled]="disabled()">{{ label() }}</button>`,
})
@Showcase({
  title: 'Button',
  description: 'Versatile button for all actions.',
  category: 'Inputs',
  tags: ['action', 'form'],
  variants: [
    { name: 'Primary', inputs: { variant: 'primary', label: 'Save' } },
    { name: 'Danger',  inputs: { variant: 'danger',  label: 'Delete' } },
    { name: 'Disabled', inputs: { disabled: true } },
  ],
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary' | 'danger'>('primary');
  disabled = input(false);
  label = input('Button');
  clicked = output<void>();
}
```

The component must be exported from the library's `public-api.ts`:

```typescript
// public-api.ts
export { ButtonComponent } from './lib/components/button/button.component';
```

---

## Starting the dev server

```bash
ng run my-lib:prism
```

The styleguide is available at `http://localhost:4400`.

File changes (`.ts`, `.scss`, `.css`, `.svg`) in the library directory automatically
trigger a re-scan (debounce 300ms).

---

## Production build

```bash
ng run my-lib:prism-build
```

Produces a static build at `dist/my-lib-prism/`, suitable for GitHub Pages etc.

---

## `ng-prism.config.ts` reference

```typescript
import { defineConfig } from 'ng-prism/config';
import { customPage } from 'ng-prism/config';

export default defineConfig({
  // Plugins (executed in order)
  plugins: [],

  // Config-based pages (custom — build-time)
  pages: [
    customPage({ title: 'Changelog', data: { version: '1.0' } }),
  ],

  // Providers for the styleguide app (library-wide)
  appProviders: [
    // provideAnimationsAsync(),
    // provideHttpClient(),
  ],

  // CSS custom properties for visual theming
  theme: {
    '--prism-primary': '#6366f1',
    '--prism-sidebar-width': '280px',
  },

  // Alternative: custom stylesheet
  // themeStylesheet: './my-prism-theme.scss',

  // Replace UI slots with custom components
  // ui: {
  //   header: MyCustomHeaderComponent,
  // },

  // Headless mode: fully custom app component
  // headless: true,
  // appComponent: MyCustomAppComponent,
});
```

### `NgPrismConfig` options

| Option | Type | Description |
|---|---|---|
| `plugins` | `NgPrismPlugin[]` | Plugins in execution order |
| `pages` | `StyleguidePage[]` | Config-based pages (custom — build-time) |
| `appProviders` | `Provider[]` | Providers for the Prism app (e.g. `provideAnimationsAsync()`) |
| `theme` | `Record<string, string>` | CSS custom properties (`--prism-*`) |
| `themeStylesheet` | `string` | Path to a custom CSS/SCSS stylesheet |
| `ui` | Object | Replaceable UI slots (see below) |
| `headless` | `boolean` | Headless mode — services only, custom UI |
| `appComponent` | `Type<unknown>` | Root component in headless mode |

### `ui` slots

Each slot can be replaced with a custom Angular standalone component.
The component has access to all Prism services via dependency injection.

| Slot | Default component | Description |
|---|---|---|
| `header` | `PrismHeaderComponent` | App header with logo and search field |
| `sidebar` | `PrismSidebarComponent` | Navigation sidebar with category tree |
| `componentHeader` | `PrismComponentHeaderComponent` | Title, description, and tags of the active component |
| `renderer` | `PrismRendererComponent` | Component rendering area with variant tabs |
| `controlsPanel` | Built-in Controls Panel | Auto-generated controls panel for inputs |
| `eventsPanel` | Built-in Events Panel | Event log for `output()` events |
| `footer` | *(none)* | Optional footer area |

```typescript
// ng-prism.config.ts
import { defineConfig } from 'ng-prism/config';
import { MyCustomHeaderComponent } from './my-custom-header.component';

export default defineConfig({
  ui: {
    header: MyCustomHeaderComponent,
  },
});
```

---

## `@Showcase` API

```typescript
interface ShowcaseConfig {
  title: string;              // Display name in the styleguide
  description?: string;       // Description (Markdown)
  category?: string;          // Sidebar group
  categoryOrder?: number;     // Sort position of the category (lower = higher up)
  componentOrder?: number;    // Sort position within the category (lower = higher up)
  variants?: Variant[];       // Predefined variants
  tags?: string[];            // Tags for search/filtering
  providers?: Provider[];     // Child injector providers
  meta?: Record<string, unknown>; // Plugin metadata (e.g. { figma: 'https://...' })
}

interface Variant {
  name: string;               // Tab label
  inputs?: Record<string, unknown>; // Input values
  description?: string;       // Variant description
}
```

### Navigation order

By default, categories sort alphabetically and components within a category sort
alphabetically by title. Use `categoryOrder` and `componentOrder` to take full
control:

```typescript
@Showcase({
  title: 'Button',
  category: 'Inputs',
  categoryOrder: 1,   // "Inputs" appears first in the sidebar
  componentOrder: 1,  // "Button" appears first within "Inputs"
})
```

**Rules:**

- Categories with a `categoryOrder` appear before those without one (sorted ascending by number).
- Categories without `categoryOrder` sort alphabetically after the ordered ones.
- The same logic applies to `componentOrder` within each category.
- If two items share the same order value, they sort alphabetically by title.
- `categoryOrder` is set per component — if multiple components share a category, the **lowest** value in that category wins.

The `meta` field is a generic extension point for plugins. Each plugin defines
which keys it reads. For example, the Figma plugin reads `meta.figma`:

```typescript
@Showcase({
  title: 'Button',
  meta: { figma: 'https://www.figma.com/file/abc123/my-design' },
})
```

---

## Component pages

Component pages allow you to register arbitrary Angular components as styleguide pages
— ideal for composition demos, dialog workflows, or complex multi-component scenarios.
Component pages are registered at **runtime** via `providePrism()`, since Angular
classes are not JSON-serializable.

**Important:** Component pages belong in the **Prism app** (`projects/{lib}-prism/`),
not in the library itself. This ensures they are never part of the library build.

### Creating a page component

```typescript
// projects/my-lib-prism/src/pages/button-patterns-page.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonComponent } from 'my-lib';

@Component({
  selector: 'prism-button-patterns-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    <section>
      <h3>Form Actions</h3>
      <my-button variant="primary" label="Save" />
      <my-button variant="secondary" label="Cancel" />
    </section>
  `,
})
export class ButtonPatternsPageComponent {}
```

### Registering in `main.ts`

```typescript
// projects/my-lib-prism/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { PrismShellComponent, providePrism } from 'ng-prism';
import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';
import config from 'ng-prism.config';
import { ButtonPatternsPageComponent } from './pages/button-patterns-page.component';

bootstrapApplication(PrismShellComponent, {
  providers: [
    providePrism(PRISM_RUNTIME_MANIFEST, config, {
      componentPages: [
        {
          title: 'Button Patterns',
          category: 'Patterns',
          component: ButtonPatternsPageComponent,
        },
      ],
    }),
  ],
});
```

The page component is a regular Angular standalone component. It imports library
components via the library import path and can arrange them in a free-form layout.

---

## Enabling HMR for live metadata updates

ng-prism supports hot module replacement (HMR) for `@Showcase` metadata changes.
When enabled, edits to variant inputs, titles, categories, and other metadata in
your library source appear in the styleguide without a full reload. UI state
(active component, variant, control values) is preserved across updates.

Add the following to your Prism app's `main.ts`:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { providePrism, enablePrismHmr, PrismShellComponent } from 'ng-prism';
import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';
import config from '../ng-prism.config';

const appRef = await bootstrapApplication(PrismShellComponent, {
  providers: [providePrism(PRISM_RUNTIME_MANIFEST, config)],
});

if (import.meta.hot) {
  import.meta.hot.accept('./prism-manifest', (mod) => {
    if (mod) {
      enablePrismHmr(appRef, mod.PRISM_RUNTIME_MANIFEST);
    }
  });
}
```

Start the dev server with HMR enabled:

```
ng serve --hmr
```

**Note:** Changes to component source code (templates, logic) still trigger
normal Angular HMR. ng-prism's reactive manifest handles `@Showcase` decorator
metadata changes specifically. In production builds `import.meta.hot` is `undefined`
and the HMR code path is dead-code eliminated.

---

## Code snippets

Each showcase component displays a collapsible code block below the canvas.
The snippet demonstrates how to use the component with the current input values
in an Angular template.

- **Live-reactive:** Variant switches and manual control changes update the snippet instantly
- **Syntax highlighting:** Built-in minimal XML highlighter (zero dependencies)
- **Smart formatting:** Strings as plain attributes, booleans/numbers with
  binding syntax `[prop]="value"`, default values are omitted

```html
<lib-button
  variant="filled"
  label="Save"
  [disabled]="true" />
```

The toggle button (`</> Code`) sits directly below the rendering canvas.

---

## Plugins

Plugins are plain objects implementing the `NgPrismPlugin` interface. They can
enrich components at build time and contribute UI panels and controls at runtime.

See [docs/plugin-api.md](./plugin-api.md) for the full reference.

### Official plugins

#### `@ng-prism/plugin-figma`

Embeds a Figma design frame as an interactive panel.

```bash
npm install @ng-prism/plugin-figma
```

```typescript
import { figmaPlugin } from '@ng-prism/plugin-figma';
export default defineConfig({
  plugins: [figmaPlugin()],
});
```

Provide a Figma URL per component via `@Showcase({ meta: { figma: 'https://...' } })`.

---

#### `@ng-prism/plugin-a11y`

Runs an axe-core accessibility audit on the rendered component.

```bash
npm install @ng-prism/plugin-a11y axe-core
```

```typescript
import { a11yPlugin } from '@ng-prism/plugin-a11y';
export default defineConfig({
  plugins: [a11yPlugin()],
});
```

Disable per component via `@Showcase({ meta: { a11y: { disable: true } } })`.

---

#### `@ng-prism/plugin-jsdoc`

Extracts JSDoc comments from component source files at build time and displays
them in an **API** panel. Covers class description, `@deprecated`, `@since`,
`@see`, `@example`, and per-input/output documentation.

```bash
npm install @ng-prism/plugin-jsdoc highlight.js ngx-highlightjs
```

```typescript
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';
export default defineConfig({
  plugins: [jsDocPlugin()],
});
```

Document your components with standard JSDoc:

```typescript
/**
 * Primary action button.
 * @since 1.0.0
 * @deprecated Use PrimaryButtonComponent instead.
 * @see PrimaryButtonComponent
 * @example
 * <my-button label="Save" />
 */
@Component({ ... })
@Showcase({ title: 'Button' })
export class ButtonComponent {
  /** Button label */
  readonly label = input('Click');

  /**
   * Visual variant.
   * @since 1.1.0
   * @deprecated Prefer semantic tokens
   */
  readonly variant = input<'filled' | 'outlined'>('filled');

  /** Emits on click */
  readonly clicked = output<void>();
}
```

The API panel shows:
- Class description, `@deprecated` badge, `@since`, `@see` links
- Inputs table: Name | Type | Default | Required | Description
- Outputs table: Name | Description
- `@example` blocks with syntax highlighting

---

## Theming

The styleguide app uses CSS custom properties with the `--prism-` prefix.
All CSS classes use a `prism-` prefix (no iframe, CSS isolation via naming).

Available properties (excerpt):

```css
--prism-primary          /* Primary color */
--prism-bg               /* Background */
--prism-bg-surface       /* Surface background */
--prism-text             /* Text color */
--prism-text-muted       /* Secondary text color */
--prism-border           /* Border color */
--prism-sidebar-width    /* Sidebar width */
--prism-sidebar-bg       /* Sidebar background */
--prism-header-height    /* Header height */
--prism-font-family      /* Font family */
--prism-font-mono        /* Monospace font */
--prism-radius           /* Border radius */
--prism-panel-height     /* Panel height */
```

---

## Builder options

### `ng-prism:serve`

| Option | Required | Default | Description |
|---|---|---|---|
| `entryPoint` | yes | — | Path to the library's `public-api.ts` |
| `prismProject` | yes | — | Angular project name of the Prism app |
| `libraryProject` | no | — | Library project name |
| `port` | no | `4400` | Dev server port |
| `libraryImportPath` | no | `libraryProject` | npm package name for imports in the manifest |
| `configFile` | no | `ng-prism.config.ts` | Path to the config file |

### `ng-prism:build`

Same options as `serve`, without `port`.

---

## Troubleshooting

### NG0203: `inject() must be called from an injection context`

**Cause:** Two instances of `@angular/core` in the bundle (can happen with `file:` links or misconfigured package managers).

**Solution:** `preserveSymlinks: true` in the Prism app's build configuration (set automatically by the schematic).

### `reflect-metadata` CommonJS warning

**Cause:** `reflect-metadata` is not an ESM module.

**Solution:** The warning is harmless and can be ignored. An ESM-compatible import will be provided in a future version.
