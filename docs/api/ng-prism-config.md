# NgPrismConfig

Configuration object returned by `defineConfig()` and exported as the default export of `prism.config.ts`.

```typescript
import type { Provider, Type } from '@angular/core';
import type { NgPrismPlugin } from './plugin.types.js';
import type { StyleguidePage } from './page.types.js';

interface NgPrismConfig {
  title?: string;
  subtitle?: string;
  logo?: { light?: string; dark?: string };
  plugins?: NgPrismPlugin[];
  pages?: StyleguidePage[];
  appProviders?: Provider[];
  theme?: Record<string, string>;
  darkTheme?: Record<string, string>;
  lightTheme?: Record<string, string>;
  themeStylesheet?: string;
  ui?: {
    header?: Type<unknown>;
    sidebar?: Type<unknown>;
    componentHeader?: Type<unknown>;
    renderer?: Type<unknown>;
    controlsPanel?: Type<unknown>;
    eventsPanel?: Type<unknown>;
    footer?: Type<unknown>;
  };
  headless?: boolean;
  appComponent?: Type<unknown>;
  urlState?: boolean;
}
```

## Fields

### `plugins`

Array of `NgPrismPlugin` objects to activate. Plugins run in registration order during both the build pipeline and at runtime.

```typescript
export default defineConfig({
  plugins: [jsDocPlugin(), figmaPlugin()],
});
```

---

### `pages`

Array of `StyleguidePage` entries declared in config. Supports `CustomPage` (type-safe data object) and is processed through the pipeline's `onPageScanned` hooks.

```typescript
export default defineConfig({
  pages: [
    {
      type: 'custom',
      title: 'Changelog',
      category: 'Meta',
      data: { version: '2.1.0' },
    },
  ],
});
```

For `ComponentPage` entries (Angular class references), use `providePrism(manifest, config, { componentPages: [...] })` in `main.ts` instead — Angular classes cannot be serialized through the build pipeline.

---

### `appProviders`

Angular providers added to the Prism app's root injector at bootstrap. Use for library-wide services, mock backends, or global configuration that every component needs.

```typescript
export default defineConfig({
  appProviders: [
    provideHttpClient(),
    { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
  ],
});
```

---

### `theme`

Map of CSS custom property overrides. Applied on top of the built-in default theme.

```typescript
export default defineConfig({
  theme: {
    '--prism-primary':   '#0ea5e9',
    '--prism-bg':        '#0f172a',
    '--prism-font-sans': '"Inter", system-ui, sans-serif',
  },
});
```

See [Theming](guide/theming.md) for the full list of available properties.

---

### `themeStylesheet`

Path to a custom CSS/SCSS file loaded by the Prism app. Relative to the workspace root. Use for custom fonts, utility classes, or complex theming that cannot be expressed with CSS custom properties alone.

```typescript
export default defineConfig({
  themeStylesheet: 'projects/my-lib-prism/src/theme.scss',
});
```

---

### `ui`

Replace individual UI sections with custom Angular standalone components. All fields are optional — omit any slot to keep the built-in component.

| Key | Replaces |
|-----|----------|
| `header` | Top header bar (logo, toolbar, theme toggle) |
| `sidebar` | Left navigation sidebar |
| `componentHeader` | Title and description area above the canvas |
| `renderer` | Entire renderer region (canvas + variant tabs + snippet) |
| `controlsPanel` | Built-in Controls addon panel |
| `eventsPanel` | Built-in Events addon panel |
| `footer` | Footer area below addon panels |

```typescript
export default defineConfig({
  ui: {
    header: MyBrandedHeaderComponent,
    footer: MyFooterComponent,
  },
});
```

See [Custom UI Sections](guide/custom-ui.md) for examples.

---

### `headless`

When `true`, strips all built-in chrome — header, sidebar, toolbar, panels — and renders only the component canvas. Default: `false`.

```typescript
export default defineConfig({ headless: true });
```

---

### `appComponent`

Replace the entire application shell with a custom Angular component. When set, ng-prism renders this component instead of `PrismShellComponent` while still providing all services.

```typescript
export default defineConfig({
  appComponent: MyCustomShellComponent,
});
```

---

### `urlState`

When `false`, disables URL query parameter synchronization. Default: `true`.

```typescript
export default defineConfig({ urlState: false });
```

See [URL State Sync](guide/url-state.md).
