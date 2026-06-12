# ShowcaseConfig

Configuration object passed to the `@Showcase` decorator.

```typescript
import type { Provider } from '@angular/core';

interface ShowcaseConfig<T = unknown> {
  title: string;
  description?: string;
  section?: string;
  sectionOrder?: number;
  category?: string;
  categoryOrder?: number;
  componentOrder?: number;
  variants?: Variant<T>[];
  tags?: string[];
  providers?: Provider[];
  meta?: Record<string, unknown>;
  bg?: CanvasBg;
  canvasLayout?: CanvasLayout;
  host?: string | DirectiveHost;
  renderPage?: string;
  status?: ComponentStatus;
}

type ComponentStatus = 'stable' | 'beta' | 'wip' | 'deprecated';
```

The optional generic parameter `T` is the component class. When set via `@Showcase<MyComponent>({...})`, variant `inputs` are checked against `Partial<InputsOf<MyComponent>>`, giving you autocomplete on input names and type-checking on values. When omitted, `T` defaults to `unknown` and `inputs` accepts any `Record<string, unknown>` — existing call sites keep working unchanged. See [Variants — Type-safe inputs](guide/variants.md#type-safe-inputs) for usage and [`InputsOf<T>`](api/types.md#inputsof) for the type mapping rules.

## Fields

### `title`

**Required.** Display name shown in the sidebar and above the component canvas.

```typescript
@Showcase({ title: 'Alert Banner' })
```

---

### `description`

Optional Markdown-formatted text rendered below the component title.

```typescript
@Showcase({
  title: 'Alert Banner',
  description: 'Displays status messages. Supports `info`, `warning`, `success`, and `error`.',
})
```

---

### `category`

Optional string that groups the component in the sidebar. Components without a category are placed in "Uncategorized".

```typescript
@Showcase({ title: 'Button', category: 'Atoms' })
```

---

### `categoryOrder`

Optional number controlling the sort order of this _category_ in the sidebar. Lower numbers appear first. Categories without `categoryOrder` sort alphabetically after ordered ones.

When multiple components share a category, the lowest `categoryOrder` value among them is used for the category.

```typescript
@Showcase({ title: 'Button', category: 'Atoms', categoryOrder: 1 })
```

---

### `componentOrder`

Optional number controlling the sort order of _this component_ within its category. Same semantics as `categoryOrder` but scoped to the category.

```typescript
@Showcase({ title: 'Icon Button', category: 'Atoms', componentOrder: 2 })
```

---

### `section`

Optional string that places the component into a top-level sidebar section. Auto-detected when omitted: `@Directive` → `'Directives'`, `@Component` → `'Components'`. Any free-form string creates a new section (e.g. `'Pipes'`, `'Utilities'`).

```typescript
@Showcase({ title: 'Autofocus', section: 'Behavior' })
@Directive({ selector: '[appAutofocus]', standalone: true })
export class AutofocusDirective {}
```

---

### `sectionOrder`

Optional number controlling the sort order of this _section_ in the sidebar. Lower numbers appear first. The section's effective order is the minimum `sectionOrder` among its items. Defaults: `Components` → 0, `Directives` → 10, custom → 100.

```typescript
@Showcase({ title: 'AutofocusDirective', section: 'Behavior', sectionOrder: 5 })
```

---

### `variants`

Optional array of `Variant` objects. Each renders as a named tab above the canvas. See the [`Variant`](api/types.md#variant) type for full documentation.

```typescript
@Showcase({
  title: 'Badge',
  variants: [
    { name: 'Info',    inputs: { type: 'info' } },
    { name: 'Success', inputs: { type: 'success' } },
  ],
})
```

---

### `tags`

Optional array of strings used for sidebar search and filtering. Matched alongside `title` and `category`.

```typescript
@Showcase({ title: 'Button', tags: ['form', 'cta', 'interactive'] })
```

---

### `providers`

Optional Angular providers added to a child `EnvironmentInjector` scoped to this component. Use for mock services, dialog providers, or any other dependency not available in the root injector.

```typescript
@Showcase({
  title: 'Confirm Dialog',
  providers: [{ provide: DialogService, useClass: MockDialogService }],
})
```

For library-wide providers, use `defineConfig({ appProviders })`.

---

### `meta`

Optional arbitrary key-value metadata. Plugins read their own namespaced keys from this object.

```typescript
@Showcase({
  title: 'Button',
  meta: {
    figma: 'https://www.figma.com/design/abc/Design?node-id=1-1',
    a11y: { disable: ['color-contrast'] },
  },
})
```

---

### `bg`

Optional recommended canvas background for this component. Applied when the user opens the component, unless a variant defines its own `bg`. The user can still override the background via the canvas toolbar — the override is transient and resets when switching variants or components.

Accepted values: `'dots'`, `'plain'`, `'light'`, `'dark'`, `'checker'`.

```typescript
@Showcase({
  title: 'Dark-only Card',
  bg: 'dark',
})
```

When the user has deviated from the recommended background, a small floating pill appears in the canvas labelled `Recommended: <bg>` with a one-click `Reset` button.

See also: [Variants — Per-Variant Background](guide/variants.md#per-variant-background) for the variant-level override and [Canvas State](architecture/canvas-state.md) for the full fallback model.

---

### `canvasLayout`

Optional canvas layout mode for the rendered component. Controls how `.demo-wrap` (the wrapper inside the canvas stage) sizes itself around the component.

Accepted values: `'fit'` (default), `'stretch'`.

| Value       | Behavior                                                                                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'fit'`     | Wrapper is `display: inline-block` and shrinks to the component's intrinsic size. The canvas stage's flexbox centers it. Use for the vast majority of components — buttons, badges, cards, alerts.                                                                  |
| `'stretch'` | Wrapper becomes `display: block; width: 100%; max-width: 800px`. Use when the component has no intrinsic width (e.g. a horizontal divider rendered via `border-bottom`) or explicitly opts into filling its container (e.g. a full-width button via `width: 100%`). |

A `Variant.canvasLayout` overrides the component-level setting.

```typescript
@Showcase({
  title: 'Divider',
  // Most variants render horizontally and need a width reference.
  canvasLayout: 'stretch',
  variants: [
    { name: 'Horizontal', inputs: { orientation: 'horizontal' } },
    // Vertical dividers are intrinsic-sized — opt back into 'fit'.
    { name: 'Vertical',   inputs: { orientation: 'vertical' }, canvasLayout: 'fit' },
  ],
})
```

See also: [Variants — Per-Variant Canvas Layout](guide/variants.md#per-variant-canvas-layout) for variant-level overrides.

---

### `host`

Optional. Tells ng-prism how to render a **directive** that cannot render on its own.

**String form** — an HTML element string:

```typescript
@Showcase({ title: 'Tooltip', host: '<button class="btn">Hover me</button>' })
```

**Object form** (`DirectiveHost`) — an Angular component as host:

```typescript
@Showcase({
  title: 'Ripple',
  host: {
    selector: 'lib-button',
    import: { name: 'ButtonComponent', from: 'my-lib' },
    inputs: { label: 'Click me' },
  },
})
```

See [Directive Hosting](guide/directive-hosting.md) for a full walkthrough.

---

### `renderPage`

Optional title of a registered `ComponentPage`. When set, the matching page component is rendered in the canvas instead of the automatic `ViewContainerRef.createComponent()` output.

```typescript
@Showcase({
  title: 'Data Table',
  renderPage: 'Data Table Demo',
})
```

The page component can inject `PrismRendererService` to react to variant and controls changes. See [Component Pages](guide/component-pages.md).

---

### `status`

Optional migration / maturity badge. Accepts one of four values from the `ComponentStatus` union:

| Value          | Meaning                                    |
| -------------- | ------------------------------------------ |
| `'stable'`     | Migrated and production-ready.             |
| `'beta'`       | Functional, but API may still change.      |
| `'wip'`        | Work in progress, migration ongoing.       |
| `'deprecated'` | Legacy component — do not use in new code. |

```typescript
@Showcase({ title: 'Button', status: 'stable' })
@Showcase({ title: 'Dialog', status: 'deprecated' })
```

When the property is omitted, the component is treated like `stable` but rendered **without** any indicator — neither in the sidebar nor in the component header. Set the property explicitly only when you want to draw attention to the migration state.

UI impact:

- **Sidebar**
  - `'wip'` → small amber dot at the right edge of the sidebar item, with a native tooltip "Work in progress".
  - `'deprecated'` → component name is rendered struck-through and dimmed, with a native tooltip "Deprecated / Legacy".
  - `'stable'` / `'beta'` / unset → no sidebar decoration.
- **Component header** — next to the selector pill, an inline status pill renders for every explicit value (Stable, Beta, Work in progress, Deprecated). The pill stays inline with title and `<selector>` pill.

All colors come from the existing theme tokens (`--prism-success`, `--prism-warn`, `--prism-text-muted`, `--prism-text-ghost`, `--prism-input-bg`, `--prism-border-strong`) and adapt automatically to light/dark mode. The Beta accent uses `#60a5fa` because no `--prism-info` token exists yet.

---

## DirectiveHost Interface

```typescript
interface DirectiveHost {
  /** CSS selector of the host element to render */
  selector: string;
  /** Import info for the Angular component */
  import: {
    name: string; // exported class name
    from: string; // npm package or path
  };
  /** Static inputs passed to the host component */
  inputs?: Record<string, unknown>;
}
```

## Variant Interface

See [Type Reference — Variant](api/types.md#variant).
