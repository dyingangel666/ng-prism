import type { VrtStatus, VrtVariantResult } from './visual-regression.types.js';
import { formatPercent, summarize, summaryTiles } from './vrt-summarize.js';

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

describe('summaryTiles', () => {
  it('always shows Changed and Unchanged, even at zero', () => {
    const tiles = summaryTiles(summarize([variant('new')]));
    expect(tiles.map((t) => t.key)).toEqual(['changed', 'unchanged', 'new']);
    expect(tiles.find((t) => t.key === 'changed')?.value).toBe('0');
  });

  it('omits statuses that have nothing to report', () => {
    const tiles = summaryTiles(
      summarize([variant('unchanged', 0), variant('changed', 0.5)])
    );
    expect(tiles.map((t) => t.key)).toEqual([
      'changed',
      'unchanged',
      'max-diff',
    ]);
  });

  it('leads with the bad news', () => {
    const tiles = summaryTiles(
      summarize([
        variant('unchanged', 0),
        variant('changed', 0.5),
        variant('size-mismatch'),
        variant('excluded'),
      ])
    );
    expect(tiles.map((t) => t.key)).toEqual([
      'changed',
      'size-mismatch',
      'unchanged',
      'excluded',
      'max-diff',
    ]);
  });

  it('sizes each bar by the share of variants it covers', () => {
    const tiles = summaryTiles(
      summarize([
        variant('unchanged', 0),
        variant('unchanged', 0),
        variant('unchanged', 0),
        variant('changed', 0.5),
      ])
    );
    expect(tiles.find((t) => t.key === 'unchanged')?.ratio).toBe(0.75);
    expect(tiles.find((t) => t.key === 'changed')?.ratio).toBe(0.25);
  });

  it('mutes a count of zero instead of colouring it', () => {
    const tiles = summaryTiles(summarize([variant('new')]));
    expect(tiles.find((t) => t.key === 'changed')).toMatchObject({
      value: '0',
      tone: 'muted',
    });
    expect(tiles.find((t) => t.key === 'new')?.tone).toBe('neutral');
  });

  it('drops the max-diff tile when nothing was compared', () => {
    const tiles = summaryTiles(summarize([variant('new')]));
    expect(tiles.some((t) => t.key === 'max-diff')).toBe(false);
  });

  it('tones the max-diff tile green when everything matched', () => {
    const tiles = summaryTiles(summarize([variant('unchanged', 0)]));
    const maxDiff = tiles.find((t) => t.key === 'max-diff');
    expect(maxDiff).toMatchObject({ value: '0%', tone: 'success' });
  });

  it('tones the max-diff tile red as soon as anything moved', () => {
    const tiles = summaryTiles(summarize([variant('changed', 0.1026)]));
    expect(tiles.find((t) => t.key === 'max-diff')).toMatchObject({
      value: '10.26%',
      tone: 'danger',
    });
  });

  it('survives an empty variant list', () => {
    expect(() => summaryTiles(summarize([]))).not.toThrow();
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
