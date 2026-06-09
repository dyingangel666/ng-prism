import type { Tree } from '@angular-devkit/schematics';
import {
  parse as parseJsonc,
  modify as modifyJsonc,
  applyEdits as applyJsoncEdits,
} from 'jsonc-parser';

interface TsConfigSchema {
  compilerOptions?: {
    paths?: Record<string, string[]>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Adds `compilerOptions.paths[<key>] = <value>` to a tsconfig.json (JSONC-safe).
 * Idempotent: does not overwrite an existing entry.
 * Returns true when an entry was added, false otherwise (already present or file missing).
 */
export function addTsConfigPath(
  tree: Tree,
  tsConfigPath: string,
  key: string,
  value: string[]
): boolean {
  const buffer = tree.read(tsConfigPath);
  if (!buffer) return false;

  const sourceText = buffer.toString('utf-8');
  const parsed = parseJsonc(sourceText) as TsConfigSchema;
  const existing = parsed.compilerOptions?.paths ?? {};
  if (existing[key]) return false;

  const edits = modifyJsonc(
    sourceText,
    ['compilerOptions', 'paths', key],
    value,
    { formattingOptions: { tabSize: 2, insertSpaces: true } }
  );
  const nextText = applyJsoncEdits(sourceText, edits);
  tree.overwrite(tsConfigPath, nextText);
  return true;
}
