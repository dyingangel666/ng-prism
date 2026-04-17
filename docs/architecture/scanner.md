# How the Scanner Works

The ng-prism scanner uses the TypeScript Compiler API to extract `@Showcase` metadata, component structure, and input/output types from library source files at build time — with no runtime reflection.

## Entry

The scanner is created via `createScanner()` in `src/builder/scanner/scanner.ts`:

```typescript
const scanner = createScanner({
  entryPoint: 'packages/my-lib/src/index.ts',
});
const manifest = scanner.scan();
```

Each `scan()` call creates or reuses a `ts.Program`, resolves all exports from the entry point, and passes them to `scanComponents()`.

## Incremental Builds — `createScanner()` Factory

`createScanner()` is a stateful factory. It retains the previous `ts.Program` reference between calls. When TypeScript creates a new program via `ts.createProgram(files, opts, oldProgram)`, it reuses `SourceFile` objects for files that have not changed. On file saves during watch mode, only the changed files are re-parsed.

```typescript
export function createScanner(options: CreateScannerOptions): Scanner {
  let previousProgram: ts.Program | undefined;

  return {
    scan() {
      const { program, exports } = resolveEntryPointExports(
        options.entryPoint,
        compilerOptions,
        previousProgram,  // ← reused on next scan
      );
      previousProgram = program;
      // ...
    },
  };
}
```

## Entry Point Discovery

### Single file

If `entryPoint` is a `.ts` file, it is treated as a single barrel export:

```
packages/my-lib/src/index.ts
  → exports ButtonComponent, CardComponent, ...
```

### Directory with secondary entry points

If `entryPoint` is a directory, `discoverSecondaryEntryPoints()` walks it recursively looking for `ng-package.json` files. For each `ng-package.json` that does not have a `dest` field (root entry point), the scanner reads `lib.entryFile` (default: `public-api.ts`) and derives the import path from the relative directory name.

```
packages/my-lib/src/
  index.ts                    → 'my-lib'
  atoms/ng-package.json       → 'my-lib/atoms'
  molecules/ng-package.json   → 'my-lib/molecules'
```

Each secondary entry point gets its own `Scanner` instance stored in `PrismPipelineState.scanners`. Only the entry points whose files changed are re-scanned.

## How Decorators Are Extracted

`component.scanner.ts` iterates over exported symbols, calls `findDecorator()` for each class declaration, and checks for `@Showcase`, `@Component`, and `@Directive` decorators.

**`findDecorator(node, name)`** in `ast-utils.ts` walks the node's decorator list and matches by identifier name. It supports both call-expression decorators (`@Component({...})`) and plain identifier decorators.

**`evaluateExpression(node)`** does a shallow constant-fold of the AST node into a JavaScript value. It handles string literals, numeric literals, boolean literals, array literals, and object literals. Non-constant values (function calls, references) return `undefined`.

The `@Showcase` config object is reconstructed by evaluating each property of the object literal passed to the decorator.

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

| TypeScript type | Normalized `type` | Notes |
|-----------------|-------------------|-------|
| `string` / string literal | `'string'` | |
| `number` | `'number'` | |
| `boolean` | `'boolean'` | Includes `true \| false` union |
| `'a' \| 'b'` (string literals only) | `'union'` | `values` array populated |
| Array types | `'array'` | Detected via `checker.isArrayType()` |
| Object / interface | `'object'` | `ts.TypeFlags.Object` |
| Everything else | `'unknown'` | |

`rawType` is the original TypeScript type string produced by `checker.typeToString()`, used by plugins and displayed in the JSDoc panel.

### Directive detection

A class is considered a directive (`isDirective: true`) if it has `@Directive` but not `@Component`.

## Output

`scanComponents()` returns an array of `ScannedComponent` objects. Each includes:

- `className`, `filePath`
- `showcaseConfig` — the evaluated `@Showcase` argument
- `inputs`, `outputs` — extracted metadata arrays
- `componentMeta` — `{ selector, standalone, isDirective }`
- `importPath` — set by the pipeline for secondary entry points
