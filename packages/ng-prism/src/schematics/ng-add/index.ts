import { chain, type Rule, type SchematicContext, type Tree, SchematicsException } from '@angular-devkit/schematics';
// `@angular-devkit/schematics` has no `exports` map, so its subpaths must name
// a file — Node's ESM resolver does not honour the legacy `tasks/package.json`
// `main` field the way CommonJS `require()` does. See issue #32.
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks/index.js';
import { addTsConfigPath } from '../utils/tsconfig-paths.js';
import type { NgAddSchemaOptions } from './schema.js';

interface WorkspaceProject {
    sourceRoot?: string;
    root?: string;
    architect?: Record<string, unknown>;
    [key: string]: unknown;
}

interface WorkspaceSchema {
    projects: Record<string, WorkspaceProject>;
    [key: string]: unknown;
}

interface NxJsonSchema {
    workspaceLayout?: { appsDir?: string; libsDir?: string };
}

interface PackageJsonSchema {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

const ANGULAR_BUILD = '@angular/build';
const BUILD_ANGULAR = '@angular-devkit/build-angular';

function readJsonIfPresent<T>(tree: Tree, path: string): T | undefined {
    const buffer = tree.read(path);
    if (!buffer) return undefined;
    try {
        return JSON.parse(buffer.toString('utf-8')) as T;
    } catch {
        return undefined;
    }
}

/**
 * Angular CLI workspaces install `@angular-devkit/build-angular`; Nx and newer
 * Angular workspaces install `@angular/build`. Presence in node_modules is not a
 * usable signal — `@angular-devkit/build-angular` depends on `@angular/build`
 * itself — so only a direct entry in package.json counts.
 */
function resolveAppBuilder(tree: Tree): string {
    const pkg = readJsonIfPresent<PackageJsonSchema>(tree, 'package.json');
    const declared = { ...pkg?.dependencies, ...pkg?.devDependencies };
    return declared[ANGULAR_BUILD] ? ANGULAR_BUILD : BUILD_ANGULAR;
}

/** The root tsconfig that carries workspace-wide path mappings. */
function resolveRootTsConfig(tree: Tree): string | undefined {
    if (tree.exists('tsconfig.base.json')) return 'tsconfig.base.json';
    if (tree.exists('tsconfig.json')) return 'tsconfig.json';
    return undefined;
}

function dirHasContent(tree: Tree, path: string): boolean {
    const dir = tree.getDir(path);
    return dir.subfiles.length > 0 || dir.subdirs.length > 0;
}

/**
 * Angular CLI keeps every project under `projects/`. Nx lets the workspace
 * choose, so mirror the layout that is already there rather than assuming one.
 */
function resolvePrismRoot(tree: Tree, libraryRoot: string, prismProjectName: string): string {
    const nxJson = readJsonIfPresent<NxJsonSchema>(tree, 'nx.json');
    const appsDir = nxJson?.workspaceLayout?.appsDir;
    if (appsDir) return `${appsDir}/${prismProjectName}`;

    if (tree.exists('nx.json') && dirHasContent(tree, 'apps')) {
        return `apps/${prismProjectName}`;
    }

    const separator = libraryRoot.lastIndexOf('/');
    const parent = separator > 0 ? libraryRoot.slice(0, separator) : 'projects';
    return `${parent}/${prismProjectName}`;
}

/** `../` repeated once per path segment, so generated tsconfigs reach the root. */
function relativePrefix(root: string): string {
    return '../'.repeat(root.split('/').filter(Boolean).length);
}

/**
 * Resolves the library's public entry file. Angular CLI libraries use
 * `src/public-api.ts`, Nx libraries use `src/index.ts`, and either can override
 * it via `ng-package.json`.
 */
function resolveLibraryBarrel(tree: Tree, project: WorkspaceProject): string {
    const root = project.root ?? '';
    const sourceRoot = project.sourceRoot ?? `${root}/src`;

    if (root) {
        const ngPackage = readJsonIfPresent<{ lib?: { entryFile?: string } }>(tree, `${root}/ng-package.json`);
        if (ngPackage?.lib?.entryFile) return `${root}/${ngPackage.lib.entryFile}`;
    }

    for (const candidate of ['public-api.ts', 'index.ts']) {
        if (tree.exists(`${sourceRoot}/${candidate}`)) {
            return `${sourceRoot}/${candidate}`;
        }
    }

    return `${sourceRoot}/public-api.ts`;
}

function readWorkspace(tree: Tree): WorkspaceSchema {
    const buffer = tree.read('angular.json');
    if (!buffer) {
        throw new SchematicsException(
            'Could not find angular.json. Run this from an Angular workspace root, or ' +
                'in an Nx workspace via `nx g @ng-prism/core:ng-add --project=<library>` — ' +
                'Nx supplies the workspace configuration the schematic reads.'
        );
    }
    return JSON.parse(buffer.toString('utf-8')) as WorkspaceSchema;
}

function writeWorkspace(tree: Tree, workspace: WorkspaceSchema): void {
    tree.overwrite('angular.json', JSON.stringify(workspace, null, 2) + '\n');
}

function addPrismAppProject(options: NgAddSchemaOptions): Rule {
    return (tree: Tree, _context: SchematicContext) => {
        const workspace = readWorkspace(tree);
        const project = workspace.projects[options.project];

        if (!project) {
            throw new SchematicsException(`Project "${options.project}" does not exist in angular.json`);
        }

        const prismProjectName = `${options.project}-prism`;
        const prismRoot = resolvePrismRoot(tree, project.root ?? '', prismProjectName);
        const prismSrc = `${prismRoot}/src`;
        const toRoot = relativePrefix(prismRoot);
        const appBuilder = resolveAppBuilder(tree);

        const zoneless = options.zoneless === true;
        const hotConst =
            'const hot = (import.meta as ImportMeta & { hot?: { accept(dep: string, cb: (mod: { PRISM_RUNTIME_MANIFEST: typeof PRISM_RUNTIME_MANIFEST } | undefined) => void): void } }).hot;';
        const hmrThen = [
            '.then((appRef) => {',
            `  hot?.accept('prism-manifest/${prismProjectName}', (mod) => {`,
            '    if (mod) enablePrismHmr(appRef, mod.PRISM_RUNTIME_MANIFEST);',
            '  });',
            '});'
        ].join('\n');
        const mainTs = zoneless
            ? [
                  "import { provideZonelessChangeDetection } from '@angular/core';",
                  "import { bootstrapApplication } from '@angular/platform-browser';",
                  "import { enablePrismHmr, PrismShellComponent, providePrism } from '@ng-prism/core';",
                  `import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/${prismProjectName}';`,
                  "import config from 'ng-prism.config';",
                  '',
                  hotConst,
                  '',
                  'bootstrapApplication(PrismShellComponent, {',
                  '  providers: [',
                  '    provideZonelessChangeDetection(),',
                  '    providePrism(PRISM_RUNTIME_MANIFEST, config),',
                  '  ],',
                  '})' + hmrThen,
                  ''
              ].join('\n')
            : [
                  "import { bootstrapApplication } from '@angular/platform-browser';",
                  "import { enablePrismHmr, PrismShellComponent, providePrism } from '@ng-prism/core';",
                  `import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/${prismProjectName}';`,
                  "import config from 'ng-prism.config';",
                  '',
                  hotConst,
                  '',
                  'bootstrapApplication(PrismShellComponent, {',
                  '  providers: [providePrism(PRISM_RUNTIME_MANIFEST, config)],',
                  '})' + hmrThen,
                  ''
              ].join('\n');

        if (!tree.exists(`${prismSrc}/main.ts`)) {
            tree.create(`${prismSrc}/main.ts`, mainTs);
        }

        const indexHtmlPath = `${prismSrc}/index.html`;
        if (!tree.exists(indexHtmlPath)) {
            const indexHtml = [
                '<!DOCTYPE html>',
                '<html lang="en">',
                '<head>',
                '  <meta charset="UTF-8" />',
                '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
                '  <title>ng-prism Styleguide</title>',
                '  <style>* { margin: 0; padding: 0; box-sizing: border-box; } html, body { height: 100%; }</style>',
                '</head>',
                '<body>',
                '  <prism-shell></prism-shell>',
                '</body>',
                '</html>',
                ''
            ].join('\n');
            tree.create(indexHtmlPath, indexHtml);
        }

        const tsconfigAppPath = `${prismRoot}/tsconfig.app.json`;
        if (!tree.exists(tsconfigAppPath)) {
            const tsconfigApp = {
                extends: `${toRoot}${resolveRootTsConfig(tree) ?? 'tsconfig.json'}`,
                compilerOptions: {
                    outDir: `${toRoot}out-tsc/app`,
                    rootDir: toRoot.slice(0, -1),
                    types: []
                },
                files: ['src/main.ts'],
                include: ['src/**/*.d.ts', `${toRoot}ng-prism-cache/${prismProjectName}/**/*.ts`]
            };
            tree.create(tsconfigAppPath, JSON.stringify(tsconfigApp, null, 2) + '\n');
        }

        const port = options.port ?? 4400;

        if (!workspace.projects[prismProjectName]) {
            workspace.projects[prismProjectName] = {
                projectType: 'application',
                root: prismRoot,
                sourceRoot: prismSrc,
                architect: {
                    build: {
                        builder: `${appBuilder}:application`,
                        options: {
                            outputPath: {
                                base: `dist/${prismProjectName}`,
                                browser: ''
                            },
                            index: `${prismSrc}/index.html`,
                            browser: `${prismSrc}/main.ts`,
                            tsConfig: `${prismRoot}/tsconfig.app.json`,
                            styles: ['node_modules/highlight.js/styles/base16/solarized-dark.min.css'],
                            polyfills: zoneless ? [] : ['zone.js'],
                            allowedCommonJsDependencies: ['highlight.js', 'axe-core'],
                            preserveSymlinks: true
                        },
                        configurations: {
                            production: {
                                outputHashing: 'all'
                            },
                            development: {
                                outputHashing: 'none',
                                optimization: false,
                                sourceMap: true
                            }
                        },
                        defaultConfiguration: 'production'
                    },
                    serve: {
                        builder: `${appBuilder}:dev-server`,
                        options: {
                            buildTarget: `${prismProjectName}:build:development`,
                            port,
                            hmr: true,
                            liveReload: true
                        }
                    }
                }
            };

            writeWorkspace(tree, workspace);
        }

        return tree;
    };
}

function addBuilderTargets(options: NgAddSchemaOptions): Rule {
    return (tree: Tree, _context: SchematicContext) => {
        const workspace = readWorkspace(tree);
        const project = workspace.projects[options.project];
        const prismProjectName = `${options.project}-prism`;
        const port = options.port ?? 4400;

        const entryPoint = project.root ?? project.sourceRoot ?? `projects/${options.project}`;

        if (!project.architect) {
            project.architect = {};
        }

        let changed = false;

        if (!project.architect['prism']) {
            project.architect['prism'] = {
                builder: '@ng-prism/core:serve',
                options: {
                    entryPoint,
                    prismProject: prismProjectName,
                    libraryProject: options.project,
                    port
                }
            };
            changed = true;
        }

        if (!project.architect['prism-build']) {
            project.architect['prism-build'] = {
                builder: '@ng-prism/core:build',
                options: {
                    entryPoint,
                    prismProject: prismProjectName,
                    libraryProject: options.project,
                    outputPath: `dist/${prismProjectName}`
                }
            };
            changed = true;
        }

        if (changed) {
            writeWorkspace(tree, workspace);
        }

        return tree;
    };
}

function addTsConfigPaths(options: NgAddSchemaOptions): Rule {
    return (tree: Tree, _context: SchematicContext) => {
        const tsConfigPath = resolveRootTsConfig(tree);
        if (!tsConfigPath) return tree;

        const workspace = readWorkspace(tree);
        const project = workspace.projects[options.project];

        addTsConfigPath(tree, tsConfigPath, 'ng-prism.config', ['./ng-prism.config.ts']);
        addTsConfigPath(tree, tsConfigPath, options.project, [`./${resolveLibraryBarrel(tree, project)}`]);
        addTsConfigPath(tree, tsConfigPath, 'prism-manifest/*', ['./ng-prism-cache/*/prism-manifest.ts']);

        return tree;
    };
}

function createConfigFile(): Rule {
    return (tree: Tree, _context: SchematicContext) => {
        const configPath = 'ng-prism.config.ts';

        if (tree.exists(configPath)) {
            return tree;
        }

        const content = ["import { defineConfig } from '@ng-prism/core/config';", '', 'export default defineConfig({ plugins: [] });', ''].join('\n');

        tree.create(configPath, content);

        return tree;
    };
}

const RUNTIME_PEER_DEPS: Record<string, string> = {
    'highlight.js': '^11.0.0',
    'ngx-highlightjs': '^14.0.0'
};

function addRuntimePeerDeps(): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const pkgPath = 'package.json';
        const buffer = tree.read(pkgPath);
        if (!buffer) return tree;

