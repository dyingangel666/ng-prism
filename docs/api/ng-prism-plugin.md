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
| `keepAlive`            | When `true`, the panel component is rendered once on first activation and merely hidden (instead of destroyed) on tab switch. Use for expensive panels — iframes, remote previews, heavy DOM. Default: `false`. |

> **Note:** Always prefer `loadComponent` over `component`. The config file is evaluated by the Angular builder in Node.js — a static import of a component that uses `DomSanitizer` or any browser global will crash the build.

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
