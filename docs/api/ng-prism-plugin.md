# NgPrismPlugin

Interface implemented by all ng-prism plugins. A plugin is a plain JavaScript object — no class inheritance or base classes.

```typescript
interface NgPrismPlugin {
  name: string;
  onComponentScanned?: (
    component: ScannedComponent
  ) => ScannedComponent | void | Promise<ScannedComponent | void>;
  onPageScanned?: (
    page: StyleguidePage
  ) => StyleguidePage | void | Promise<StyleguidePage | void>;
  onManifestReady?: (
    manifest: PrismManifest
  ) => PrismManifest | void | Promise<PrismManifest | void>;
  panels?: PanelDefinition[];
  controls?: ControlDefinition[];
  headerWidgets?: HeaderWidgetDefinition[];
  navigationDecorations?: NavigationDecorationDefinition[];
  wrapComponent?: Type<unknown>;
}
```

## Fields

### `name`

**Required.** Unique identifier for this plugin. Used in debug output and conflict detection.

```typescript
{
  name: '@my-org/plugin-my-plugin';
}
```

---

### `onComponentScanned`

Build-time hook called once per `@Showcase`-decorated component. Receives the `ScannedComponent` object. Mutate it in place or return a new object. Returning `void` keeps the original.

Runs in Node.js — do not import browser APIs.

```typescript
onComponentScanned(component) {
  component.meta = {
    ...component.meta,
    myPlugin: extractMyData(component.filePath),
  };
}
```

Async is supported:

```typescript
async onComponentScanned(component) {
  const extra = await fetchData(component.className);
  component.meta = { ...component.meta, extra };
}
```

---

### `onPageScanned`

Build-time hook called once per `StyleguidePage`. Same mutation pattern as `onComponentScanned`.

```typescript
onPageScanned(page) {
  if (page.type === 'custom') {
    page.data = enrichPageData(page.data);
  }
}
```

---

### `onManifestReady`

Build-time hook called once with the complete `PrismManifest` after all components and pages have been processed. Use for cross-component transforms or manifest-level filtering.

```typescript
onManifestReady(manifest) {
  // Remove internal-only components from the manifest
  manifest.components = manifest.components.filter(
    (c) => !c.showcaseConfig.tags?.includes('internal'),
  );
}
```

---

### `panels`

Array of `PanelDefinition` objects registering new panel tabs at runtime (browser).

```typescript
panels: [
  {
    id: 'my-panel',
    label: 'My Panel',
    loadComponent: () =>
      import('./my-panel.component.js').then((m) => m.MyPanelComponent),
    position: 'bottom',
    placement: 'addon',
  },
];
```

---

### `controls`

Array of `ControlDefinition` objects registering custom input controls. The Controls panel checks registered definitions in plugin order before falling back to built-in controls.

```typescript
controls: [
  {
    matchType: (input) => input.rawType === 'CssColor',
    component: ColorPickerControlComponent,
  },
];
```

---

### `headerWidgets`

Array of `HeaderWidgetDefinition` objects rendering Angular components inside the Prism shell header bar. Use for library-wide signals — total coverage, perf budgets, version banners.

```typescript
headerWidgets: [
  {
    id: 'coverage-total',
    placement: 'end',
    order: -10,
    loadComponent: () =>
      import('./coverage-header-badge.component.js').then(
        (m) => m.CoverageHeaderBadgeComponent
      ),
  },
];
```

Widgets typically inject `PRISM_MANIFEST` and read library-wide data from `manifest.meta`. Set library-wide values from `onManifestReady`:

```typescript
async onManifestReady(manifest) {
  return {
    ...manifest,
    meta: { ...manifest.meta, myPlugin: aggregate(manifest.components) },
  };
}
```

---

### `navigationDecorations`

Array of `NavigationDecorationDefinition` objects, each contributing a marker to the sidebar's navigation item for every component. Use for library-wide health signals that should be visible while browsing — a11y, coverage and visual regression standing all ship as built-ins through this exact extension point.

```typescript
navigationDecorations: [
  {
    id: 'todo',
    icon: 'file-text',
    order: 40,
    badge: (component) => {
      const todo = component.meta.showcaseConfig.meta?.['todo'] as
        | { summary?: { variant: 'warn' | 'danger'; label: string } }
        | undefined;
      return todo?.summary
        ? { variant: todo.summary.variant, label: todo.summary.label }
        : null;
    },
  },
];
```

