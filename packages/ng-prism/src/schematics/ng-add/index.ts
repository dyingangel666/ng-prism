import {
  chain,
  type Rule,
  type SchematicContext,
  type Tree,
  SchematicsException,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  parse as parseJsonc,
  modify as modifyJsonc,
  applyEdits as applyJsoncEdits,
} from 'jsonc-parser';
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

interface TsConfigSchema {
  compilerOptions?: {
    paths?: Record<string, string[]>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function readWorkspace(tree: Tree): WorkspaceSchema {
  const buffer = tree.read('angular.json');
  if (!buffer) {
    throw new SchematicsException('Could not find angular.json');
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
      throw new SchematicsException(
        `Project "${options.project}" does not exist in angular.json`
      );
    }

    const prismProjectName = `${options.project}-prism`;
    const prismRoot = `projects/${prismProjectName}`;
    const prismSrc = `${prismRoot}/src`;

    const zoneless = options.zoneless === true;
    const mainTs = zoneless
      ? [
          "import { provideZonelessChangeDetection } from '@angular/core';",
          "import { bootstrapApplication } from '@angular/platform-browser';",
          "import { PrismShellComponent, providePrism } from '@ng-prism/core';",
          "import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';",
          "import config from 'ng-prism.config';",
          '',
          'bootstrapApplication(PrismShellComponent, {',
          '  providers: [',
          '    provideZonelessChangeDetection(),',
          '    providePrism(PRISM_RUNTIME_MANIFEST, config),',
          '  ],',
          '});',
          '',
        ].join('\n')
      : [
          "import { bootstrapApplication } from '@angular/platform-browser';",
          "import { PrismShellComponent, providePrism } from '@ng-prism/core';",
          "import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';",
          "import config from 'ng-prism.config';",
          '',
          'bootstrapApplication(PrismShellComponent, {',
          '  providers: [providePrism(PRISM_RUNTIME_MANIFEST, config)],',
          '});',
          '',
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
        '',
      ].join('\n');
      tree.create(indexHtmlPath, indexHtml);
    }

    const tsconfigAppPath = `${prismRoot}/tsconfig.app.json`;
    if (!tree.exists(tsconfigAppPath)) {
      const tsconfigApp = {
        extends: '../../tsconfig.json',
        compilerOptions: {
          outDir: '../../out-tsc/app',
          types: [],
        },
        files: ['src/main.ts'],
        include: ['src/**/*.d.ts'],
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
            builder: '@angular-devkit/build-angular:application',
            options: {
              outputPath: {
                base: `dist/${prismProjectName}`,
                browser: '',
              },
              index: `${prismSrc}/index.html`,
              browser: `${prismSrc}/main.ts`,
              tsConfig: `${prismRoot}/tsconfig.app.json`,
              styles: [
                'node_modules/highlight.js/styles/base16/solarized-dark.min.css',
              ],
              polyfills: zoneless ? [] : ['zone.js'],
              allowedCommonJsDependencies: ['highlight.js'],
              preserveSymlinks: true,
            },
            configurations: {
              production: {
                outputHashing: 'all',
              },
              development: {
                outputHashing: 'none',
                optimization: false,
                sourceMap: true,
              },
            },
            defaultConfiguration: 'production',
          },
          serve: {
            builder: '@angular-devkit/build-angular:dev-server',
            options: {
              buildTarget: `${prismProjectName}:build:development`,
              port,
              hmr: true,
              liveReload: true,
            },
          },
        },
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

    const entryPoint =
      project.root ?? project.sourceRoot ?? `projects/${options.project}`;

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
          port,
        },
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
          outputPath: `dist/${prismProjectName}`,
        },
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
    const tsConfigPath = 'tsconfig.json';
    const buffer = tree.read(tsConfigPath);
    if (!buffer) {
      return tree;
    }

    const sourceText = buffer.toString('utf-8');
    const tsConfig = parseJsonc(sourceText) as TsConfigSchema;
    const existingPaths = tsConfig.compilerOptions?.paths ?? {};

    const workspace = readWorkspace(tree);
    const project = workspace.projects[options.project];
    const sourceRoot = project.sourceRoot ?? `${project.root}/src`;

    const formattingOptions = { tabSize: 2, insertSpaces: true };
    let nextText = sourceText;
    let changed = false;

    if (!existingPaths['ng-prism.config']) {
      const edits = modifyJsonc(
        nextText,
        ['compilerOptions', 'paths', 'ng-prism.config'],
        ['ng-prism.config.ts'],
        { formattingOptions }
      );
      nextText = applyJsoncEdits(nextText, edits);
      changed = true;
    }

    if (!existingPaths[options.project]) {
      const edits = modifyJsonc(
        nextText,
        ['compilerOptions', 'paths', options.project],
        [`${sourceRoot}/public-api.ts`],
        { formattingOptions }
      );
      nextText = applyJsoncEdits(nextText, edits);
      changed = true;
    }

    if (changed) {
      tree.overwrite(tsConfigPath, nextText);
    }

    return tree;
  };
}

function createConfigFile(): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const configPath = 'ng-prism.config.ts';

    if (tree.exists(configPath)) {
      return tree;
    }

    const content = [
      "import { defineConfig } from '@ng-prism/core/config';",
      '',
      'export default defineConfig({ plugins: [] });',
      '',
    ].join('\n');

    tree.create(configPath, content);

    return tree;
  };
}

function addGitignoreEntry(options: NgAddSchemaOptions): Rule {
  return (tree: Tree) => {
    const prismProjectName = `${options.project}-prism`;
    const entry = `projects/${prismProjectName}/src/prism-manifest.ts`;
    const gitignorePath = '.gitignore';

    const buffer = tree.read(gitignorePath);
    if (buffer) {
      const content = buffer.toString('utf-8');
      if (content.includes(entry)) return tree;
      tree.overwrite(gitignorePath, content.trimEnd() + '\n' + entry + '\n');
    } else {
      tree.create(gitignorePath, entry + '\n');
    }

    return tree;
  };
}

const RUNTIME_PEER_DEPS: Record<string, string> = {
  'highlight.js': '^11.0.0',
  'ngx-highlightjs': '^14.0.0',
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
      const alreadyPresent =
        pkg.devDependencies[name] || pkg.dependencies?.[name];
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
    context.logger.info(
      `  Production build:  ng run ${options.project}:prism-build`
    );
    context.logger.info(`  Strip decorators:  npm run strip-showcase`);
    context.logger.info('');
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
    createConfigFile(),
    addStripShowcaseScript(options),
    addGitignoreEntry(options),
    addRuntimePeerDeps(),
    logSetupSummary(options),
  ]);
}
