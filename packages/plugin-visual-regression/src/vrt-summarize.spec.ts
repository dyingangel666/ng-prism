import type { VrtStatus, VrtVariantResult } from './visual-regression.types.js';
import { formatPercent, summarize, summarySegments } from './vrt-summarize.js';

function variant(status: VrtStatus, diffRatio?: number): VrtVariantResult {
  return {
    className: 'ButtonComponent',
    variantIndex: 0,
    status,
    ...(diffRatio === undefined ? {} : { diffRatio }),
  };
}

describe('summarize', () => {
  it('counts every status', () => {
    const summary = summarize([
      variant('unchanged', 0),
      variant('unchanged', 0),
      variant('changed', 0.1),
      variant('size-mismatch'),
      variant('new'),
      variant('excluded'),
    ]);

    expect(summary.counts).toEqual({
      unchanged: 2,
      changed: 1,
      'size-mismatch': 1,
      new: 1,
      excluded: 1,
    });
    expect(summary.total).toBe(6);
  });

  it('reports the worst diff among compared variants', () => {
    const summary = summarize([
      variant('unchanged', 0),
      variant('changed', 0.1026),
      variant('changed', 0.004),
    ]);
    expect(summary.maxDiffRatio).toBeCloseTo(0.1026);
    expect(summary.compared).toBe(3);
  });

  it('has no diff figure when nothing could be compared', () => {
    const summary = summarize([variant('new'), variant('excluded')]);
    expect(summary.maxDiffRatio).toBeNull();
    expect(summary.compared).toBe(0);
  });

  it('does not let a size-mismatch invent a diff of zero', () => {
    // Dimensions changed, so no pixel comparison happened. Counting it as a
    // compared 0% would claim a clean result the runner never produced.
    const summary = summarize([variant('size-mismatch')]);
    expect(summary.maxDiffRatio).toBeNull();
    expect(summary.compared).toBe(0);
  });

  it('handles an empty list', () => {
    const summary = summarize([]);
    expect(summary.total).toBe(0);
    expect(summary.maxDiffRatio).toBeNull();
    expect(summary.counts.unchanged).toBe(0);
  });

  it('ignores a status outside the union rather than throwing', () => {
    const rogue = { ...variant('unchanged'), status: 'wat' as VrtStatus };
    expect(() => summarize([rogue])).not.toThrow();
    expect(summarize([rogue]).total).toBe(1);
  });
});

describe('summarySegments', () => {
  it('omits a status that did not occur', () => {
    // A bar has no shape to keep: a zero-count slice is zero pixels wide, so
    // carrying it would only add an invisible entry and a misleading legend.
    const segments = summarySegments(summarize([variant('new')]));
    expect(segments.map((s) => s.key)).toEqual(['new']);
  });

  it('leads with the bad news', () => {
    const segments = summarySegments(
      summarize([
        variant('unchanged', 0),
        variant('changed', 0.5),
        variant('size-mismatch'),
        variant('excluded'),
      ])
    );
    expect(segments.map((s) => s.key)).toEqual([
      'changed',
      'size-mismatch',
      'unchanged',
      'excluded',
    ]);
  });

  it('carries the raw count so the bar can weight itself', () => {
    const segments = summarySegments(
      summarize([
        variant('unchanged', 0),
        variant('unchanged', 0),
        variant('unchanged', 0),
        variant('changed', 0.5),
      ])
    );
    expect(segments.find((s) => s.key === 'unchanged')?.count).toBe(3);
    expect(segments.find((s) => s.key === 'changed')?.count).toBe(1);
  });

  it('gives every segment its status tone and label', () => {
    const segments = summarySegments(summarize([variant('size-mismatch')]));
    expect(segments[0]).toEqual({
      key: 'size-mismatch',
      label: 'Resized',
      count: 1,
      tone: 'warn',
    });
  });

  it('survives an empty variant list', () => {
    expect(summarySegments(summarize([]))).toEqual([]);
  });
});

describe('formatPercent', () => {
  it('shows a clean zero', () => {
    expect(formatPercent(0)).toBe('0%');
  });

  it('never rounds a real diff down to zero', () => {
    expect(formatPercent(0.00001)).toBe('<0.01%');
  });

  it('keeps two decimals', () => {
    expect(formatPercent(0.1026)).toBe('10.26%');
  });
});
