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

export interface CoverageData {
  score: number;
  statements: MetricDetail;
  branches: MetricDetail;
  functions: MetricDetail;
  lines: MetricDetail;
  found: boolean;
  files?: FileCoverageDetail[];
  thresholds?: CoverageThresholds;
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
