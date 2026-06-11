import { Tree } from '@angular-devkit/schematics';
import { parse as parseJsonc } from 'jsonc-parser';
import { addTsConfigPath } from './tsconfig-paths.js';

function createTree(initial: string): Tree {
  const tree = Tree.empty();
  tree.create('tsconfig.json', initial);
  return tree;
}

describe('addTsConfigPath', () => {
  it('adds a path entry when none exists', () => {
    const tree = createTree('{ "compilerOptions": {} }');

    addTsConfigPath(tree, 'tsconfig.json', 'foo', ['bar/baz.ts']);

    const parsed = parseJsonc(
      tree.read('tsconfig.json')!.toString('utf-8')
    ) as { compilerOptions: { paths: Record<string, string[]> } };
    expect(parsed.compilerOptions.paths['foo']).toEqual(['bar/baz.ts']);
  });

  it('is idempotent: does not overwrite an existing path entry', () => {
    const tree = createTree(
      '{ "compilerOptions": { "paths": { "foo": ["existing.ts"] } } }'
    );

    addTsConfigPath(tree, 'tsconfig.json', 'foo', ['bar/baz.ts']);

    const parsed = parseJsonc(
      tree.read('tsconfig.json')!.toString('utf-8')
    ) as { compilerOptions: { paths: Record<string, string[]> } };
    expect(parsed.compilerOptions.paths['foo']).toEqual(['existing.ts']);
  });

  it('preserves JSONC comments and trailing commas', () => {
    const initial = [
      '/* important comment */',
      '{',
      '  // strict mode',
      '  "compilerOptions": {',
      '    "strict": true,',
      '  },',
      '}',
      '',
    ].join('\n');
    const tree = createTree(initial);

    addTsConfigPath(tree, 'tsconfig.json', 'foo', ['bar/baz.ts']);

    const written = tree.read('tsconfig.json')!.toString('utf-8');
    expect(written).toContain('/* important comment */');
    expect(written).toContain('// strict mode');
    expect(written).toContain('"foo"');
  });

  it('returns false when path already exists, true when added', () => {
    const tree = createTree('{ "compilerOptions": {} }');

    const addedFirst = addTsConfigPath(tree, 'tsconfig.json', 'foo', ['a.ts']);
    const addedSecond = addTsConfigPath(tree, 'tsconfig.json', 'foo', ['b.ts']);

    expect(addedFirst).toBe(true);
    expect(addedSecond).toBe(false);
  });

  it('returns false when tsconfig.json does not exist', () => {
    const tree = Tree.empty();

    const added = addTsConfigPath(tree, 'tsconfig.json', 'foo', ['a.ts']);

    expect(added).toBe(false);
  });
});
