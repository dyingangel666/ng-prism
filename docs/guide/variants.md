# Variants

Variants are named tabs displayed above the component canvas. Each variant defines a different combination of inputs, content, and metadata.

## Variant Interface

```typescript
interface Variant {
  name: string;
  inputs?: Record<string, unknown>;
  content?: string | Record<string, string>;
  description?: string;
  meta?: Record<string, unknown>;
}
```

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

## Input Types and Controls

The TypeScript Compiler API extracts the type of each `input()` signal at build time and maps it to the appropriate control in the Controls panel:

| TypeScript type | Control |
|-----------------|---------|
| `string` | Text input |
| `number` | Number input |
| `boolean` | Checkbox |
| `'a' \| 'b' \| 'c'` (string literal union) | Select dropdown with those options |
| `object` / interface | JSON editor |
| Array | JSON editor |
| Other / unknown | Text input (cast to string) |

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
label = input('Click me');         // default: 'Click me'
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
