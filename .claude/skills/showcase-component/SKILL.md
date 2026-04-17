---
name: showcase-component
description: Annotates an Angular component with the @Showcase decorator for ng-prism discovery. Triggers on "add showcase", "showcase this", "make showcaseable", "annotate component".
---

# @Showcase Decorator — Annotation Guide

Add `@Showcase` to Angular components to make them discoverable by ng-prism.

## Basic Usage

```typescript
import { Showcase } from 'ng-prism';

@Showcase({
  title: 'Button',
  category: 'Inputs',
})
@Component({ ... })
export class ButtonComponent { }
```

## Full Configuration

```typescript
@Showcase({
  // Required
  title: 'Button',

  // Optional — grouping in sidebar
  category: 'Inputs',

  // Optional — Markdown supported
  description: 'A versatile button component with multiple variants.',

  // Optional — search/filter tags
  tags: ['form', 'action', 'interactive'],

  // Optional — predefined demo tabs
  variants: [
    {
      name: 'Primary',
      inputs: { variant: 'primary', label: 'Click me' },
      description: 'Default primary button',
    },
    {
      name: 'Danger',
      inputs: { variant: 'danger', label: 'Delete', disabled: false },
    },
  ],

  // Optional — scoped providers (e.g. for dialog/overlay services)
  providers: [DialogService],
})
```

## ShowcaseConfig Interface

```typescript
interface ShowcaseConfig {
  title: string;           // Display name in the UI
  description?: string;    // Markdown description
  category?: string;       // Sidebar grouping
  variants?: Variant[];    // Predefined demo tabs
  tags?: string[];         // Search/filter tags
  providers?: Provider[];  // Scoped DI providers (runtime-only, not serialized)
}

interface Variant {
  name: string;                        // Tab label
  inputs?: Record<string, unknown>;    // @Input() values
  description?: string;                // Variant description
}
```

## Rules

- `@Showcase` must come before `@Component` in decorator order
- `title` is the only required field
- `providers` are runtime-only — they are NOT extracted by the scanner
- `variants.inputs` keys must match `@Input()` property names
- Components must be exported from the library's `public-api.ts` to be discovered

## Scanner Compatibility

The scanner extracts metadata statically via TypeScript Compiler API. This means:

- Only **literal values** are extracted (strings, numbers, booleans, arrays, objects)
- **Variables, function calls, spread operators** in the config will be ignored
- `providers` is always skipped (not statically serializable)

```typescript
// Good — scanner can extract this
@Showcase({
  title: 'Button',
  variants: [{ name: 'Primary', inputs: { variant: 'primary' } }],
})

// Bad — scanner cannot extract variable references
const VARIANTS = [{ name: 'Primary' }];
@Showcase({
  title: 'Button',
  variants: VARIANTS,  // will be undefined in manifest
})
```

## Checklist

- [ ] `title` is set
- [ ] `category` groups the component logically
- [ ] `variants` cover the main use cases
- [ ] `variants.inputs` keys match actual `@Input()` names
- [ ] All config values are literals (no variable references)
- [ ] Component is exported from `public-api.ts`
