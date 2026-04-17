# @Showcase Decorator

`@Showcase` is placed directly on an Angular component (or directive) class to register it with ng-prism. The decorator accepts a `ShowcaseConfig` object.

```typescript
import { Showcase } from 'ng-prism';

@Showcase({
  title: 'My Component',
  // ...
})
@Component({ ... })
export class MyComponent { ... }
```

The decorator is evaluated at build time by the TypeScript Compiler API scanner. Its presence is what makes the builder include the component in the manifest.

> **Note:** `@Showcase` must always appear _above_ `@Component` or `@Directive`, as decorator application order in Angular matters.

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
