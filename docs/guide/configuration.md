# Configuration

ng-prism is configured through a `prism.config.ts` file in your showcase app. The file exports a default `NgPrismConfig` object created with `defineConfig()`.

```typescript
// projects/my-lib-prism/prism.config.ts
import { defineConfig } from '@ng-prism/core';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';

export default defineConfig({
  plugins: [jsDocPlugin()],
  theme: {
    '--prism-primary': '#6366f1',
    '--prism-primary-from': '#6366f1',
    '--prism-primary-to': '#8b5cf6',
  },
});
```

`defineConfig()` is an identity function — it exists purely for TypeScript inference on the config object.

## Full Reference

See [NgPrismConfig](api/ng-prism-config.md) for the complete interface.

The most commonly used fields:

| Field | Type | Description |
|-------|------|-------------|
| `plugins` | `NgPrismPlugin[]` | List of plugins to activate |
| `pages` | `StyleguidePage[]` | Config-declared custom pages |
| `appProviders` | `Provider[]` | Angular providers added to the Prism app bootstrap |
| `theme` | `Record<string, string>` | CSS custom property overrides |
| `themeStylesheet` | `string` | Path to a custom SCSS file loaded by the Prism app |
| `ui` | object | Replace individual UI sections with custom components |
| `headless` | `boolean` | Strip all built-in chrome — render only the component canvas |
| `urlState` | `boolean` | Disable URL state sync (default: `true`) |

## Adding Global Providers

Use `appProviders` for services that every showcase component needs — for example, a mock API service or router:

```typescript
import { defineConfig } from '@ng-prism/core';
import { provideRouter, withHashLocation } from '@angular/router';

export default defineConfig({
  appProviders: [
    provideRouter([], withHashLocation()),
    { provide: MyApiService, useClass: MockApiService },
  ],
});
```

For providers scoped to a single component, use `@Showcase({ providers: [...] })` instead.

## Theming

Override CSS custom properties to match your design system:

```typescript
export default defineConfig({
  theme: {
    '--prism-primary': '#0ea5e9',
    '--prism-bg': '#0f172a',
    '--prism-font-sans': '"Inter", sans-serif',
  },
});
```

See [Theming](guide/theming.md) for the full list of available properties.

## Branding

Replace the default ng-prism logo and title in the header:

```typescript
export default defineConfig({
  title: 'My Component Library',
  logo: {
    light: 'assets/logo-dark.svg',
    dark: 'assets/logo-light.svg',
  },
});
```

If only one logo variant is provided, it is used for both themes.

> **Note:** A small "Powered by ng-prism" notice is always visible at the bottom of the sidebar.

## Plugins

Plugins are registered in order. Each is activated during the build pipeline and at runtime:

```typescript
import { defineConfig } from '@ng-prism/core';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';
import { figmaPlugin } from '@ng-prism/plugin-figma';

export default defineConfig({
  plugins: [
    jsDocPlugin(),
    figmaPlugin(),
  ],
});
```

See [Plugin Overview](plugins/overview.md) for a description of each official plugin.
