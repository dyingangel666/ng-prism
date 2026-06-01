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
});
