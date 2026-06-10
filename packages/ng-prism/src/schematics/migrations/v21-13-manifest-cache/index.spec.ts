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
      "import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/my-lib-prism'"
    );
    expect(mainTs).not.toContain(
      "import { PRISM_RUNTIME_MANIFEST } from './prism-manifest'"
    );
  });

  it('is idempotent: a second run does not touch already-migrated main.ts', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    const migratedMain = [
      "import { bootstrapApplication } from '@angular/platform-browser';",
      "import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/my-lib-prism';",
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

  it('adds prism-manifest path mapping for each prism project', async () => {
    const tree = createWorkspaceTree(defaultProjects());

    const result = await run(tree);

    const tsconfig = JSON.parse(
      result.read('tsconfig.json')!.toString('utf-8')
    ) as { compilerOptions: { paths: Record<string, string[]> } };
    expect(tsconfig.compilerOptions.paths['prism-manifest/*']).toEqual([
      '.ng-prism/*/prism-manifest.ts',
    ]);
  });

  it('is idempotent: does not overwrite an existing prism-manifest mapping', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.overwrite(
      'tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            paths: { 'prism-manifest/*': ['custom/elsewhere.ts'] },
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
      'custom/elsewhere.ts',
    ]);
  });

  it('deletes the legacy prism-manifest.ts from sourceRoot', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.create(
      'projects/my-lib-prism/src/prism-manifest.ts',
      '// auto-generated\n'
    );

    const result = await run(tree);

    expect(result.exists('projects/my-lib-prism/src/prism-manifest.ts')).toBe(
      false
    );
  });

  it('is a no-op when the legacy prism-manifest.ts is already gone', async () => {
    const tree = createWorkspaceTree(defaultProjects());

    await expect(run(tree)).resolves.toBeDefined();
  });

  it('removes the specific prism-manifest entry from .gitignore', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.create(
      '.gitignore',
      [
        'node_modules',
        'dist',
        'projects/my-lib-prism/src/prism-manifest.ts',
        '',
      ].join('\n')
    );

    const result = await run(tree);

    const gitignore = result.read('.gitignore')!.toString('utf-8');
    expect(gitignore).not.toContain('projects/my-lib-prism/src/prism-manifest.ts');
    expect(gitignore).toContain('node_modules');
    expect(gitignore).toContain('dist');
  });

  it('creates .gitignore with .ng-prism/ when it does not exist', async () => {
    const tree = createWorkspaceTree(defaultProjects());

    const result = await run(tree);

    expect(result.exists('.gitignore')).toBe(true);
    expect(result.read('.gitignore')!.toString('utf-8')).toContain(
      '.ng-prism/'
    );
  });

  it('is a no-op when the specific entry is not present', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    const original = 'node_modules\ndist\n';
    tree.create('.gitignore', original);

    const result = await run(tree);

    // NOTE: removeGitignoreEntry leaves the file untouched, but ensureNgPrismGitignoreEntry
    // still appends .ng-prism/. The original entries are preserved.
    const gitignore = result.read('.gitignore')!.toString('utf-8');
    expect(gitignore).toContain('node_modules');
    expect(gitignore).toContain('dist');
    expect(gitignore).toContain('.ng-prism/');
  });

  it('ensures .ng-prism/ is in .gitignore', async () => {
    const tree = createWorkspaceTree(defaultProjects());

    const result = await run(tree);

    const gitignore = result.read('.gitignore');
    expect(gitignore).not.toBeNull();
    expect(gitignore!.toString('utf-8')).toContain('.ng-prism/');
  });

  it('does not duplicate .ng-prism/ when already in .gitignore', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.create('.gitignore', 'node_modules\n.ng-prism/\n');

    const result = await run(tree);

    const gitignore = result.read('.gitignore')!.toString('utf-8');
    const matches = gitignore.match(/\.ng-prism\//g);
    expect(matches).toHaveLength(1);
  });

  it('preserves existing entries when adding .ng-prism/', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.create('.gitignore', 'node_modules\ndist\n');

    const result = await run(tree);

    const gitignore = result.read('.gitignore')!.toString('utf-8');
    expect(gitignore).toContain('node_modules');
    expect(gitignore).toContain('dist');
    expect(gitignore).toContain('.ng-prism/');
  });

  it('migrates all prism projects in a multi-library workspace', async () => {
    const projects: Record<string, AngularProject> = {
      'lib-a': {
        projectType: 'library',
        root: 'projects/lib-a',
        sourceRoot: 'projects/lib-a/src',
        architect: {
          prism: {
            builder: '@ng-prism/core:serve',
            options: { entryPoint: 'projects/lib-a', prismProject: 'lib-a-prism' },
          },
        },
      },
      'lib-a-prism': {
        projectType: 'application',
        root: 'projects/lib-a-prism',
        sourceRoot: 'projects/lib-a-prism/src',
      },
      'lib-b': {
        projectType: 'library',
        root: 'projects/lib-b',
        sourceRoot: 'projects/lib-b/src',
        architect: {
          prism: {
            builder: '@ng-prism/core:serve',
            options: { entryPoint: 'projects/lib-b', prismProject: 'lib-b-prism' },
          },
        },
      },
      'lib-b-prism': {
        projectType: 'application',
        root: 'projects/lib-b-prism',
        sourceRoot: 'projects/lib-b-prism/src',
      },
    };
    const tree = createWorkspaceTree(projects);
    tree.create(
      'projects/lib-a-prism/src/main.ts',
      "import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';\n"
    );
    tree.create(
      'projects/lib-b-prism/src/main.ts',
      "import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';\n"
    );

    const result = await run(tree);

    // Wildcard mapping makes both projects coexist cleanly.
    const tsconfig = JSON.parse(
      result.read('tsconfig.json')!.toString('utf-8')
    ) as { compilerOptions: { paths: Record<string, string[]> } };
    expect(tsconfig.compilerOptions.paths['prism-manifest/*']).toEqual([
      '.ng-prism/*/prism-manifest.ts',
    ]);

    expect(
      result.read('projects/lib-a-prism/src/main.ts')!.toString('utf-8')
    ).toContain("from 'prism-manifest/lib-a-prism'");
    expect(
      result.read('projects/lib-b-prism/src/main.ts')!.toString('utf-8')
    ).toContain("from 'prism-manifest/lib-b-prism'");
  });

  it('migrates a workspace already on the intermediate single-key import form', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    tree.create(
      'projects/my-lib-prism/src/main.ts',
      "import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest';\n"
    );

    const result = await run(tree);

    const mainTs = result
      .read('projects/my-lib-prism/src/main.ts')!
      .toString('utf-8');
    expect(mainTs).toContain(
      "import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/my-lib-prism'"
    );
  });

  it('does not rewrite a commented-out PRISM_RUNTIME_MANIFEST import line', async () => {
    const tree = createWorkspaceTree(defaultProjects());
    const mainTs = [
      "// import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';",
      "import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/my-lib-prism';",
      '',
    ].join('\n');
    tree.create('projects/my-lib-prism/src/main.ts', mainTs);

    const result = await run(tree);

    const after = result
      .read('projects/my-lib-prism/src/main.ts')!
      .toString('utf-8');
    // commented line untouched
    expect(after).toContain(
      "// import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';"
    );
    // live import already correct, unchanged
    expect(after.match(/PRISM_RUNTIME_MANIFEST/g)?.length).toBe(2);
  });
});
