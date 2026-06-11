# Variants

Variants are named tabs displayed above the component canvas. Each variant defines a different combination of inputs, content, and metadata.

## Variant Interface

```typescript
interface Variant<T = unknown> {
  name: string;
  inputs?: Partial<InputsOf<T>>;
  content?: string | Record<string, string>;
  description?: string;
  meta?: Record<string, unknown>;
  bg?: 'dots' | 'plain' | 'light' | 'dark' | 'checker';
  canvasLayout?: 'fit' | 'stretch';
}
```

`T` is the component class — supply it via `@Showcase<MyComponent>({...})` to type the `inputs` against the component's signal inputs. Without it, `inputs` accepts any `Record<string, unknown>`. See [Type-safe inputs](#type-safe-inputs) below.

## Defining Variants

```typescript
@Showcase({
  title: 'Alert',
  variants: [
    {
      name: 'Info',
      inputs: { message: 'Operation completed.', severity: 'info' },
      description: 'Used for neutral informational messages.',
    },
    {
      name: 'Error',
      inputs: { message: 'Something went wrong.', severity: 'error' },
      description: 'Draws immediate attention to failures.',
    },
  ],
})
```

When no variants are defined, a single unlabeled canvas is shown and all controls start at their default values.

## Type-safe inputs

Pass the component class as a type argument to `@Showcase` to get autocomplete and compile-time type-checking on every variant's `inputs`:

```typescript
@Showcase<ButtonComponent>({
  title: 'Button',
  variants: [
    { name: 'Primary', inputs: { label: 'Save',  variant: 'primary' } },
    { name: 'Danger',  inputs: { label: 'Delete', variant: 'danger'  } },
  ],
})
@Component({ ... })
export class ButtonComponent {
  label   = input.required<string>();
  variant = input<'primary' | 'secondary' | 'danger'>('primary');
  closed  = output<void>();
}
```

The compiler now enforces three things:

1. **Keys** — only declared signal inputs (`label`, `variant`) are accepted. A typo like `inputs: { lable: 'Save' }` fails to compile.
2. **Values** — each value must satisfy the input's declared type. `variant: 'tertiary'` would be rejected because the union does not include it.
3. **Output exclusion** — `output()` signals (e.g. `closed`) are not accepted as inputs.

For transform inputs (e.g. `input(false, { transform: booleanAttribute })`), the accepted type is the **source** type that the transform reads, not the parsed value — so you can write what you would in an Angular template.

Without the generic parameter, `inputs` falls back to `Record<string, unknown>` and behaves exactly like before. The change is purely additive and opt-in — no existing call site needs to be updated.

