import { callRule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { firstValueFrom } from 'rxjs';
import { ngAdd } from './index.js';

const EMPTY_CONFIG = `import { defineConfig } from '@ng-prism/core/config';

export default defineConfig({ plugins: [] });
`;

const noop = (): void => {
  /* noop */
};
const mockContext = {
  engine: {},
  schematic: {},
  description: {},
  strategy: 0,
  logger: { info: noop, debug: noop, warn: noop, error: noop, fatal: noop },
  addTask: noop,
  interactive: false,
} as unknown as SchematicContext;

async function run(tree: Tree, options: { configPath?: string } = {}) {
  return firstValueFrom(callRule(ngAdd(options), tree, mockContext));
}

describe('plugin-jsdoc ng-add', () => {
  it('adds jsDocPlugin import + call to empty config', async () => {
    const tree = Tree.empty();
    tree.create('ng-prism.config.ts', EMPTY_CONFIG);

    const result = await run(tree);
    const content = result.read('ng-prism.config.ts')!.toString('utf-8');

    expect(content).toContain(
      `import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';`
    );
    expect(content).toContain('plugins: [jsDocPlugin()]');
  });

  it('is idempotent on re-run', async () => {
    const tree = Tree.empty();
    tree.create('ng-prism.config.ts', EMPTY_CONFIG);

    const first = await run(tree);
    const afterFirst = first.read('ng-prism.config.ts')!.toString('utf-8');
    const second = await run(first);
    const afterSecond = second.read('ng-prism.config.ts')!.toString('utf-8');

    expect(afterSecond).toBe(afterFirst);
  });

  it('throws when ng-prism.config.ts is missing', async () => {
    const tree = Tree.empty();
    await expect(run(tree)).rejects.toThrow(
      /Run "ng add @ng-prism\/core" first/
    );
  });
});
