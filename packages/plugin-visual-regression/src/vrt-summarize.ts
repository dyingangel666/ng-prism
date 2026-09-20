import {
  isVrtStatus,
  type VrtStat,
  type VrtStatus,
  type VrtVariantResult,
} from './visual-regression.types.js';

/**
 * Colour role of a status, resolved to a theme token by the components.
 *
 * `new` is `neutral` rather than muted on purpose: the report contract says a
 * variant with no baseline is explicitly not a failure, and grey reads as
 * "ignored" next to a green "unchanged".
 */
export type VrtTone = 'success' | 'danger' | 'warn' | 'neutral' | 'muted';

export const STATUS_LABEL: Record<VrtStatus, string> = {
  unchanged: 'Unchanged',
  changed: 'Changed',
  'size-mismatch': 'Resized',
  new: 'New',
  excluded: 'Excluded',
};

export const STATUS_TONE: Record<VrtStatus, VrtTone> = {
  unchanged: 'success',
  changed: 'danger',
  'size-mismatch': 'warn',
  new: 'neutral',
  excluded: 'muted',
};

/** The two statuses that mean a baseline and a capture were actually compared. */
const COMPARED_STATUSES: ReadonlySet<VrtStatus> = new Set<VrtStatus>([
  'unchanged',
  'changed',
]);

/** Order the summary strip and any status list follow: worst news first. */
const STATUS_ORDER: readonly VrtStatus[] = [
  'changed',
  'size-mismatch',
  'unchanged',
  'new',
  'excluded',
];

export interface VrtSummary {
  /**
   * Variants with a recognised status — the same set the groups render, so
   * the headline figure and the list cannot disagree about how many there are.
   */
  total: number;
  counts: Record<VrtStatus, number>;
  /** Variants a runner could actually measure against a baseline. */
  compared: number;
  /** Largest diff among compared variants; `null` when nothing was compared. */
  maxDiffRatio: number | null;
}

export interface VrtSegment {
  key: VrtStatus;
  label: string;
  /** Raw count — the bar weights its slices by this, so it needs no ratio. */
  count: number;
  tone: VrtTone;
}

/** Counts and the worst diff, derived from the variants already in `meta`. */
export function summarize(variants: readonly VrtVariantResult[]): VrtSummary {
  const counts: Record<VrtStatus, number> = {
    unchanged: 0,
    changed: 0,
    'size-mismatch': 0,
    new: 0,
    excluded: 0,
  };

  let total = 0;
  let compared = 0;
  let maxDiffRatio: number | null = null;

  for (const variant of variants) {
    // `isVrtStatus`, not `variant.status in counts`: `counts` is an object
    // literal, so `in` also answers true for `Object.prototype` members and a
    // report writing `status: "toString"` would increment a key that is not
    // one, turning the count into `NaN`. The reader rejects such an entry
    // before it reaches here; this keeps the function honest on its own.
    if (!isVrtStatus(variant.status)) continue;
    total++;
    counts[variant.status]++;

    // A ratio exists only where a baseline and a capture were compared.
    // `new` has nothing to measure against and `size-mismatch` could not be
    // measured, so neither contributes to the worst-diff figure — the status
    // is what decides that, not the mere presence of a number. A runner that
    // records `diffRatio: 1` on a resized variant (a natural way to write
    // "completely different") would otherwise push the component head to
    // "VRT 100.00%" for a variant nothing ever compared.
    if (!COMPARED_STATUSES.has(variant.status)) continue;
    if (typeof variant.diffRatio === 'number') {
      compared++;
      maxDiffRatio = Math.max(maxDiffRatio ?? 0, variant.diffRatio);
    }
  }

  return { total, counts, compared, maxDiffRatio };
}

/**
 * The slices of the composition bar, worst news first.
 *
 * Only statuses that actually occurred. The tile strip this replaced had to
 * keep `changed` and `unchanged` present at zero so the panel would not change
 * shape with its content — a bar has no such problem, because a zero count is
 * a zero-width slice. Carrying it would add an invisible segment and a legend
 * entry claiming a colour nothing on screen has.
 *
 * Counts rather than ratios: the bar divides itself with `flex-grow`, so it
 * needs the weights, not pre-divided shares, and an empty run yields an empty
 * bar instead of a division by zero.
 */
export function summarySegments(summary: VrtSummary): VrtSegment[] {
  return STATUS_ORDER.filter((status) => summary.counts[status] > 0).map(
    (status) => ({
      key: status,
      label: STATUS_LABEL[status],
      count: summary.counts[status],
      tone: STATUS_TONE[status],
    })
  );
}

/**
 * A ratio as the percentage a reviewer reads.
 *
 * Anything above zero keeps two decimals, because the difference between
 * "0.00%" and "a few pixels moved" is the whole point of the panel — a diff
 * that rounds to zero is shown as `<0.01%`, never as `0%`.
 */
export function formatPercent(ratio: number): string {
  const pct = ratio * 100;
  if (pct === 0) return '0%';
  if (pct < 0.01) return '<0.01%';
  return `${pct.toFixed(2)}%`;
}

/** The three buckets the variant list is grouped into, in display order. */
export type VrtGroupKey = 'review' | 'unchanged' | 'excluded';

export interface VrtGroup<T> {
  key: VrtGroupKey;
  label: string;
  count: number;
  /**
   * Whether the group may be collapsed. `review` never can: it is the reason
   * the panel exists, and a list whose only interesting rows can be hidden
   * behind a disclosure triangle is a list that gets skimmed past.
   */
  collapsible: boolean;
  rows: T[];
}

