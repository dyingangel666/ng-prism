import path from 'node:path';
import { scan } from './scanner.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

describe('scan (integration)', () => {
  it('should scan the full pipeline from entry point to manifest', () => {
    const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
    const manifest = scan({ entryPoint });

    expect(manifest.components).toHaveLength(4);
  });

  it('should produce correct ButtonComponent data', () => {
    const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
    const manifest = scan({ entryPoint });
    const button = manifest.components.find((c) => c.className === 'ButtonComponent')!;

    expect(button).toBeDefined();
    expect(button.showcaseConfig.title).toBe('Button');
    expect(button.showcaseConfig.category).toBe('Inputs');
    expect(button.showcaseConfig.variants).toHaveLength(2);
    expect(button.inputs).toHaveLength(5);
    expect(button.outputs).toHaveLength(2);
    expect(button.componentMeta.selector).toBe('my-button');
    expect(button.componentMeta.standalone).toBe(true);

    // Verify specific input details
    const variant = button.inputs.find((i) => i.name === 'variant')!;
    expect(variant.type).toBe('union');
    expect(variant.values).toEqual(['primary', 'secondary', 'danger']);
    expect(variant.defaultValue).toBe('primary');
    expect(variant.doc).toBe('Visual appearance of the button');

    const disabled = button.inputs.find((i) => i.name === 'disabled')!;
    expect(disabled.type).toBe('boolean');
    expect(disabled.defaultValue).toBe(false);

    // Verify output
    const clicked = button.outputs.find((o) => o.name === 'clicked')!;
    expect(clicked.doc).toBe('Click event');
  });

  it('should produce correct CardComponent data', () => {
    const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
    const manifest = scan({ entryPoint });
    const card = manifest.components.find((c) => c.className === 'CardComponent')!;

    expect(card).toBeDefined();
    expect(card.showcaseConfig.title).toBe('Card');
    expect(card.showcaseConfig.category).toBe('Layout');
    expect(card.inputs).toHaveLength(2);
    expect(card.outputs).toHaveLength(0);
  });

  it('should not include non-Showcase components', () => {
    const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
    const manifest = scan({ entryPoint });
    const names = manifest.components.map((c) => c.className);

    expect(names).not.toContain('NoShowcaseComponent');
  });

  it('should accept custom compiler options', () => {
    const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
    const manifest = scan({
      entryPoint,
      compilerOptions: { strict: false },
    });

    expect(manifest.components).toHaveLength(4);
  });
});
