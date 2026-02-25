import path from 'node:path';
import ts from 'typescript';
import { resolveEntryPointExports } from './entry-point.scanner.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  experimentalDecorators: true,
  strict: true,
  skipLibCheck: true,
};

describe('resolveEntryPointExports', () => {
  it('should resolve all exports from public-api.ts', () => {
    const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
    const { exports } = resolveEntryPointExports(entryPoint, compilerOptions);
    const names = exports.map((s) => s.name).sort();

    expect(names).toEqual(['ButtonComponent', 'CardComponent', 'NoShowcaseComponent', 'SignalButtonComponent']);
  });

  it('should return a valid program', () => {
    const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
    const { program } = resolveEntryPointExports(entryPoint, compilerOptions);

    expect(program).toBeDefined();
    expect(program.getTypeChecker()).toBeDefined();
  });

  it('should throw for missing entry point', () => {
    expect(() =>
      resolveEntryPointExports('/non-existent/file.ts', compilerOptions),
    ).toThrow('Could not find source file');
  });
});