See [`InputsOf<T>`](api/types.md#inputsof) for the type mapping rules.

## Input Types and Controls

The TypeScript Compiler API extracts the type of each `input()` signal at build time and maps it to the appropriate control in the Controls panel:

| TypeScript type                            | Control                            |
| ------------------------------------------ | ---------------------------------- |
| `string`                                   | Text input                         |
| `number`                                   | Number input                       |
| `boolean`                                  | Checkbox                           |
| `'a' \| 'b' \| 'c'` (string literal union) | Select dropdown with those options |
| `object` / interface                       | JSON editor                        |
| Array                                      | JSON editor                        |
| Other / unknown                            | Text input (cast to string)        |

### Example

```typescript
@Component({ ... })
export class TagComponent {
  label    = input.required<string>();
  count    = input<number>(0);
  active   = input(false);
  size     = input<'sm' | 'md' | 'lg'>('md');
  style    = input<Record<string, string>>({});
}
```

The Controls panel renders:

- `label` → text input (required, no default)
- `count` → number input (default `0`)
- `active` → checkbox (default `false`)
- `size` → select with options `sm`, `md`, `lg` (default `md`)
- `style` → JSON editor (default `{}`)

## Default Values

Default values are read from the `input()` call:

```typescript
label = input('Click me'); // default: 'Click me'
variant = input<'primary'>('primary'); // default: 'primary'
```

When a variant does not specify a value for an input, the control falls back to the input's declared default. If no default exists and the input is not required, the value is `undefined` (omitted from the rendered snippet).

## Explicit Keys Behavior

When you define `inputs` on a variant, only the keys you list are overridden. Other inputs keep their defaults or any value set via the Controls panel — they are not reset unless you navigate to a different variant.

```typescript
variants: [
  { name: 'Large', inputs: { size: 'lg' } },
  // 'label' keeps its default when this variant is selected
],
```

If you want a value to be explicitly absent for a specific variant (overriding a previous user change), set it to `undefined` in the variant inputs:

```typescript
variants: [
  { name: 'No Icon', inputs: { icon: undefined } },
],
```

## Per-Variant Content

Use `content` on a variant to project HTML into the component's `<ng-content>`:

```typescript
variants: [
  {
    name: 'With Icon',
    content: '<svg>...</svg> Save',
  },
  {
    name: 'Text Only',
    content: 'Save',
  },
],
```

For multi-slot content projection, use a record. See [Content Projection](guide/content-projection.md).

## Per-Variant Plugin Metadata

Plugins like Figma support variant-level metadata to link each variant to a different design node:

```typescript
variants: [
  {
    name: 'Primary',
    inputs: { variant: 'primary' },
    meta: { figma: 'https://www.figma.com/design/abc?node-id=1-1' },
  },
  {
    name: 'Danger',
    inputs: { variant: 'danger' },
    meta: { figma: 'https://www.figma.com/design/abc?node-id=1-2' },
  },
],
```

## Per-Variant Background

A variant can declare a recommended canvas background. When the user selects the variant, the canvas switches to that background automatically — overriding both `ShowcaseConfig.bg` and the user's global default. The override is transient: the user can change it via the canvas toolbar, but switching variants resets to the recommendation.

```typescript
@Showcase({
  title: 'Button',
  variants: [
    { name: 'On light', inputs: { variant: 'primary' }, bg: 'light' },
    { name: 'On dark',  inputs: { variant: 'primary' }, bg: 'dark'  },
  ],
})
```

Accepted values: `'dots'`, `'plain'`, `'light'`, `'dark'`, `'checker'`.

A small gold star appears next to the matching background button in the canvas toolbar, signalling which background is recommended for the active variant.

See [Showcase Decorator — bg](guide/showcase-decorator.md#bg) for the component-level fallback and the full override-reset behavior.

## Per-Variant Canvas Layout

A variant can override the wrapper layout used in the canvas. The default is `'fit'` — the wrapper shrinks to the component's intrinsic size and the canvas stage centers it via flexbox. Switch to `'stretch'` for variants where you need a real container width — e.g. a horizontal divider (no intrinsic width because it's just a `border-bottom`) or a "full width" button variant (`width: 100%` only resolves against a sized parent).

```typescript
@Showcase({
  title: 'Button',
  variants: [
    { name: 'Default',    inputs: { variant: 'primary' } },
    { name: 'Full width', inputs: { variant: 'primary', fullWidth: true }, canvasLayout: 'stretch' },
  ],
})
```

```typescript
@Showcase({
  title: 'Divider',
  // Set at component level — most variants need stretch.
  canvasLayout: 'stretch',
  variants: [
    { name: 'Horizontal', inputs: { orientation: 'horizontal' } },
    // Vertical dividers are intrinsic-sized — opt back into 'fit'.
    { name: 'Vertical',   inputs: { orientation: 'vertical' }, canvasLayout: 'fit' },
  ],
})
```

In `'stretch'` mode `.demo-wrap` becomes `display: block; width: 100%; max-width: 800px`, giving children a real container width to size against. The variant-level value always wins over the component-level value.

See [Showcase Decorator — canvasLayout](guide/showcase-decorator.md#canvaslayout) for the component-level setting and the [`CanvasLayout`](api/types.md#canvaslayout) type for the wrapper styles applied in each mode.
