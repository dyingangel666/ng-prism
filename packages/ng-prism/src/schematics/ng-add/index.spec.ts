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

async function runSchematic(
  options: { project: string; port?: number; zoneless?: boolean },
  tree: Tree
): Promise<Tree> {
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

    const mainTs = result
      .read('/projects/my-lib-prism/src/main.ts')!
      .toString('utf-8');
    expect(mainTs).toContain(
      "import { bootstrapApplication } from '@angular/platform-browser'"
    );
    expect(mainTs).toContain(
      "import { enablePrismHmr, PrismShellComponent, providePrism } from '@ng-prism/core'"
    );
    expect(mainTs).toContain(
      "import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/my-lib-prism'"
    );
    expect(mainTs).toContain("import config from 'ng-prism.config'");
    expect(mainTs).toContain('providePrism(PRISM_RUNTIME_MANIFEST, config)');
    expect(mainTs).toContain('enablePrismHmr');
    expect(mainTs).toContain("hot?.accept('prism-manifest/my-lib-prism',");
  });

  it('should add prism app project to angular.json', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<string, Record<string, unknown>>;
    };
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
      projects: Record<
        string,
        { architect: Record<string, Record<string, unknown>> }
      >;
    };
    const prismTarget = workspace.projects['my-lib'].architect['prism'];
    expect(prismTarget).toBeDefined();
    expect(prismTarget['builder']).toBe('@ng-prism/core:serve');
    const opts = prismTarget['options'] as Record<string, unknown>;
    expect(opts['entryPoint']).toBe('projects/my-lib');
    expect(opts['prismProject']).toBe('my-lib-prism');
    expect(opts['libraryProject']).toBe('my-lib');
    expect(opts['port']).toBe(4400);
  });

  it('should add prism-build target to library project', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, Record<string, unknown>> }
      >;
    };
    const buildTarget = workspace.projects['my-lib'].architect['prism-build'];
    expect(buildTarget).toBeDefined();
    expect(buildTarget['builder']).toBe('@ng-prism/core:build');
    const opts = buildTarget['options'] as Record<string, unknown>;
    expect(opts['entryPoint']).toBe('projects/my-lib');
    expect(opts['outputPath']).toBe('dist/my-lib-prism');

    const prismAppBuild = workspace.projects['my-lib-prism'].architect['build'];
    const prismOpts = prismAppBuild['options'] as Record<string, unknown>;
    expect(prismOpts['outputPath']).toEqual({
      base: 'dist/my-lib-prism',
      browser: '',
    });
  });

  it('should create ng-prism.config.ts at workspace root', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const files = [] as string[];
    result.visit((path) => files.push(path));
    expect(files).toContain('/ng-prism.config.ts');
    const content = result.read('/ng-prism.config.ts')!.toString('utf-8');
    expect(content).toContain(
      "import { defineConfig } from '@ng-prism/core/config'"
    );
    expect(content).toContain('defineConfig({ plugins: [] })');
  });

  it('should not overwrite existing ng-prism.config.ts', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('ng-prism.config.ts', 'existing config');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(result.read('/ng-prism.config.ts')!.toString('utf-8')).toBe(
      'existing config'
    );
  });

  it('should create index.html in prism project', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(result.exists('/projects/my-lib-prism/src/index.html')).toBe(true);
    const indexHtml = result
      .read('/projects/my-lib-prism/src/index.html')!
      .toString('utf-8');
    expect(indexHtml).toContain('<prism-shell>');
  });

  it('should set index path in build config', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, { options: Record<string, unknown> }> }
      >;
    };
    const buildOptions =
      workspace.projects['my-lib-prism'].architect['build'].options;
    expect(buildOptions['index']).toBe('projects/my-lib-prism/src/index.html');
    expect(buildOptions['polyfills']).toEqual(['zone.js']);
    expect(buildOptions['styles']).toEqual([
      'node_modules/highlight.js/styles/base16/solarized-dark.min.css',
    ]);
    expect(buildOptions['allowedCommonJsDependencies']).toEqual([
      'highlight.js',
      'axe-core',
    ]);
  });

  it('should split outputHashing into production and development configurations', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, Record<string, unknown>> }
      >;
    };
    const build = workspace.projects['my-lib-prism'].architect['build'];
    const options = build['options'] as Record<string, unknown>;
    const configurations = build['configurations'] as Record<
      string,
      Record<string, unknown>
    >;

    expect(options['outputHashing']).toBeUndefined();
    expect(configurations['production']['outputHashing']).toBe('all');
    expect(configurations['development']['outputHashing']).toBe('none');
    expect(configurations['development']['optimization']).toBe(false);
    expect(configurations['development']['sourceMap']).toBe(true);
    expect(build['defaultConfiguration']).toBe('production');
  });

  it('should configure serve target for HMR against the development configuration', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, { options: Record<string, unknown> }> }
      >;
    };
    const serveOptions =
      workspace.projects['my-lib-prism'].architect['serve'].options;

    expect(serveOptions['buildTarget']).toBe('my-lib-prism:build:development');
    expect(serveOptions['hmr']).toBe(true);
    expect(serveOptions['liveReload']).toBe(true);
  });

  it('should add ng-prism.config and library paths to tsconfig.json', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const tsConfig = readJson(result, '/tsconfig.json') as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    expect(tsConfig.compilerOptions?.paths?.['ng-prism.config']).toEqual([
      './ng-prism.config.ts',
    ]);
    expect(tsConfig.compilerOptions?.paths?.['my-lib']).toEqual([
      './projects/my-lib/src/public-api.ts',
    ]);
    expect(tsConfig.compilerOptions?.paths?.['prism-manifest/*']).toEqual([
      './ng-prism-cache/*/prism-manifest.ts',
    ]);
  });

  it('should add ng-prism-cache/ entry to .gitignore', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(result.exists('/.gitignore')).toBe(true);
    const gitignore = result.read('/.gitignore')!.toString('utf-8');
    expect(gitignore).toContain('ng-prism-cache/');
  });

  it('should append ng-prism-cache/ to an existing .gitignore without duplicating', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('.gitignore', 'node_modules\ndist\n');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const gitignore = result.read('/.gitignore')!.toString('utf-8');
    expect(gitignore).toContain('node_modules');
    expect(gitignore).toContain('ng-prism-cache/');
  });

  it('should not duplicate ng-prism-cache/ entry in .gitignore', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('.gitignore', 'ng-prism-cache/\n');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const gitignore = result.read('/.gitignore')!.toString('utf-8');
    const matches = gitignore.match(/ng-prism-cache\//g);
    expect(matches).toHaveLength(1);
  });

  it('should include the cache manifest in the prism tsconfig.app.json so it satisfies rootDir', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const tsconfigApp = JSON.parse(
      result.read('/projects/my-lib-prism/tsconfig.app.json')!.toString('utf-8')
    ) as {
      compilerOptions: { rootDir?: string };
      include: string[];
    };
    expect(tsconfigApp.compilerOptions.rootDir).toBe('../..');
    expect(tsconfigApp.include).toContain('src/**/*.d.ts');
    expect(tsconfigApp.include).toContain(
      '../../ng-prism-cache/my-lib-prism/**/*.ts'
    );
  });

  it('should not overwrite existing main.ts', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('projects/my-lib-prism/src/main.ts', 'custom main');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(
      result.read('/projects/my-lib-prism/src/main.ts')!.toString('utf-8')
    ).toBe('custom main');
  });

  it('should not overwrite existing index.html', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('projects/my-lib-prism/src/index.html', 'custom html');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(
      result.read('/projects/my-lib-prism/src/index.html')!.toString('utf-8')
    ).toBe('custom html');
  });

  it('should not overwrite existing tsconfig.app.json', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('projects/my-lib-prism/tsconfig.app.json', 'custom tsconfig');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    expect(
      result.read('/projects/my-lib-prism/tsconfig.app.json')!.toString('utf-8')
    ).toBe('custom tsconfig');
  });

  it('should handle tsconfig.json with comments (JSONC)', async () => {
    const tree = createTree(defaultLibProject());
    tree.overwrite(
      'tsconfig.json',
      '/* To learn more about this file see: https://angular.dev */\n{\n  "compilerOptions": {}\n}\n'
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const tsConfig = parseJsonc(
      result.read('/tsconfig.json')!.toString('utf-8')
    ) as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    expect(tsConfig.compilerOptions?.paths?.['ng-prism.config']).toEqual([
      './ng-prism.config.ts',
    ]);
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
    expect(written).toContain(
      '/* To learn more about this file see: https://angular.dev */'
    );
    expect(written).toContain('// important: strict mode');
    expect(written).toContain('// angular standalone projects');
    expect(written).toContain('"strict": true');
    expect(written).toContain('"ng-prism.config"');
    expect(written).toContain('"my-lib"');
  });

  it('should throw if project does not exist in angular.json', async () => {
    const tree = createTree(defaultLibProject());

    await expect(
      runSchematic({ project: 'nonexistent' }, tree)
    ).rejects.toThrow('Project "nonexistent" does not exist in angular.json');
  });

  it('should add strip-showcase script to package.json', async () => {
    const tree = createTree(defaultLibProject());
    tree.create(
      'package.json',
      JSON.stringify({ name: 'my-workspace', scripts: {} }, null, 2)
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const pkg = readJson(result, '/package.json') as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['strip-showcase']).toBe('ng-prism-strip dist/my-lib');
  });

  it('should not overwrite existing strip-showcase script', async () => {
    const tree = createTree(defaultLibProject());
    tree.create(
      'package.json',
      JSON.stringify(
        {
          name: 'my-workspace',
          scripts: { 'strip-showcase': 'custom-command' },
        },
        null,
        2
      )
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const pkg = readJson(result, '/package.json') as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['strip-showcase']).toBe('custom-command');
  });

  it('should be idempotent: second run preserves manually customized prism app config', async () => {
    const tree = createTree(defaultLibProject());

    await runSchematic({ project: 'my-lib' }, tree);

    const workspaceAfterFirst = readJson(tree, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, Record<string, unknown>> }
      >;
    };
    const customStyle = 'src/styles/custom.scss';
    const buildOptions = workspaceAfterFirst.projects['my-lib-prism'].architect[
      'build'
    ]['options'] as Record<string, unknown>;
    (buildOptions['styles'] as string[]).push(customStyle);
    tree.overwrite(
      'angular.json',
      JSON.stringify(workspaceAfterFirst, null, 2) + '\n'
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspaceAfterSecond = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, Record<string, unknown>> }
      >;
    };
    const finalStyles = (
      workspaceAfterSecond.projects['my-lib-prism'].architect['build'][
        'options'
      ] as Record<string, unknown>
    )['styles'] as string[];
    expect(finalStyles).toContain(customStyle);
  });

  it('should be idempotent: second run preserves manually customized prism serve target', async () => {
    const tree = createTree(defaultLibProject());

    await runSchematic({ project: 'my-lib' }, tree);

    const workspaceAfterFirst = readJson(tree, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, Record<string, unknown>> }
      >;
    };
    const prismOptions = workspaceAfterFirst.projects['my-lib'].architect[
      'prism'
    ]['options'] as Record<string, unknown>;
    prismOptions['port'] = 9999;
    tree.overwrite(
      'angular.json',
      JSON.stringify(workspaceAfterFirst, null, 2) + '\n'
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspaceAfterSecond = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, Record<string, unknown>> }
      >;
    };
    const finalOptions = workspaceAfterSecond.projects['my-lib'].architect[
      'prism'
    ]['options'] as Record<string, unknown>;
    expect(finalOptions['port']).toBe(9999);
  });

  it('should be idempotent: second run preserves manually customized tsconfig path', async () => {
    const tree = createTree(defaultLibProject());

    await runSchematic({ project: 'my-lib' }, tree);

    const tsConfigAfterFirst = readJson(tree, '/tsconfig.json') as {
      compilerOptions: { paths: Record<string, string[]> };
    };
    tsConfigAfterFirst.compilerOptions.paths['my-lib'] = ['custom/path.ts'];
    tree.overwrite(
      'tsconfig.json',
      JSON.stringify(tsConfigAfterFirst, null, 2) + '\n'
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const tsConfigAfterSecond = readJson(result, '/tsconfig.json') as {
      compilerOptions: { paths: Record<string, string[]> };
    };
    expect(tsConfigAfterSecond.compilerOptions.paths['my-lib']).toEqual([
      'custom/path.ts',
    ]);
  });

  it('should be idempotent: second run preserves manually customized prism-manifest path', async () => {
    const tree = createTree(defaultLibProject());

    await runSchematic({ project: 'my-lib' }, tree);

    const tsConfigAfterFirst = readJson(tree, '/tsconfig.json') as {
      compilerOptions: { paths: Record<string, string[]> };
    };
    tsConfigAfterFirst.compilerOptions.paths['prism-manifest/*'] = [
      'custom/path.ts',
    ];
    tree.overwrite(
      'tsconfig.json',
      JSON.stringify(tsConfigAfterFirst, null, 2) + '\n'
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const tsConfigAfterSecond = readJson(result, '/tsconfig.json') as {
      compilerOptions: { paths: Record<string, string[]> };
    };
    expect(
      tsConfigAfterSecond.compilerOptions.paths['prism-manifest/*']
    ).toEqual(['custom/path.ts']);
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

  it('adds runtime peer deps to devDependencies', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('package.json', JSON.stringify({ name: 'host' }) + '\n');

    const result = await runSchematic({ project: 'my-lib' }, tree);
    const pkg = readJson(result, 'package.json') as {
      devDependencies?: Record<string, string>;
    };

    expect(pkg.devDependencies?.['highlight.js']).toBe('^11.0.0');
    expect(pkg.devDependencies?.['ngx-highlightjs']).toBe('^14.0.0');
  });

  it('does not overwrite existing dependencies', async () => {
    const tree = createTree(defaultLibProject());
    tree.create(
      'package.json',
      JSON.stringify({
        name: 'host',
        devDependencies: { 'highlight.js': '^10.0.0' },
      }) + '\n'
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);
    const pkg = readJson(result, 'package.json') as {
      devDependencies?: Record<string, string>;
    };

    expect(pkg.devDependencies?.['highlight.js']).toBe('^10.0.0');
    expect(pkg.devDependencies?.['ngx-highlightjs']).toBe('^14.0.0');
  });

  it('respects existing entries in dependencies (not devDependencies)', async () => {
    const tree = createTree(defaultLibProject());
    tree.create(
      'package.json',
      JSON.stringify({
        name: 'host',
        dependencies: { 'highlight.js': '11.0.0' },
      }) + '\n'
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);
    const pkg = readJson(result, 'package.json') as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(pkg.dependencies?.['highlight.js']).toBe('11.0.0');
    expect(pkg.devDependencies?.['highlight.js']).toBeUndefined();
  });

  it('should generate main.ts with provideZonelessChangeDetection when zoneless=true', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic(
      { project: 'my-lib', zoneless: true },
      tree
    );

    const mainTs = result
      .read('/projects/my-lib-prism/src/main.ts')!
      .toString('utf-8');
    expect(mainTs).toContain(
      "import { provideZonelessChangeDetection } from '@angular/core'"
    );
    expect(mainTs).toContain('provideZonelessChangeDetection()');
    const zonelessIndex = mainTs.indexOf('provideZonelessChangeDetection()');
    const providePrismIndex = mainTs.indexOf(
      'providePrism(PRISM_RUNTIME_MANIFEST, config)'
    );
    expect(zonelessIndex).toBeGreaterThan(-1);
    expect(providePrismIndex).toBeGreaterThan(-1);
    expect(zonelessIndex).toBeLessThan(providePrismIndex);
    expect(mainTs).toContain('enablePrismHmr');
    expect(mainTs).toContain("hot?.accept('prism-manifest/my-lib-prism',");
  });

  it('should write empty polyfills array when zoneless=true', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic(
      { project: 'my-lib', zoneless: true },
      tree
    );

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, { options: Record<string, unknown> }> }
      >;
    };
    const buildOptions =
      workspace.projects['my-lib-prism'].architect['build'].options;
    expect(buildOptions['polyfills']).toEqual([]);
  });

  it('should NOT include provideZonelessChangeDetection when zoneless option is omitted', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const mainTs = result
      .read('/projects/my-lib-prism/src/main.ts')!
      .toString('utf-8');
    expect(mainTs).not.toContain('provideZonelessChangeDetection');
  });

  it('should NOT include provideZonelessChangeDetection when zoneless=false', async () => {
    const tree = createTree(defaultLibProject());

    const result = await runSchematic(
      { project: 'my-lib', zoneless: false },
      tree
    );

    const mainTs = result
      .read('/projects/my-lib-prism/src/main.ts')!
      .toString('utf-8');
    expect(mainTs).not.toContain('provideZonelessChangeDetection');

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, { options: Record<string, unknown> }> }
      >;
    };
    const buildOptions =
      workspace.projects['my-lib-prism'].architect['build'].options;
    expect(buildOptions['polyfills']).toEqual(['zone.js']);
  });

  it('should be idempotent with --zoneless: second run does not modify zoneless main.ts', async () => {
    const tree = createTree(defaultLibProject());

    await runSchematic({ project: 'my-lib', zoneless: true }, tree);
    const mainTsAfterFirst = tree
      .read('/projects/my-lib-prism/src/main.ts')!
      .toString('utf-8');

    const result = await runSchematic(
      { project: 'my-lib', zoneless: true },
      tree
    );

    const mainTsAfterSecond = result
      .read('/projects/my-lib-prism/src/main.ts')!
      .toString('utf-8');
    expect(mainTsAfterSecond).toBe(mainTsAfterFirst);
  });
});

