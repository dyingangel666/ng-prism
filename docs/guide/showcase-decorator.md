# @Showcase Decorator

`@Showcase` is placed directly on an Angular component (or directive) class to register it with ng-prism. The decorator accepts a `ShowcaseConfig` object.

```typescript
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'My Component',
  // ...
})
@Component({ ... })
export class MyComponent { ... }
```

The decorator is evaluated at build time by the TypeScript Compiler API scanner. Its presence is what makes the builder include the component in the manifest.

> **Note:** `@Showcase` must always appear _above_ `@Component` or `@Directive`, as decorator application order in Angular matters.

## Type-safe variants (optional)

`@Showcase` is generic: `@Showcase<T>({...})` where `T` is the component class. Supplying it types each variant's `inputs` as `Partial<InputsOf<T>>`, giving you autocomplete on input names and value type-checking against the component's signal inputs.

```typescript
@Showcase<ButtonComponent>({
  title: 'Button',
  variants: [
    { name: 'Primary', inputs: { label: 'Save',  variant: 'primary' } },
    { name: 'Danger',  inputs: { label: 'Delete', variant: 'danger'  } },
  ],
})
@Component({ ... })
export class ButtonComponent {
  label   = input.required<string>();
  variant = input<'primary' | 'secondary' | 'danger'>('primary');
}
```

Without the generic argument, `inputs` falls back to `Record<string, unknown>` — every existing call site keeps working unchanged. See [Variants — Type-safe inputs](guide/variants.md#type-safe-inputs) and [`InputsOf<T>`](api/types.md#inputsof) for full details.

## All Fields

### `title` _(required)_

Display name shown in the sidebar and above the component canvas.

```typescript
@Showcase({ title: 'Alert Banner' })
```

### `description`

Markdown-supported text rendered below the component title. Good for documenting intent, usage notes, and accessibility hints.

```typescript
@Showcase({
  title: 'Alert Banner',
  description: `
Use to communicate status messages. **Do not use** for persistent UI elements.

Supports \`info\`, \`warning\`, \`success\`, and \`error\` severity levels.
  `,
})
```

### `category`

Groups the component in the sidebar. Components without a category land in "Uncategorized".

```typescript
@Showcase({ title: 'Pill', category: 'Atoms' })
@Showcase({ title: 'Card', category: 'Molecules' })
```

Use `/` (space-slash-space) to nest categories under a parent group:

```typescript
@Showcase({ title: 'Button', category: 'Atoms' })
@Showcase({ title: 'Dialog', category: 'Overlays' })
@Showcase({ title: 'Color Tokens', category: 'Foundations' })
```

This creates a collapsible **Components** group in the sidebar containing **Atoms** and **Overlays** as sub-categories, while **Foundations** remains a top-level category.

### `categoryOrder`

Controls the order of this _category_ in the sidebar. Lower numbers appear first. Categories without this property sort alphabetically after ordered ones.

When multiple components share a category, the lowest `categoryOrder` value among them wins.

```typescript
@Showcase({ title: 'Button', category: 'Atoms', categoryOrder: 1 })
@Showcase({ title: 'Modal', category: 'Overlays', categoryOrder: 2 })
```

### `componentOrder`

Controls the order of _this component_ within its category. Same sorting rules as `categoryOrder`.

```typescript
@Showcase({ title: 'Icon Button', category: 'Atoms', componentOrder: 2 })
@Showcase({ title: 'Button',      category: 'Atoms', componentOrder: 1 })
```

### `variants`

Predefined tabs shown above the canvas. Each variant can set different `inputs`, `content`, a `description`, and plugin `meta`.

```typescript
@Showcase({
  title: 'Badge',
  variants: [
    { name: 'Info',    inputs: { label: 'New',    type: 'info' } },
    { name: 'Warning', inputs: { label: 'Review', type: 'warning' } },
    { name: 'Error',   inputs: { label: 'Error',  type: 'error' } },
  ],
})
```

See [Variants](guide/variants.md) for the full `Variant` interface.

### `tags`

Array of strings used for search and filtering in the sidebar. Tags are matched alongside `title` and `category`.

```typescript
@Showcase({
  title: 'Button',
  tags: ['interactive', 'form', 'cta'],
})
```

### `providers`

Angular providers injected into a child `EnvironmentInjector` scoped to this component. Use for components that require services not available in the root injector — for example a `DialogService`, `OverlayRef`, or a per-component mock.

```typescript
@Showcase({
  title: 'Confirm Dialog Trigger',
  providers: [
    { provide: DialogService, useClass: MockDialogService },
  ],
})
```

For library-wide providers, use `defineConfig({ appProviders })` in your config file.

### `meta`

Arbitrary key-value metadata consumed by plugins. Each official plugin documents its own key.

```typescript
@Showcase({
  title: 'Button',
  meta: {
    figma: 'https://www.figma.com/design/abc123/My-Design?node-id=1-1',
    a11y: { rules: { 'color-contrast': { enabled: true } } },
  },
})
```

### `bg`

Recommended canvas background for this component. Applied automatically when the user opens the component (or one of its variants), unless a variant defines its own `bg`. The user can still pick a different background via the canvas toolbar; the override is transient and resets when switching variants or components. When the user has deviated, a `Recommended: <bg>` pill appears in the canvas with a one-click `Reset` button.

Accepted values: `'dots'`, `'plain'`, `'light'`, `'dark'`, `'checker'`.

```typescript
@Showcase({
  title: 'Dark-only Card',
  bg: 'dark',
})
```

Variants can also declare a recommended `bg` — variant-level always wins over component-level. See [Variants](guide/variants.md#per-variant-background).

### `canvasLayout`

Wrapper sizing mode for the canvas. Controls how `.demo-wrap` (the wrapper around the rendered component) sizes itself within the canvas stage.

Accepted values: `'fit'` (default) and `'stretch'`.

| Value       | Behavior                                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'fit'`     | Wrapper is `display: inline-block` and shrinks to the component's intrinsic size; the stage's flexbox centers it. Use for the vast majority of components.                                        |
| `'stretch'` | Wrapper becomes `display: block; width: 100%; max-width: 800px`. Use when the component has no intrinsic width (horizontal divider via `border-bottom`) or opts into `width: 100%` (full-width button). |

