import { readFileSync, statSync } from 'node:fs';
import type {
  A11yComponentMeta,
  A11yManifestMeta,
  A11yReport,
  A11yScoreResult,
  A11yThresholds,
} from '../../app/panels/a11y/a11y.types.js';
import { resolveA11yThresholds } from '../../app/panels/a11y/a11y-thresholds.js';

export const DEFAULT_A11Y_REPORT_PATH = 'a11y-report.json';

const cache = new Map<string, { mtime: number; data: A11yReport }>();

export function loadA11yReport(reportPath: string): A11yReport | null {
  try {
    const mtime = statSync(reportPath).mtimeMs;
    const cached = cache.get(reportPath);
    if (cached && cached.mtime === mtime) return cached.data;

    const raw = readFileSync(reportPath, 'utf-8');
    const parsed = JSON.parse(raw) as A11yReport;
    cache.set(reportPath, { mtime, data: parsed });
    return parsed;
  } catch {
    return null;
  }
}

export function readA11yMeta(
  reportPath: string,
  thresholdsInput?: Partial<A11yThresholds>
): A11yManifestMeta | null {
  const report = loadA11yReport(reportPath);
  if (!report?.total) return null;

  return {
    total: report.total,
    thresholds: resolveA11yThresholds(thresholdsInput),
  };
}

/**
 * A component's standing, derived with the same precedence
 * `checkA11yThresholds` uses library-wide.
 *
 * The derivation happens here, at build time, and not in the navigation:
 * `badge()` only ever sees one component and has no access to the library's
 * thresholds, so the core would otherwise have to reimplement this plugin's
 * semantics.
 */
export function deriveA11ySummary(
  score: A11yScoreResult,
  thresholds: A11yThresholds
): NonNullable<A11yComponentMeta['summary']> {
  if (
    score.critical > thresholds.critical ||
    score.serious > thresholds.serious
  ) {
    const parts: string[] = [];
    if (score.critical > 0) parts.push(`${score.critical} critical`);
    if (score.serious > 0) parts.push(`${score.serious} serious`);
    return { variant: 'danger', label: `A11y: ${parts.join(', ')}` };
  }

  if (score.moderate > thresholds.moderate || score.score < thresholds.score) {
    return { variant: 'warn', label: `A11y score ${score.score}` };
  }

  return { variant: 'ok', label: `A11y score ${score.score}` };
}

/** The per-component entry of the report, or null when there is none. */
export function readA11yForComponent(
  reportPath: string,
  className: string,
  thresholds: A11yThresholds
): A11yComponentMeta | null {
  const score = loadA11yReport(reportPath)?.components?.[className];
  if (!score) return null;

  return { found: true, score, summary: deriveA11ySummary(score, thresholds) };
}

export interface ThresholdViolation {
  metric: 'score' | 'critical' | 'serious' | 'moderate';
  actual: number;
  threshold: number;
}

export function checkA11yThresholds(
  meta: A11yManifestMeta
): ThresholdViolation[] {
  const violations: ThresholdViolation[] = [];
  const t = meta.thresholds;
  const total = meta.total;

  if (total.score < t.score) {
    violations.push({
      metric: 'score',
      actual: total.score,
      threshold: t.score,
    });
  }
  if (total.critical > t.critical) {
    violations.push({
      metric: 'critical',
      actual: total.critical,
      threshold: t.critical,
    });
  }
  if (total.serious > t.serious) {
    violations.push({
      metric: 'serious',
      actual: total.serious,
      threshold: t.serious,
    });
  }
  if (total.moderate > t.moderate) {
    violations.push({
      metric: 'moderate',
      actual: total.moderate,
      threshold: t.moderate,
    });
  }
  return violations;
}

export function clearA11yReportCache(): void {
  cache.clear();
}
