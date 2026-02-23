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
): EntryPointResult {
  const program = ts.createProgram([entryPointPath], compilerOptions);
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
