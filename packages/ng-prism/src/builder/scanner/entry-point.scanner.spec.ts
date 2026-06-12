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
    const entryFile = path.join(FIXTURES_DIR, 'public-api.ts');
    const { entries } = resolveEntryPointExports(
      [{ entryFile, importPath: 'fixture' }],
      compilerOptions
    );
    const names = entries[0].exports.map((s) => s.name).sort();

    expect(names).toEqual([
      'ButtonComponent',
      'CardComponent',
      'HighlightDirective',
      'InvalidBgComponent',
      'InvalidStatusComponent',
      'MissingTitleComponent',
      'ModelInputComponent',
      'NoShowcaseComponent',
      'SectionedComponent',
      'SignalButtonComponent',
    ]);
  });

  it('should return a valid program', () => {
    const entryFile = path.join(FIXTURES_DIR, 'public-api.ts');
    const { program } = resolveEntryPointExports(
      [{ entryFile, importPath: 'fixture' }],
      compilerOptions
    );

    expect(program).toBeDefined();
    expect(program.getTypeChecker()).toBeDefined();
  });

  it('should warn and return empty exports for a missing entry point (no throw)', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      const { entries } = resolveEntryPointExports(
        [{ entryFile: '/non-existent/file.ts', importPath: 'fixture' }],
        compilerOptions
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].exports).toEqual([]);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('source file not found for entry point')
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('should isolate per-entry failures: other entries still resolved', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      const entryFile = path.join(FIXTURES_DIR, 'public-api.ts');
      const { entries } = resolveEntryPointExports(
        [
          { entryFile: '/non-existent/file.ts', importPath: 'broken' },
          { entryFile, importPath: 'good' },
        ],
        compilerOptions
      );
      expect(entries[0].exports).toEqual([]);
      expect(entries[1].exports.length).toBeGreaterThan(0);
    } finally {
      warn.mockRestore();
    }
  });

  it('should resolve multiple entry points with one shared program', () => {
    const entryFile = path.join(FIXTURES_DIR, 'public-api.ts');
    const { program, entries } = resolveEntryPointExports(
      [
        { entryFile, importPath: 'a' },
        { entryFile, importPath: 'b' },
      ],
      compilerOptions
    );

    expect(entries).toHaveLength(2);
    expect(entries[0].importPath).toBe('a');
    expect(entries[1].importPath).toBe('b');
    // both entries point at the same SourceFile instance (single shared program)
    expect(program.getSourceFile(entryFile)).toBeDefined();
  });
});
