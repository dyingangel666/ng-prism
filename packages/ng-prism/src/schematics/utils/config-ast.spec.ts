import { Tree, SchematicsException } from '@angular-devkit/schematics';
import { addPluginToConfig } from './config-ast.js';

function makeTreeWithConfig(content: string): Tree {
  const tree = Tree.empty();
  tree.create('ng-prism.config.ts', content);
  return tree;
}

const EMPTY_CONFIG = `import { defineConfig } from '@ng-prism/core/config';

export default defineConfig({ plugins: [] });
`;

const JSDOC_OPTS = {
  importName: 'jsDocPlugin',
  importFrom: '@ng-prism/plugin-jsdoc',
  call: 'jsDocPlugin()',
};

describe('addPluginToConfig', () => {
  it('adds import + call to empty plugins array', () => {
    const tree = makeTreeWithConfig(EMPTY_CONFIG);
    const changed = addPluginToConfig(tree, 'ng-prism.config.ts', JSDOC_OPTS);

    expect(changed).toBe(true);
    const result = tree.read('ng-prism.config.ts')!.toString('utf-8');
    expect(result).toContain(
      `import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';`
    );
    expect(result).toContain('plugins: [jsDocPlugin()]');
  });

  it('appends to pre-populated plugins array', () => {
    const tree = makeTreeWithConfig(`import { defineConfig } from '@ng-prism/core/config';
import { otherPlugin } from '@ng-prism/plugin-other';

export default defineConfig({ plugins: [otherPlugin()] });
`);
    const changed = addPluginToConfig(tree, 'ng-prism.config.ts', JSDOC_OPTS);

    expect(changed).toBe(true);
    const result = tree.read('ng-prism.config.ts')!.toString('utf-8');
    expect(result).toContain('plugins: [otherPlugin(), jsDocPlugin()]');
    expect(result).toContain(
      `import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';`
    );
  });

  it('is no-op when call already present (exact match)', () => {
    const tree = makeTreeWithConfig(`import { defineConfig } from '@ng-prism/core/config';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';

export default defineConfig({ plugins: [jsDocPlugin()] });
`);
    const before = tree.read('ng-prism.config.ts')!.toString('utf-8');
    const changed = addPluginToConfig(tree, 'ng-prism.config.ts', JSDOC_OPTS);

    expect(changed).toBe(false);
    expect(tree.read('ng-prism.config.ts')!.toString('utf-8')).toBe(before);
  });

  it('is no-op when call is present with options', () => {
    const tree = makeTreeWithConfig(`import { defineConfig } from '@ng-prism/core/config';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';

export default defineConfig({ plugins: [jsDocPlugin({ x: 1 })] });
`);
    const before = tree.read('ng-prism.config.ts')!.toString('utf-8');
    const changed = addPluginToConfig(tree, 'ng-prism.config.ts', JSDOC_OPTS);

    expect(changed).toBe(false);
    expect(tree.read('ng-prism.config.ts')!.toString('utf-8')).toBe(before);
  });

  it('adds plugins property when missing', () => {
    const tree = makeTreeWithConfig(`import { defineConfig } from '@ng-prism/core/config';

export default defineConfig({});
`);
    const changed = addPluginToConfig(tree, 'ng-prism.config.ts', JSDOC_OPTS);

    expect(changed).toBe(true);
    const result = tree.read('ng-prism.config.ts')!.toString('utf-8');
    expect(result).toContain('plugins: [jsDocPlugin()]');
  });

  it('throws when config file is missing', () => {
    const tree = Tree.empty();
    expect(() =>
      addPluginToConfig(tree, 'ng-prism.config.ts', JSDOC_OPTS)
    ).toThrow(/Run "ng add @ng-prism\/core" first/);
  });

  it('throws when defineConfig is called with variable arg', () => {
    const tree = makeTreeWithConfig(`import { defineConfig } from '@ng-prism/core/config';
const opts = { plugins: [] };
export default defineConfig(opts);
`);
    expect(() =>
      addPluginToConfig(tree, 'ng-prism.config.ts', JSDOC_OPTS)
    ).toThrow(/must be an object literal/);
  });

  it('throws when plugins is not an array literal', () => {
    const tree = makeTreeWithConfig(`import { defineConfig } from '@ng-prism/core/config';
const myPlugins = [];
export default defineConfig({ plugins: myPlugins });
`);
    expect(() =>
      addPluginToConfig(tree, 'ng-prism.config.ts', JSDOC_OPTS)
    ).toThrow(/plugins must be an array literal/);
  });

  it('handles multi-line / formatted arrays robustly', () => {
    const tree = makeTreeWithConfig(`import { defineConfig } from '@ng-prism/core/config';
import { otherPlugin } from '@ng-prism/plugin-other';

export default defineConfig({
  plugins: [
    otherPlugin(),
  ],
});
`);
    const changed = addPluginToConfig(tree, 'ng-prism.config.ts', JSDOC_OPTS);

    expect(changed).toBe(true);
    const result = tree.read('ng-prism.config.ts')!.toString('utf-8');
    expect(result).toMatch(/otherPlugin\(\)[\s\S]*jsDocPlugin\(\)/);
  });
});
