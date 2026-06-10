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

const OLD_IMPORT = /import\s+\{\s*PRISM_RUNTIME_MANIFEST\s*\}\s+from\s+['"](?:\.\/prism-manifest|prism-manifest)['"]\s*;?/;

function buildNewImport(prismProject: string): string {
  return `import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/${prismProject}';`;
}

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

  const newImport = buildNewImport(prismProject);
  const content = buffer.toString('utf-8');
  if (content.includes(newImport)) return;

  if (!OLD_IMPORT.test(content)) {
    context.logger.warn(
      `ng-prism migration: could not find PRISM_RUNTIME_MANIFEST import in ${mainPath}. ` +
        `Update it manually to: ${newImport}`
    );
    return;
  }

  tree.overwrite(mainPath, content.replace(OLD_IMPORT, newImport));
}

function addTsConfigMapping(tree: Tree): void {
  addTsConfigPath(tree, 'tsconfig.json', 'prism-manifest/*', [
    '.ng-prism/*/prism-manifest.ts',
  ]);
}

function ensureNgPrismGitignoreEntry(tree: Tree): void {
  const path = '.gitignore';
  const entry = '.ng-prism/';
  const buffer = tree.read(path);
  if (!buffer) {
    tree.create(path, entry + '\n');
    return;
  }
  const content = buffer.toString('utf-8');
  if (content.split('\n').some((line) => line.trim() === entry)) return;
  tree.overwrite(path, content.trimEnd() + '\n' + entry + '\n');
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

function removeGitignoreEntry(tree: Tree, prismProject: string): void {
  const path = '.gitignore';
  const buffer = tree.read(path);
  if (!buffer) return;

  const targetEntry = `projects/${prismProject}/src/prism-manifest.ts`;
  const content = buffer.toString('utf-8');
  if (!content.includes(targetEntry)) return;

  const cleaned = content
    .split('\n')
    .filter((line) => line.trim() !== targetEntry)
    .join('\n');
  tree.overwrite(path, cleaned);
}

export function migrate(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const workspace = readWorkspace(tree);
    if (!workspace) return tree;

    const prismProjects = findPrismProjects(workspace);
    for (const prismProject of prismProjects) {
      rewriteMainTs(tree, context, workspace, prismProject);
      addTsConfigMapping(tree);
      deleteLegacyManifest(tree, workspace, prismProject);
      removeGitignoreEntry(tree, prismProject);
    }
    ensureNgPrismGitignoreEntry(tree);

    return tree;
  };
}