const GROUP_OF: Record<VrtStatus, VrtGroupKey> = {
  changed: 'review',
  'size-mismatch': 'review',
  new: 'review',
  unchanged: 'unchanged',
  excluded: 'excluded',
};

/**
 * Whether a status lands in the `review` group.
 *
 * Exported so the panel tab's badge can count the same set {@link groupRows}
 * puts in the first group without building all three groups to find out — the
 * badge runs on every change-detection pass, the grouping does not.
 */
export function isReviewStatus(status: VrtStatus): boolean {
  return GROUP_OF[status] === 'review';
}

const GROUP_LABEL: Record<VrtGroupKey, string> = {
  review: 'Needs review',
  unchanged: 'Unchanged',
  excluded: 'Excluded',
};

const GROUP_ORDER: readonly VrtGroupKey[] = ['review', 'unchanged', 'excluded'];

/**
 * The variant list split into what needs a decision and what does not.
 *
 * `new` sits in `review` beside `changed`, which is the one placement worth
 * explaining. A variant with no baseline is explicitly *not* a failure — the
 * report contract says so and the row keeps its own neutral tone — but it is
 * the one state that cannot resolve itself: somebody has to accept a baseline.
 * `excluded` is the mirror image and gets its own group rather than being
 * folded into `unchanged`: both are "not your problem", but "compared and
 * matched" and "never captured" are different claims and a reviewer counting
 * coverage needs to tell them apart.
 *
 * Empty groups are dropped instead of rendered at zero. The summary bar above
 * the list has the same rule, and for the same reason — a zero-count header is
 * a line of chrome asserting a colour nothing on screen has.
 *
 * Generic over the row rather than taking `VrtVariantResult`: the panel groups
 * its own view models, which already carry the label and the formatted diff,
 * and threading those back through a variant-shaped API would mean building
 * them twice.
 */
export function groupRows<T extends { status: VrtStatus }>(
  rows: readonly T[]
): VrtGroup<T>[] {
  return GROUP_ORDER.map((key) => ({
    key,
    label: GROUP_LABEL[key],
    collapsible: key !== 'review',
    rows: STATUS_ORDER.filter((status) => GROUP_OF[status] === key).flatMap(
      (status) => rows.filter((row) => row.status === status)
    ),
  }))
    .filter((group) => group.rows.length > 0)
    .map((group) => ({ ...group, count: group.rows.length }));
}

/**
 * Which groups start open.
 *
 * Nothing, while something needs review — the point of the grouping is that
 * the fourteen unchanged variants stop competing with the one that changed.
 * When there is no review group the rule inverts and the first group opens,
 * because two collapsed headers and no rows reads as a panel that failed to
 * load rather than as a clean run.
 */
export function defaultExpandedGroups<T>(
  groups: readonly VrtGroup<T>[]
): VrtGroupKey[] {
  if (groups.some((group) => group.key === 'review')) return [];
  return groups.length ? [groups[0].key] : [];
}

/**
 * Names the reason a warn fires when nothing was actually compared.
 *
 * `value` is `'—'` in exactly this case — a resized capture or a variant with
 * no baseline yet has nothing to measure a diff against — so a label built
 * from `value` would read "Visual regression: — max diff": amber, naming
 * nothing actionable. This names the real cause instead, the same way the
 * a11y danger label lists which severities fired rather than repeating a
 * score that wouldn't explain itself.
 */
function warnReason(counts: VrtSummary['counts']): string {
  const parts: string[] = [];
  if (counts['size-mismatch'] > 0) {
    parts.push(`${counts['size-mismatch']} resized`);
  }
  if (counts.new > 0) {
    parts.push(`${counts.new} new baseline${counts.new === 1 ? '' : 's'}`);
  }
  return parts.join(', ');
}

/**
 * The headline figure, colour and label for one component.
 *
 * The colour comes from the *statuses*, not from the percentage, and that is
 * deliberate: {@link DEFAULT_VRT_THRESHOLDS} already says a run is only green
 * at a perfect score, so a "small enough to stay amber" diff would contradict
 * the badge sitting in the same header. Magnitude is what the value carries.
 * Amber is reserved for the variants that could not be measured at all —
 * resized and new — which are neither a regression nor a clean pass.
 *
 * The label is composed here, alongside the value, and never again at read
 * time — `badge()` in `panel-contributions.ts` returns it verbatim, the same
 * contract a11y and coverage already follow for their own `summary.label`.
 *
 * Computed at build time and stored in the component's meta, so the component
 * head can read primitives instead of reimplementing this plugin's status
 * semantics in the core app.
 */
export function statSummary(summary: VrtSummary): VrtStat {
  const { counts, maxDiffRatio } = summary;
  const value = maxDiffRatio === null ? '—' : formatPercent(maxDiffRatio);

  if (counts.changed > 0) {
    return {
      value,
      variant: 'danger',
      label: `Visual regression: ${value} max diff`,
    };
  }

  if (counts['size-mismatch'] > 0 || counts.new > 0) {
    return {
      value,
      variant: 'warn',
      label: `Visual regression: ${warnReason(counts)}`,
    };
  }

  return {
    value,
    variant: 'ok',
    label: `Visual regression: ${value} max diff`,
  };
}
