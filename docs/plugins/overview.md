# Plugin Overview

Plugins extend ng-prism with additional panels, controls, and build-time data extraction. They are registered in your `prism.config.ts` and activated automatically during both the build pipeline and at runtime.

## What Plugins Can Do

| Capability | Description |
|------------|-------------|
| `panels` | Add new tabs to the addon panel area (bottom / right) or the view toolbar |
| `controls` | Register custom input controls for specific TypeScript types |
| `wrapComponent` | Wrap each rendered component with an Angular component (e.g. for context providers or overlay hosts) |
| `onComponentScanned` | Enrich `ScannedComponent` data at build time (e.g. extract JSDoc, inject external metadata) |
| `onPageScanned` | Enrich `StyleguidePage` data at build time |
| `onManifestReady` | Transform the final manifest before it is written to disk |

## Installing Plugins

Install the plugin package and register it in your config:

```typescript
// prism.config.ts
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

Plugins run in registration order during build-time hooks and are activated in order at runtime.

## Official Plugins

| Package | Description |
|---------|-------------|
| [`@ng-prism/plugin-jsdoc`](plugins/jsdoc.md) | Extracts JSDoc comments from source and renders an API documentation panel |
| [`@ng-prism/plugin-figma`](plugins/figma.md) | Embeds Figma designs as an interactive panel for visual comparison |
| [`@ng-prism/plugin-box-model`](plugins/box-model.md) | Overlays CSS box model dimensions on the rendered component |
| [`@ng-prism/plugin-perf`](plugins/perf.md) | Profiles render and re-render timing via the Performance API |

> **Note:** Accessibility auditing (axe-core, keyboard navigation, ARIA tree, screen reader simulation) is built into ng-prism core. No plugin needed.

## Writing Your Own Plugin

See [Writing a Plugin](plugins/writing-plugins.md) for a complete walkthrough of the `NgPrismPlugin` interface, build-time hooks, and runtime panel registration.
