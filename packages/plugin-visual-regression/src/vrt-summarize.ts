import type { VrtStatus, VrtVariantResult } from './visual-regression.types.js';

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

/** Order the summary strip and any status list follow: worst news first. */
const STATUS_ORDER: readonly VrtStatus[] = [
  'changed',
  'size-mismatch',
  'unchanged',
  'new',
  'excluded',
];

export interface VrtSummary {
  total: number;
  counts: Record<VrtStatus, number>;
  /** Variants a runner could actually measure against a baseline. */
  compared: number;
  /** Largest diff among compared variants; `null` when nothing was compared. */
  maxDiffRatio: number | null;
}

export interface VrtTile {
  key: string;
  label: string;
  value: string;
  /** How far the tile's bar fills, 0–1. */
  ratio: number;
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

  let compared = 0;
  let maxDiffRatio: number | null = null;

  for (const variant of variants) {
    if (variant.status in counts) counts[variant.status]++;

    // A ratio exists only where a baseline and a capture were compared.
    // `new` has nothing to measure against and `size-mismatch` could not be
    // measured, so neither contributes to the worst-diff figure.
    if (typeof variant.diffRatio === 'number') {
      compared++;
      maxDiffRatio = Math.max(maxDiffRatio ?? 0, variant.diffRatio);
    }
  }

  return { total: variants.length, counts, compared, maxDiffRatio };
}

/**
 * The tiles the summary strip renders.
 *
 * `Changed` and `Unchanged` are always present: a strip that loses a column
 * when a run goes green would make the panel change shape with its content,
 * and "no Changed tile" is easy to misread as "no data". Everything else
 * appears only when it has something to report, so a library that never
 * excludes a variant is never asked to wonder what `Excluded` means.
 */
export function summaryTiles(summary: VrtSummary): VrtTile[] {
  const share = (count: number) =>
    summary.total === 0 ? 0 : count / summary.total;

  const tiles: VrtTile[] = STATUS_ORDER.filter(
    (status) =>
      summary.counts[status] > 0 ||
      status === 'changed' ||
      status === 'unchanged'
  ).map((status) => {
    const count = summary.counts[status];
    return {
      key: status,
      label: STATUS_LABEL[status],
      value: String(count),
      ratio: share(count),
      // A count of zero is the absence of news, not news in that colour:
      // "Changed 0" rendered in danger red screams the opposite of what it says.
      tone: count === 0 ? ('muted' as const) : STATUS_TONE[status],
    };
  });

  if (summary.maxDiffRatio !== null) {
    tiles.push({
      key: 'max-diff',
      label: 'Max diff',
      value: formatPercent(summary.maxDiffRatio),
      ratio: summary.maxDiffRatio,
      tone: summary.maxDiffRatio > 0 ? 'danger' : 'success',
    });
  }

  return tiles;
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
