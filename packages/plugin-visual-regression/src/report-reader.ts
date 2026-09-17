import { readFileSync, statSync } from 'node:fs';
import type {
  VrtReport,
  VrtTotals,
  VrtVariantResult,
} from './visual-regression.types.js';

const cache = new Map<string, { mtime: number; data: VrtReport }>();

/**
 * Reads and parses the report, memoised on the file's mtime so a watch-mode
 * rebuild picks up a fresh run without re-parsing on every scanned component.
 */
function loadReport(reportPath: string): VrtReport | null {
  try {
    const mtime = statSync(reportPath).mtimeMs;
    const cached = cache.get(reportPath);
    if (cached && cached.mtime === mtime) return cached.data;

    const parsed = JSON.parse(readFileSync(reportPath, 'utf-8')) as VrtReport;
    cache.set(reportPath, { mtime, data: parsed });
    return parsed;
  } catch {
    return null;
  }
}

/**
 * All recorded results for one component, ordered by variant index.
 *
 * Components are matched on `className` — the report and the scanner agree on
 * it exactly, so there is no need for the path-matching heuristics the coverage
 * plugin uses.
 */
export function readVariantsForComponent(
  reportPath: string,
  className: string
): VrtVariantResult[] {
  const report = loadReport(reportPath);
  if (!report?.byVariant) return [];

  return report.byVariant
    .filter((v) => v.className === className)
    .sort((a, b) => a.variantIndex - b.variantIndex);
}

export function readTotals(reportPath: string): VrtTotals | null {
  return loadReport(reportPath)?.total ?? null;
}

export function clearReportCache(): void {
  cache.clear();
}
