import { readFileSync } from 'node:fs';
import type { CoverageData, IstanbulSummary } from './coverage.types.js';

const EMPTY_METRIC = { total: 0, covered: 0, skipped: 0, pct: 0 };

const EMPTY_COVERAGE: CoverageData = {
  score: 0,
  statements: { ...EMPTY_METRIC },
  branches: { ...EMPTY_METRIC },
  functions: { ...EMPTY_METRIC },
  lines: { ...EMPTY_METRIC },
  found: false,
};

const cache = new Map<string, IstanbulSummary>();

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

function loadSummary(coveragePath: string): IstanbulSummary | null {
  if (cache.has(coveragePath)) return cache.get(coveragePath)!;

  try {
    const raw = readFileSync(coveragePath, 'utf-8');
    const parsed = JSON.parse(raw) as IstanbulSummary;
    cache.set(coveragePath, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function findEntry(summary: IstanbulSummary, componentPath: string): string | undefined {
  const normalizedComponent = normalizePath(componentPath);
  const keys = Object.keys(summary).filter((k) => k !== 'total');

  for (const key of keys) {
    const normalizedKey = normalizePath(key);
    if (normalizedKey === normalizedComponent) return key;
  }

  for (const key of keys) {
    const normalizedKey = normalizePath(key);
    if (
      normalizedKey.endsWith(normalizedComponent) ||
      normalizedComponent.endsWith(normalizedKey)
    ) {
      return key;
    }
  }

  const componentSuffix = normalizedComponent.split('/').slice(-3).join('/');
  for (const key of keys) {
    if (normalizePath(key).endsWith(componentSuffix)) return key;
  }

  return undefined;
}

export function readCoverageForFile(coveragePath: string, componentFilePath: string): CoverageData {
  const summary = loadSummary(coveragePath);
  if (!summary) return { ...EMPTY_COVERAGE };

  const entryKey = findEntry(summary, componentFilePath);
  if (!entryKey) return { ...EMPTY_COVERAGE };

  const entry = summary[entryKey];
  const score = Math.round(
    (entry.statements.pct + entry.branches.pct + entry.functions.pct + entry.lines.pct) / 4,
  );

  return {
    score,
    statements: { ...entry.statements },
    branches: { ...entry.branches },
    functions: { ...entry.functions },
    lines: { ...entry.lines },
    found: true,
  };
}

export function clearCoverageCache(): void {
  cache.clear();
}
