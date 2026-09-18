import type { CoverageSummary, CoverageThresholds } from './coverage.types.js';
import { avgThreshold, deriveCoverageSummary } from './coverage-summary.js';

const T: CoverageThresholds = {
  lines: 80,
  branches: 80,
  functions: 80,
  statements: 80,
};

describe('avgThreshold', () => {
  it('rounds the mean of the four metrics', () => {
    expect(avgThreshold(T)).toBe(80);
    expect(
      avgThreshold({ lines: 90, branches: 70, functions: 85, statements: 76 })
    ).toBe(80);
  });
});

describe('deriveCoverageSummary', () => {
  it('is ok exactly at the threshold', () => {
    expect(deriveCoverageSummary(80, T).variant).toBe('ok');
  });

  it('is warn just below the threshold', () => {
    expect(deriveCoverageSummary(79, T).variant).toBe('warn');
  });

  it('is warn exactly at three quarters of the threshold', () => {
    expect(deriveCoverageSummary(60, T).variant).toBe('warn');
  });

  it('is danger below three quarters', () => {
    expect(deriveCoverageSummary(59, T).variant).toBe('danger');
  });

  it('names the score and the target', () => {
    expect(deriveCoverageSummary(61, T).label).toBe(
      'Coverage: 61% (target 80%)'
    );
  });
});
