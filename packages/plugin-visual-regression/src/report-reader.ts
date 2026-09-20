import { readFileSync, statSync } from 'node:fs';
import {
  isVrtStatus,
  type VrtReport,
  type VrtTotals,
  type VrtVariantResult,
} from './visual-regression.types.js';

const cache = new Map<string, { mtime: number; data: VrtReport }>();

/** Statuses already reported to the console, so a build warns once, not per component. */
const warnedStatuses = new Set<string>();

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
 *
 * The report's shape is checked rather than trusted. It is written by someone
 * else's runner, and this runs inside `onComponentScanned`, where a throw is
 * rethrown by the plugin runner and fails the whole styleguide build. A report
 * that is merely *missing* already degrades to "no results"; a truncated or
 * malformed one must not be punished harder than a missing one.
 *
 * `status` is part of that check and not a formality. Everything downstream is
 * keyed by it — the counts, the summary bar, the three groups the panel
 * renders — and the group tables only know the five documented values. An
 * entry carrying anything else used to survive this filter, be counted as
 * present by `summarize`, and then render in no group at all: present in the
 * totals, absent from the list. Dropping it here keeps the two agreeing, and
 * the warning below is what keeps the drop from being the silent kind.
 */
export function readVariantsForComponent(
  reportPath: string,
  className: string
): VrtVariantResult[] {
  const entries: unknown = loadReport(reportPath)?.byVariant;
  if (!Array.isArray(entries)) return [];

  return entries
    .filter(
      (entry): entry is VrtVariantResult =>
        isRecord(entry) && entry['className'] === className
    )
    .filter((entry) => {
      if (isVrtStatus(entry.status)) return true;
      warnUnknownStatus(reportPath, entry);
      return false;
    })
    .sort((a, b) => variantIndexOf(a) - variantIndexOf(b));
}

function warnUnknownStatus(reportPath: string, entry: VrtVariantResult): void {
  const status = String(entry.status);
  if (warnedStatuses.has(status)) return;
  warnedStatuses.add(status);
  console.warn(
    `ng-prism/plugin-visual-regression: ${reportPath} reports an unknown ` +
      `status ${JSON.stringify(entry.status)} (first seen on ` +
      `${entry.className}). Those variants are left out of the panel.`
  );
}

export function readTotals(reportPath: string): VrtTotals | null {
  const total: unknown = loadReport(reportPath)?.total;
  return isRecord(total) ? (total as unknown as VrtTotals) : null;
}

export function clearReportCache(): void {
  cache.clear();
  warnedStatuses.clear();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Missing or non-numeric indices sort first rather than poisoning the sort. */
function variantIndexOf(variant: VrtVariantResult): number {
  return typeof variant.variantIndex === 'number' ? variant.variantIndex : 0;
}
