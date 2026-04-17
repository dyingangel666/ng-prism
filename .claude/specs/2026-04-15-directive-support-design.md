# Directive Support for ng-prism

**Date:** 2026-04-15
**Status:** Approved

## Problem

ng-prism only supports Angular components annotated with `@Showcase`. Directives (e.g., tooltip, highlight, drag) cannot be showcased because they require a host element — `ViewContainerRef.createComponent()` does not work for directives.

## Solution

Add a `host` property to `ShowcaseConfig` that defines the host element for directives. At build time, the manifest generator creates a wrapper component for each directive, applying the directive to the specified host element. The renderer treats the wrapper like any other component.

## ShowcaseConfig Changes

New properties on `ShowcaseConfig`:

```typescript
host?: string | DirectiveHost;

interface DirectiveHost {
  selector: string;
  import: { name: string; from: string };
  inputs?: Record<string, unknown>;
}
```

- **String form** — plain HTML element: `'<button class="btn">'`
- **Object form** — Angular component as host with typed import

The `content` from variants becomes the innerHTML / ng-content of the host element. Content supports Angular template syntax (the wrapper component is AOT-compiled).

For the object form, `inputs` are static values applied to the host component (not the directive).

## Scanner Changes

`extractComponentMeta()` currently only checks for `@Component`. It must also detect `@Directive`:

- Check for `@Directive` decorator when `@Component` is not found
- Extract `selector` from `@Directive({ selector: '...' })`
- Add `isDirective: boolean` to `componentMeta`
- Input/output extraction is identical (same code path)

Updated `componentMeta` type:

```typescript
componentMeta: {
  selector: string;
  standalone: boolean;
  isDirective: boolean;
}
```

Default `isDirective: false` for backward compatibility.

## Manifest Generator Changes

For each directive with `@Showcase`, the generator produces a wrapper component in the manifest file.

### String host example

```typescript
@Showcase({
  title: 'Tooltip',
  host: '<button class="btn">',
  variants: [
    { name: 'Top', inputs: { customToolTip: 'Top tooltip', tooltipPosition: 'top' }, content: 'Hover me' },
  ],
})
@Directive({ selector: '[sguiTooltip]' })
export class SguiTooltipDirective { ... }
```

Generated wrapper:

```typescript
import { Component, input } from '@angular/core';
import { SguiTooltipDirective } from 'sgui-lib';

@Component({
  standalone: true,
  imports: [SguiTooltipDirective],
  template: `<button class="btn" sguiTooltip
    [customToolTip]="customToolTip()"
    [tooltipPosition]="tooltipPosition()">
    {{ __prismContent__ }}
  </button>`,
})
class SguiTooltipDirective__PrismHost {
  customToolTip = input('');
  tooltipPosition = input<string>('bottom');
  __prismContent__ = input('');
}
```

### Object host example

```typescript
@Showcase({
  title: 'Tooltip on Button',
  host: {
    selector: 'sgui-button',
    import: { name: 'SguiButtonComponent', from: 'sgui-lib' },
    inputs: { variant: 'primary' },
  },
})
```

Generated wrapper:

```typescript
import { SguiButtonComponent } from 'sgui-lib';

@Component({
  standalone: true,
  imports: [SguiTooltipDirective, SguiButtonComponent],
  template: `<sgui-button sguiTooltip
    [customToolTip]="customToolTip()"
    variant="primary">
    {{ __prismContent__ }}
  </sgui-button>`,
})
class SguiTooltipDirective__PrismHost { ... }
```

### Wrapper naming convention

`{ClassName}__PrismHost` — e.g., `SguiTooltipDirective__PrismHost`.

### Content handling

- Variant `content` is passed as the `__prismContent__` input on the wrapper
- The wrapper renders it via interpolation (`{{ __prismContent__ }}`) for plain text
- For Angular template content: the content string is inlined in the template at build time (since the wrapper is AOT-compiled)

### Host string parsing

The generator parses the `host` string to extract:
- Element tag name (e.g., `button`)
- Attributes (e.g., `class="btn"`)

Simple regex extraction — no full HTML parser needed.

## RuntimeManifest Entry

The manifest exports the **wrapper component** as `type`, not the directive itself:

```typescript
{
  type: SguiTooltipDirective__PrismHost,
  meta: {
    className: 'SguiTooltipDirective',
    componentMeta: { selector: '[sguiTooltip]', standalone: true, isDirective: true },
    // ... inputs, outputs, showcaseConfig
  },
}
```

## Snippet Generator Changes

When `componentMeta.isDirective` is true, generate directive-style snippets:

```html
<button sguiTooltip [customToolTip]="'Tooltip text'" tooltipPosition="top">
  Hover me
</button>
```

The host element info comes from `showcaseConfig.host`. The directive selector is applied as an attribute on the host element.

## What Does NOT Change

- **Renderer** — renders wrapper components like any other component
- **Controls Panel** — sets inputs normally (wrapper forwards them)
- **Events Panel** — outputs are forwarded through the wrapper
- **Plugin Hooks** — `onComponentScanned` receives directives the same way
- **Content for regular components** — stays runtime DOM nodes (no template syntax)

## Testing Strategy

- **Scanner tests**: Add directive fixture, verify `isDirective: true`, selector extraction
- **Manifest generator tests**: Verify wrapper component code generation for both host forms
- **Snippet generator tests**: Verify directive-style snippet output
- **Integration test**: Add a directive fixture to test-workspace, verify end-to-end flow
