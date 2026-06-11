# Type Reference

All types exported from `ng-prism` or `ng-prism/plugin`.

---

## RuntimeManifest

The in-memory manifest produced after the builder scan and loaded at app bootstrap.

```typescript
interface RuntimeManifest {
  components: RuntimeComponent[];
  pages?: StyleguidePage[];
}
```

---

## RuntimeComponent

A single entry in the runtime manifest, combining scan metadata with the actual Angular class reference.

```typescript
interface RuntimeComponent {
  meta: ScannedComponent;
  type: Type<unknown>;
}
```

---

## ScannedComponent

The raw data extracted from a `@Showcase`-annotated component by the TypeScript Compiler API scanner.

```typescript
interface ScannedComponent {
  className: string;
  filePath: string;
  showcaseConfig: ShowcaseConfig;
  inputs: InputMeta[];
  outputs: OutputMeta[];
  componentMeta: {
    selector: string;
    standalone: boolean;
    isDirective: boolean;
  };
  importPath?: string;
  meta?: Record<string, unknown>;
}
```

| Field                       | Description                                                                |
| --------------------------- | -------------------------------------------------------------------------- |
| `className`                 | TypeScript class name                                                      |
| `filePath`                  | Absolute path to the source file                                           |
| `showcaseConfig`            | The `ShowcaseConfig` passed to `@Showcase`                                 |
| `inputs`                    | Array of extracted `InputMeta` for each `input()` signal                   |
| `outputs`                   | Array of extracted `OutputMeta` for each `output()` signal                 |
| `componentMeta.selector`    | Angular element selector                                                   |
| `componentMeta.standalone`  | Whether the component is standalone                                        |
| `componentMeta.isDirective` | `true` if decorated with `@Directive`, `false` for `@Component`            |
| `importPath`                | Entry point import path (e.g. `'my-lib/atoms'` for secondary entry points) |
| `meta`                      | Plugin-injected metadata                                                   |

---

## InputMeta

Describes a single `input()` signal as extracted by the scanner.

```typescript
interface InputMeta {
  name: string;
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'union'
    | 'array'
    | 'object'
    | 'unknown';
  rawType?: string;
  values?: string[];
  defaultValue?: unknown;
  required: boolean;
  doc?: string;
}
```

| Field          | Description                                                             |
| -------------- | ----------------------------------------------------------------------- |
| `name`         | Property name                                                           |
| `type`         | Normalized type category used to select a control                       |
| `rawType`      | Raw TypeScript type string (e.g. `'primary' \| 'danger'`)               |
| `values`       | For union types: the individual member values                           |
| `defaultValue` | Value from `input(defaultValue)`                                        |
| `required`     | `true` if declared with `input.required<T>()`                           |
| `doc`          | JSDoc comment from the property (populated by `@ng-prism/plugin-jsdoc`) |

---

## OutputMeta

Describes a single `output()` signal.

```typescript
interface OutputMeta {
  name: string;
  doc?: string;
}
```

---

## PanelDefinition

