import type {
  A11yReport,
  A11yScoreResult,
} from '../../app/panels/a11y/a11y.types.js';

export interface RawAuditResult {
  className: string;
  variantName: string;
  variantIndex: number;
  /** Result from `calculateScore(axeResults)` in the running app. */
  score: A11yScoreResult;
}

export function aggregateAuditResults(results: RawAuditResult[]): A11yReport {
  if (results.length === 0) {
    return {
      total: {
        score: 100,
        violations: 0,
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
        passes: 0,
        incomplete: 0,
        auditedComponents: 0,
        auditedVariants: 0,
      },
      components: {},
      generatedAt: new Date().toISOString(),
    };
  }

  const byComponent = new Map<string, A11yScoreResult[]>();
  for (const r of results) {
    const list = byComponent.get(r.className) ?? [];
    list.push(r.score);
    byComponent.set(r.className, list);
  }

  const componentBreakdown: Record<string, A11yScoreResult> = {};
  for (const [className, scores] of byComponent) {
    componentBreakdown[className] = averageScore(scores);
  }

  const all = results.map((r) => r.score);
  const total = averageScore(all);

  return {
    total: {
      ...total,
      // Sum (not average) of violation counts — they aggregate across the library.
      violations: sum(all, (s) => s.violations),
      critical: sum(all, (s) => s.critical),
      serious: sum(all, (s) => s.serious),
      moderate: sum(all, (s) => s.moderate),
      minor: sum(all, (s) => s.minor),
      auditedComponents: byComponent.size,
      auditedVariants: results.length,
    },
    components: componentBreakdown,
    generatedAt: new Date().toISOString(),
  };
}

function averageScore(scores: A11yScoreResult[]): A11yScoreResult {
  const n = scores.length;
  const sumF = (sel: (s: A11yScoreResult) => number) =>
    scores.reduce((acc, s) => acc + sel(s), 0);
  return {
    score: Math.round(sumF((s) => s.score) / n),
    violations: Math.round(sumF((s) => s.violations) / n),
    critical: Math.round(sumF((s) => s.critical) / n),
    serious: Math.round(sumF((s) => s.serious) / n),
    moderate: Math.round(sumF((s) => s.moderate) / n),
    minor: Math.round(sumF((s) => s.minor) / n),
    passes: Math.round(sumF((s) => s.passes) / n),
    incomplete: Math.round(sumF((s) => s.incomplete) / n),
  };
}

function sum(
  scores: A11yScoreResult[],
  sel: (s: A11yScoreResult) => number,
): number {
  return scores.reduce((acc, s) => acc + sel(s), 0);
}
