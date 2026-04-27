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

export interface CoverageData {
  score: number;
  statements: MetricDetail;
  branches: MetricDetail;
  functions: MetricDetail;
  lines: MetricDetail;
  found: boolean;
  files?: FileCoverageDetail[];
}

export interface CoveragePluginOptions {
  coveragePath?: string;
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
