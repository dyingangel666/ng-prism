# ng-prism

A lightweight, Angular-native component showcase tool. Annotate your components directly with a `@Showcase` decorator — no separate story files, no parallel file tree to maintain.

## Key Features

- **Zero story files** — decorator lives on the component itself
- **Signal-native** — built for Angular 20+ with `input()` / `output()` signals
- **Plugin architecture** — extend with JSDoc, A11y, Figma, Perf panels and more
- **Custom Angular Builder** — `ng-prism:serve` and `ng-prism:build` integrate into your existing workspace
- **No iframe** — components render in the same document, so dialogs, overlays, and CDK portals work out of the box
- **TypeScript Compiler API** — inputs, outputs, and types are extracted at build time, no runtime reflection
- **Component Pages** — register free-form Angular components as styleguide pages alongside `@Showcase` components
- **URL state** — deep-linking via `?component=`, `?variant=`, `?page=`, `?view=` params

## Quick Example

```typescript
import { Showcase } from '@ng-prism/core';
import { Component, input } from '@angular/core';

@Showcase({
  title: 'Button',
  category: 'Atoms',
  description: 'The primary action button.',
  variants: [
    { name: 'Primary', inputs: { label: 'Save', variant: 'primary' } },
    { name: 'Danger',  inputs: { label: 'Delete', variant: 'danger' } },
  ],
})
@Component({
  selector: 'lib-button',
  standalone: true,
  template: `<button [class]="variant()">{{ label() }}</button>`,
})
export class ButtonComponent {
  label   = input.required<string>();
  variant = input<'primary' | 'danger'>('primary');
}
```

Run the showcase:

```bash
ng run my-lib:prism
```

## Getting Started

- [Installation & Setup](guide/installation.md) — add ng-prism to an existing workspace in two minutes
- [Your First Showcase](guide/first-showcase.md) — annotate a component step by step
- [Configuration](guide/configuration.md) — `prism.config.ts` reference

## Going Further

- [Plugins](plugins/overview.md) — extend the UI with official and custom plugins
- [Component Pages](guide/component-pages.md) — free-form styleguide pages
- [Writing a Plugin](plugins/writing-plugins.md) — build-time hooks + runtime panels
- [API Reference](api/showcase-config.md) — complete type documentation
