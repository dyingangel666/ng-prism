# Your First Showcase

This guide walks through annotating an existing Angular component with `@Showcase` and seeing it appear in the browser.

## Start with a Component

Assume you have this button component in your library:

```typescript
// packages/my-lib/src/lib/button/button.component.ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'lib-button',
  standalone: true,
  template: `
    <button [class]="'btn btn--' + variant()">
      {{ label() }}
    </button>
  `,
})
export class ButtonComponent {
  label   = input.required<string>();
  variant = input<'primary' | 'secondary' | 'danger'>('primary');
  disabled = input(false);
}
```

## Add the Decorator

Import `Showcase` from `ng-prism` and add the decorator above `@Component`:

```typescript
import { Component, input } from '@angular/core';
import { Showcase } from '@ng-prism/core';  // ← add this

@Showcase({
  title: 'Button',
  category: 'Atoms',
  description: 'The primary action element. Use for form submissions and navigation triggers.',
  variants: [
    {
      name: 'Primary',
      inputs: { label: 'Save', variant: 'primary' },
    },
    {
      name: 'Secondary',
      inputs: { label: 'Cancel', variant: 'secondary' },
    },
    {
      name: 'Danger',
      inputs: { label: 'Delete', variant: 'danger' },
    },
  ],
})
@Component({
  selector: 'lib-button',
  standalone: true,
  template: `...`,
})
export class ButtonComponent {
  label    = input.required<string>();
  variant  = input<'primary' | 'secondary' | 'danger'>('primary');
  disabled = input(false);
}
```

## What Each Field Does

| Field | Effect |
|-------|--------|
| `title` | Display name in the sidebar and component header |
| `category` | Groups this component in the sidebar. Omit to land in "Uncategorized". |
| `description` | Shown below the component header. Supports Markdown. |
| `variants` | Named tabs above the rendered component. Each tab sets different `inputs`. |

## Make Sure It Is Exported

The scanner follows your library's public API. The component must be exported from your `index.ts`:

```typescript
// packages/my-lib/src/index.ts
export { ButtonComponent } from './lib/button/button.component.js';
```

## Run the Showcase

```bash
ng run my-lib:prism
```

The scanner reads your `index.ts`, finds `ButtonComponent` (because it has `@Showcase`), extracts the inputs and their types, and generates a runtime manifest. The showcase opens in the browser.

You will see:

- "Atoms" category in the sidebar with "Button" inside
- Three variant tabs: Primary, Secondary, Danger
- A **Controls** panel listing `label`, `variant`, and `disabled` with appropriate input types
- A **`</> Code`** toggle that shows a live code snippet reflecting current input values

## Next Steps

- Learn about all `@Showcase` options in the [@Showcase Decorator](guide/showcase-decorator.md) reference
- Understand how input types map to controls in [Variants](guide/variants.md)
- Add content projection with the `content` field — see [Content Projection](guide/content-projection.md)
