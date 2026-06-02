import { callRule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { firstValueFrom } from 'rxjs';
import { ngAdd } from './index.js';

const EMPTY_CONFIG = `import { defineConfig } from '@ng-prism/core/config';

export default defineConfig({ plugins: [] });
`;

const logCalls: Array<{ method: string; msg: string }> = [];
const captureLogger = {
  info: (msg: string) => logCalls.push({ method: 'info', msg }),
  debug: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
};

const mockContext = {
  engine: {},
  schematic: {},
  description: {},
  strategy: 0,
  logger: captureLogger,
  addTask: () => {},
  interactive: false,
} as unknown as SchematicContext;

async function run(tree: Tree, options: { configPath?: string } = {}) {
  return firstValueFrom(callRule(ngAdd(options), tree, mockContext));
}

describe('plugin-figma ng-add', () => {
  beforeEach(() => {
    logCalls.length = 0;
  });

  it('adds figmaPlugin import + call to empty config', async () => {
    const tree = Tree.empty();
    tree.create('ng-prism.config.ts', EMPTY_CONFIG);

    const result = await run(tree);
    const content = result.read('ng-prism.config.ts')!.toString('utf-8');

    expect(content).toContain(
      `import { figmaPlugin } from '@ng-prism/plugin-figma';`
    );
    expect(content).toContain('plugins: [figmaPlugin()]');
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

  it('logs optional peers hint after successful inject', async () => {
    const tree = Tree.empty();
    tree.create('ng-prism.config.ts', EMPTY_CONFIG);
    await run(tree);

    expect(logCalls.some((c) => c.msg.includes('html2canvas pixelmatch'))).toBe(
      true
    );
  });
});
