# How the Scanner Works

The ng-prism scanner uses the TypeScript Compiler API to extract `@Showcase` metadata, component structure, and input/output types from library source files at build time, with no runtime reflection.

## Entry

The scanner is created via `createScanner()` in `src/builder/scanner/scanner.ts`:

```typescript
const scanner = createScanner({
    entryPoint: 'packages/my-lib/src/index.ts'
});
const manifest = scanner.scan();
```

Each `scan()` call creates or reuses a `ts.Program`, resolves all exports from the entry point, and passes them to `scanComponents()`.

## Incremental Builds: the `createScanner()` Factory

`createScanner()` is a stateful factory. It retains the previous `ts.Program` reference between calls. When TypeScript creates a new program via `ts.createProgram(files, opts, oldProgram)`, it reuses `SourceFile` objects for files that have not changed. On file saves during watch mode, only the changed files are re-parsed.

```typescript
export function createScanner(options: CreateScannerOptions): Scanner {
    let previousProgram: ts.Program | undefined;

    return {
        scan() {
            const { program, exports } = resolveEntryPointExports(
                options.entryPoint,
                compilerOptions,
                previousProgram // ← reused on next scan
            );
            previousProgram = program;
            // ...
        }
    };
}
```

## Entry Point Discovery

The pipeline accepts either a directory or a file as `entryPoint`. The resolution works the same way for both. The file form is just a convenience that gets resolved upward to its containing library.

### Directory with secondary entry points (recommended)

If `entryPoint` is a directory, `discoverSecondaryEntryPoints()` walks it recursively looking for `ng-package.json` files. For each `ng-package.json` that does not have a `dest` field (i.e. a secondary entry point, since `dest` is conventionally only set on the primary), the scanner reads `lib.entryFile` (default: `public-api.ts`) and derives the import path from the relative directory name.

```
packages/my-lib/
  public-api.ts                  ← primary (ng-package.json with `dest`, ignored by discovery)
  atoms/ng-package.json          → 'my-lib/atoms'
  molecules/ng-package.json      → 'my-lib/molecules'
```

Each secondary entry point gets its own `Scanner` instance stored in `PrismPipelineState.scanners`. Only the entry points whose files changed are re-scanned.

### File entryPoint (auto-detected library root)

If `entryPoint` is a `.ts` file, the pipeline walks upward to find the nearest `ng-package.json` and treats that directory as the library root. The same discovery logic then runs, so secondary entry points are still picked up automatically:

```
entryPoint = "projects/my-lib/public-api.ts"
            ↓ walk upward, find ng-package.json
libraryRoot = "projects/my-lib"
            ↓ discoverSecondaryEntryPoints()
[my-lib/atoms, my-lib/molecules, ...]
```

If no `ng-package.json` is found above the file, or if discovery returns no entries (e.g. for a primary-only library without secondaries), the pipeline falls back to scanning the configured file directly, which preserves back-compat for non-ng-packagr setups.

## How Decorators Are Extracted

`component.scanner.ts` iterates over exported symbols, calls `findDecorator()` for each class declaration, and checks for `@Showcase`, `@Component`, and `@Directive` decorators.

**`findDecorator(node, name)`** in `ast-utils.ts` walks the node's decorator list and matches by identifier name. It supports both call-expression decorators (`@Component({...})`) and plain identifier decorators.

**`evaluateStatic(node, report)`** in `ast-utils.ts` folds an AST node into a JavaScript value without running anything. It handles string, numeric and boolean literals, `null`, `undefined`, and array and object literals, including computed keys that fold to a string or number. On top of that it folds:

- arithmetic (`+ - * / % **`) on numbers, and `+` as concatenation once either side is a string and the other a primitive
- template literals whose placeholders fold to primitives
- unary `-` and `+` on numbers, and `!` on anything it can fold
- type-only wrappers, which it sees through: `as`, `as const`, `satisfies`, `<T>x` and the non-null `!`

A calculation whose result JSON cannot carry (`1 / 0`, `0 / 0`) counts as unfoldable, since `Infinity` and `NaN` would reach the manifest as `null`. Conditions, comparisons and logical operators are left out on purpose: the evaluator folds values, it does not interpret code.

