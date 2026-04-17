# Scanner Speedup & Skip-Write Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut ng-prism rebuild latency from ~6–8s to ~300–600ms for pure component-code edits by making the TypeScript scanner stateful across rebuilds and skipping manifest writes when the generated content is unchanged.

**Architecture:** Introduce a `createScanner()` factory that retains the previous `ts.Program` between calls so TypeScript can reuse parsed `SourceFile` objects. Pipeline gains a `PrismPipelineState` carried by the serve builder across rebuilds. The manifest write becomes conditional on content difference, short-circuiting Angular's dev server from rebuilding when nothing relevant changed.

**Tech Stack:** TypeScript Compiler API (`ts.createProgram` with `oldProgram`), Jest 30 + SWC for tests.

---

### Task 1: Add `previousProgram` parameter to `resolveEntryPointExports`

**Files:**
- Modify: `packages/ng-prism/src/builder/scanner/entry-point.scanner.ts`

The current resolver always creates a fresh program. We accept an optional previous program and pass it to `ts.createProgram()` as the 4th argument. TypeScript reuses unchanged `SourceFile` objects from the previous program, which is where the speedup comes from.

- [ ] **Step 1: Update the function signature and pass `previousProgram` to `ts.createProgram`**

Replace the entire file `packages/ng-prism/src/builder/scanner/entry-point.scanner.ts`:

```typescript
import ts from 'typescript';

export interface EntryPointResult {
  program: ts.Program;
  exports: ts.Symbol[];
}

/**
 * Resolve all exported symbols from an entry-point file (e.g. public-api.ts).
 * Re-exports (`export * from '...'`) are resolved automatically by TypeScript.
 */
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
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(entryPointPath);

  if (!sourceFile) {
    throw new Error(`Could not find source file: ${entryPointPath}`);
  }

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) {
    return { program, exports: [] };
  }

  const exports = checker.getExportsOfModule(moduleSymbol);
  return { program, exports };
}
```

- [ ] **Step 2: Run existing tests to confirm backward compatibility**

Run: `npx nx test ng-prism -- --testPathPatterns=scanner.spec`
Expected: PASS — existing callers pass no `previousProgram`, behavior unchanged.

- [ ] **Step 3: Commit**

```bash
git add packages/ng-prism/src/builder/scanner/entry-point.scanner.ts
git commit -m "feat(scanner): accept optional previousProgram for incremental builds"
```

---

### Task 2: Introduce `createScanner()` factory and remove legacy `scan()`

**Files:**
- Modify: `packages/ng-prism/src/builder/scanner/scanner.ts`
- Modify: `packages/ng-prism/src/builder/scanner/scanner.spec.ts`

- [ ] **Step 1: Write failing tests for the new API**

Replace the entire file `packages/ng-prism/src/builder/scanner/scanner.spec.ts`:

