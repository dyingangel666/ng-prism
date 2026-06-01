import { aggregateAuditResults, type RawAuditResult } from './aggregator.js';
import type { A11yScoreResult } from '../../app/panels/a11y/a11y.types.js';

function score(overrides?: Partial<A11yScoreResult>): A11yScoreResult {
  return {
    score: 90,
    violations: 1,
    critical: 0,
    serious: 0,
    moderate: 1,
    minor: 0,
    passes: 20,
    incomplete: 0,
    ...overrides,
  };
}

function r(className: string, variantIndex: number, s: A11yScoreResult): RawAuditResult {
  return { className, variantName: `v${variantIndex}`, variantIndex, score: s };
}

describe('aggregateAuditResults', () => {
  it('returns an empty report when there are no results', () => {
    const report = aggregateAuditResults([]);
    expect(report.total.auditedComponents).toBe(0);
    expect(report.total.auditedVariants).toBe(0);
    expect(report.total.score).toBe(100);
  });

  it('counts unique components and total variants', () => {
    const results = [
      r('A', 0, score()),
      r('A', 1, score()),
      r('B', 0, score()),
    ];
    const report = aggregateAuditResults(results);
    expect(report.total.auditedComponents).toBe(2);
    expect(report.total.auditedVariants).toBe(3);
  });

  it('averages the score across all audited variants', () => {
    const results = [
      r('A', 0, score({ score: 100 })),
      r('A', 1, score({ score: 50 })),
    ];
    const report = aggregateAuditResults(results);
    expect(report.total.score).toBe(75);
  });

  it('sums violation counts instead of averaging them', () => {
    const results = [
      r('A', 0, score({ critical: 1, serious: 2 })),
      r('B', 0, score({ critical: 1, serious: 0 })),
    ];
    const report = aggregateAuditResults(results);
    expect(report.total.critical).toBe(2);
    expect(report.total.serious).toBe(2);
  });

  it('produces a per-component breakdown', () => {
    const results = [
      r('A', 0, score({ score: 80 })),
      r('A', 1, score({ score: 100 })),
      r('B', 0, score({ score: 60 })),
    ];
    const report = aggregateAuditResults(results);
    expect(report.components?.['A'].score).toBe(90);
    expect(report.components?.['B'].score).toBe(60);
  });

  it('writes a generatedAt timestamp', () => {
    const report = aggregateAuditResults([r('A', 0, score())]);
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
