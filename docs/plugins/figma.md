# Figma Plugin

`@ng-prism/plugin-figma` embeds Figma designs as an interactive panel in ng-prism, enabling side-by-side visual comparison between design and implementation.

## What It Does

- Adds a **Figma** panel to the addon area
- Embeds the Figma design as an interactive iframe using the Figma Embed API
- Reads Figma URLs from component-level or variant-level `meta.figma`
- No Figma API token required — uses the public embed endpoint

## Install

```bash
npm install @ng-prism/plugin-figma
```

## Configuration

```typescript
// prism.config.ts
import { defineConfig } from '@ng-prism/core';
import { figmaPlugin } from '@ng-prism/plugin-figma';

export default defineConfig({
  plugins: [figmaPlugin()],
});
```

## Setting Figma URLs

### Component-Level URL

A single URL applies to all variants:

```typescript
@Showcase({
  title: 'Button',
  meta: {
    figma: 'https://www.figma.com/design/abc123/My-Design?node-id=1-1',
  },
  variants: [
    { name: 'Primary', inputs: { variant: 'primary' } },
    { name: 'Danger',  inputs: { variant: 'danger' } },
  ],
})
```

### Variant-Level URLs

Link each variant to a different Figma design node:

```typescript
@Showcase({
  title: 'Button',
  variants: [
    {
      name: 'Primary',
      inputs: { variant: 'primary' },
      meta: { figma: 'https://www.figma.com/design/abc123/My-Design?node-id=1-1' },
    },
    {
      name: 'Danger',
      inputs: { variant: 'danger' },
      meta: { figma: 'https://www.figma.com/design/abc123/My-Design?node-id=1-2' },
    },
  ],
})
```

When the active variant has a `meta.figma` URL, it takes precedence over the component-level URL. When there is no variant-level URL, the component-level URL is used. When neither is set, the Figma panel shows a placeholder.

## Embed Rendering

The plugin uses the Figma Embed endpoint (`https://www.figma.com/embed?embed_host=ng-prism&url=...`). No API token or authentication is needed for public Figma files. For private files, the user must be logged into Figma in their browser.

The embedded Figma viewer is fully interactive — you can navigate nodes, zoom, and inspect properties within the panel.

## Lazy Loading

`FigmaPanelComponent` is loaded lazily via `loadComponent`. This is necessary because the component imports `DomSanitizer` from `@angular/platform-browser`, which fails in the Node.js build environment. The builder only evaluates the `figmaPlugin()` factory call — the panel component is never imported at build time.
