import { Tree } from '@angular-devkit/schematics';
import { callRule, type SchematicContext } from '@angular-devkit/schematics';
import { firstValueFrom } from 'rxjs';
import { migrate } from './index.js';

interface AngularProject {
  projectType?: string;
  root?: string;
  sourceRoot?: string;
  architect?: Record<string, { builder: string; options?: Record<string, unknown> }>;
}

function createWorkspaceTree(projects: Record<string, AngularProject>): Tree {
  const tree = Tree.empty();
  tree.create(
    'angular.json',
    JSON.stringify(
      {
        $schema: './node_modules/@angular/cli/lib/config/workspace-schema.json',
        version: 1,
        projects,
      },
      null,
      2
    )
  );
  tree.create('tsconfig.json', '{ "compilerOptions": {} }');
  return tree;
}

function defaultProjects(): Record<string, AngularProject> {
  return {
    'my-lib': {
      projectType: 'library',
      root: 'projects/my-lib',
      sourceRoot: 'projects/my-lib/src',
      architect: {
        prism: {
          builder: '@ng-prism/core:serve',
          options: { entryPoint: 'projects/my-lib', prismProject: 'my-lib-prism' },
        },
      },
    },
    'my-lib-prism': {
      projectType: 'application',
      root: 'projects/my-lib-prism',
      sourceRoot: 'projects/my-lib-prism/src',
    },
  };
}

const noop = (): void => undefined;
const mockContext = {
  engine: {},
  schematic: {},
  description: {},
  strategy: 0,
  logger: { info: noop, debug: noop, warn: noop, error: noop, fatal: noop },
  addTask: noop,
  interactive: false,
} as unknown as SchematicContext;

async function run(tree: Tree): Promise<Tree> {
  return firstValueFrom(callRule(migrate(), tree, mockContext));
}

describe('migration v21-13-manifest-cache', () => {
  it('rewrites main.ts import to use the path-mapped specifier', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.create(
      'projects/my-lib-prism/src/main.ts',
      [
        "import { bootstrapApplication } from '@angular/platform-browser';",
        "import { PrismShellComponent, providePrism } from '@ng-prism/core';",
        "import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';",
        "import config from 'ng-prism.config';",
        '',
        'bootstrapApplication(PrismShellComponent, {',
        '  providers: [providePrism(PRISM_RUNTIME_MANIFEST, config)],',
        '});',
        '',
      ].join('\n')
    );

    const result = await run(tree);

    const mainTs = result
      .read('projects/my-lib-prism/src/main.ts')!
      .toString('utf-8');
    expect(mainTs).toContain(
      "import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest'"
    );
    expect(mainTs).not.toContain(
      "import { PRISM_RUNTIME_MANIFEST } from './prism-manifest'"
    );
  });

  it('is idempotent: a second run does not touch already-migrated main.ts', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    const migratedMain = [
      "import { bootstrapApplication } from '@angular/platform-browser';",
      "import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest';",
      '',
    ].join('\n');
    tree.create('projects/my-lib-prism/src/main.ts', migratedMain);

    const result = await run(tree);

    expect(
      result.read('projects/my-lib-prism/src/main.ts')!.toString('utf-8')
    ).toBe(migratedMain);
  });

  it('logs a warning and skips when main.ts has no recognizable import line', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.create(
      'projects/my-lib-prism/src/main.ts',
      'export const customSetup = true;\n'
    );

    const logs: string[] = [];
    const loggingContext = {
      ...mockContext,
      logger: {
        ...mockContext.logger,
        warn: (msg: string) => logs.push(msg),
      },
    } as unknown as SchematicContext;

    await firstValueFrom(callRule(migrate(), tree, loggingContext));

    expect(logs.some((l) => l.includes('main.ts'))).toBe(true);
  });

  it('skips projects without an @ng-prism/core:serve builder', async () => {
    const projects = {
      'other-lib': {
        projectType: 'library',
        root: 'projects/other-lib',
        sourceRoot: 'projects/other-lib/src',
        architect: {
          build: { builder: '@angular-devkit/build-angular:ng-packagr' },
        },
      },
    };
    const tree = createWorkspaceTree(projects);

    const result = await run(tree);

    expect(result.read('tsconfig.json')!.toString('utf-8')).toBe(
      '{ "compilerOptions": {} }'
    );
  });
});
