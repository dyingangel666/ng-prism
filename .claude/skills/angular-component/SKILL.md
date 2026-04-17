---
name: angular-component
description: Creates Angular standalone components for the ng-prism library or test fixtures. Triggers on "create component", "add component", "new component". Follows ng-prism conventions with @Showcase decorator support.
---

# Angular Component Creation — ng-prism

Create Angular standalone components for the ng-prism project.

> **Context:** ng-prism is a library, not an app. Components are either:
> 1. **Internal UI components** for the styleguide app (`src/app/`)
> 2. **Test fixture components** with `@Showcase` decorator (`__fixtures__/`)

## Component Template

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'prism-example',
  standalone: true,
  imports: [],
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleComponent {
  readonly title = input.required<string>();
  readonly disabled = input(false);
  readonly clicked = output<void>();
}
```

## Showcase-Annotated Component (Test Fixture / Demo)

```typescript
import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';
import { Showcase } from 'ng-prism';

@Showcase({
  title: 'Example',
  category: 'Inputs',
  description: 'An example component',
  variants: [
    { name: 'Default', inputs: { label: 'Click me' } },
    { name: 'Disabled', inputs: { label: 'Disabled', disabled: true } },
  ],
  tags: ['form', 'action'],
})
@Component({
  selector: 'my-example',
  standalone: true,
  template: `<button [disabled]="disabled">{{ label }}</button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleComponent {
  /** Button label text */
  @Input() label = 'Button';

  /** Whether the button is disabled */
  @Input() disabled = false;

  /** Click event */
  @Output() clicked = new EventEmitter<void>();
}
```

> **Note:** Fixture components for scanner tests use `@Input()` decorator (not `input()` signal)
> because the scanner currently only supports decorator-based inputs.

## Conventions

- **Selector prefix:** `prism-` for internal UI components
- **Standalone:** Always `standalone: true` (explicit)
- **Change detection:** Always `ChangeDetectionStrategy.OnPush`
- **DI:** Use `inject()` function, not constructor injection
- **Signals:** Use `input()` / `output()` for new internal components
- **Decorator inputs:** Use `@Input()` / `@Output()` for test fixtures (scanner compat)
- **File location:**
  - Internal UI: `packages/ng-prism/src/app/components/<name>/`
  - Test fixtures: `packages/ng-prism/src/builder/scanner/__fixtures__/`
- **Imports:** Use `.js` extension in all import paths (ESM)

## Checklist

- [ ] `standalone: true` explicit
- [ ] `ChangeDetectionStrategy.OnPush`
- [ ] Correct selector prefix (`prism-` internal, custom for fixtures)
- [ ] `.js` extensions in imports
- [ ] JSDoc on `@Input()` properties (for scanner extraction)
