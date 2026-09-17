/**
 * Outcome of comparing one rendered variant against its baseline.
 *
 * `new` and `excluded` are deliberately not failures. A variant with no
 * baseline has nothing to regress against, and an excluded one was never
 * captured — a runner that does not fail its build on either must not be
 * contradicted by the UI.
 *
 * `excluded` exists because some variants cannot be captured meaningfully: a
 * tooltip that only renders on hover would be screenshotted as its trigger. A
 * runner reports them instead of dropping them silently, so the list of skipped
 * variants stays visible rather than quietly shrinking coverage.
 */
export type VrtStatus =
  | 'unchanged'
  | 'changed'
  | 'size-mismatch'
  | 'new'
  | 'excluded';

export interface VrtVariantResult {
  className: string;
  title?: string;
  variantName?: string;
  variantIndex: number;
  status: VrtStatus;
  width?: number;
  height?: number;
  diffPixels?: number;
  totalPixels?: number;
  /** Changed pixels as a fraction of the total, e.g. `0.5` for 50%. */
  diffRatio?: number;
  baselinePath?: string;
  /** The image captured on this run. Optional — the panel degrades without it. */
  currentPath?: string;
  diffPath?: string;
  /** Why a variant was excluded. Runners are expected to justify each one. */
  reason?: string;
}

export interface VrtTotals {
  auditedVariants: number;
  auditedComponents: number;
  unchanged: number;
  changed: number;
  sizeMismatch: number;
  new: number;
  /** Optional — older runners and runners without an exclusion list omit it. */
  excluded?: number;
  maxDiffRatio: number;
  /** Percent of comparable variants that are unchanged. */
  score: number;
}

/** The JSON document an external runner writes. */
export interface VrtReport {
  total: VrtTotals;
  byVariant: VrtVariantResult[];
}

export interface VrtThresholds {
  /** Minimum score before the header badge stops being green. */
  score: number;
}

export interface VisualRegressionPluginOptions {
  /** Path to the report JSON, relative to the workspace root. */
  reportPath?: string;
  /**
   * Prefix applied to the image paths recorded in the report so they resolve
   * against the served styleguide. No layout is assumed.
   */
  assetBaseUrl?: string;
  thresholds?: number | Partial<VrtThresholds>;
}

/** Shape stored under `showcaseConfig.meta.visualRegression`. */
export interface VrtComponentMeta {
  found: boolean;
  variants: VrtVariantResult[];
  assetBaseUrl: string;
}

/** Shape stored under `manifest.meta.visualRegression`. */
export interface VrtManifestMeta {
  found: boolean;
  total: VrtTotals | null;
  thresholds: VrtThresholds;
}
