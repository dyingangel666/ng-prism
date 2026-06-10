import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { addTsConfigPath } from '../../utils/tsconfig-paths.js';

interface AngularProject {
  sourceRoot?: string;
  root?: string;
  architect?: Record<string, { builder: string; options?: Record<string, unknown> }>;
}

interface AngularWorkspace {
  projects?: Record<string, AngularProject>;
}

const OLD_IMPORT = /import\s+\{\s*PRISM_RUNTIME_MANIFEST\s*\}\s+from\s+['"]\.\/prism-manifest['"]\s*;?/;
const NEW_IMPORT = "import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest';";

function readWorkspace(tree: Tree): AngularWorkspace | undefined {
  const buffer = tree.read('angular.json');
  if (!buffer) return undefined;
  return JSON.parse(buffer.toString('utf-8')) as AngularWorkspace;
}

function findPrismProjects(workspace: AngularWorkspace): string[] {
  const projects = workspace.projects ?? {};
  const result: string[] = [];
  for (const [, project] of Object.entries(projects)) {
    const architect = project.architect ?? {};
    for (const target of Object.values(architect)) {
      if (target.builder === '@ng-prism/core:serve') {
        const prismProject = target.options?.['prismProject'];
        if (typeof prismProject === 'string' && !result.includes(prismProject)) {
          result.push(prismProject);
        }
      }
    }
  }
  return result;
}

function rewriteMainTs(
  tree: Tree,
  context: SchematicContext,
  workspace: AngularWorkspace,
  prismProject: string
): void {
  const project = workspace.projects?.[prismProject];
  const sourceRoot = project?.sourceRoot ?? `projects/${prismProject}/src`;
  const mainPath = `${sourceRoot}/main.ts`;
  const buffer = tree.read(mainPath);
  if (!buffer) return;

  const content = buffer.toString('utf-8');
  if (content.includes(NEW_IMPORT)) return;

  if (!OLD_IMPORT.test(content)) {
    context.logger.warn(
      `ng-prism migration: could not find PRISM_RUNTIME_MANIFEST import in ${mainPath}. ` +
        `Update it manually to: ${NEW_IMPORT}`
    );
    return;
  }

  tree.overwrite(mainPath, content.replace(OLD_IMPORT, NEW_IMPORT));
}

function addTsConfigMapping(tree: Tree, prismProject: string): void {
  addTsConfigPath(tree, 'tsconfig.json', 'prism-manifest', [
    `node_modules/.cache/ng-prism/${prismProject}/prism-manifest.ts`,
  ]);
}

function deleteLegacyManifest(
  tree: Tree,
  workspace: AngularWorkspace,
  prismProject: string
): void {
  const project = workspace.projects?.[prismProject];
  const sourceRoot = project?.sourceRoot ?? `projects/${prismProject}/src`;
  const manifestPath = `${sourceRoot}/prism-manifest.ts`;
  if (tree.exists(manifestPath)) {
    tree.delete(manifestPath);
  }
}

export function migrate(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const workspace = readWorkspace(tree);
    if (!workspace) return tree;

    const prismProjects = findPrismProjects(workspace);
    for (const prismProject of prismProjects) {
      rewriteMainTs(tree, context, workspace, prismProject);
      addTsConfigMapping(tree, prismProject);
      deleteLegacyManifest(tree, workspace, prismProject);
    }

    return tree;
  };
}