/**
 * Nx never puts an `angular.json` on disk, but its `wrapAngularDevkitSchematic`
 * bridge synthesizes one into the schematic `Tree` from the project graph and
 * translates writes back into per-project `project.json` files. So the Tree a
 * schematic sees in Nx still has `angular.json` — what differs is everything
 * around it: the layout, `tsconfig.base.json`, and the installed builder.
 */
function createNxTree(
  options: {
    withAppsDir?: boolean;
    workspaceLayout?: Record<string, string>;
    angularBuild?: boolean;
  } = {}
): Tree {
  const { withAppsDir = true, workspaceLayout, angularBuild = true } = options;
  const tree = Tree.empty();

  tree.create(
    'angular.json',
    JSON.stringify(
      {
        version: 1,
        projects: {
          button: {
            projectType: 'library',
            root: 'libs/button',
            sourceRoot: 'libs/button/src',
            architect: {
              build: { builder: '@nx/angular:package', options: {} },
            },
          },
        },
      },
      null,
      2
    )
  );

  tree.create(
    'nx.json',
    JSON.stringify(workspaceLayout ? { workspaceLayout } : {}, null, 2)
  );

  tree.create(
    'tsconfig.base.json',
    JSON.stringify(
      { compilerOptions: { paths: { button: ['libs/button/src/index.ts'] } } },
      null,
      2
    )
  );

  tree.create(
    'package.json',
    JSON.stringify(
      {
        name: 'nxws',
        devDependencies: {
          nx: '22.7.8',
          ...(angularBuild ? { '@angular/build': '21.2.14' } : {}),
          ...(angularBuild
            ? {}
            : { '@angular-devkit/build-angular': '21.2.14' }),
        },
      },
      null,
      2
    )
  );

  tree.create('libs/button/src/index.ts', 'export {};\n');

  if (withAppsDir) {
    tree.create('apps/demo/project.json', JSON.stringify({ name: 'demo' }));
  }

  return tree;
}

