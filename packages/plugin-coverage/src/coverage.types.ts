export interface MetricDetail {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

export interface FileCoverageDetail {
  path: string;
  statements: MetricDetail;
  branches: MetricDetail;
  functions: MetricDetail;
  lines: MetricDetail;
}

export interface CoverageThresholds {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

export interface CoverageSummary {
  variant: 'ok' | 'warn' | 'danger';
  label: string;
}

export interface CoverageData {
  score: number;
  statements: MetricDetail;
  branches: MetricDetail;
  functions: MetricDetail;
  lines: MetricDetail;
  found: boolean;
  files?: FileCoverageDetail[];
  thresholds?: CoverageThresholds;
  /**
   * Pre-derived headline, written by the build-time hook. Optional because a
   * browser-only plugin setup runs no build-time hooks and then has none.
   */
  summary?: CoverageSummary;
}

export interface CoveragePluginOptions {
  coveragePath?: string;
  thresholds?: number | Partial<CoverageThresholds>;
}

/** Shape stored under `manifest.meta.coverage`. */
export interface CoverageManifestMeta {
  total: CoverageData;
  thresholds: CoverageThresholds;
}

export interface IstanbulFileCoverage {
  statements: MetricDetail;
  branches: MetricDetail;
  functions: MetricDetail;
  lines: MetricDetail;
}

export interface IstanbulSummary {
  [filePath: string]: IstanbulFileCoverage;
}
