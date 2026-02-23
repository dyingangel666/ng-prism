import ts from 'typescript';
import type { PrismManifest } from '../../plugin/plugin.types.js';
import { resolveEntryPointExports } from './entry-point.scanner.js';
import { scanComponents } from './component.scanner.js';

export interface ScanOptions {
  entryPoint: string;
  compilerOptions?: ts.CompilerOptions;
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
 * Scan an entry-point file for @Showcase-annotated components
 * and return a PrismManifest.
 */
export function scan(options: ScanOptions): PrismManifest {
  const compilerOptions = { ...DEFAULT_COMPILER_OPTIONS, ...options.compilerOptions };
  const { program, exports } = resolveEntryPointExports(options.entryPoint, compilerOptions);
  const checker = program.getTypeChecker();
  const components = scanComponents(exports, checker);

  return { components };
}