```typescript
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { join } from 'node:path';
import ts from 'typescript';
import { createScanner } from './scanner.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

describe('createScanner', () => {
  const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');

  it('should scan the full pipeline from entry point to manifest', () => {
    const scanner = createScanner({ entryPoint });
    const manifest = scanner.scan();

    expect(manifest.components).toHaveLength(5);
  });

  it('should produce correct ButtonComponent data', () => {
    const scanner = createScanner({ entryPoint });
    const manifest = scanner.scan();
    const button = manifest.components.find((c) => c.className === 'ButtonComponent')!;

    expect(button).toBeDefined();
    expect(button.showcaseConfig.title).toBe('Button');
    expect(button.showcaseConfig.category).toBe('Inputs');
    expect(button.showcaseConfig.variants).toHaveLength(2);
    expect(button.inputs).toHaveLength(5);
    expect(button.outputs).toHaveLength(2);
    expect(button.componentMeta.selector).toBe('my-button');
    expect(button.componentMeta.standalone).toBe(true);

    const variant = button.inputs.find((i) => i.name === 'variant')!;
    expect(variant.type).toBe('union');
    expect(variant.values).toEqual(['primary', 'secondary', 'danger']);
    expect(variant.defaultValue).toBe('primary');
    expect(variant.doc).toBe('Visual appearance of the button');

    const disabled = button.inputs.find((i) => i.name === 'disabled')!;
    expect(disabled.type).toBe('boolean');
    expect(disabled.defaultValue).toBe(false);

    const clicked = button.outputs.find((o) => o.name === 'clicked')!;
    expect(clicked.doc).toBe('Click event');
  });

  it('should produce correct CardComponent data', () => {
    const scanner = createScanner({ entryPoint });
    const manifest = scanner.scan();
    const card = manifest.components.find((c) => c.className === 'CardComponent')!;

    expect(card).toBeDefined();
    expect(card.showcaseConfig.title).toBe('Card');
    expect(card.showcaseConfig.category).toBe('Layout');
    expect(card.inputs).toHaveLength(2);
    expect(card.outputs).toHaveLength(0);
  });

  it('should not include non-Showcase components', () => {
    const scanner = createScanner({ entryPoint });
    const manifest = scanner.scan();
    const names = manifest.components.map((c) => c.className);

    expect(names).not.toContain('NoShowcaseComponent');
  });

  it('should accept custom compiler options', () => {
    const scanner = createScanner({
      entryPoint,
      compilerOptions: { strict: false },
    });
    const manifest = scanner.scan();

    expect(manifest.components).toHaveLength(5);
  });

  it('should produce correct HighlightDirective data', () => {
    const scanner = createScanner({ entryPoint });
    const manifest = scanner.scan();
    const highlight = manifest.components.find((c) => c.className === 'HighlightDirective')!;

    expect(highlight).toBeDefined();
    expect(highlight.showcaseConfig.title).toBe('Highlight');
    expect(highlight.showcaseConfig.host).toBe('<span class="demo-text">');
    expect(highlight.componentMeta.isDirective).toBe(true);
    expect(highlight.componentMeta.selector).toBe('[appHighlight]');
    expect(highlight.inputs).toHaveLength(1);
    expect(highlight.outputs).toHaveLength(1);
  });

  it('should pass the previous program to ts.createProgram on subsequent scans', () => {
    const createProgramSpy = jest.spyOn(ts, 'createProgram');
    const scanner = createScanner({ entryPoint });

    scanner.scan();
    const firstCallProgram = createProgramSpy.mock.results[0].value;
    expect(createProgramSpy.mock.calls[0][3]).toBeUndefined();

    scanner.scan();
    expect(createProgramSpy.mock.calls[1][3]).toBe(firstCallProgram);

    createProgramSpy.mockRestore();
  });

  it('should produce the same manifest on repeated scans when files are unchanged', () => {
    const scanner = createScanner({ entryPoint });

    const first = scanner.scan();
    const second = scanner.scan();

    expect(second.components).toHaveLength(first.components.length);
    expect(second.components.map((c) => c.className))
      .toEqual(first.components.map((c) => c.className));
  });

  it('should pick up file changes between scans', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'ng-prism-scanner-'));
    try {
      cpSync(FIXTURES_DIR, tmpDir, { recursive: true });
      const mutableEntry = join(tmpDir, 'public-api.ts');
      const scanner = createScanner({ entryPoint: mutableEntry });

      const first = scanner.scan();
      const originalButton = first.components.find((c) => c.className === 'ButtonComponent')!;
      expect(originalButton.showcaseConfig.title).toBe('Button');

      const buttonFile = join(tmpDir, 'button.component.ts');
      const content = readFileSync(buttonFile, 'utf-8');
      writeFileSync(buttonFile, content.replace("title: 'Button',", "title: 'MutatedButton',"));

      const second = scanner.scan();
      const mutatedButton = second.components.find((c) => c.className === 'ButtonComponent')!;
      expect(mutatedButton.showcaseConfig.title).toBe('MutatedButton');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test ng-prism -- --testPathPatterns=scanner.spec`