```typescript
@Showcase({
  title: 'Divider',
  canvasLayout: 'stretch',
})
```

Variants can override this with their own `canvasLayout`. See [Variants — Per-Variant Canvas Layout](guide/variants.md#per-variant-canvas-layout) and the [`CanvasLayout`](api/types.md#canvaslayout) type for the exact wrapper styles applied in each mode.

### `host`

Targets directives that cannot render on their own. Tells ng-prism what element or component to host the directive on.

**String host** — an HTML element string:

```typescript
@Showcase({
  title: 'Tooltip Directive',
  host: '<button class="btn">Hover me</button>',
  variants: [
    { name: 'Default', inputs: { appTooltip: 'This is a tooltip' } },
  ],
})
@Directive({ selector: '[appTooltip]' })
export class TooltipDirective { ... }
```

**Object host** — an Angular component:

```typescript
@Showcase({
  title: 'Ripple Directive',
  host: {
    selector: 'lib-button',
    import: { name: 'ButtonComponent', from: 'my-lib' },
    inputs: { label: 'Click me' },
  },
})
@Directive({ selector: '[libRipple]' })
export class RippleDirective { ... }
```

See [Directive Hosting](guide/directive-hosting.md) for a full walkthrough.

### `status`

Optional migration / maturity badge. Accepts `'stable'`, `'beta'`, `'wip'`, or `'deprecated'` (the `ComponentStatus` union).

```typescript
@Showcase({ title: 'Button',  status: 'stable' })
@Showcase({ title: 'Chip',    status: 'beta' })
@Showcase({ title: 'Slider',  status: 'wip' })
@Showcase({ title: 'Dialog',  status: 'deprecated' })
```

When `status` is omitted, the component is treated as stable but renders **without any indicator** — keeping the sidebar quiet. Set it explicitly only when you want to draw attention.

**Visual impact**

| Status         | Sidebar item                           | Component header                            |
| -------------- | -------------------------------------- | ------------------------------------------- |
| _unset_        | unchanged                              | no status pill                              |
| `'stable'`     | unchanged                              | green "Stable" pill with check icon         |
| `'beta'`       | unchanged                              | blue "Beta" pill                            |
| `'wip'`        | amber dot at the right edge (tooltip)  | amber "Work in progress" pill (hollow ring) |
| `'deprecated'` | name struck-through + dimmed (tooltip) | muted "Deprecated" pill                     |

The status pill is rendered inline with the title and the `<selector>` pill in the component header. All colors come from the existing theme tokens, so light/dark mode are handled automatically — except for the Beta accent (`#60a5fa`) because the design system has no `--prism-info` token yet.

Use this to communicate migration state while moving components from a legacy library into a new one — set `'wip'` on what's actively being migrated, `'deprecated'` on what should no longer be used, and `'stable'` / `'beta'` to badge maturity once a component is done.

### `renderPage`

Title of a registered `ComponentPage` to render instead of the default component canvas. Use for complex components that need elaborate template projections or mock data that cannot be expressed with simple `content` strings.

The page component can inject `PrismRendererService` to react to variant and controls panel changes.

```typescript
@Showcase({
  title: 'Data Table',
  renderPage: 'Data Table Demo',  // must match the ComponentPage title
  variants: [
    { name: 'Empty', inputs: {} },
    { name: '10 rows', inputs: { rowCount: 10 } },
  ],
})
@Component({ ... })
export class DataTableComponent { ... }
```

See [Component Pages](guide/component-pages.md) for how to create and register the page.
