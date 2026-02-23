import path from 'node:path';
import ts from 'typescript';
import { resolveEntryPointExports } from './entry-point.scanner.js';
import { extractInputs, extractOutputs } from './input.extractor.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  experimentalDecorators: true,
  strict: true,
  skipLibCheck: true,
};

function getClassDeclaration(
  exports: ts.Symbol[],
  className: string,
  checker: ts.TypeChecker,
): ts.ClassDeclaration {
  let sym = exports.find((s) => s.name === className)!;
  // Resolve alias symbols (from re-exports)
  if (sym.flags & ts.SymbolFlags.Alias) {
    sym = checker.getAliasedSymbol(sym);
  }
  const decl = sym.declarations!.find(ts.isClassDeclaration)!;
  return decl;
}

describe('extractInputs', () => {
  let checker: ts.TypeChecker;
  let exports: ts.Symbol[];

  beforeAll(() => {
    const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
    const result = resolveEntryPointExports(entryPoint, compilerOptions);
    checker = result.program.getTypeChecker();
    exports = result.exports;
  });

  it('should extract all inputs from ButtonComponent', () => {
    const classDecl = getClassDeclaration(exports, 'ButtonComponent', checker);
    const inputs = extractInputs(classDecl, checker);

    expect(inputs).toHaveLength(5);
    const names = inputs.map((i) => i.name);
    expect(names).toEqual(['variant', 'label', 'disabled', 'size', 'items']);
  });

  it('should resolve union type with values', () => {
    const classDecl = getClassDeclaration(exports, 'ButtonComponent', checker);
    const inputs = extractInputs(classDecl, checker);
    const variant = inputs.find((i) => i.name === 'variant')!;

    expect(variant.type).toBe('union');
    expect(variant.values).toEqual(['primary', 'secondary', 'danger']);
    expect(variant.defaultValue).toBe('primary');
  });

  it('should resolve string type', () => {
    const classDecl = getClassDeclaration(exports, 'ButtonComponent', checker);
    const inputs = extractInputs(classDecl, checker);
    const label = inputs.find((i) => i.name === 'label')!;

    expect(label.type).toBe('string');
    expect(label.defaultValue).toBe('Button');
  });

  it('should resolve boolean type', () => {
    const classDecl = getClassDeclaration(exports, 'ButtonComponent', checker);
    const inputs = extractInputs(classDecl, checker);
    const disabled = inputs.find((i) => i.name === 'disabled')!;

    expect(disabled.type).toBe('boolean');
    expect(disabled.defaultValue).toBe(false);
  });

  it('should resolve number type', () => {
    const classDecl = getClassDeclaration(exports, 'ButtonComponent', checker);
    const inputs = extractInputs(classDecl, checker);
    const size = inputs.find((i) => i.name === 'size')!;

    expect(size.type).toBe('number');
    expect(size.defaultValue).toBe(16);
  });

  it('should resolve array type', () => {
    const classDecl = getClassDeclaration(exports, 'ButtonComponent', checker);
    const inputs = extractInputs(classDecl, checker);
    const items = inputs.find((i) => i.name === 'items')!;

    expect(items.type).toBe('array');
    expect(items.defaultValue).toEqual([]);
  });

  it('should extract JSDoc comments', () => {
    const classDecl = getClassDeclaration(exports, 'ButtonComponent', checker);
    const inputs = extractInputs(classDecl, checker);
    const variant = inputs.find((i) => i.name === 'variant')!;

    expect(variant.doc).toBe('Visual appearance of the button');
  });

  it('should mark required as false for standard inputs', () => {
    const classDecl = getClassDeclaration(exports, 'ButtonComponent', checker);
    const inputs = extractInputs(classDecl, checker);

    for (const input of inputs) {
      expect(input.required).toBe(false);
    }
  });

  it('should extract inputs from CardComponent', () => {
    const classDecl = getClassDeclaration(exports, 'CardComponent', checker);
    const inputs = extractInputs(classDecl, checker);

    expect(inputs).toHaveLength(2);
    expect(inputs[0].name).toBe('title');
    expect(inputs[0].type).toBe('string');
    expect(inputs[1].name).toBe('bordered');
    expect(inputs[1].type).toBe('boolean');
  });
});

describe('extractOutputs', () => {
  let checker: ts.TypeChecker;
  let exports: ts.Symbol[];

  beforeAll(() => {
    const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
    const result = resolveEntryPointExports(entryPoint, compilerOptions);
    checker = result.program.getTypeChecker();
    exports = result.exports;
  });

  it('should extract all outputs from ButtonComponent', () => {
    const classDecl = getClassDeclaration(exports, 'ButtonComponent', checker);
    const outputs = extractOutputs(classDecl, checker);

    expect(outputs).toHaveLength(2);
    expect(outputs[0].name).toBe('clicked');
    expect(outputs[0].doc).toBe('Click event');
    expect(outputs[1].name).toBe('doubleClicked');
    expect(outputs[1].doc).toBe('Double click event');
  });

  it('should return empty for components without outputs', () => {
    const classDecl = getClassDeclaration(exports, 'CardComponent', checker);
    const outputs = extractOutputs(classDecl, checker);

    expect(outputs).toHaveLength(0);
  });
});