See [NgPrismPlugin — PanelDefinition](api/ng-prism-plugin.md#paneldefinition).

---

## ControlDefinition

See [NgPrismPlugin — ControlDefinition](api/ng-prism-plugin.md#controldefinition).

---

## StyleguidePage

Discriminated union for sidebar pages.

```typescript
type StyleguidePage = CustomPage | ComponentPage;
```

### CustomPage

A data-only page processed through the build pipeline. Requires a plugin panel to render `data`.

```typescript
interface CustomPage {
  type: 'custom';
  title: string;
  category?: string;
  categoryOrder?: number;
  order?: number;
  data: Record<string, unknown>;
}
```

### ComponentPage

A free-form Angular component rendered as a sidebar page. Registered via `providePrism` — not through the build pipeline.

```typescript
interface ComponentPage {
  type: 'component';
  title: string;
  category?: string;
  categoryOrder?: number;
  order?: number;
  component: Type<unknown>;
}
```

Use the `componentPage()` helper to create entries with TypeScript type safety:

```typescript
import { componentPage } from '@ng-prism/core';

componentPage({
  title: 'Button Patterns',
  category: 'Atoms',
  order: 99,
  component: ButtonPatternsPageComponent,
});
```

---

## NavigationItem

Discriminated union used in `PrismNavigationService.categoryTree()` and `PrismNavigationService.activeItem`.

```typescript
type NavigationItem =
  | { kind: 'component'; data: RuntimeComponent }
  | { kind: 'page'; data: StyleguidePage };
```

---

## Variant

```typescript
interface Variant<T = unknown> {
  name: string;
  inputs?: Partial<InputsOf<T>>;
  content?: string | Record<string, string>;
  description?: string;
  meta?: Record<string, unknown>;
  bg?: CanvasBg;
  canvasLayout?: CanvasLayout;
}
```

The optional type parameter `T` is the component class. When provided (via `@Showcase<MyComponent>({...})`), `inputs` becomes `Partial<InputsOf<MyComponent>>` and the editor checks both keys and values against the component's signal inputs. When omitted, `T` defaults to `unknown` and `inputs` falls back to `Record<string, unknown>` — fully backwards compatible.

| Field          | Description                                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`         | Tab label                                                                                                                                                                                                                         |
| `inputs`       | Key-value map of input signal names to values. Typed via [`InputsOf<T>`](#inputsof) when a component generic is supplied to `@Showcase`.                                                                                          |
| `content`      | Content projected into `<ng-content>` — string for single slot, record for named slots                                                                                                                                            |
| `description`  | Optional description rendered below the variant tab                                                                                                                                                                               |
| `meta`         | Arbitrary plugin metadata (e.g. `{ figma: 'url' }`)                                                                                                                                                                               |
| `bg`           | Recommended canvas background. Overrides `ShowcaseConfig.bg`. One of `dots`, `plain`, `light`, `dark`, `checker`. See [Per-Variant Background](guide/variants.md#per-variant-background).                                         |
| `canvasLayout` | Canvas layout mode for this variant. Overrides `ShowcaseConfig.canvasLayout`. One of `fit`, `stretch`. See [Per-Variant Canvas Layout](guide/variants.md#per-variant-canvas-layout) and the [`CanvasLayout`](#canvaslayout) type. |

---

## InputsOf

Utility type that maps a component class to a record of its signal-input properties, unwrapped to their write-side value type.

```typescript
type InputsOf<T>;
```

**Selection rules**

- Picks fields declared as `input()`, `input.required()`, `model()`, or `input(..., { transform })`.
- Excludes `output()` and any other class members.
- Unwraps each signal to its write-side type — for transform inputs (e.g. `input(false, { transform: booleanAttribute })`) this is the **source** type (`string | boolean | ''`), not the parsed value type. That mirrors what callers actually write in `inputs: {...}`.
- When `T` is `unknown` (the default), evaluates to `Record<string, unknown>`.

**Example**

```typescript
import { booleanAttribute, input, model, output } from '@angular/core';

class FooComponent {
  label = input.required<string>();
  count = input<number>(0);
  active = input(false, { transform: booleanAttribute });
  selected = model<string>('');
  closed = output<void>();
}

// InputsOf<FooComponent> ≡
// {
//   label: string;
//   count: number;
//   active: string | boolean | '';
//   selected: string;
// }
```

`closed` is excluded because `output()` is not a signal input. `Variant<FooComponent>['inputs']` is `Partial<InputsOf<FooComponent>>`, so any subset of these keys is valid in a variant.

---

## DirectiveHost

```typescript
interface DirectiveHost {
  selector: string;
  import: { name: string; from: string };
  inputs?: Record<string, unknown>;
}
```

Used in `ShowcaseConfig.host` for directive showcases that require an Angular component as the host element. See [Directive Hosting](guide/directive-hosting.md).

---

## CanvasBg

Canvas background mode used by `ShowcaseConfig.bg` and `Variant.bg`.

```typescript
type CanvasBg = 'dots' | 'plain' | 'light' | 'dark' | 'checker';
```

| Value     | Visual                                                        |
| --------- | ------------------------------------------------------------- |
| `dots`    | Default — light dot grid on neutral surface                   |
| `plain`   | Solid neutral surface, no pattern                             |
| `light`   | Light surface tuned for components designed for light themes  |
| `dark`    | Dark surface tuned for components designed for dark themes    |
| `checker` | Checkerboard pattern, useful for components with transparency |

---

## CanvasLayout

Wrapper sizing mode used by `ShowcaseConfig.canvasLayout` and `Variant.canvasLayout`. Controls how `.demo-wrap` (the inner wrapper of the canvas stage) sizes itself around the rendered component.

```typescript
type CanvasLayout = 'fit' | 'stretch';
```

| Value     | Wrapper styles                                      | When to use                                                                                                                                                    |
| --------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fit`     | `display: inline-block` — shrinks to component size | Default. The vast majority of components — buttons, badges, cards, alerts — render at their intrinsic size and are centered by the canvas stage flex.          |
| `stretch` | `display: block; width: 100%; max-width: 800px`     | Components without intrinsic width (horizontal dividers via `border-bottom`) or that opt into filling their container (full-width buttons with `width: 100%`). |

The variant-level value always wins over the component-level value; the default is `'fit'`.

---

## ComponentStatus

Optional migration / maturity badge used by `ShowcaseConfig.status`.

```typescript
type ComponentStatus = 'stable' | 'beta' | 'wip' | 'deprecated';
```

| Value        | Meaning                                   |
| ------------ | ----------------------------------------- |
| `stable`     | Migrated and production-ready             |
| `beta`       | Functional, but API may still change      |
| `wip`        | Work in progress, migration ongoing       |
| `deprecated` | Legacy component — do not use in new code |

When `status` is omitted, no indicator renders. See [`ShowcaseConfig.status`](api/showcase-config.md#status) for the full UI behavior in sidebar and header.

---

## PrismManifest

The build-time manifest written to disk by the builder. Contains JSON-serializable data only — no class references.

```typescript
interface PrismManifest {
  components: ScannedComponent[];
  pages?: StyleguidePage[];
}
```
