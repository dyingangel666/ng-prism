import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path, { join } from 'node:path';
import { createScanner } from './scanner.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

describe('createScanner', () => {
  const entryFile = path.join(FIXTURES_DIR, 'public-api.ts');
  const entryPoints = [{ entryFile, importPath: 'fixture' }];

  it('should scan the full pipeline from entry point to manifest', () => {
    const scanner = createScanner({ entryPoints });
    const result = scanner.scan();

    expect(result.components).toHaveLength(7);
  });

  it('should produce correct ButtonComponent data', () => {
    const scanner = createScanner({ entryPoints });
    const result = scanner.scan();
    const button = result.components.find(
      (c) => c.className === 'ButtonComponent'
    )!;

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
    const scanner = createScanner({ entryPoints });
    const result = scanner.scan();
    const card = result.components.find(
      (c) => c.className === 'CardComponent'
    )!;

    expect(card).toBeDefined();
    expect(card.showcaseConfig.title).toBe('Card');
    expect(card.showcaseConfig.category).toBe('Layout');
    expect(card.inputs).toHaveLength(2);
    expect(card.outputs).toHaveLength(0);
  });

  it('should not include non-Showcase components', () => {
    const scanner = createScanner({ entryPoints });
    const result = scanner.scan();
    const names = result.components.map((c) => c.className);

    expect(names).not.toContain('NoShowcaseComponent');
  });

  it('should accept custom compiler options', () => {
    const scanner = createScanner({
      entryPoints,
      compilerOptions: { strict: false },
    });
    const result = scanner.scan();

    expect(result.components).toHaveLength(7);
  });

  it('should produce correct HighlightDirective data', () => {
    const scanner = createScanner({ entryPoints });
    const result = scanner.scan();
    const highlight = result.components.find(
      (c) => c.className === 'HighlightDirective'
    )!;

    expect(highlight).toBeDefined();
    expect(highlight.showcaseConfig.title).toBe('Highlight');
    expect(highlight.showcaseConfig.host).toBe('<span class="demo-text">');
    expect(highlight.componentMeta.isDirective).toBe(true);
    expect(highlight.componentMeta.selector).toBe('[appHighlight]');
    expect(highlight.inputs).toHaveLength(1);
    expect(highlight.outputs).toHaveLength(1);
  });

  it('should tag every scanned component with its entry-point importPath', () => {
    const scanner = createScanner({ entryPoints });
    const result = scanner.scan();

    expect(result.components.length).toBeGreaterThan(0);
    for (const c of result.components) {
      expect(c.importPath).toBe('fixture');
    }
  });

  it('should retain program reference across scans (previousProgram threading)', () => {
    const scanner = createScanner({ entryPoints });

    const first = scanner.scan();
    expect(first.components.length).toBeGreaterThan(0);

    const second = scanner.scan();
    expect(second.components.map((c) => c.className)).toEqual(
      first.components.map((c) => c.className)
    );
  });

  it('should produce the same manifest on repeated scans when files are unchanged', () => {
    const scanner = createScanner({ entryPoints });

    const first = scanner.scan();
    const second = scanner.scan();

    expect(second.components).toHaveLength(first.components.length);
    expect(second.components.map((c) => c.className)).toEqual(
      first.components.map((c) => c.className)
    );
  });

  it('should dedupe a component re-exported by multiple entry points', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      const scanner = createScanner({
        entryPoints: [
          {
            entryFile: path.join(FIXTURES_DIR, 'entry-a.ts'),
            importPath: 'lib/a',
          },
          {
            entryFile: path.join(FIXTURES_DIR, 'entry-b.ts'),
            importPath: 'lib/b',
          },
        ],
      });
      const result = scanner.scan();

      const buttons = result.components.filter(
        (c) => c.className === 'ButtonComponent'
      );
      expect(buttons).toHaveLength(1);
      // First-occurrence wins → importPath should be 'lib/a'
      expect(buttons[0].importPath).toBe('lib/a');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('exported by multiple entry points')
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('should isolate a failing entry: other entries still scanned', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      const scanner = createScanner({
        entryPoints: [
          { entryFile: '/non-existent/file.ts', importPath: 'broken' },
          { entryFile, importPath: 'good' },
        ],
      });
      const result = scanner.scan();

      // 7 components from the valid entry; the broken entry contributes nothing
      expect(result.components).toHaveLength(7);
      for (const c of result.components) {
        expect(c.importPath).toBe('good');
      }
    } finally {
      warn.mockRestore();
    }
  });

  it('should pick up file changes between scans', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'ng-prism-scanner-'));
    try {
      cpSync(FIXTURES_DIR, tmpDir, { recursive: true });
      const mutableEntry = join(tmpDir, 'public-api.ts');
      const scanner = createScanner({
        entryPoints: [{ entryFile: mutableEntry, importPath: 'fixture' }],
      });

      const first = scanner.scan();
      const originalButton = first.components.find(
        (c) => c.className === 'ButtonComponent'
      )!;
      expect(originalButton.showcaseConfig.title).toBe('Button');

      const buttonFile = join(tmpDir, 'button.component.ts');
      const content = readFileSync(buttonFile, 'utf-8');
      writeFileSync(
        buttonFile,
        content.replace("title: 'Button',", "title: 'MutatedButton',")
      );

      const second = scanner.scan();
      const mutatedButton = second.components.find(
        (c) => c.className === 'ButtonComponent'
      )!;
      expect(mutatedButton.showcaseConfig.title).toBe('MutatedButton');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
