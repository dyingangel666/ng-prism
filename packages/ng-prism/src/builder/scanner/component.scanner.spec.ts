import path from 'node:path';
import ts from 'typescript';
import { resolveEntryPointExports } from './entry-point.scanner.js';
import { scanComponents } from './component.scanner.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  experimentalDecorators: true,
  strict: true,
  skipLibCheck: true,
};

describe('scanComponents', () => {
  let checker: ts.TypeChecker;
  let exports: ts.Symbol[];

  beforeAll(() => {
    const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
    const result = resolveEntryPointExports(entryPoint, compilerOptions);
    checker = result.program.getTypeChecker();
    exports = result.exports;
  });

  it('should find only @Showcase-annotated components', () => {
    const components = scanComponents(exports, checker);
    const names = components.map((c) => c.className);

    expect(names).toContain('ButtonComponent');
    expect(names).toContain('CardComponent');
    expect(names).toContain('SignalButtonComponent');
    expect(names).not.toContain('NoShowcaseComponent');
    expect(components).toHaveLength(3);
  });

  it('should extract showcase config for ButtonComponent', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.showcaseConfig.title).toBe('Button');
    expect(button.showcaseConfig.category).toBe('Inputs');
    expect(button.showcaseConfig.description).toBe('A versatile button component');
    expect(button.showcaseConfig.tags).toEqual(['form', 'action']);
  });

  it('should extract variants', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.showcaseConfig.variants).toHaveLength(2);
    expect(button.showcaseConfig.variants![0].name).toBe('Primary');
    expect(button.showcaseConfig.variants![0].inputs).toEqual({
      variant: 'primary',
      label: 'Click me',
    });
    expect(button.showcaseConfig.variants![1].name).toBe('Danger');
    expect(button.showcaseConfig.variants![1].inputs).toEqual({
      variant: 'danger',
      disabled: true,
    });
  });

  it('should extract component metadata (selector, standalone)', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.componentMeta.selector).toBe('my-button');
    expect(button.componentMeta.standalone).toBe(true);
  });

  it('should extract inputs and outputs', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.inputs.length).toBe(5);
    expect(button.outputs.length).toBe(2);
    expect(button.inputs[0].name).toBe('variant');
    expect(button.outputs[0].name).toBe('clicked');
  });

  it('should set filePath', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.filePath).toContain('button.component.ts');
  });

  it('should handle CardComponent with minimal config', () => {
    const components = scanComponents(exports, checker);
    const card = components.find((c) => c.className === 'CardComponent')!;

    expect(card.showcaseConfig.title).toBe('Card');
    expect(card.showcaseConfig.category).toBe('Layout');
    expect(card.showcaseConfig.variants).toBeUndefined();
    expect(card.showcaseConfig.tags).toBeUndefined();
    expect(card.inputs).toHaveLength(2);
    expect(card.outputs).toHaveLength(0);
  });
});
