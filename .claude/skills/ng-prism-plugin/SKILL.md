---
name: ng-prism-plugin
description: Creates ng-prism plugins following the NgPrismPlugin interface. Triggers on "create plugin", "new plugin", "add plugin", "plugin for".
---

# ng-prism Plugin Creation Guide

Create plugins that extend ng-prism via the `NgPrismPlugin` interface.

## Plugin Interface

```typescript
interface NgPrismPlugin {
  name: string;

  // Build-time hooks (run in Node.js during scanning)
  onComponentScanned?: (component: ScannedComponent) => ScannedComponent | void | Promise<ScannedComponent | void>;
  onManifestReady?: (manifest: PrismManifest) => PrismManifest | void | Promise<PrismManifest | void>;

  // Runtime contributions (embedded in the Prism app)
  panels?: PanelDefinition[];
  controls?: ControlDefinition[];
  wrapComponent?: Type<unknown>;
}
```

## Plugin Template

```typescript
// packages/plugin-example/src/lib/example.plugin.ts
import type { NgPrismPlugin, ScannedComponent, PrismManifest } from 'ng-prism/plugin';

export interface ExamplePluginOptions {
  enabled?: boolean;
}

export function examplePlugin(options: ExamplePluginOptions = {}): NgPrismPlugin {
  return {
    name: 'example',

    onComponentScanned(component: ScannedComponent) {
      // Modify or enrich component metadata
      component.meta = {
        ...component.meta,
        example: { processed: true },
      };
      return component;
    },

    onManifestReady(manifest: PrismManifest) {
      // Post-process the full manifest
      console.log(`[example] Scanned ${manifest.components.length} components`);
      return manifest;
    },
  };
}
```

## Plugin Registration

```typescript
// ng-prism.config.ts
import { defineConfig } from 'ng-prism/config';
import { examplePlugin } from '@ng-prism/plugin-example';

export default defineConfig({
  plugins: [examplePlugin({ enabled: true })],
  appProviders: [],
});
```

## Plugin with Panels

```typescript
import type { NgPrismPlugin, PanelDefinition, InputMeta } from 'ng-prism/plugin';
import { Type } from '@angular/core';

export function a11yPlugin(): NgPrismPlugin {
  return {
    name: 'a11y',

    panels: [
      {
        id: 'a11y',
        label: 'Accessibility',
        component: A11yPanelComponent, // Angular standalone component
        icon: 'accessibility',
        position: 'bottom',
      },
    ],
  };
}
```

## Plugin with Custom Controls

```typescript
export function colorPlugin(): NgPrismPlugin {
  return {
    name: 'color-controls',

    controls: [
      {
        matchType: (input: InputMeta) =>
          input.type === 'string' && (input.name.includes('color') || input.name.includes('Color')),
        component: ColorPickerControlComponent,
      },
    ],
  };
}
```

## Package Structure (official plugins)

```
packages/plugin-example/
  src/
    lib/
      example.plugin.ts
      example.plugin.spec.ts
      components/          # Angular components for panels/controls
    index.ts
  package.json             # name: @ng-prism/plugin-example
  tsconfig.lib.json
  jest.config.cts
```

## Conventions

- Plugin factory function returns `NgPrismPlugin` (Vite-style)
- Options object as parameter with sensible defaults
- `name` must be unique — used for debugging and conflict detection
- Build-time hooks are async-compatible (can return Promise)
- Runtime components (panels, controls, wrapComponent) must be standalone
- Official plugins: `packages/plugin-*/` → npm: `@ng-prism/plugin-*`

## Checklist

- [ ] Plugin factory function with options parameter
- [ ] Unique `name` property
- [ ] Build-time hooks return modified object or void
- [ ] Runtime components are standalone Angular components
- [ ] Exported from package index
- [ ] Tests for hook behavior
- [ ] Registered via `defineConfig({ plugins: [...] })`
