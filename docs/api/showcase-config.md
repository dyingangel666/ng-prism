# ShowcaseConfig

Configuration object passed to the `@Showcase` decorator.

```typescript
import type { Provider } from '@angular/core';

interface ShowcaseConfig {
  title: string;
  description?: string;
  category?: string;
  categoryOrder?: number;
  componentOrder?: number;
  variants?: Variant[];
  tags?: string[];
  providers?: Provider[];
  meta?: Record<string, unknown>;
  host?: string | DirectiveHost;
  renderPage?: string;
}
```

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

## DirectiveHost Interface

```typescript
interface DirectiveHost {
  /** CSS selector of the host element to render */
  selector: string;
  /** Import info for the Angular component */
  import: {
    name: string;  // exported class name
    from: string;  // npm package or path
  };
  /** Static inputs passed to the host component */
  inputs?: Record<string, unknown>;
}
```

## Variant Interface

See [Type Reference — Variant](api/types.md#variant).