        const pkg = JSON.parse(buffer.toString('utf-8')) as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
        };
        pkg.devDependencies ??= {};

        let changed = false;
        for (const [name, version] of Object.entries(RUNTIME_PEER_DEPS)) {
            const alreadyPresent = pkg.devDependencies[name] || pkg.dependencies?.[name];
            if (!alreadyPresent) {
                pkg.devDependencies[name] = version;
                changed = true;
                context.logger.info(`  Added ${name}@${version} to devDependencies`);
            }
        }

        if (changed) {
            tree.overwrite(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
            context.addTask(new NodePackageInstallTask());
        }

        return tree;
    };
}

function logSetupSummary(options: NgAddSchemaOptions): Rule {
    return (_tree: Tree, context: SchematicContext) => {
        const prismProjectName = `${options.project}-prism`;

        context.logger.info('');
        context.logger.info('ng-prism setup complete:');
        context.logger.info(`  Prism app project: ${prismProjectName}`);
        context.logger.info(`  Config file:       ng-prism.config.ts`);
        context.logger.info(`  Dev server:        ng run ${options.project}:prism`);
        context.logger.info(`  Production build:  ng run ${options.project}:prism-build`);
        context.logger.info(`  Strip decorators:  npm run strip-showcase`);
        context.logger.info('');
    };
}

