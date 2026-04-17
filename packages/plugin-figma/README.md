# @ng-prism/plugin-figma

Figma design embed panel for [@ng-prism/core](https://github.com/dyingangel666/ng-prism). Displays Figma designs as interactive iframes directly in your component styleguide.

> **Full documentation:** [ng-prism Docs — Figma Plugin](https://dyingangel666.github.io/ng-prism/#/plugins/figma)

Uses Figma's official embed endpoint — no API token required. Works with any publicly shared Figma file.

## Installation

```bash
npm install @ng-prism/plugin-figma
```

### Peer Dependencies

| Package | Version |
|---|---|
| `@ng-prism/core` | `>=21.0.0` |
| `@angular/core` | `>=20.0.0` |

## Usage

### 1. Register the plugin

Add `figmaPlugin()` to your `ng-prism.config.ts`:

```typescript
import { defineConfig } from '@ng-prism/core/config';
import { figmaPlugin } from '@ng-prism/plugin-figma';

export default defineConfig({
  plugins: [figmaPlugin()],
});
```

### 2. Link Figma designs to components

Add a `figma` key to the `meta` field of your `@Showcase` decorator:

```typescript
import { Component, input, output } from '@angular/core';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Button',
  category: 'Inputs',
  meta: {
    figma: 'https://www.figma.com/file/abc123/my-design',
  },
})
@Component({
  selector: 'my-button',
  standalone: true,
  template: `<button>{{ label() }}</button>`,
})
export class ButtonComponent {
  label = input('Button');
}
```

A **Figma** tab appears in the panel area (next to Controls and Events). The tab displays an interactive Figma viewer with zoom and navigation support.

Components without a `meta.figma` URL show a placeholder message instead.

### Supported URL formats

Any publicly shared Figma URL works:

- `https://www.figma.com/file/<id>/<name>` — full file
- `https://www.figma.com/file/<id>/<name>?node-id=<node>` — specific frame/component
- `https://www.figma.com/design/<id>/<name>` — new Figma URL format

## How it works

The plugin registers a single panel (`FigmaPanelComponent`) that:

1. Reads `meta.figma` from the active component's `@Showcase` config
2. Constructs a Figma embed URL: `https://www.figma.com/embed?embed_host=ng-prism&url=<encoded-url>`
3. Renders the embed in a sandboxed `<iframe>` with `allowfullscreen`
4. Reactively updates when navigating between components (Angular Signals)

No build-time hooks — the plugin is purely runtime. The panel component is **lazy-loaded**
via `loadComponent` to avoid pulling in browser-only Angular dependencies (`DomSanitizer`)
at config-load time in Node.js.

## API

### `figmaPlugin()`

Factory function that returns an `NgPrismPlugin`. Zero-config — no arguments needed.

```typescript
import { figmaPlugin } from '@ng-prism/plugin-figma';

const plugin = figmaPlugin();
// plugin.name === '@ng-prism/plugin-figma'
// plugin.panels === [{ id: 'figma', label: 'Figma', loadComponent: () => ... }]
```

### `FigmaPanelComponent`

The Angular component rendering the Figma iframe. Lazy-loaded by the plugin — typically
you don't need to import it directly. The type is exported for advanced use cases.

## License

MIT
