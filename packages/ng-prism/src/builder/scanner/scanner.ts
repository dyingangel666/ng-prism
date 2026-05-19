import ts from 'typescript';
import type { ScannedComponent } from '../../plugin/plugin.types.js';
import {
  resolveEntryPointExports,
  type EntryPointInput,
} from './entry-point.scanner.js';
import { scanComponents } from './component.scanner.js';

export interface CreateScannerOptions {
  entryPoints: ReadonlyArray<EntryPointInput>;
  compilerOptions?: ts.CompilerOptions;
}

export interface ScanResult {
  components: ScannedComponent[];
}

export interface Scanner {
  /** Scan all entry points. Reuses TypeScript program state from previous scans. */
  scan(): ScanResult;
}

const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  experimentalDecorators: true,
  strict: true,
  skipLibCheck: true,
  // Perf: skip auto-loading every @types/* package; library source rarely needs ambient globals.
  // Users with explicit needs can pass `types: ['node']` via tsconfig.json paths.
  types: [],
  // Perf: we never call program.emit(); skip emit-related setup work.
  noEmit: true,
  // Perf: complement to skipLibCheck — also skip type-checking lib.*.d.ts files.
  skipDefaultLibCheck: true,
};

/**
 * Create a stateful multi-entry scanner that retains the previous ts.Program between scans.
 * A single shared program is created with every entry-point file as a root name, so the
 * transitive type graph (Angular framework typings, etc.) is parsed once and shared via
 * the program's `TypeChecker` — instead of N programs that each load Material/CDK/RxJS.
 *
 * TypeScript reuses parsed SourceFile objects from the old program on rebuild, making
 * incremental scans fast.
 */
export function createScanner(options: CreateScannerOptions): Scanner {
  const compilerOptions = {
    ...DEFAULT_COMPILER_OPTIONS,
    ...options.compilerOptions,
  };
  let previousProgram: ts.Program | undefined;

  return {
    scan(): ScanResult {
      const { program, entries } = resolveEntryPointExports(
        options.entryPoints,
        compilerOptions,
        previousProgram
      );
      previousProgram = program;

      const checker = program.getTypeChecker();
      const allComponents: ScannedComponent[] = [];

      for (const { exports, importPath } of entries) {
        const components = scanComponents(exports, checker);
        for (const c of components) c.importPath = importPath;
        allComponents.push(...components);
      }

      // Dedupe by (filePath, className): if a component class is re-exported from
      // multiple entry points (e.g. atoms/button + barrel index.ts), we keep the first
      // occurrence. The duplicate would otherwise produce duplicate imports in the
      // generated manifest and a runtime collision in the Prism shell.
      const seen = new Set<string>();
      const unique: ScannedComponent[] = [];
      for (const c of allComponents) {
        const key = `${c.filePath}::${c.className}`;
        if (seen.has(key)) {
          console.warn(
            `⚠ ng-prism: ${c.className} is exported by multiple entry points; ` +
              `keeping the first occurrence (importPath: ${
                unique.find(
                  (u) =>
                    u.className === c.className && u.filePath === c.filePath
                )?.importPath
              }).`
          );
          continue;
        }
        seen.add(key);
        unique.push(c);
      }

      return { components: unique };
    },
  };
}
