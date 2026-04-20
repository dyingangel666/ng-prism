import { Tree } from '@angular-devkit/schematics';
import { callRule, SchematicContext } from '@angular-devkit/schematics';
import { firstValueFrom } from 'rxjs';
import { ngAdd } from './index.js';

function createTree(projects: Record<string, unknown> = {}): Tree {
  const tree = Tree.empty();
  const angularJson = {
    $schema: './node_modules/@angular/cli/lib/config/workspace-schema.json',
    version: 1,
    projects,
  };
  tree.create('angular.json', JSON.stringify(angularJson, null, 2));
  tree.create('tsconfig.json', '{}');
  return tree;
}

function defaultLibProject() {
  return {
    'my-lib': {
      projectType: 'library',
      root: 'projects/my-lib',
      sourceRoot: 'projects/my-lib/src',
      architect: {
        build: {
          builder: '@angular-devkit/build-angular:ng-packagr',
          options: { project: 'projects/my-lib/ng-package.json' },
        },
      },
    },
  };
}

function readJson(tree: Tree, path: string): Record<string, unknown> {
  const buffer = tree.read(path);
  return JSON.parse(buffer!.toString('utf-8'));
}

const noop = (): void => { /* noop */ };

const mockContext = {
  engine: {},
  schematic: {},
  description: {},
  strategy: 0,
  logger: { info: noop, debug: noop, warn: noop, error: noop, fatal: noop },
  addTask: noop,
  interactive: false,
} as unknown as SchematicContext;

async function runSchematic(options: { project: string; port?: number }, tree: Tree): Promise<Tree> {
  const rule = ngAdd(options);
  return firstValueFrom(callRule(rule, tree, mockContext));
}

describe('ng-add schematic', () => {
  it('should create prism project directory with main.ts', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const files = [] as string[];
    result.visit((path) => files.push(path));
    expect(files).toContain('/projects/my-lib-prism/src/main.ts');
  });

  it('should generate main.ts with correct imports', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const mainTs = result.read('/projects/my-lib-prism/src/main.ts')!.toString('utf-8');
    expect(mainTs).toContain("import { bootstrapApplication } from '@angular/platform-browser'");
    expect(mainTs).toContain("import { PrismShellComponent, providePrism } from 'ng-prism'");
    expect(mainTs).toContain("import { PRISM_RUNTIME_MANIFEST } from './prism-manifest'");
    expect(mainTs).toContain("import config from 'ng-prism.config'");
    expect(mainTs).toContain('providePrism(PRISM_RUNTIME_MANIFEST, config)');
  });

  it('should add prism app project to angular.json', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspace = readJson(result, '/angular.json') as { projects: Record<string, Record<string, unknown>> };
    const prismProject = workspace.projects['my-lib-prism'];
    expect(prismProject).toBeDefined();
    expect(prismProject['projectType']).toBe('application');
    expect(prismProject['root']).toBe('projects/my-lib-prism');
    expect(prismProject['sourceRoot']).toBe('projects/my-lib-prism/src');
  });

  it('should add prism serve target to library project', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<string, { architect: Record<string, Record<string, unknown>> }>;
    };
    const prismTarget = workspace.projects['my-lib'].architect['prism'];
    expect(prismTarget).toBeDefined();
    expect(prismTarget['builder']).toBe('ng-prism:serve');
    const opts = prismTarget['options'] as Record<string, unknown>;
    expect(opts['entryPoint']).toBe('projects/my-lib/src/public-api.ts');
    expect(opts['prismProject']).toBe('my-lib-prism');
    expect(opts['libraryProject']).toBe('my-lib');
    expect(opts['port']).toBe(4400);
  });

  it('should add prism-build target to library project', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<string, { architect: Record<string, Record<string, unknown>> }>;
    };
    const buildTarget = workspace.projects['my-lib'].architect['prism-build'];
    expect(buildTarget).toBeDefined();
    expect(buildTarget['builder']).toBe('ng-prism:build');
    const opts = buildTarget['options'] as Record<string, unknown>;
    expect(opts['entryPoint']).toBe('projects/my-lib/src/public-api.ts');
    expect(opts['outputPath']).toBe('dist/my-lib-prism');

    const prismAppBuild = workspace.projects['my-lib-prism'].architect['build'];
    const prismOpts = prismAppBuild['options'] as Record<string, unknown>;
    expect(prismOpts['outputPath']).toEqual({ base: 'dist/my-lib-prism', browser: '' });
  });

  it('should create ng-prism.config.ts at workspace root', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const files = [] as string[];
    result.visit((path) => files.push(path));
    expect(files).toContain('/ng-prism.config.ts');
    const content = result.read('/ng-prism.config.ts')!.toString('utf-8');
    expect(content).toContain("import { defineConfig } from 'ng-prism/config'");
    expect(content).toContain('defineConfig({ plugins: [] })');
  });

  it('should not overwrite existing ng-prism.config.ts', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('ng-prism.config.ts', 'existing config');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(result.read('/ng-prism.config.ts')!.toString('utf-8')).toBe('existing config');
  });

  it('should create index.html in prism project', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(result.exists('/projects/my-lib-prism/src/index.html')).toBe(true);
    const indexHtml = result.read('/projects/my-lib-prism/src/index.html')!.toString('utf-8');
    expect(indexHtml).toContain('<prism-shell>');
  });

  it('should set index path in build config', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<string, { architect: Record<string, { options: Record<string, unknown> }> }>;
    };
    const buildOptions = workspace.projects['my-lib-prism'].architect['build'].options;
    expect(buildOptions['index']).toBe('projects/my-lib-prism/src/index.html');
    expect(buildOptions['polyfills']).toEqual(['zone.js']);
    expect(buildOptions['styles']).toEqual(['node_modules/highlight.js/styles/base16/solarized-dark.min.css']);
    expect(buildOptions['allowedCommonJsDependencies']).toEqual(['highlight.js']);
  });

  it('should add ng-prism.config and library paths to tsconfig.json', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const tsConfig = readJson(result, '/tsconfig.json') as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    expect(tsConfig.compilerOptions?.paths?.['ng-prism.config']).toEqual(['ng-prism.config.ts']);
    expect(tsConfig.compilerOptions?.paths?.['my-lib']).toEqual(['projects/my-lib/src/public-api.ts']);
  });

  it('should not overwrite existing main.ts', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('projects/my-lib-prism/src/main.ts', 'custom main');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(result.read('/projects/my-lib-prism/src/main.ts')!.toString('utf-8')).toBe('custom main');
  });

  it('should not overwrite existing index.html', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('projects/my-lib-prism/src/index.html', 'custom html');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(result.read('/projects/my-lib-prism/src/index.html')!.toString('utf-8')).toBe('custom html');
  });

  it('should not overwrite existing tsconfig.app.json', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('projects/my-lib-prism/tsconfig.app.json', 'custom tsconfig');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(result.read('/projects/my-lib-prism/tsconfig.app.json')!.toString('utf-8')).toBe('custom tsconfig');
  });

  it('should throw if project does not exist in angular.json', async () => {
    const tree = createTree(defaultLibProject());

    await expect(
      runSchematic({ project: 'nonexistent' }, tree),
    ).rejects.toThrow('Project "nonexistent" does not exist in angular.json');
  });
});
