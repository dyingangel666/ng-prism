# Scanner Speedup & Skip-Write for ng-prism

**Date:** 2026-04-16
**Status:** Approved

## Problem

ng-prism's serve builder regenerates the runtime manifest on every source file change in the watched library. Two issues make development feel slow:

1. **Non-incremental scanner:** `ts.createProgram()` is called fresh every pipeline run, re-parsing all library source files. For medium libraries this takes 1–2 seconds per rebuild.
2. **Unnecessary manifest writes:** The pipeline always writes `prism-manifest.ts`, even when the generated content is identical to what's on disk. Since `prism-manifest.ts` sits in Angular's dependency graph, every write triggers a full Angular bundle rebuild (~4 seconds). For pure component-code edits (method bodies, template changes) the manifest content doesn't actually change — the rebuild is purely our fault.

Combined, this means component-driven development in ng-prism has a ~6–8 second feedback loop per save, even for trivial edits.

## Solution

Two orthogonal optimizations:

1. **Stateful Scanner (`createScanner()` factory).** Each scanner instance holds the previous `ts.Program` and passes it to subsequent `ts.createProgram()` calls. TypeScript reuses parsed `SourceFile` objects that haven't changed, cutting scan time from 1–2 seconds to <100ms on incremental rebuilds.

2. **Skip-Write on identical content.** Before writing `prism-manifest.ts`, compare the generated content to what's on disk. If identical, skip the write entirely. Angular's watcher sees no change, so no bundle rebuild — it only reacts to the actual source file change (which may be a fast HMR patch for template/style edits).

## Impact

| Change type | Current | After this work |
|---|---|---|
| Method body / template / styles edit | ~6–8 s | ~300–600 ms |
| `@Showcase({...})` decorator arg edit | ~6–8 s | ~4 s (Angular rebuild still needed) |
| New component added / removed | ~6–8 s | ~4 s |

Component-driven development becomes usable.

## Scanner API

### New factory function

```typescript
// packages/ng-prism/src/builder/scanner/scanner.ts

export interface Scanner {
  /** Scan the entry point. Reuses TypeScript program state from previous scans. */
  scan(): PrismManifest;
}

export interface CreateScannerOptions {
  entryPoint: string;
  compilerOptions?: ts.CompilerOptions;
}

export function createScanner(options: CreateScannerOptions): Scanner {
  const mergedOptions = { ...DEFAULT_COMPILER_OPTIONS, ...options.compilerOptions };
  let previousProgram: ts.Program | undefined;

  return {
    scan(): PrismManifest {
      const { program, exports } = resolveEntryPointExports(
        options.entryPoint,
        mergedOptions,
        previousProgram,
      );
      previousProgram = program;

      const checker = program.getTypeChecker();
      const components = scanComponents(exports, checker);
      return { components };
    },
  };
}
```

### Entry point resolver update

```typescript
// packages/ng-prism/src/builder/scanner/entry-point.scanner.ts

export function resolveEntryPointExports(
  entryPointPath: string,
  compilerOptions: ts.CompilerOptions,
  previousProgram?: ts.Program,
): EntryPointResult {
  const program = ts.createProgram(
    [entryPointPath],
    compilerOptions,
    undefined,
    previousProgram,
  );
  // ... rest unchanged
}
```

### Breaking change: old `scan()` removed

The existing stateless `scan(options)` function is removed. Callers migrate to `createScanner(options).scan()`. Since ng-prism is pre-production (not yet published), this breaking change is acceptable.

## Pipeline State

### New state factory

```typescript
// packages/ng-prism/src/builder/shared/prism-pipeline.ts

export interface PrismPipelineState {
  scanners: Map<string, Scanner>; // keyed by entry point absolute path
}

export function createPipelineState(): PrismPipelineState {
  return { scanners: new Map() };
}
```

### Pipeline signature becomes stateful

