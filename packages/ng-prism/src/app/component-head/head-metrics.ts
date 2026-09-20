/**
 * How a metric compares to its threshold.
 *
 * `none` means there is no verdict to give — either the value is missing, or
 * it is a plain fact with no threshold to compare against, like a count of
 * variants. Those render grey and stay out of the gauge's tally, which counts
 * the metrics that actually passed something.
 */
export type MetricVariant = 'ok' | 'warn' | 'danger' | 'none';

/** One measured value, already formatted for display. */
export interface HeadMetric {
  id: string;
  label: string;
  value: string;
  variant: MetricVariant;
}

/** What the gauge chip renders, derived from the full metric list. */
export interface GaugeSummary {
  /** Metrics that actually carry data. `none` does not count. */
  measured: number;
  /** The worst-ranked deviating metric, or null when nothing deviates. */
  worst: HeadMetric | null;
  /** How many further metrics deviate besides `worst`. */
  others: number;
  /** Colour role for the chip. */
  variant: 'ok' | 'warn' | 'danger';
}

const SEVERITY: Record<MetricVariant, number> = {
  none: 0,
  ok: 0,
  warn: 1,
  danger: 2,
};

/**
 * Folds the head's metrics into what one chip can say.
 *
 * Deliberately a pure function rather than a computed inside the component:
 * components using signal inputs cannot be rendered through TestBed in this
 * repo's Jest setup, so any logic left in a template is logic that never gets
 * a test. This mirrors `decorateItem` in the sidebar, which resolves the same
 * kind of question for navigation marks.
 *
 * Ties resolve by source order so the chip shows a stable metric across
 * renders rather than flickering between two equally bad ones.
 */
export function summarizeMetrics(metrics: readonly HeadMetric[]): GaugeSummary {
  let measured = 0;
  let worst: HeadMetric | null = null;
  let deviating = 0;

  for (const m of metrics) {
    if (m.variant !== 'none') measured++;
    if (SEVERITY[m.variant] === 0) continue;
    deviating++;
    if (worst === null || SEVERITY[m.variant] > SEVERITY[worst.variant]) {
      worst = m;
    }
  }

  return {
    measured,
    worst,
    others: deviating > 0 ? deviating - 1 : 0,
    variant: worst === null ? 'ok' : (worst.variant as 'warn' | 'danger'),
  };
}
