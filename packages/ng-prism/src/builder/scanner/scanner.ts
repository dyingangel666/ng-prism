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