```typescript
export async function runPrismPipeline(
  options: PrismPipelineOptions,
  context: BuilderContext,
  state: PrismPipelineState,
): Promise<PrismPipelineResult>
```

### Scanner reuse per entry point

```typescript
function scanEntryPoints(
  workspaceRoot: string,
  options: PrismPipelineOptions,
  state: PrismPipelineState,
): PrismManifest {
  const absoluteEntryPoint = join(workspaceRoot, options.entryPoint);

  if (!isDirectory(absoluteEntryPoint)) {
    return getOrCreateScanner(state, absoluteEntryPoint).scan();
  }

  const entryPoints = discoverSecondaryEntryPoints(absoluteEntryPoint, options.libraryImportPath);
  const allComponents: ScannedComponent[] = [];

  for (const ep of entryPoints) {
    const scanner = getOrCreateScanner(state, ep.entryFile);
    const result = scanner.scan();
    for (const comp of result.components) {
      comp.importPath = ep.importPath;
      allComponents.push(comp);
    }
  }
  return { components: allComponents };
}

function getOrCreateScanner(state: PrismPipelineState, entryFile: string): Scanner {
  let scanner = state.scanners.get(entryFile);
  if (!scanner) {
    scanner = createScanner({ entryPoint: entryFile });
    state.scanners.set(entryFile, scanner);
  }
  return scanner;
}
```

### Serve builder holds state across rebuilds

```typescript
// packages/ng-prism/src/builder/serve/index.ts

async function createServeBuilder(options, context) {
  const pipelineState = createPipelineState();

  await runPrismPipeline(pipelineOptions, context, pipelineState);

  const watcher = startWatcher({
    // ...
    onRebuild: async () => {
      await runPrismPipeline(pipelineOptions, context, pipelineState);
    },
  });
  // ...
}
```

### Build builder uses fresh state

```typescript
// packages/ng-prism/src/builder/build/index.ts

const state = createPipelineState();
await runPrismPipeline(pipelineOptions, context, state);
```

## Skip-Write

### Helper function

```typescript
function writeManifestIfChanged(manifestPath: string, newContent: string): boolean {
  if (existsSync(manifestPath)) {
    const currentContent = readFileSync(manifestPath, 'utf-8');
    if (currentContent === newContent) {
      return false;
    }
  }

  const tempPath = manifestPath + '.tmp';
  writeFileSync(tempPath, newContent, 'utf-8');
  if (existsSync(manifestPath)) {
    unlinkSync(manifestPath);
  }
  renameSync(tempPath, manifestPath);
  return true;
}
```

The atomic temp-write + rename pattern remains to bust bundler module caches when the content genuinely differs.

### Pipeline integration

```typescript
mkdirSync(join(workspaceRoot, sourceRoot), { recursive: true });

const written = writeManifestIfChanged(manifestPath, source);

context.logger.info(
  `ng-prism: ${written ? 'Generated' : 'Verified (unchanged)'} manifest ` +
  `with ${manifest.components.length} component(s)` +
  (pageCount > 0 ? ` and ${pageCount} page(s)` : '') +
  ` → ${manifestPath}`,
);

return { manifestPath, componentCount: manifest.components.length, pageCount, written };
```

### Result type gains `written`

```typescript
export interface PrismPipelineResult {
  manifestPath: string;
  componentCount: number;
  pageCount: number;
  /** True if the manifest file was actually written, false if content was unchanged. */
  written: boolean;
}
```

## Edge Cases

1. **First run (file missing):** `existsSync` returns false → write proceeds normally.
2. **Identical content after edit:** Generated content matches current — skip write — Angular's watcher sees no prism-manifest change — Angular can do a fast HMR patch for the actual source change.
3. **Scanner-state corruption after error:** If `scan()` throws, `previousProgram` retains the last successful program. Next scan picks up changes via TypeScript's own change detection. No manual recovery needed.
4. **File deleted mid-session:** TypeScript's `createProgram` handles missing files by dropping them from the program. The manifest will differ from the on-disk version → write triggers.
5. **New entry point discovered:** `scanEntryPoints` iterates all discovered entry points each run. New entries get a fresh scanner via `getOrCreateScanner`. Initial scan for that entry point has no `previousProgram`, so it's a cold-start (expected).
6. **Entry point removed:** The stale scanner remains in `state.scanners` but is never invoked again. Harmless memory pressure until server restart. YAGNI — no cleanup logic.

