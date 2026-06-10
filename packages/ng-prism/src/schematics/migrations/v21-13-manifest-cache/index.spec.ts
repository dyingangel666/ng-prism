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
  it('placeholder so the suite is discovered', () => {
    expect(typeof migrate).toBe('function');
  });
});
