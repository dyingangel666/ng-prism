import type { A11yThresholds } from './a11y.types.js';

/** Sentinel value meaning "no upper bound" — JSON-safe (unlike Infinity, which serializes to null). */
export const A11Y_UNLIMITED = Number.MAX_SAFE_INTEGER;

export const DEFAULT_A11Y_THRESHOLDS: A11yThresholds = {
  score: 80,
  critical: 0,
  serious: 0,
  moderate: A11Y_UNLIMITED,
};

export function resolveA11yThresholds(
  input?: Partial<A11yThresholds>
): A11yThresholds {
  if (!input) return { ...DEFAULT_A11Y_THRESHOLDS };
  return { ...DEFAULT_A11Y_THRESHOLDS, ...input };
}
