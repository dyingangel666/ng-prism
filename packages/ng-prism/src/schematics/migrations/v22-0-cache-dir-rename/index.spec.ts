import { Tree } from '@angular-devkit/schematics';
import { callRule, type SchematicContext } from '@angular-devkit/schematics';
import { firstValueFrom } from 'rxjs';
import { migrate } from './index.js';

interface AngularProject {
  projectType?: string;
  root?: string;
  sourceRoot?: string;
  architect?: Record<
    string,
    { builder: string; options?: Record<string, unknown> }
  >;
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
          options: {
            entryPoint: 'projects/my-lib',
            prismProject: 'my-lib-prism',
          },
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

describe('migration v22-0-cache-dir-rename', () => {
  it('rewrites the prism-manifest path mapping from .ng-prism/ to ng-prism-cache/', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.overwrite(
      'tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            paths: {
              'prism-manifest/*': ['./.ng-prism/*/prism-manifest.ts'],
            },
          },
        },
        null,
        2
      )
    );

    const result = await run(tree);

    const tsconfig = JSON.parse(
      result.read('tsconfig.json')!.toString('utf-8')
    ) as { compilerOptions: { paths: Record<string, string[]> } };
    expect(tsconfig.compilerOptions.paths['prism-manifest/*']).toEqual([
      './ng-prism-cache/*/prism-manifest.ts',
    ]);
  });

  it('preserves a user-customised path mapping', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.overwrite(
      'tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            paths: {
              'prism-manifest/*': ['./custom-location/*/manifest.ts'],
            },
          },
        },
        null,
        2
      )
    );

    const result = await run(tree);

    const tsconfig = JSON.parse(
      result.read('tsconfig.json')!.toString('utf-8')
    ) as { compilerOptions: { paths: Record<string, string[]> } };
    expect(tsconfig.compilerOptions.paths['prism-manifest/*']).toEqual([
      './custom-location/*/manifest.ts',
    ]);
  });

  it('inserts a new mapping if none existed', async () => {
    const tree = createWorkspaceTree(defaultProjects());

    const result = await run(tree);

    const tsconfig = JSON.parse(
      result.read('tsconfig.json')!.toString('utf-8')
    ) as { compilerOptions: { paths?: Record<string, string[]> } };
    expect(tsconfig.compilerOptions.paths?.['prism-manifest/*']).toEqual([
      './ng-prism-cache/*/prism-manifest.ts',
    ]);
  });

  it("updates each prism project's tsconfig.app.json include entry", async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.create(
      'projects/my-lib-prism/tsconfig.app.json',
      JSON.stringify(
        {
          extends: '../../tsconfig.json',
          compilerOptions: { outDir: '../../out-tsc/app', rootDir: '../..' },
          files: ['src/main.ts'],
          include: [
            'src/**/*.d.ts',
            '../../.ng-prism/my-lib-prism/**/*.ts',
          ],
        },
        null,
        2
      )
    );

    const result = await run(tree);

    const tsconfig = JSON.parse(
      result.read('projects/my-lib-prism/tsconfig.app.json')!.toString('utf-8')
    ) as { include: string[] };
    expect(tsconfig.include).toContain(
      '../../ng-prism-cache/my-lib-prism/**/*.ts'
    );
    expect(tsconfig.include).not.toContain(
      '../../.ng-prism/my-lib-prism/**/*.ts'
    );
  });

  it('renames the .ng-prism/ entry in .gitignore to ng-prism-cache/', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.create('.gitignore', 'node_modules\ndist\n.ng-prism/\n');

    const result = await run(tree);

    const gitignore = result.read('.gitignore')!.toString('utf-8');
    expect(gitignore).toContain('ng-prism-cache/');
    expect(gitignore).not.toContain('.ng-prism/');
    expect(gitignore).toContain('node_modules');
    expect(gitignore).toContain('dist');
  });

  it('ensures ng-prism-cache/ exists in .gitignore even when .ng-prism/ was already missing', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.create('.gitignore', 'node_modules\ndist\n');

    const result = await run(tree);

    const gitignore = result.read('.gitignore')!.toString('utf-8');
    expect(gitignore).toContain('ng-prism-cache/');
  });

  it('is idempotent: a second run after migration does not change anything', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.overwrite(
      'tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            paths: {
              'prism-manifest/*': ['./ng-prism-cache/*/prism-manifest.ts'],
            },
          },
        },
        null,
        2
      )
    );
    tree.create('.gitignore', 'node_modules\nng-prism-cache/\n');

    const before = {
      tsconfig: tree.read('tsconfig.json')!.toString('utf-8'),
      gitignore: tree.read('.gitignore')!.toString('utf-8'),
    };

    const result = await run(tree);

    expect(result.read('tsconfig.json')!.toString('utf-8')).toBe(
      before.tsconfig
    );
    expect(result.read('.gitignore')!.toString('utf-8')).toBe(
      before.gitignore
    );
  });

  it('skips projects without an @ng-prism/core:serve builder', async () => {
    const tree = createWorkspaceTree({
      'other-lib': {
        projectType: 'library',
        root: 'projects/other-lib',
        sourceRoot: 'projects/other-lib/src',
        architect: {
          build: { builder: '@angular-devkit/build-angular:ng-packagr' },
        },
      },
    });
    const result = await run(tree);

    expect(result.read('tsconfig.json')!.toString('utf-8')).toBe(
      '{ "compilerOptions": {} }'
    );
  });
});
