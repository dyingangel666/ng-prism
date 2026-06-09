import { join, isAbsolute } from 'path';

/**
 * Normalizes a user-provided `cacheDir` builder option to an absolute path
 * (or `undefined` when the option is empty/unset).
 *
 * Relative paths resolve against `workspaceRoot`.
 */
export function resolveCacheDir(
  option: string | undefined,
  workspaceRoot: string
): string | undefined {
  if (!option) return undefined;
  return isAbsolute(option) ? option : join(workspaceRoot, option);
}