describe('ng-add schematic — Nx workspaces', () => {
  it('should place the showcase app under apps/ when that layout exists', async () => {
    const tree = createNxTree();

    const result = await runSchematic({ project: 'button' }, tree);

    const files = [] as string[];
    result.visit((path) => files.push(path));
    expect(files).toContain('/apps/button-prism/src/main.ts');
    expect(files).not.toContain('/projects/button-prism/src/main.ts');

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<string, Record<string, unknown>>;
    };
    expect(workspace.projects['button-prism']['root']).toBe(
      'apps/button-prism'
    );
    expect(workspace.projects['button-prism']['sourceRoot']).toBe(
      'apps/button-prism/src'
    );
  });

  it('should honour workspaceLayout.appsDir from nx.json', async () => {
    const tree = createNxTree({
      withAppsDir: false,
      workspaceLayout: { appsDir: 'packages/apps' },
    });

    const result = await runSchematic({ project: 'button' }, tree);

    const files = [] as string[];
    result.visit((path) => files.push(path));
    expect(files).toContain('/packages/apps/button-prism/src/main.ts');
  });

  it('should fall back to the library parent directory when there is no apps dir', async () => {
    const tree = createNxTree({ withAppsDir: false });

    const result = await runSchematic({ project: 'button' }, tree);

    const files = [] as string[];
    result.visit((path) => files.push(path));
    expect(files).toContain('/libs/button-prism/src/main.ts');
  });

  it('should use @angular/build executors when it is a direct dependency', async () => {
    const tree = createNxTree();

    const result = await runSchematic({ project: 'button' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, Record<string, unknown>> }
      >;
    };
    const architect = workspace.projects['button-prism'].architect;
    expect(architect['build']['builder']).toBe('@angular/build:application');
    expect(architect['serve']['builder']).toBe('@angular/build:dev-server');
  });

  it('should write path mappings to tsconfig.base.json, not tsconfig.json', async () => {
    const tree = createNxTree();

    const result = await runSchematic({ project: 'button' }, tree);

    const base = readJson(result, '/tsconfig.base.json') as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    expect(base.compilerOptions?.paths?.['ng-prism.config']).toEqual([
      './ng-prism.config.ts',
    ]);
    expect(base.compilerOptions?.paths?.['prism-manifest/*']).toEqual([
      './ng-prism-cache/*/prism-manifest.ts',
    ]);
    expect(result.exists('/tsconfig.json')).toBe(false);
  });

  it('should leave the existing Nx library path mapping untouched', async () => {
    const tree = createNxTree();

    const result = await runSchematic({ project: 'button' }, tree);

    const base = readJson(result, '/tsconfig.base.json') as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    expect(base.compilerOptions?.paths?.['button']).toEqual([
      'libs/button/src/index.ts',
    ]);
  });

  it('should extend tsconfig.base.json from the generated tsconfig.app.json', async () => {
    const tree = createNxTree();

    const result = await runSchematic({ project: 'button' }, tree);

    const tsconfigApp = JSON.parse(
      result.read('/apps/button-prism/tsconfig.app.json')!.toString('utf-8')
    ) as {
      extends: string;
      compilerOptions: { outDir: string; rootDir: string };
      include: string[];
    };
    expect(tsconfigApp.extends).toBe('../../tsconfig.base.json');
    expect(tsconfigApp.compilerOptions.rootDir).toBe('../..');
    expect(tsconfigApp.include).toContain(
      '../../ng-prism-cache/button-prism/**/*.ts'
    );
  });

  it('should compute the relative prefix from a nested app directory', async () => {
    const tree = createNxTree({
      withAppsDir: false,
      workspaceLayout: { appsDir: 'packages/apps' },
    });

    const result = await runSchematic({ project: 'button' }, tree);

    const tsconfigApp = JSON.parse(
      result
        .read('/packages/apps/button-prism/tsconfig.app.json')!
        .toString('utf-8')
    ) as {
      extends: string;
      compilerOptions: { outDir: string; rootDir: string };
      include: string[];
    };
    expect(tsconfigApp.extends).toBe('../../../tsconfig.base.json');
    expect(tsconfigApp.compilerOptions.rootDir).toBe('../../..');
    expect(tsconfigApp.compilerOptions.outDir).toBe('../../../out-tsc/app');
    expect(tsconfigApp.include).toContain(
      '../../../ng-prism-cache/button-prism/**/*.ts'
    );
  });

  it('should keep writing architect entries for the Nx bridge to translate', async () => {
    const tree = createNxTree();

    const result = await runSchematic({ project: 'button' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, Record<string, unknown>> }
      >;
    };
    const architect = workspace.projects['button'].architect;
    expect(architect['prism']['builder']).toBe('@ng-prism/core:serve');
    expect(architect['prism-build']['builder']).toBe('@ng-prism/core:build');
    const opts = architect['prism']['options'] as Record<string, unknown>;
    expect(opts['entryPoint']).toBe('libs/button');
    expect(opts['prismProject']).toBe('button-prism');
  });
});