Expected: FAIL — `createScanner is not a function` (not yet exported).

- [ ] **Step 3: Implement `createScanner` and remove `scan()`**

Replace the entire file `packages/ng-prism/src/builder/scanner/scanner.ts`:

```typescript
import ts from 'typescript';
import type { PrismManifest } from '../../plugin/plugin.types.js';
import { resolveEntryPointExports } from './entry-point.scanner.js';
import { scanComponents } from './component.scanner.js';

export interface CreateScannerOptions {
  entryPoint: string;
  compilerOptions?: ts.CompilerOptions;
}

export interface Scanner {
  /** Scan the entry point. Reuses TypeScript program state from previous scans. */
  scan(): PrismManifest;
}

const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  experimentalDecorators: true,
  strict: true,
  skipLibCheck: true,
};

/**
 * Create a stateful scanner that retains the previous ts.Program between scans.
 * TypeScript reuses parsed SourceFile objects from the old program, making incremental scans fast.
 */
export function createScanner(options: CreateScannerOptions): Scanner {
  const compilerOptions = { ...DEFAULT_COMPILER_OPTIONS, ...options.compilerOptions };
  let previousProgram: ts.Program | undefined;

  return {
    scan(): PrismManifest {
      const { program, exports } = resolveEntryPointExports(
        options.entryPoint,
        compilerOptions,
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test ng-prism -- --testPathPatterns=scanner.spec`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/ng-prism/src/builder/scanner/scanner.ts packages/ng-prism/src/builder/scanner/scanner.spec.ts
git commit -m "feat(scanner): replace stateless scan() with stateful createScanner() factory"
```

---

### Task 3: Add `PrismPipelineState` + `createPipelineState()` to pipeline

**Files:**
- Modify: `packages/ng-prism/src/builder/shared/prism-pipeline.ts`

The pipeline is invoked on every rebuild. To keep scanners alive between invocations, the builder passes a state object through. This task just introduces the state type — the actual scanner reuse is wired in Task 4.

- [ ] **Step 1: Add `PrismPipelineState` type, `createPipelineState()` function, and require state in `runPrismPipeline`**

Modify `packages/ng-prism/src/builder/shared/prism-pipeline.ts`. Change the imports and type definitions at the top of the file (lines 1-23). Replace:

```typescript
import { join } from 'path';
import { writeFileSync, mkdirSync, statSync, renameSync, existsSync, unlinkSync } from 'fs';
import type { BuilderContext } from '@angular-devkit/architect';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { ScannedComponent, PrismManifest } from '../../plugin/plugin.types.js';
import { scan } from '../scanner/scanner.js';
import { discoverSecondaryEntryPoints } from '../scanner/entry-point-discovery.js';
import { loadConfig } from '../config-loader/config-loader.js';
import { runPluginHooks } from '../plugin-runner/plugin-runner.js';
import { generateRuntimeManifest } from '../manifest/runtime-manifest.generator.js';

export interface PrismPipelineOptions {
  entryPoint: string;
  libraryImportPath: string;
  prismProject: string;
  configFile: string;
}

export interface PrismPipelineResult {
  manifestPath: string;
  componentCount: number;
  pageCount: number;
}
```

with:

```typescript
import { join } from 'path';
import { writeFileSync, readFileSync, mkdirSync, statSync, renameSync, existsSync, unlinkSync } from 'fs';
import type { BuilderContext } from '@angular-devkit/architect';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { ScannedComponent, PrismManifest } from '../../plugin/plugin.types.js';
import { createScanner, type Scanner } from '../scanner/scanner.js';
import { discoverSecondaryEntryPoints } from '../scanner/entry-point-discovery.js';
import { loadConfig } from '../config-loader/config-loader.js';
import { runPluginHooks } from '../plugin-runner/plugin-runner.js';
import { generateRuntimeManifest } from '../manifest/runtime-manifest.generator.js';

export interface PrismPipelineOptions {
  entryPoint: string;
  libraryImportPath: string;
  prismProject: string;
  configFile: string;
}

