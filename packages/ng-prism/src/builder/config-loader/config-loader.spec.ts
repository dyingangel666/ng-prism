import { join } from 'path';
import { readdirSync } from 'fs';
import { loadConfig } from './config-loader.js';

const FIXTURES_DIR = join(__dirname, '__fixtures__');

describe('loadConfig', () => {
  it('should load a valid config file', async () => {
    const config = await loadConfig({
      workspaceRoot: FIXTURES_DIR,
      configFileName: 'valid.config.ts',
    });

    expect(config).toEqual({
      plugins: [{ name: 'test-plugin' }],
      theme: { '--prism-primary': '#ff0000' },
    });
  });

  it('should return empty object for an empty config', async () => {
    const config = await loadConfig({
      workspaceRoot: FIXTURES_DIR,
      configFileName: 'empty.config.ts',
    });

    expect(config).toEqual({});
  });

  it('should return empty object if config file does not exist', async () => {
    const config = await loadConfig({
      workspaceRoot: FIXTURES_DIR,
      configFileName: 'nonexistent.config.ts',
    });

    expect(config).toEqual({});
  });

  it('should clean up temp file after loading', async () => {
    await loadConfig({
      workspaceRoot: FIXTURES_DIR,
      configFileName: 'valid.config.ts',
    });

    const leftovers = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.tmp.mjs'));
    expect(leftovers).toEqual([]);
  });

  it('should reload config on second call (no ESM module cache hit)', async () => {
    const first = await loadConfig({
      workspaceRoot: FIXTURES_DIR,
      configFileName: 'valid.config.ts',
    });
    const second = await loadConfig({
      workspaceRoot: FIXTURES_DIR,
      configFileName: 'valid.config.ts',
    });

    expect(second).toEqual(first);
    const leftovers = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.tmp.mjs'));
    expect(leftovers).toEqual([]);
  });

  it('should use default config file name when not specified', async () => {
    const config = await loadConfig({
      workspaceRoot: FIXTURES_DIR,
    });

    expect(config).toEqual({});
  });

  it('should reject configFile paths that resolve outside the workspace root', async () => {
    await expect(
      loadConfig({
        workspaceRoot: FIXTURES_DIR,
        configFileName: '../../../etc/passwd.ts',
      }),
    ).rejects.toThrow(/resolves outside workspace root/);
  });
});
