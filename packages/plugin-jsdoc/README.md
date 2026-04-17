# @ng-prism/plugin-jsdoc

API documentation plugin for [@ng-prism/core](https://github.com/dyingangel666/ng-prism). Extracts JSDoc comments from component source code at build time and renders an interactive API panel.

> **Full documentation:** [ng-prism Docs — JSDoc Plugin](https://dyingangel666.github.io/ng-prism/#/plugins/jsdoc)

## Installation

```bash
npm install @ng-prism/plugin-jsdoc
```

### Peer Dependencies

| Package | Version |
|---|---|
| `@ng-prism/core` | `>=21.0.0` |
| `@angular/core` | `>=20.0.0` |
| `typescript` | `>=5.5.0` |
| `highlight.js` | `>=11.0.0` |
| `ngx-highlightjs` | `>=14.0.0` |

## Setup

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core/config';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';

export default defineConfig({
  plugins: [jsDocPlugin()],
});
```

## What It Does

- Extracts class-level JSDoc description
- Extracts per-input and per-output JSDoc comments
- Renders an **API** panel with:
  - Component description
  - Inputs table (name, type, default, description)
  - Outputs table (name, description)
  - Supported tags: `@deprecated`, `@since`, `@see`, `@example`

## Example

```typescript
/**
 * A configurable button for primary user actions.
 *
 * @since 2.0.0
 * @see https://design-system.example.com/button
 */
@Showcase({ title: 'Button', category: 'Atoms' })
@Component({ selector: 'my-button', ... })
export class ButtonComponent {
  /** Visual style variant of the button. */
  variant = input<'primary' | 'secondary'>('primary');

  /** Emitted when the button is clicked. */
  clicked = output<void>();
}
```

The API panel shows the class description, a table of inputs with their types and JSDoc, and all supported tags.

## How It Works

**Build time:** The `onComponentScanned` hook uses `ts.createSourceFile` with `setParentNodes: true` and `ts.getJSDocTags()` to extract JSDoc data. The extracted data is injected into `showcaseConfig.meta.jsdoc`.

**Runtime:** The `JsDocPanelComponent` reads the metadata and renders the documentation. The component is lazy-loaded via `loadComponent`.

## License

MIT