function addNgPrismGitignoreEntry(): Rule {
    return (tree: Tree) => {
        const entry = 'ng-prism-cache/';
        const gitignorePath = '.gitignore';

        const buffer = tree.read(gitignorePath);
        if (buffer) {
            const content = buffer.toString('utf-8');
            if (content.split('\n').some((line) => line.trim() === entry)) return tree;
            tree.overwrite(gitignorePath, content.trimEnd() + '\n' + entry + '\n');
        } else {
            tree.create(gitignorePath, entry + '\n');
        }

        return tree;
    };
}

function addStripShowcaseScript(options: NgAddSchemaOptions): Rule {
    return (tree: Tree) => {
        const pkgPath = 'package.json';
        const buffer = tree.read(pkgPath);
        if (!buffer) return tree;

        const pkg = JSON.parse(buffer.toString('utf-8')) as {
            scripts?: Record<string, string>;
            [key: string]: unknown;
        };
        if (!pkg.scripts) pkg.scripts = {};

        const scriptName = 'strip-showcase';
        if (pkg.scripts[scriptName]) return tree;

        pkg.scripts[scriptName] = `ng-prism-strip dist/${options.project}`;
        tree.overwrite(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

        return tree;
    };
}

export function ngAdd(options: NgAddSchemaOptions): Rule {
    return chain([
        addPrismAppProject(options),
        addBuilderTargets(options),
        addTsConfigPaths(options),
        addNgPrismGitignoreEntry(),
        createConfigFile(),
        addStripShowcaseScript(options),
        addRuntimePeerDeps(),
        logSetupSummary(options)
    ]);
}
