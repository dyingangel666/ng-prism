import { Tree } from '@angular-devkit/schematics';
import { callRule, SchematicContext } from '@angular-devkit/schematics';
import { parse as parseJsonc } from 'jsonc-parser';
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
    expect(mainTs).toContain("import { PrismShellComponent, providePrism } from '@ng-prism/core'");
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
    expect(prismTarget['builder']).toBe('@ng-prism/core:serve');
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
    expect(buildTarget['builder']).toBe('@ng-prism/core:build');
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
    expect(content).toContain("import { defineConfig } from '@ng-prism/core/config'");
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

  it('should handle tsconfig.json with comments (JSONC)', async () => {
    const tree = createTree(defaultLibProject());
    tree.overwrite('tsconfig.json', '/* To learn more about this file see: https://angular.dev */\n{\n  "compilerOptions": {}\n}\n');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const tsConfig = parseJsonc(result.read('/tsconfig.json')!.toString('utf-8')) as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    expect(tsConfig.compilerOptions?.paths?.['ng-prism.config']).toEqual(['ng-prism.config.ts']);
  });

  it('should preserve comments and trailing commas in tsconfig.json', async () => {
    const tree = createTree(defaultLibProject());
    const original = [
      '/* To learn more about this file see: https://angular.dev */',
      '{',
      '  // important: strict mode',
      '  "compilerOptions": {',
      '    "strict": true,',
      '    // angular standalone projects',
      '    "experimentalDecorators": true,',
      '  },',
      '}',
      '',
    ].join('\n');
    tree.overwrite('tsconfig.json', original);

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const written = result.read('/tsconfig.json')!.toString('utf-8');
    expect(written).toContain('/* To learn more about this file see: https://angular.dev */');
    expect(written).toContain('// important: strict mode');
    expect(written).toContain('// angular standalone projects');
    expect(written).toContain('"strict": true');
    expect(written).toContain('"ng-prism.config"');
    expect(written).toContain('"my-lib"');
  });

  it('should throw if project does not exist in angular.json', async () => {
    const tree = createTree(defaultLibProject());

    await expect(
      runSchematic({ project: 'nonexistent' }, tree),
    ).rejects.toThrow('Project "nonexistent" does not exist in angular.json');
  });

  it('should add strip-showcase script to package.json', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('package.json', JSON.stringify({ name: 'my-workspace', scripts: {} }, null, 2));

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const pkg = readJson(result, '/package.json') as { scripts: Record<string, string> };
    expect(pkg.scripts['strip-showcase']).toBe('ng-prism-strip dist/my-lib');
  });

  it('should not overwrite existing strip-showcase script', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('package.json', JSON.stringify({
      name: 'my-workspace',
      scripts: { 'strip-showcase': 'custom-command' },
    }, null, 2));

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const pkg = readJson(result, '/package.json') as { scripts: Record<string, string> };
    expect(pkg.scripts['strip-showcase']).toBe('custom-command');
  });

  it('should add prism-manifest to .gitignore', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(result.exists('/.gitignore')).toBe(true);
    const gitignore = result.read('/.gitignore')!.toString('utf-8');
    expect(gitignore).toContain('projects/my-lib-prism/src/prism-manifest.ts');
  });

  it('should append to existing .gitignore without duplicating', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('.gitignore', 'node_modules\ndist\n');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const gitignore = result.read('/.gitignore')!.toString('utf-8');
    expect(gitignore).toContain('node_modules');
    expect(gitignore).toContain('projects/my-lib-prism/src/prism-manifest.ts');
  });

  it('should not duplicate prism-manifest entry in .gitignore', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('.gitignore', 'projects/my-lib-prism/src/prism-manifest.ts\n');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const gitignore = result.read('/.gitignore')!.toString('utf-8');
    const matches = gitignore.match(/prism-manifest\.ts/g);
    expect(matches).toHaveLength(1);
  });

  it('should be idempotent: second run preserves manually customized prism app config', async () => {
    const tree = createTree(defaultLibProject());

    await runSchematic({ project: 'my-lib' }, tree);

    const workspaceAfterFirst = readJson(tree, '/angular.json') as {
      projects: Record<string, { architect: Record<string, Record<string, unknown>> }>;
    };
    const customStyle = 'src/styles/custom.scss';
    const buildOptions = workspaceAfterFirst.projects['my-lib-prism'].architect['build']['options'] as Record<string, unknown>;
    (buildOptions['styles'] as string[]).push(customStyle);
    tree.overwrite('angular.json', JSON.stringify(workspaceAfterFirst, null, 2) + '\n');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspaceAfterSecond = readJson(result, '/angular.json') as {
      projects: Record<string, { architect: Record<string, Record<string, unknown>> }>;
    };
    const finalStyles = (workspaceAfterSecond.projects['my-lib-prism'].architect['build']['options'] as Record<string, unknown>)['styles'] as string[];
    expect(finalStyles).toContain(customStyle);
  });

  it('should be idempotent: second run preserves manually customized prism serve target', async () => {
    const tree = createTree(defaultLibProject());

    await runSchematic({ project: 'my-lib' }, tree);

    const workspaceAfterFirst = readJson(tree, '/angular.json') as {
      projects: Record<string, { architect: Record<string, Record<string, unknown>> }>;
    };
    const prismOptions = workspaceAfterFirst.projects['my-lib'].architect['prism']['options'] as Record<string, unknown>;
    prismOptions['port'] = 9999;
    tree.overwrite('angular.json', JSON.stringify(workspaceAfterFirst, null, 2) + '\n');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspaceAfterSecond = readJson(result, '/angular.json') as {
      projects: Record<string, { architect: Record<string, Record<string, unknown>> }>;
    };
    const finalOptions = workspaceAfterSecond.projects['my-lib'].architect['prism']['options'] as Record<string, unknown>;
    expect(finalOptions['port']).toBe(9999);
  });

  it('should be idempotent: second run preserves manually customized tsconfig path', async () => {
    const tree = createTree(defaultLibProject());

    await runSchematic({ project: 'my-lib' }, tree);

    const tsConfigAfterFirst = readJson(tree, '/tsconfig.json') as {
      compilerOptions: { paths: Record<string, string[]> };
    };
    tsConfigAfterFirst.compilerOptions.paths['my-lib'] = ['custom/path.ts'];
    tree.overwrite('tsconfig.json', JSON.stringify(tsConfigAfterFirst, null, 2) + '\n');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const tsConfigAfterSecond = readJson(result, '/tsconfig.json') as {
      compilerOptions: { paths: Record<string, string[]> };
    };
    expect(tsConfigAfterSecond.compilerOptions.paths['my-lib']).toEqual(['custom/path.ts']);
  });

  it('should log setup summary', async () => {
    const tree = createTree(defaultLibProject());
    const logs: string[] = [];
    const loggingContext = {
      ...mockContext,
      logger: { ...mockContext.logger, info: (msg: string) => logs.push(msg) },
    } as unknown as SchematicContext;

    const rule = ngAdd({ project: 'my-lib' });
    await firstValueFrom(callRule(rule, tree, loggingContext));

    expect(logs.some((l) => l.includes('my-lib-prism'))).toBe(true);
    expect(logs.some((l) => l.includes('ng run my-lib:prism'))).toBe(true);
  });
});