describe('ng-add schematic — application builder resolution', () => {
  it('should use @angular-devkit/build-angular when @angular/build is not a direct dependency', async () => {
    const tree = createTree(defaultLibProject());
    tree.create(
      'package.json',
      JSON.stringify({
        name: 'cli-ws',
        devDependencies: { '@angular-devkit/build-angular': '21.2.14' },
      })
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, Record<string, unknown>> }
      >;
    };
    const architect = workspace.projects['my-lib-prism'].architect;
    expect(architect['build']['builder']).toBe(
      '@angular-devkit/build-angular:application'
    );
    expect(architect['serve']['builder']).toBe(
      '@angular-devkit/build-angular:dev-server'
    );
  });

  it('should prefer @angular/build when both are direct dependencies', async () => {
    const tree = createTree(defaultLibProject());
    tree.create(
      'package.json',
      JSON.stringify({
        name: 'cli-ws',
        devDependencies: {
          '@angular/build': '21.2.14',
          '@angular-devkit/build-angular': '21.2.14',
        },
      })
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const workspace = readJson(result, '/angular.json') as {
      projects: Record<
        string,
        { architect: Record<string, Record<string, unknown>> }
      >;
    };
    expect(
      workspace.projects['my-lib-prism'].architect['build']['builder']
    ).toBe('@angular/build:application');
  });
});

