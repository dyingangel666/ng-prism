import path from 'node:path';
import { clearCoverageCache, readCoverageForFile } from './coverage-reader.js';
import type { CoverageData } from './coverage.types.js';

const FIXTURE_PATH = path.join(__dirname, '__fixtures__/coverage-summary.json');

describe('readCoverageForFile', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    clearCoverageCache();
  });

  it('should return coverage data for a matching file path', () => {
    const result = readCoverageForFile(
      FIXTURE_PATH,
      '/workspace/src/app/button/button.component.ts',
    );

    expect(result.found).toBe(true);
    expect(result.statements.pct).toBe(80);
    expect(result.branches.pct).toBe(75);
    expect(result.functions.pct).toBe(100);
    expect(result.lines.pct).toBe(90);
  });

  it('should calculate score as average of all 4 metrics', () => {
    const result = readCoverageForFile(
      FIXTURE_PATH,
      '/workspace/src/app/button/button.component.ts',
    );

    expect(result.score).toBe(Math.round((80 + 75 + 100 + 90) / 4));
  });

  it('should match by normalized path suffix', () => {
    const result = readCoverageForFile(
      FIXTURE_PATH,
      '/different/root/src/app/button/button.component.ts',
    );

    expect(result.found).toBe(true);
    expect(result.statements.pct).toBe(80);
  });

  it('should return found:false for a non-matching file path', () => {
    const result = readCoverageForFile(
      FIXTURE_PATH,
      '/workspace/src/app/unknown/unknown.component.ts',
    );

    expect(result.found).toBe(false);
    expect(result.score).toBe(0);
    expect(result.statements.pct).toBe(0);
  });

  it('should return found:false when coverage file does not exist', () => {
    const result = readCoverageForFile(
      '/nonexistent/coverage-summary.json',
      '/workspace/src/app/button/button.component.ts',
    );

    expect(result.found).toBe(false);
    expect(result.score).toBe(0);
  });

  it('should cache the parsed JSON across multiple calls', () => {
    const fs = require('node:fs');
    const spy = jest.spyOn(fs, 'readFileSync');

    readCoverageForFile(FIXTURE_PATH, '/workspace/src/app/button/button.component.ts');
    readCoverageForFile(FIXTURE_PATH, '/workspace/src/app/card/card.component.ts');

    const matchingCalls = spy.mock.calls.filter(
      (call) => typeof call[0] === 'string' && (call[0] as string).includes('coverage-summary'),
    );
    expect(matchingCalls).toHaveLength(1);
  });

  it('should handle low-coverage components correctly', () => {
    const result = readCoverageForFile(
      FIXTURE_PATH,
      '/workspace/src/app/card/card.component.ts',
    );

    expect(result.found).toBe(true);
    expect(result.score).toBe(Math.round((50 + 25 + 33.33 + 50) / 4));
  });
});