See [`NavigationDecorationDefinition`](#navigationdecorationdefinition) for the full field reference and the reserved `order` values, and [Example: a complete navigation decoration plugin](#example-a-complete-navigation-decoration-plugin) for a runnable one.

---

### `wrapComponent`

An Angular standalone component that wraps every rendered component. Use for providing context (theme, mocks, CDK overlay host) that must exist in the component tree.

```typescript
wrapComponent: ThemeProviderWrapperComponent;
```

---

## PanelDefinition

```typescript
interface PanelDefinition {
  id: string;
  label: string;
  component?: Type<unknown>;
  loadComponent?: () => Promise<Type<unknown>>;
  overlayComponent?: Type<unknown>;
  loadOverlayComponent?: () => Promise<Type<unknown>>;
  icon?: string;
  position?: 'bottom' | 'right';
  placement?: 'addon' | 'view';
  providers?: Provider[];
  isVisible?: (component: RuntimeComponent) => boolean;
  badge?: (component: RuntimeComponent) => PanelBadge | null;
  keepAlive?: boolean;
}
```

| Field                  | Description                                                                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | Unique panel ID. Collision with built-in IDs overwrites the built-in panel.                                                                                                                                     |
| `label`                | Tab label shown in the panel tab bar                                                                                                                                                                            |
| `component`            | Static Angular component — avoid for browser-only deps                                                                                                                                                          |
| `loadComponent`        | Lazy-loaded component — preferred when importing `@angular/platform-browser` or DOM APIs                                                                                                                        |
| `overlayComponent`     | Component rendered as a canvas overlay (e.g. visual annotations)                                                                                                                                                |
| `loadOverlayComponent` | Lazy-loaded canvas overlay                                                                                                                                                                                      |
| `icon`                 | Icon identifier (optional, theme-dependent)                                                                                                                                                                     |
| `position`             | `'bottom'` (horizontal panel) or `'right'` (sidebar panel)                                                                                                                                                      |
| `placement`            | `'addon'` = bottom tab bar, `'view'` = view toolbar toggle                                                                                                                                                      |
| `providers`            | Providers scoped to this panel's child `EnvironmentInjector`                                                                                                                                                    |
| `isVisible`            | Predicate — when provided, the panel tab is only shown if it returns `true` for the active component                                                                                                            |
| `badge`                | When provided, the panel's tab carries a [badge](#panelbadge) for the active component. Return `null` for "nothing worth saying".                                                                               |
| `keepAlive`            | When `true`, the panel component is rendered once on first activation and merely hidden (instead of destroyed) on tab switch. Use for expensive panels — iframes, remote previews, heavy DOM. Default: `false`. |

> **Note:** Always prefer `loadComponent` over `component`. The config file is evaluated by the Angular builder in Node.js — a static import of a component that uses `DomSanitizer` or any browser global will crash the build.

---

## PanelBadge

```typescript
interface PanelBadge {
  text: string;
  variant?: 'default' | 'ok' | 'warn' | 'danger';
}
```

A short marker on a panel's tab, returned by [`PanelDefinition.badge`](#paneldefinition).

| Field     | Description                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------- |
| `text`    | Usually a count. Keep it to a couple of characters — the tab bar scrolls horizontally on a narrow panel. |
| `variant` | Colour role. `default` is a neutral tint for a plain count; `ok` / `warn` / `danger` carry a judgement.  |

```typescript
panels: [
  {
    id: 'visual-regression',
    label: 'Visual Regression',
    badge: (component) => {
      const open = countOpenItems(component);
      return open ? { text: String(open), variant: 'danger' } : null;
    },
    loadComponent: () => import('./panel.component.js').then((m) => m.Panel),
  },
];
```

Two rules make the difference between a badge and decoration:

- **Return `null` when there is nothing to report.** A badge that is always present stops being a signal — a green `0` on every tab trains people to ignore the one tab showing `3`.
- **Keep it cheap and pure.** The callback runs during change detection. Read what the component's `meta` already holds; do not fetch, and do not inject — a badge has no injection context.

---

## ControlDefinition

```typescript
interface ControlDefinition {
  matchType: (input: InputMeta) => boolean;
  component: Type<unknown>;
}
```

| Field       | Description                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `matchType` | Predicate called with the `InputMeta` for each input. Return `true` to use this control.                      |
| `component` | Angular standalone component rendered as the input control. Receives `inputMeta: InputMeta` as an `@Input()`. |

---

## HeaderWidgetDefinition

```typescript
interface HeaderWidgetDefinition {
  id: string;
  component?: Type<unknown>;
  loadComponent?: () => Promise<Type<unknown>>;
  placement?: 'start' | 'end';
  order?: number;
}
```

| Field           | Description                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | Unique widget ID.                                                                                                                 |
| `component`     | Static Angular component — avoid for browser-only deps.                                                                           |
| `loadComponent` | Lazy-loaded component — preferred (config is evaluated in Node.js by the builder).                                                |
| `placement`     | `'start'` renders next to the brand block; `'end'` (default) renders inside the existing actions area, before theme/menu buttons. |
| `order`         | Sort order within the same placement (lower = earlier). Default `0`.                                                              |

> **Note:** Header widgets are root-level components. They commonly inject `PRISM_MANIFEST` from `@ng-prism/core/plugin` to access library-wide `manifest.meta` data written by `onManifestReady`.

---

## NavigationDecorationDefinition

```typescript
interface NavigationDecorationDefinition {
  id: string;
  icon: string;
  order?: number;
  badge: (component: RuntimeComponent) => NavigationDecoration | null;
}
```

| Field   | Description                                                                                                                                                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`    | Unique id — used for de-duplication when two plugins contribute the same source. Built-ins win a collision: a plugin cannot silence or restyle `a11y`, `visual-regression` or `coverage` by reusing their id.                       |
| `icon`  | Icon name from the built-in registry (`ICON_NAMES`). Built-in sources use `accessibility`, `camera` and `shield-check`.                                                                                                             |
| `order` | Fixed slot order (lower = further left in the sidebar's trailing marker group). Position alone names the source to the reader, so a decoration must not move depending on plugin registration order. See the reserved values below. |
| `badge` | The component's standing for this source, or `null` for "nothing worth saying". See [`NavigationDecoration`](#navigationdecoration) and the rules below.                                                                            |

The built-in sources reserve these `order` values — pick something else (`40`, `50`, …) for a new source so its marker does not interleave with them:

| `order` | Source                                                   |
| ------- | -------------------------------------------------------- |
| `10`    | A11y (core)                                              |
| `20`    | Visual Regression (`@ng-prism/plugin-visual-regression`) |
| `30`    | Coverage (`@ng-prism/plugin-coverage`)                   |

Three rules make the difference between a decoration and one that quietly breaks the contract:

- **Return `null` for anything healthy.** There is no `'ok'` variant on `NavigationDecoration` — a marker that is always present stops being a signal, same reasoning as [`PanelDefinition.badge`](#panelbadge). The per-source summary types stored in build-time `meta` (e.g. `CoverageSummary`, `VrtStat`) are three-valued and do include `'ok'`, because the hook that writes them needs to represent "healthy" as a real value; `badge()` is exactly the place that narrows a three-valued verdict down to the two-valued public type, by returning `null` instead of passing `'ok'` through.
- **Keep it cheap and pure.** `badge()` runs during change detection: read what `component.meta.showcaseConfig.meta` already holds, do not fetch, and do not inject — a decoration has no injection context.
- **Decide the threshold at build time, not here.** `badge()` only ever sees one component, so it has no way to know what counts as "bad" for the library as a whole — is 72% coverage fine, or a regression? Each built-in source answers that once, in `onComponentScanned`, where the full picture (thresholds, aggregates) is available, and stores the verdict under its own key in `component.showcaseConfig.meta` — conventionally a `summary: { variant, label }` field. `badge()` then does nothing but read that field back. See `packages/plugin-visual-regression/src/panel-contributions.ts` and `packages/plugin-coverage/src/coverage-contributions.ts` for the shipped pattern, and [Plugin Hooks](architecture/plugin-hooks.md) for the full rationale.

---

## NavigationDecoration

```typescript
interface NavigationDecoration {
  variant: 'warn' | 'danger';
  label: string;
}
```

What one source has to say about one component, returned by [`NavigationDecorationDefinition.badge`](#navigationdecorationdefinition).

| Field     | Description                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant` | Colour role. Deliberately only two — see the "return `null`" rule above.                                                                                              |
| `label`   | One tooltip line for this source, e.g. `'A11y: 2 critical, 1 serious'`. Several sources on the same component join their labels with a newline in the item's tooltip. |

---

## Example: a complete navigation decoration plugin

A self-contained plugin that flags components with open `// TODO` comments. It follows the same three-file split every shipped plugin with a build-time hook uses — `packages/plugin-coverage/src/coverage-plugin.ts`, `coverage-plugin.browser.ts` and `coverage-contributions.ts` are the reference this example mirrors.

The split exists because of one fact about this project: the generated Prism app imports the config directly (see the schematic that wires it in, `packages/ng-prism/src/schematics/ng-add/index.ts`), so the config module — and every plugin it imports — lands in the **browser** bundle too, not just in the Node.js process that runs the builder. A plugin file with a top-level `import { readFileSync } from 'node:fs'` crashes the moment that bundle reaches it, whether or not the hook that uses it ever runs in the browser. `onComponentScanned` never does — but the import statement doesn't know that.

Three files close that gap:

- **`todo-marker-contributions.ts`** — no `node:` imports, no Angular. Declares the `navigationDecorations` entry once, so both entries below share the exact same `badge()` and can't drift apart.
- **`todo-marker-plugin.ts`** — the **Node entry**, resolved when the builder loads the config. Carries `onComponentScanned`. Still no _static_ `node:` import: `readFileSync` is loaded with a dynamic `import()` inside the hook, the same shape `coverage-plugin.ts` uses to load `coverage-reader.js`. A dynamic import only executes when the hook actually runs, which is never in a browser bundle.
- **`todo-marker-plugin.browser.ts`** — the **browser entry**, resolved when the Prism app itself loads the config. No build-time hooks at all — just the runtime contribution, reading back whatever the Node entry already wrote to `meta` during the last build.

```typescript
// todo-marker-contributions.ts — shared by both entries, dependency-free
import type {
  NavigationDecorationDefinition,
  RuntimeComponent,
} from '@ng-prism/core/plugin';

export interface TodoSummary {
  variant: 'warn' | 'danger';
  label: string;
}

export interface TodoMeta {
  count: number;
  /** Pre-derived verdict, written by the build-time hook in todo-marker-plugin.ts. */
  summary?: TodoSummary;
}

function todoMeta(component: RuntimeComponent): TodoMeta | undefined {
  return component.meta.showcaseConfig.meta?.['todo'] as TodoMeta | undefined;
}

export const TODO_NAVIGATION_DECORATION: NavigationDecorationDefinition = {
  id: 'todo',
  icon: 'file-text',
  order: 40,
  badge: (component) => {
    const todo = todoMeta(component);
    return todo?.summary
      ? { variant: todo.summary.variant, label: todo.summary.label }
      : null;
  },
};
```

```typescript
// todo-marker-plugin.ts — Node entry, loaded by the builder
import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import {
  TODO_NAVIGATION_DECORATION,
  type TodoMeta,
} from './todo-marker-contributions.js';

export function todoMarkerPlugin(): NgPrismPlugin {
  return {
    name: '@my-org/plugin-todo-marker',

    // Build time only: count `// TODO` markers and decide the verdict once,
    // here — not in `badge()`, which never sees more than one component and
    // cannot know what "too many" means for the library as a whole.
    async onComponentScanned(component) {
      const { readFileSync } = await import('node:fs');
      const source = readFileSync(component.filePath, 'utf-8');
      const count = (source.match(/\/\/\s*TODO/g) ?? []).length;

      const todo: TodoMeta = {
        count,
        ...(count > 0
          ? {
              summary: {
                variant: count >= 5 ? 'danger' : 'warn',
                label: `${count} open TODO${count === 1 ? '' : 's'}`,
              },
            }
          : {}),
      };

      return {
        ...component,
        showcaseConfig: {
          ...component.showcaseConfig,
          meta: { ...component.showcaseConfig.meta, todo },
        },
      };
    },

    navigationDecorations: [TODO_NAVIGATION_DECORATION],
  };
}
```

```typescript
// todo-marker-plugin.browser.ts — browser entry, loaded by the Prism app itself
import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { TODO_NAVIGATION_DECORATION } from './todo-marker-contributions.js';

export function todoMarkerPlugin(): NgPrismPlugin {
  return {
    name: '@my-org/plugin-todo-marker',
    // Runtime only: read the pre-derived verdict back. No file access, no
    // computation, no build-time hooks — just the shared contribution.
    navigationDecorations: [TODO_NAVIGATION_DECORATION],
  };
}
```

The two entries are the same exported function name in two files; a `"browser"` export condition in `package.json` picks between them so consumers write one import and get whichever twin fits where their bundle runs:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "browser": "./dist/index.browser.js",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

`packages/plugin-coverage/package.json` and `packages/plugin-visual-regression/package.json` carry the shipped version of this map — each `index.ts` re-exports the Node entry, each `index.browser.ts` re-exports the browser entry. See [Plugin Hooks](architecture/plugin-hooks.md#navigation-decorations) for why the threshold decision has to live in the Node entry's hook and never in `badge()`.
