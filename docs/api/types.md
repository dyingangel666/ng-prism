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

| Field | Description |
|-------|-------------|
| `className` | TypeScript class name |
| `filePath` | Absolute path to the source file |
| `showcaseConfig` | The `ShowcaseConfig` passed to `@Showcase` |
| `inputs` | Array of extracted `InputMeta` for each `input()` signal |
| `outputs` | Array of extracted `OutputMeta` for each `output()` signal |
| `componentMeta.selector` | Angular element selector |
| `componentMeta.standalone` | Whether the component is standalone |
| `componentMeta.isDirective` | `true` if decorated with `@Directive`, `false` for `@Component` |
| `importPath` | Entry point import path (e.g. `'my-lib/atoms'` for secondary entry points) |
| `meta` | Plugin-injected metadata |

---

## InputMeta

Describes a single `input()` signal as extracted by the scanner.

```typescript
interface InputMeta {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'union' | 'array' | 'object' | 'unknown';
  rawType?: string;
  values?: string[];
  defaultValue?: unknown;
  required: boolean;
  doc?: string;
}
```

| Field | Description |
|-------|-------------|
| `name` | Property name |
| `type` | Normalized type category used to select a control |
| `rawType` | Raw TypeScript type string (e.g. `'primary' \| 'danger'`) |
| `values` | For union types: the individual member values |
| `defaultValue` | Value from `input(defaultValue)` |
| `required` | `true` if declared with `input.required<T>()` |
| `doc` | JSDoc comment from the property (populated by `@ng-prism/plugin-jsdoc`) |

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
})
```

---

## NavigationItem

Discriminated union used in `PrismNavigationService.categoryTree()` and `PrismNavigationService.activeItem`.

```typescript
type NavigationItem =
  | { kind: 'component'; data: RuntimeComponent }
  | { kind: 'page';      data: StyleguidePage };
```

---

## Variant

```typescript
interface Variant {
  name: string;
  inputs?: Record<string, unknown>;
  content?: string | Record<string, string>;
  description?: string;
  meta?: Record<string, unknown>;
}
```

| Field | Description |
|-------|-------------|
| `name` | Tab label |
| `inputs` | Key-value map of input signal names to values |
| `content` | Content projected into `<ng-content>` — string for single slot, record for named slots |
| `description` | Optional description rendered below the variant tab |
| `meta` | Arbitrary plugin metadata (e.g. `{ figma: 'url' }`) |

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

## PrismManifest

The build-time manifest written to disk by the builder. Contains JSON-serializable data only — no class references.

```typescript
interface PrismManifest {
  components: ScannedComponent[];
  pages?: StyleguidePage[];
}
```