Whatever it cannot fold costs only the member that holds it: an object keeps its other properties, an array its other elements, and a spread, a shorthand property or an unreadable computed key drops just itself. Each drop goes to `report` as an `UnevaluableIssue`:

- `path`: where the value sat, e.g. `['variants', 3, 'inputs', 'maxFileSize']`, with array indices as written in the source
- `node`: the expression, spread or property that could not be folded
- `reason`: `runtime-value` for functions, classes and instances, which no static evaluation can capture; `unsupported` for everything else

Only a root that cannot be folded at all comes back as the `UNEVALUABLE` sentinel, a symbol that keeps it distinct from an `undefined` written on purpose.

The three callers treat a drop differently:

| Caller                               | Entry point                               | On a dropped value                                                                                                                                        |
| ------------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@Showcase` config                   | `evaluateStatic` with a reporter          | Warns (see [Diagnostics](#diagnostics))                                                                                                                   |
| `@Component` / `@Directive` metadata | `evaluateExpression`                      | Nothing. Only `selector` and `standalone` are read, so `imports: [FooComponent]` costs nothing                                                            |
| Input defaults                       | `evaluateDefault` in `input.extractor.ts` | Nothing, but the whole default goes: the renderer applies `defaultValue` to the component, so the readable part of a default would overwrite the real one |

### Diagnostics

`describeUnevaluable()` in `showcase-diagnostics.ts` turns each `@Showcase` issue into a message: the component, the path (a variant is named by its index and its `name`), the source text, and its `file:line:column` relative to the working directory so terminals and editors can link it.

`scanComponents()` prints each message once as a warning and collects it in a `diagnostics` array. The values it rejects after evaluation (an invalid `bg`, `status` or `canvasLayout`, a missing `title`) go through the same channel, and so does the deprecated `providers` field, as one message for the whole field instead of one per provider. A deprecated `bg: 'checker'` stays a plain warning, because nothing is lost. `createScanner().scan()` shares one array across all entry points, so a component exported from several of them warns once, and returns it as `ScanResult.diagnostics`. The pipeline throws on a non-empty array when [`strictShowcase`](api/ng-prism-config.md#strictshowcase) is on, before plugin hooks run and before a manifest is written.

## Input and Output Extraction

`extractInputs()` and `extractOutputs()` in `input.extractor.ts` walk the class members:

### Signal inputs: `input()` and `model()`

Detected by checking whether the property initializer is a call expression whose callee is `input`, `input.required`, `model`, or `model.required`.

- **Required check:** `isSignalInputRequired()` looks for the `.required` property access.
- **Type resolution:** If the call has a type argument (`input<string>()`), `checker.getTypeFromTypeNode()` resolves it. If there is a default value argument (`input('hello')`), `checker.getTypeAtLocation()` infers the type from the argument.

### Decorator inputs: `@Input()`

Detected by `findDecorator(member, 'Input')`. The `required` field is read from `@Input({ required: true })`.

### Type mapping

`mapType()` converts a `ts.Type` to the `InputMeta.type` enum:

| TypeScript type                     | Normalized `type` | Notes                                |
| ----------------------------------- | ----------------- | ------------------------------------ |
| `string` / string literal           | `'string'`        |                                      |
| `number`                            | `'number'`        |                                      |
| `boolean`                           | `'boolean'`       | Includes `true \| false` union       |
| `'a' \| 'b'` (string literals only) | `'union'`         | `values` array populated             |
| Array types                         | `'array'`         | Detected via `checker.isArrayType()` |
| Object / interface                  | `'object'`        | `ts.TypeFlags.Object`                |
| Everything else                     | `'unknown'`       |                                      |

`rawType` is the original TypeScript type string produced by `checker.typeToString()`, used by plugins and displayed in the JSDoc panel.

### Directive detection

A class is considered a directive (`isDirective: true`) if it has `@Directive` but not `@Component`.

## Output

`scanComponents()` returns an array of `ScannedComponent` objects. Each includes:

- `className`, `filePath`
- `showcaseConfig`: the evaluated `@Showcase` argument
- `inputs`, `outputs`: extracted metadata arrays
- `componentMeta`: `{ selector, standalone, isDirective }`
- `importPath`: set by the pipeline for secondary entry points
