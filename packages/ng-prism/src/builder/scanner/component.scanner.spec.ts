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
    const entryFile = path.join(FIXTURES_DIR, 'public-api.ts');
    const result = resolveEntryPointExports(
      [{ entryFile, importPath: 'fixture' }],
      compilerOptions
    );
    checker = result.program.getTypeChecker();
    exports = result.entries[0].exports;
  });

  it('should find only @Showcase-annotated components', () => {
    const components = scanComponents(exports, checker);
    const names = components.map((c) => c.className);

    expect(names).toContain('ButtonComponent');
    expect(names).toContain('CardComponent');
    expect(names).toContain('SignalButtonComponent');
    expect(names).toContain('ModelInputComponent');
    expect(names).toContain('HighlightDirective');
    expect(names).toContain('InvalidBgComponent');
    expect(names).toContain('InvalidStatusComponent');
    expect(names).toContain('SectionedComponent');
    expect(names).not.toContain('NoShowcaseComponent');
    expect(components).toHaveLength(8);
  });

  it('should extract showcase config for ButtonComponent', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.showcaseConfig.title).toBe('Button');
    expect(button.showcaseConfig.category).toBe('Inputs');
    expect(button.showcaseConfig.description).toBe(
      'A versatile button component'
    );
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

  it('should extract variant-level meta', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.showcaseConfig.variants![0].meta).toEqual({
      figma: 'https://www.figma.com/design/abc123/DS?node-id=12-34',
    });
    expect(button.showcaseConfig.variants![1].meta).toBeUndefined();
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

  it('should set isDirective true for directives', () => {
    const components = scanComponents(exports, checker);
    const highlight = components.find(
      (c) => c.className === 'HighlightDirective'
    )!;

    expect(highlight.componentMeta.isDirective).toBe(true);
    expect(highlight.componentMeta.selector).toBe('[appHighlight]');
    expect(highlight.componentMeta.standalone).toBe(true);
  });

  it('should set isDirective false for components', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.componentMeta.isDirective).toBe(false);
  });

  it('should extract inputs and outputs from directives', () => {
    const components = scanComponents(exports, checker);
    const highlight = components.find(
      (c) => c.className === 'HighlightDirective'
    )!;

    expect(highlight.inputs).toHaveLength(1);
    expect(highlight.inputs[0].name).toBe('highlightColor');
    expect(highlight.inputs[0].type).toBe('string');
    expect(highlight.inputs[0].defaultValue).toBe('yellow');

    expect(highlight.outputs).toHaveLength(1);
    expect(highlight.outputs[0].name).toBe('highlighted');
  });

  it('should extract host config from directive showcase', () => {
    const components = scanComponents(exports, checker);
    const highlight = components.find(
      (c) => c.className === 'HighlightDirective'
    )!;

    expect(highlight.showcaseConfig.host).toBe('<span class="demo-text">');
  });

  it('should warn when @Showcase class uses @Input() decorators', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    scanComponents(exports, checker);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('ButtonComponent uses @Input() decorators')
    );

    warnSpy.mockRestore();
  });

  it('should warn and skip @Showcase classes without a title', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const components = scanComponents(exports, checker);

    expect(
      components.find((c) => c.className === 'MissingTitleComponent')
    ).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'MissingTitleComponent has @Showcase without a "title" field'
      )
    );

    warnSpy.mockRestore();
  });

  it('should not warn for signal-based components', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    scanComponents(exports, checker);

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('SignalButtonComponent')
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('HighlightDirective')
    );

    warnSpy.mockRestore();
  });

  it('should extract component-level bg', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.showcaseConfig.bg).toBe('dark');
  });

  it('should extract variant-level bg', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.showcaseConfig.variants![0].bg).toBe('light');
    expect(button.showcaseConfig.variants![1].bg).toBeUndefined();
  });

  it('should leave bg undefined when not declared', () => {
    const components = scanComponents(exports, checker);
    const card = components.find((c) => c.className === 'CardComponent')!;

    expect(card.showcaseConfig.bg).toBeUndefined();
  });

  it('should warn and skip invalid bg values', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const components = scanComponents(exports, checker);

    const invalid = components.find(
      (c) => c.className === 'InvalidBgComponent'
    )!;
    expect(invalid.showcaseConfig.bg).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'InvalidBgComponent declares invalid bg "rainbow"'
      )
    );

    warnSpy.mockRestore();
  });

  it('should extract status from showcase config', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.showcaseConfig.status).toBe('beta');
  });

  it('should leave status undefined when not declared', () => {
    const components = scanComponents(exports, checker);
    const card = components.find((c) => c.className === 'CardComponent')!;

    expect(card.showcaseConfig.status).toBeUndefined();
  });

  it('should warn and skip invalid status values', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const components = scanComponents(exports, checker);

    const invalid = components.find(
      (c) => c.className === 'InvalidStatusComponent'
    )!;
    expect(invalid.showcaseConfig.status).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'InvalidStatusComponent declares invalid status "banana"'
      )
    );

    warnSpy.mockRestore();
  });

  it('extracts section and sectionOrder from showcaseConfig', () => {
    const components = scanComponents(exports, checker);
    const sectioned = components.find(
      (c) => c.className === 'SectionedComponent'
    )!;

    expect(sectioned.showcaseConfig.section).toBe('Pipes');
    expect(sectioned.showcaseConfig.sectionOrder).toBe(5);
  });

  it('omits section and sectionOrder when not declared', () => {
    const components = scanComponents(exports, checker);
    const button = components.find((c) => c.className === 'ButtonComponent')!;

    expect(button.showcaseConfig.section).toBeUndefined();
    expect(button.showcaseConfig.sectionOrder).toBeUndefined();
  });
});
