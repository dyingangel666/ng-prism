# Build Pipeline

The ng-prism build pipeline transforms library source files into a TypeScript `prism-manifest.ts` file that the showcase app imports at bootstrap. Everything runs inside the Angular builder process (Node.js).

## Pipeline Steps

`runPrismPipeline()` in `src/builder/shared/prism-pipeline.ts` executes these steps in order:

```
Config load
    ↓
Entry point scan  (TypeScript Compiler API)
    ↓
Merge config pages
    ↓
Plugin hooks  (onComponentScanned, onPageScanned, onManifestReady)
    ↓
Runtime manifest generation  (TypeScript source string)
    ↓
Atomic write  (skip if unchanged)
```

### 1. Config Load

`loadConfig()` uses `ts.transpileModule()` to compile `prism.config.ts` to an `.mjs` file in a temp directory, imports it via `import(pathToFileURL(...))`, and cleans up the temp file. This avoids spawning a separate `tsc` process and works with TypeScript config syntax.

### 2. Entry Point Scan

`scanEntryPoints()` determines whether `entryPoint` is a file or a directory:

- **Single file** — creates one `Scanner` and calls `scan()`
- **Directory** — calls `discoverSecondaryEntryPoints()` to find all `ng-package.json` files, creates one `Scanner` per entry point

Each scanner is stored in `PrismPipelineState.scanners` (a `Map<entryFile, Scanner>`). On rebuild, the same `Scanner` instance is reused, which means the previous `ts.Program` is passed to `ts.createProgram()` as `oldProgram` — only changed files are re-parsed.

### 3. Merge Config Pages

`CustomPage` and `ComponentPage` entries from `config.pages` are appended to the page list produced by the scan.

### 4. Plugin Hooks

`runPluginHooks()` iterates over registered plugins in registration order:

1. `onComponentScanned` called once per component
2. `onPageScanned` called once per page
3. `onManifestReady` called once with the full `PrismManifest`

All hooks are awaited — async plugins are fully supported.

### 5. Runtime Manifest Generation

`generateRuntimeManifest()` converts the `PrismManifest` (plain JSON-safe data) into a TypeScript source string that the showcase app can import. The generated file contains real `import` statements:

```typescript
// prism-manifest.ts (generated)
import { ButtonComponent } from 'my-lib';
import { CardComponent } from 'my-lib/molecules';

export default {
  components: [
    { meta: { className: 'ButtonComponent', ... }, type: ButtonComponent },
    { meta: { className: 'CardComponent', ... }, type: CardComponent },
  ],
};
```

This avoids JSON serialization of Angular class references and keeps tree-shaking intact.

### 6. Atomic Write (Skip If Unchanged)

`writeManifestIfChanged()` reads the existing manifest and compares it string-for-string with the new content. If identical, the write is skipped and `result.written` is `false`.

When the file must be written, it is first written to `prism-manifest.ts.tmp` then renamed to `prism-manifest.ts`. This prevents the Angular dev server from seeing a partially-written file mid-recompile.

## PrismPipelineState — Scanner Reuse Across Rebuilds

```typescript
export interface PrismPipelineState {
  scanners: Map<string, Scanner>;
}
```

The builder creates one `PrismPipelineState` per builder run (not per file change). It is passed into every `runPrismPipeline()` call. When the same entry file appears in a subsequent scan, its `Scanner` is retrieved from the map and reused — TypeScript incremental parsing kicks in automatically.

## Serve Builder

The serve builder orchestrates the full dev experience:

1. Creates `PrismPipelineState`
2. Runs `runPrismPipeline()` once before starting the Angular dev server
3. Calls `context.scheduleTarget()` to delegate to the Angular dev server
4. **Subscribes to `run.output`** (Observable) — not `run.result` (Promise). `run.result` resolves on the first output event, which is long before the server stops. The builder must stay alive until `run.output` completes.
5. Starts a chokidar file watcher via `startWatcher()`

### Watch Mode — chokidar

`startWatcher()` uses chokidar (not `fs.watch`) because `fs.watch({ recursive: true })` does not fire events reliably on macOS.

`createChangeHandler()` wraps the rebuild callback with:

- **300 ms debounce** — rapid saves (e.g. auto-format on save) trigger only one rebuild
- **`isRebuilding` guard** — prevents overlapping rebuild runs
- **Extension filter** — only `.ts`, `.scss`, `.css`, `.svg` changes trigger rebuilds

After a successful rebuild, if the manifest content changed, the Angular dev server detects the file write and triggers a browser reload.

## Build Builder

The build builder runs a single `runPrismPipeline()` call, then delegates to `context.scheduleTarget()` for the Angular production build. It awaits `run.result` (Promise) since it only needs the final outcome.