describe('ng-add schematic — library barrel resolution', () => {
  it('should read the barrel from ng-package.json when no mapping exists yet', async () => {
    const tree = createTree(defaultLibProject());
    tree.create(
      'projects/my-lib/ng-package.json',
      JSON.stringify({ lib: { entryFile: 'src/my-entry.ts' } })
    );

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const tsConfig = readJson(result, '/tsconfig.json') as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    expect(tsConfig.compilerOptions?.paths?.['my-lib']).toEqual([
      './projects/my-lib/src/my-entry.ts',
    ]);
  });

  it('should probe for src/index.ts when there is no ng-package.json', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('projects/my-lib/src/index.ts', 'export {};\n');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const tsConfig = readJson(result, '/tsconfig.json') as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    expect(tsConfig.compilerOptions?.paths?.['my-lib']).toEqual([
      './projects/my-lib/src/index.ts',
    ]);
  });

  it('should prefer an existing public-api.ts over index.ts', async () => {
    const tree = createTree(defaultLibProject());
    tree.create('projects/my-lib/src/index.ts', 'export {};\n');
    tree.create('projects/my-lib/src/public-api.ts', 'export {};\n');

    const result = await runSchematic({ project: 'my-lib' }, tree);

    const tsConfig = readJson(result, '/tsconfig.json') as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    expect(tsConfig.compilerOptions?.paths?.['my-lib']).toEqual([
      './projects/my-lib/src/public-api.ts',
    ]);
  });
});
