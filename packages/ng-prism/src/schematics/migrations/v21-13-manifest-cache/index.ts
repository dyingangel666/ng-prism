import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

export function migrate(): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    return tree;
  };
}
