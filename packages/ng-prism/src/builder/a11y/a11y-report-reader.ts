import { readFileSync, statSync } from 'node:fs';
import type {
  A11yManifestMeta,
  A11yReport,
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
