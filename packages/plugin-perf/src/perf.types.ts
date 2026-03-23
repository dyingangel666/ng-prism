export interface BundleMetrics {
  sourceSize: number;
  gzipEstimate: number;
  directImports: number;
  importList: string[];
  treeDepth: number;
}

export interface PerfThresholds {
  bundleWarnKb: number;
  bundleCritKb: number;
  renderWarnMs: number;
  renderCritMs: number;
  memoryWarnMb: number;
  memoryLeakMb: number;
}

export interface PerfPluginOptions {
  thresholds?: Partial<PerfThresholds>;
  bundle?: {
    maxTreeDepth?: number;
    excludeImports?: string[];
  };
  render?: {
    bufferSize?: number;
    autoStart?: boolean;
  };
  memory?: {
    gcDelayMs?: number;
  };
}

export const DEFAULT_THRESHOLDS: PerfThresholds = {
  bundleWarnKb: 20,
  bundleCritKb: 50,
  renderWarnMs: 5,
  renderCritMs: 16,
  memoryWarnMb: 5,
  memoryLeakMb: 0.5,
};
