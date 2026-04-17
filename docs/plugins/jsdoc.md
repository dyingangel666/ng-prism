# JSDoc Plugin

`@ng-prism/plugin-jsdoc` extracts JSDoc comments from your component source files at build time and renders them as an API documentation panel in the showcase.

## What It Does

- Reads the JSDoc block above the component class and displays the class description
- Extracts `@deprecated`, `@since`, `@see`, and `@example` tags
- Renders tables for `@Input` / `@Output` documentation pulled from individual property JSDoc
- Works purely at build time — no runtime parsing of TypeScript source

## Install

```bash
npm install @ng-prism/plugin-jsdoc
```

## Configuration

```typescript
// prism.config.ts
import { defineConfig } from 'ng-prism';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';

export default defineConfig({
  plugins: [jsDocPlugin()],
});
```

The plugin adds a **Docs** tab to the addon panel for every component that has JSDoc comments.

## Supported Tags

| Tag | Rendering |
|-----|-----------|
| `@description` (or block comment) | Displayed as prose above the API table |
| `@deprecated` | Shown as a warning banner with the deprecation message |
| `@since` | Displayed as a version badge |
| `@see` | Rendered as a link list |
| `@example` | Code block with syntax highlighting |

## Component-Level JSDoc

```typescript
/**
 * The primary action button. Supports primary, secondary, and danger variants.
 *
 * @since 1.0.0
 * @deprecated Use `IconButtonComponent` for icon-only actions.
 * @see https://design.example.com/buttons
 * @example
 * <lib-button label="Save" variant="primary" />
 */
@Showcase({ title: 'Button' })
@Component({ ... })
export class ButtonComponent { ... }
```

## Input/Output Documentation

JSDoc on individual `input()` and `output()` signal declarations is extracted into the Inputs and Outputs tables:

```typescript
export class ButtonComponent {
  /** Text displayed inside the button. */
  label = input.required<string>();

  /** Visual style variant. */
  variant = input<'primary' | 'secondary' | 'danger'>('primary');

  /** Emitted when the button is clicked. */
  clicked = output<MouseEvent>();
}
```

The panel renders two tables — one for inputs and one for outputs — with columns for name, type, default value, and description.

## Class Description

The text before any tags in the JSDoc block is shown as the class description. Markdown is supported.

```typescript
/**
 * Renders a status badge with configurable color and label.
 *
 * Use inside list items, table cells, and card headers.
 * Avoid using in body text — prefer inline `<strong>` elements.
 */
```