export interface PrismPipelineResult {
  manifestPath: string;
  componentCount: number;
  pageCount: number;
  /** True if the manifest file was actually written; false if the existing content was identical. */
  written: boolean;
}

export interface PrismPipelineState {
  scanners: Map<string, Scanner>;
}

export function createPipelineState(): PrismPipelineState {
  return { scanners: new Map() };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ng-prism/src/builder/shared/prism-pipeline.ts
git commit -m "feat(pipeline): add PrismPipelineState type and createPipelineState() factory"
```

---

### Task 4: Make `runPrismPipeline` and `scanEntryPoints` accept and use state

**Files:**
- Modify: `packages/ng-prism/src/builder/shared/prism-pipeline.ts`

- [ ] **Step 1: Update `runPrismPipeline` signature and delegate scanning through state**

In `packages/ng-prism/src/builder/shared/prism-pipeline.ts`, replace the `runPrismPipeline` function and the `scanEntryPoints` function (roughly lines 25-118 of the original file) with:

```typescript
export async function runPrismPipeline(
  options: PrismPipelineOptions,
  context: BuilderContext,
  state: PrismPipelineState,
): Promise<PrismPipelineResult> {
  const { workspaceRoot } = context;

  context.reportStatus('Loading ng-prism config...');
  const config = await loadConfig({
    workspaceRoot,
    configFileName: options.configFile,
  });

  context.reportStatus('Scanning components...');
  const scanResult = scanEntryPoints(workspaceRoot, options, state);

  const pages: StyleguidePage[] = config.pages ? [...config.pages] : [];

  context.reportStatus('Running plugin hooks...');
  const manifest = await runPluginHooks(
    { ...scanResult, pages },
    config.plugins ?? [],
  );

  context.reportStatus('Generating runtime manifest...');
  const source = generateRuntimeManifest({
    components: manifest.components,
    libraryImportPath: options.libraryImportPath,
    pages: manifest.pages,
  });

  const projectMeta = await context.getProjectMetadata(options.prismProject);
  const sourceRoot = (projectMeta['sourceRoot'] as string | undefined)
    ?? join('projects', options.prismProject, 'src');
  const manifestPath = join(workspaceRoot, sourceRoot, 'prism-manifest.ts');

  mkdirSync(join(workspaceRoot, sourceRoot), { recursive: true });
  const written = writeManifestIfChanged(manifestPath, source);

  const pageCount = (manifest.pages ?? []).length;

  context.reportStatus('');
  context.logger.info(
    `ng-prism: ${written ? 'Generated' : 'Verified (unchanged)'} manifest ` +
    `with ${manifest.components.length} component(s)` +
    (pageCount > 0 ? ` and ${pageCount} page(s)` : '') +
    ` → ${manifestPath}`,
  );

  return {
    manifestPath,
    componentCount: manifest.components.length,
    pageCount,
    written,
  };
}

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

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function scanEntryPoints(
  workspaceRoot: string,
  options: PrismPipelineOptions,
  state: PrismPipelineState,
): PrismManifest {
  const absoluteEntryPoint = join(workspaceRoot, options.entryPoint);

  if (!isDirectory(absoluteEntryPoint)) {
    return getOrCreateScanner(state, absoluteEntryPoint).scan();
  }

  const entryPoints = discoverSecondaryEntryPoints(
    absoluteEntryPoint,
    options.libraryImportPath,
  );

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

- [ ] **Step 2: Run existing pipeline tests (they will fail due to new state arg)**

Run: `npx nx test ng-prism -- --testPathPatterns=prism-pipeline.spec`
Expected: FAIL — existing tests call `runPrismPipeline(options, ctx)` without state.

- [ ] **Step 3: Commit (intermediate state — tests broken until Task 5)**

```bash
git add packages/ng-prism/src/builder/shared/prism-pipeline.ts
git commit -m "feat(pipeline): require PrismPipelineState and add skip-write via writeManifestIfChanged"
```

---

### Task 5: Update pipeline test suite for new state arg and add state/skip-write tests

**Files:**
- Modify: `packages/ng-prism/src/builder/shared/prism-pipeline.spec.ts`

- [ ] **Step 1: Migrate existing tests to pass `createPipelineState()` as third argument**

In `packages/ng-prism/src/builder/shared/prism-pipeline.spec.ts`, change the import at line 4:

```typescript
import { runPrismPipeline, createPipelineState } from './prism-pipeline.js';
```

Update every `await runPrismPipeline(options, ctx)` call in both `describe` blocks to include `createPipelineState()`. Each updated call has the same pattern:

```typescript
const result = await runPrismPipeline(defaultOptions, ctx, createPipelineState());
// or
await runPrismPipeline(defaultOptions, ctx, createPipelineState());
```

There are 7 calls to update in this file — all in the two describe blocks `runPrismPipeline integration` and `runPrismPipeline multi-entry-point integration`. Replace each one.

- [ ] **Step 2: Add new tests for state and skip-write**

Append at the end of `packages/ng-prism/src/builder/shared/prism-pipeline.spec.ts`, before the final closing character of the file:

```typescript

describe('createPipelineState', () => {
  it('should return independent state objects', () => {
    const a = createPipelineState();
    const b = createPipelineState();

    expect(a).not.toBe(b);
    expect(a.scanners).not.toBe(b.scanners);
    expect(a.scanners.size).toBe(0);
    expect(b.scanners.size).toBe(0);
  });

  it('should populate scanners map after pipeline run', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp, 'prism-app/src');
    const state = createPipelineState();

    try {
      await runPrismPipeline(
        {
          entryPoint: 'lib/public-api.ts',
          libraryImportPath: 'my-lib',
          prismProject: 'my-lib-prism',
          configFile: 'ng-prism.config.ts',
        },
        ctx,
        state,
      );

      expect(state.scanners.size).toBeGreaterThan(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should reuse the same scanner across pipeline invocations', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp, 'prism-app/src');
    const state = createPipelineState();

    try {
      const options = {
        entryPoint: 'lib/public-api.ts',
        libraryImportPath: 'my-lib',
        prismProject: 'my-lib-prism',
        configFile: 'ng-prism.config.ts',
      };

      await runPrismPipeline(options, ctx, state);
      const firstScanner = state.scanners.get(join(tmp, 'lib', 'public-api.ts'));

      await runPrismPipeline(options, ctx, state);
      const secondScanner = state.scanners.get(join(tmp, 'lib', 'public-api.ts'));

      expect(secondScanner).toBe(firstScanner);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('runPrismPipeline skip-write behavior', () => {
  it('should return written: true on first invocation', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp, 'prism-app/src');

    try {
      const result = await runPrismPipeline(
        {
          entryPoint: 'lib/public-api.ts',
          libraryImportPath: 'my-lib',
          prismProject: 'my-lib-prism',
          configFile: 'ng-prism.config.ts',
        },
        ctx,
        createPipelineState(),
      );

      expect(result.written).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should return written: false when content is unchanged', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp, 'prism-app/src');
    const state = createPipelineState();
    const options = {
      entryPoint: 'lib/public-api.ts',
      libraryImportPath: 'my-lib',
      prismProject: 'my-lib-prism',
      configFile: 'ng-prism.config.ts',
    };

    try {
      await runPrismPipeline(options, ctx, state);
      const second = await runPrismPipeline(options, ctx, state);

      expect(second.written).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should leave file mtime unchanged when skip-write triggers', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp, 'prism-app/src');
    const state = createPipelineState();
    const options = {
      entryPoint: 'lib/public-api.ts',
      libraryImportPath: 'my-lib',
      prismProject: 'my-lib-prism',
      configFile: 'ng-prism.config.ts',
    };

    try {
      const first = await runPrismPipeline(options, ctx, state);
      const mtimeAfterFirst = statSync(first.manifestPath).mtimeMs;

      await new Promise((resolve) => setTimeout(resolve, 20));

      await runPrismPipeline(options, ctx, state);
      const mtimeAfterSecond = statSync(first.manifestPath).mtimeMs;

      expect(mtimeAfterSecond).toBe(mtimeAfterFirst);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should log "Generated" when written, "Verified (unchanged)" when skipped', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp, 'prism-app/src');
    const state = createPipelineState();
    const options = {
      entryPoint: 'lib/public-api.ts',
      libraryImportPath: 'my-lib',
      prismProject: 'my-lib-prism',
      configFile: 'ng-prism.config.ts',
    };

    try {
      await runPrismPipeline(options, ctx, state);
      expect(ctx.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generated manifest'),
      );

      (ctx.logger.info as jest.Mock).mockClear();

      await runPrismPipeline(options, ctx, state);
      expect(ctx.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Verified (unchanged) manifest'),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 3: Add `statSync` to imports at the top of the spec**

In `packages/ng-prism/src/builder/shared/prism-pipeline.spec.ts`, change line 1:

```typescript
import { mkdtempSync, cpSync, rmSync, existsSync, readFileSync, statSync } from 'fs';
```

- [ ] **Step 4: Run the pipeline spec**

Run: `npx nx test ng-prism -- --testPathPatterns=prism-pipeline.spec`
Expected: PASS — existing tests (migrated) plus new state and skip-write tests.

- [ ] **Step 5: Commit**

```bash
git add packages/ng-prism/src/builder/shared/prism-pipeline.spec.ts
git commit -m "test(pipeline): migrate to stateful API and add skip-write coverage"
```

---

### Task 6: Update serve builder to reuse pipeline state across rebuilds

**Files:**
- Modify: `packages/ng-prism/src/builder/serve/index.ts`

- [ ] **Step 1: Create and pass `PrismPipelineState`**

Replace the entire file `packages/ng-prism/src/builder/serve/index.ts`:

```typescript
import { createBuilder, type Builder, type BuilderContext, type BuilderOutput } from '@angular-devkit/architect';
import type { json } from '@angular-devkit/core';
import { join } from 'path';
import { existsSync } from 'fs';
import type { ServeBuilderSchema } from './schema.js';
import { runPrismPipeline, createPipelineState, type PrismPipelineOptions } from '../shared/prism-pipeline.js';
import { startWatcher } from '../watcher/index.js';

async function createServeBuilder(
  options: ServeBuilderSchema,
  context: BuilderContext,
): Promise<BuilderOutput> {
  const pipelineOptions: PrismPipelineOptions = {
    entryPoint: options.entryPoint,
    libraryImportPath: options.libraryImportPath ?? options.libraryProject ?? options.prismProject,
    prismProject: options.prismProject,
    configFile: options.configFile ?? 'ng-prism.config.ts',
  };

  const pipelineState = createPipelineState();

  await runPrismPipeline(pipelineOptions, context, pipelineState);

  const absoluteEntryPoint = join(context.workspaceRoot, options.entryPoint);
  const configFilePath = join(context.workspaceRoot, pipelineOptions.configFile);
  const absolutePrismProject = join(context.workspaceRoot, options.prismProject);
  const watcher = startWatcher({
    entryPoint: absoluteEntryPoint,
    configFile: existsSync(configFilePath) ? configFilePath : undefined,
    ignorePaths: [absolutePrismProject],
    debounceMs: 50,
    onRebuild: async () => {
      await runPrismPipeline(pipelineOptions, context, pipelineState);
    },
    logger: {
      info: (msg: string) => console.log(msg),
      error: (msg: string) => console.error(msg),
    },
  });

  const run = await context.scheduleTarget(
    { project: options.prismProject, target: 'serve', configuration: '' },
    { port: options.port ?? 4400 },
  );

  const shutdown = () => {
    watcher.close();
    run.stop();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return new Promise<BuilderOutput>((resolve, reject) => {
    let lastOutput: BuilderOutput | undefined;
    run.output.subscribe({
      next: (output) => { lastOutput = output; },
      error: (err) => { shutdown(); reject(err); },
      complete: () => { watcher.close(); resolve(lastOutput ?? { success: false }); },
    });
  });
}

const builder: Builder<ServeBuilderSchema & json.JsonObject> = createBuilder<ServeBuilderSchema>(createServeBuilder);
export default builder;
```

- [ ] **Step 2: Commit**

```bash
git add packages/ng-prism/src/builder/serve/index.ts
git commit -m "feat(serve): reuse pipeline state across rebuilds for incremental scanning"
```

---

### Task 7: Update build builder for the new pipeline API

**Files:**
- Modify: `packages/ng-prism/src/builder/build/index.ts`

- [ ] **Step 1: Pass fresh state to the pipeline**

Replace the entire file `packages/ng-prism/src/builder/build/index.ts`:

```typescript
import { createBuilder, type Builder, type BuilderContext, type BuilderOutput } from '@angular-devkit/architect';
import type { json } from '@angular-devkit/core';
import type { BuildBuilderSchema } from './schema.js';
import { runPrismPipeline, createPipelineState, type PrismPipelineOptions } from '../shared/prism-pipeline.js';

async function createBuildBuilder(
  options: BuildBuilderSchema,
  context: BuilderContext,
): Promise<BuilderOutput> {
  const pipelineOptions: PrismPipelineOptions = {
    entryPoint: options.entryPoint,
    libraryImportPath: options.libraryImportPath ?? options.libraryProject ?? options.prismProject,
    prismProject: options.prismProject,
    configFile: options.configFile ?? 'ng-prism.config.ts',
  };

  await runPrismPipeline(pipelineOptions, context, createPipelineState());

  const run = await context.scheduleTarget(
    { project: options.prismProject, target: 'build', configuration: '' },
    options.outputPath ? { outputPath: options.outputPath } : {},
  );

  return run.result;
}

const builder: Builder<BuildBuilderSchema & json.JsonObject> = createBuilder<BuildBuilderSchema>(createBuildBuilder);
export default builder;
```

- [ ] **Step 2: Commit**

```bash
git add packages/ng-prism/src/builder/build/index.ts
git commit -m "feat(build): adapt build builder to new stateful pipeline API"
```

---

### Task 8: Update integration test suite for new pipeline API

**Files:**
- Modify: `packages/ng-prism/src/integration/test-workspace.spec.ts`

- [ ] **Step 1: Add `createPipelineState` import and pass it to every `runPrismPipeline` call**

In `packages/ng-prism/src/integration/test-workspace.spec.ts`, change line 12 from:

```typescript
import { runPrismPipeline } from '../builder/shared/prism-pipeline.js';
```

to:

```typescript
import { runPrismPipeline, createPipelineState } from '../builder/shared/prism-pipeline.js';
```

Then update every `await runPrismPipeline(pipelineOptions, ctx)` call in the file (7 occurrences based on earlier grep) to include `createPipelineState()`:

```typescript
await runPrismPipeline(pipelineOptions, ctx, createPipelineState());
```

And for the one that captures the result:

```typescript
const result = await runPrismPipeline(pipelineOptions, ctx, createPipelineState());
```

- [ ] **Step 2: Run the integration tests**

Run: `npx nx test ng-prism -- --testPathPatterns=integration`
Expected: PASS — all integration tests green.

- [ ] **Step 3: Commit**

```bash
git add packages/ng-prism/src/integration/test-workspace.spec.ts
git commit -m "test(integration): pass createPipelineState to new stateful pipeline API"
```

---

### Task 9: Full verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full ng-prism test suite**

Run: `npx nx test ng-prism`
Expected: All tests pass.

- [ ] **Step 2: Run the build**

Run: `npx nx build ng-prism`
Expected: Build succeeds without warnings related to this feature.

- [ ] **Step 3: Report summary**

Report:
- Number of tests (should be ≥ previous count plus new tests from Tasks 2 and 5)
- Build success
- Any warnings encountered