## Testing

| Test | File | Focus |
|---|---|---|
| `createScanner` returns a fresh scanner | `scanner.spec.ts` | Factory returns a callable scanner |
| Scanner's first `scan()` produces correct manifest | `scanner.spec.ts` | Parity with removed `scan()` behavior |
| Subsequent `scan()` reuses TypeScript program | `scanner.spec.ts` | Behavioral test: spy on `createProgram`, verify 4th arg is the previous program |
| Scanner picks up file changes between scans | `scanner.spec.ts` | Fixture file mutated between scans; manifest reflects the change |
| `createPipelineState` returns fresh independent state | `prism-pipeline.spec.ts` | Two calls produce separate maps |
| Pipeline reuses scanner per entry point | `prism-pipeline.spec.ts` | State's scanner map populated after run; same scanner on second run |
| `writeManifestIfChanged` writes when content differs | `prism-pipeline.spec.ts` | Returns true, file updated |
| `writeManifestIfChanged` skips when identical | `prism-pipeline.spec.ts` | Returns false, file mtime unchanged |
| `writeManifestIfChanged` writes when file missing | `prism-pipeline.spec.ts` | Returns true, file created |
| `PrismPipelineResult.written` exposed | `prism-pipeline.spec.ts` | Type assertion + behavior |

### Existing test updates

- `scanner.spec.ts` — all `scan({...})` calls migrated to `createScanner({...}).scan()`
- `prism-pipeline.spec.ts` — all `runPrismPipeline(opts, ctx)` calls gain `createPipelineState()` as third argument
- `integration/test-workspace.spec.ts` — same migration for pipeline calls
- `builder/build/index.ts` — instantiate fresh state per build invocation

## File Structure

Files to modify:

- `packages/ng-prism/src/builder/scanner/scanner.ts` — replace `scan()` with `createScanner()`
- `packages/ng-prism/src/builder/scanner/entry-point.scanner.ts` — accept `previousProgram` parameter
- `packages/ng-prism/src/builder/scanner/scanner.spec.ts` — migrate to new API, add incremental reuse test
- `packages/ng-prism/src/builder/shared/prism-pipeline.ts` — add `PrismPipelineState`, `createPipelineState()`, make pipeline accept state, add `writeManifestIfChanged`
- `packages/ng-prism/src/builder/shared/prism-pipeline.spec.ts` — state tests + skip-write tests
- `packages/ng-prism/src/builder/serve/index.ts` — create state once, reuse across rebuilds
- `packages/ng-prism/src/builder/build/index.ts` — create fresh state per build
- `packages/ng-prism/src/integration/test-workspace.spec.ts` — migrate call sites

Files unchanged:

- All app/runtime code
- Scanner internals (`component.scanner.ts`, `input.extractor.ts`, `ast-utils.ts`)
- Plugin runner, config loader, manifest generator

## Backward Compatibility

Breaking changes to the builder API (not the runtime/plugin API):

- `scan(options)` removed; consumers migrate to `createScanner(options).scan()`
- `runPrismPipeline(options, context)` now requires a third `state` argument

Since ng-prism is pre-publication, these are acceptable. The runtime-facing `providePrism`, `enablePrismHmr`, `@Showcase`, `defineConfig` APIs stay unchanged.

## Non-Goals

- Metadata/class split architecture for true instant-HMR (planned Phase 2)
- Cache eviction for removed entry points (YAGNI)
- Persisting scanner state across server restarts (YAGNI)
- Faster algorithm for deep manifest diffs (string comparison is O(n) and fast enough)
