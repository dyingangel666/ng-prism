import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { addTsConfigPath } from '../../utils/tsconfig-paths.js';

interface AngularProject {
  sourceRoot?: string;
  root?: string;
  architect?: Record<
    string,
    { builder: string; options?: Record<string, unknown> }
  >;
}

interface AngularWorkspace {
  projects?: Record<string, AngularProject>;
}

const OLD_DIR = '.ng-prism';
const NEW_DIR = 'ng-prism-cache';
const OLD_GITIGNORE_ENTRY = '.ng-prism/';
const NEW_GITIGNORE_ENTRY = 'ng-prism-cache/';
const OLD_PATH_MAPPING = './.ng-prism/*/prism-manifest.ts';
const NEW_PATH_MAPPING = './ng-prism-cache/*/prism-manifest.ts';

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
        if (
          typeof prismProject === 'string' &&
          !result.includes(prismProject)
        ) {
          result.push(prismProject);
        }
      }
    }
  }
  return result;
}

/**
 * Replace the `prism-manifest/*` path mapping if it still points at the old
 * `.ng-prism/` location, while preserving any user customisation that already
 * uses a different target.
 */
function updateTsConfigMapping(tree: Tree, context: SchematicContext): void {
  const buffer = tree.read('tsconfig.json');
  if (!buffer) return;
  let parsed: {
    compilerOptions?: { paths?: Record<string, string[]> };
  };
  try {
    parsed = JSON.parse(buffer.toString('utf-8'));
  } catch {
    context.logger.warn(
      'ng-prism migration: tsconfig.json could not be parsed; skipping path-mapping update. Update "prism-manifest/*" to ' +
        `["${NEW_PATH_MAPPING}"] manually.`
    );
    return;
  }
  const existing = parsed.compilerOptions?.paths?.['prism-manifest/*'];
  if (!existing) {
    // No existing mapping — fall through to addTsConfigPath which inserts the new default.
    addTsConfigPath(tree, 'tsconfig.json', 'prism-manifest/*', [
      NEW_PATH_MAPPING,
    ]);
    return;
  }
  // Replace any entries that still reference the legacy dot-dir; leave the rest alone.
  const updated = existing.map((entry) =>
    entry === OLD_PATH_MAPPING ? NEW_PATH_MAPPING : entry
  );
  if (updated.every((entry, i) => entry === existing[i])) return;
  parsed.compilerOptions!.paths!['prism-manifest/*'] = updated;
  tree.overwrite('tsconfig.json', JSON.stringify(parsed, null, 2) + '\n');
}

function updateTsConfigAppInclude(
  tree: Tree,
  workspace: AngularWorkspace,
  prismProject: string
): void {
  const project = workspace.projects?.[prismProject];
  const projectRoot = project?.root ?? `projects/${prismProject}`;
  const path = `${projectRoot}/tsconfig.app.json`;
  const buffer = tree.read(path);
  if (!buffer) return;

  const sourceText = buffer.toString('utf-8');
  let parsed: { include?: unknown };
  try {
    parsed = JSON.parse(sourceText) as { include?: unknown };
  } catch {
    return;
  }
  if (!Array.isArray(parsed.include)) return;

  const oldEntry = `../../${OLD_DIR}/${prismProject}/**/*.ts`;
  const newEntry = `../../${NEW_DIR}/${prismProject}/**/*.ts`;
  const include = parsed.include as string[];
  const oldIndex = include.indexOf(oldEntry);
  if (oldIndex === -1 && include.includes(newEntry)) return;
  if (oldIndex === -1) return;

  const next = [...include];
  next[oldIndex] = newEntry;
  // Avoid duplicates if user already had both entries for some reason.
  const deduped = Array.from(new Set(next));
  const updated = { ...(parsed as object), include: deduped };
  tree.overwrite(path, JSON.stringify(updated, null, 2) + '\n');
}

function renameGitignoreEntry(tree: Tree): void {
  const path = '.gitignore';
  const buffer = tree.read(path);
  if (!buffer) return;
  const content = buffer.toString('utf-8');
  const lines = content.split('\n');
  let changed = false;
  const next = lines.map((line) => {
    if (line.trim() === OLD_GITIGNORE_ENTRY) {
      changed = true;
      return line.replace(OLD_GITIGNORE_ENTRY, NEW_GITIGNORE_ENTRY);
    }
    return line;
  });
  if (!changed) {
    // Ensure the new entry exists even if the old one was already missing.
    if (next.some((line) => line.trim() === NEW_GITIGNORE_ENTRY)) return;
    tree.overwrite(
      path,
      content.trimEnd() + '\n' + NEW_GITIGNORE_ENTRY + '\n'
    );
    return;
  }
  tree.overwrite(path, next.join('\n'));
}

export function migrate(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const workspace = readWorkspace(tree);
    if (!workspace) return tree;

    const prismProjects = findPrismProjects(workspace);
    if (prismProjects.length === 0) return tree;

    updateTsConfigMapping(tree, context);
    for (const prismProject of prismProjects) {
      updateTsConfigAppInclude(tree, workspace, prismProject);
    }
    renameGitignoreEntry(tree);

    context.logger.info(
      'ng-prism migration: cache directory renamed from .ng-prism/ to ng-prism-cache/. ' +
        'You can safely delete the old .ng-prism/ directory from your workspace — ' +
        'the builder will regenerate the manifest on next serve/build run.'
    );

    return tree;
  };
}
