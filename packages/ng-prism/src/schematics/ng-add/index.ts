import {
  chain,
  type Rule,
  type SchematicContext,
  type Tree,
  SchematicsException,
} from '@angular-devkit/schematics';
import { parse as parseJsonc } from 'jsonc-parser';
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
        `Project "${options.project}" does not exist in angular.json`,
      );
    }

    const prismProjectName = `${options.project}-prism`;
    const prismRoot = `projects/${prismProjectName}`;
    const prismSrc = `${prismRoot}/src`;

    const mainTs = [
      "import { bootstrapApplication } from '@angular/platform-browser';",
      "import { PrismShellComponent, providePrism } from 'ng-prism';",
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
            styles: ['node_modules/highlight.js/styles/base16/solarized-dark.min.css'],
            polyfills: ['zone.js'],
            allowedCommonJsDependencies: ['highlight.js'],
            preserveSymlinks: true,
          },
        },
        serve: {
          builder: '@angular-devkit/build-angular:dev-server',
          options: {
            buildTarget: `${prismProjectName}:build`,
            port,
          },
        },
      },
    };

    writeWorkspace(tree, workspace);

    return tree;
  };
}

function addBuilderTargets(options: NgAddSchemaOptions): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const workspace = readWorkspace(tree);
    const project = workspace.projects[options.project];
    const prismProjectName = `${options.project}-prism`;
    const port = options.port ?? 4400;

    const sourceRoot = project.sourceRoot ?? `${project.root}/src`;
    const entryPoint = `${sourceRoot}/public-api.ts`;

    if (!project.architect) {
      project.architect = {};
    }

    project.architect['prism'] = {
      builder: 'ng-prism:serve',
      options: {
        entryPoint,
        prismProject: prismProjectName,
        libraryProject: options.project,
        port,
      },
    };

    project.architect['prism-build'] = {
      builder: 'ng-prism:build',
      options: {
        entryPoint,
        prismProject: prismProjectName,
        libraryProject: options.project,
        outputPath: `dist/${prismProjectName}`,
      },
    };

    writeWorkspace(tree, workspace);

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

    const tsConfig = parseJsonc(buffer.toString('utf-8')) as TsConfigSchema;

    if (!tsConfig.compilerOptions) {
      tsConfig.compilerOptions = {};
    }
    if (!tsConfig.compilerOptions.paths) {
      tsConfig.compilerOptions.paths = {};
    }

    const workspace = readWorkspace(tree);
    const project = workspace.projects[options.project];
    const sourceRoot = project.sourceRoot ?? `${project.root}/src`;

    tsConfig.compilerOptions.paths['ng-prism.config'] = ['ng-prism.config.ts'];
    tsConfig.compilerOptions.paths[options.project] = [`${sourceRoot}/public-api.ts`];

    tree.overwrite(tsConfigPath, JSON.stringify(tsConfig, null, 2) + '\n');

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
      "import { defineConfig } from 'ng-prism/config';",
      '',
      'export default defineConfig({ plugins: [] });',
      '',
    ].join('\n');

    tree.create(configPath, content);

    return tree;
  };
}

export function ngAdd(options: NgAddSchemaOptions): Rule {
  return chain([
    addPrismAppProject(options),
    addBuilderTargets(options),
    addTsConfigPaths(options),
    createConfigFile(),
  ]);
}
