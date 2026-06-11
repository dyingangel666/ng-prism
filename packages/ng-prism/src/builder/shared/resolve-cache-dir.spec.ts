import { resolveCacheDir } from './resolve-cache-dir.js';

describe('resolveCacheDir', () => {
  const workspaceRoot = '/abs/workspace';

  it('returns undefined when the option is undefined', () => {
    expect(resolveCacheDir(undefined, workspaceRoot)).toBeUndefined();
  });

  it('returns undefined when the option is an empty string', () => {
    expect(resolveCacheDir('', workspaceRoot)).toBeUndefined();
  });

  it('returns absolute paths unchanged', () => {
    expect(resolveCacheDir('/abs/custom-cache', workspaceRoot)).toBe(
      '/abs/custom-cache'
    );
  });

  it('joins relative paths to workspaceRoot', () => {
    expect(resolveCacheDir('.custom-cache', workspaceRoot)).toBe(
      '/abs/workspace/.custom-cache'
    );
  });
});
