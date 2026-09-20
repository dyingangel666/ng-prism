import { summarizeMetrics, type HeadMetric } from './head-metrics.js';

const metric = (
  id: string,
  variant: HeadMetric['variant'],
  value = '—'
): HeadMetric => ({ id, label: id, value, variant });

describe('summarizeMetrics', () => {
  it('reports nothing for an empty list', () => {
    expect(summarizeMetrics([])).toEqual({
      measured: 0,
      worst: null,
      others: 0,
      variant: 'ok',
    });
  });

  it('counts measured values and stays quiet when all are ok', () => {
    const result = summarizeMetrics([
      metric('variants', 'ok', '9'),
      metric('coverage', 'ok', '99%'),
    ]);
    expect(result.measured).toBe(2);
    expect(result.worst).toBeNull();
    expect(result.variant).toBe('ok');
  });

  /**
   * A metric with no data is not a metric in good standing — it is one the
   * gauge has nothing to say about. Counting it would make "5" mean something
   * different depending on which plugins happen to be installed.
   */
  it('excludes metrics without data from the count', () => {
    const result = summarizeMetrics([
      metric('coverage', 'ok', '99%'),
      metric('vrt', 'none', '—'),
    ]);
    expect(result.measured).toBe(1);
  });

  it('surfaces a single deviation as the worst', () => {
    const result = summarizeMetrics([
      metric('coverage', 'warn', '73%'),
      metric('a11y', 'ok', '100'),
    ]);
    expect(result.worst?.id).toBe('coverage');
    expect(result.others).toBe(0);
    expect(result.variant).toBe('warn');
  });

  it('ranks danger above warn regardless of order', () => {
    const result = summarizeMetrics([
      metric('coverage', 'warn', '73%'),
      metric('a11y', 'danger', '64'),
    ]);
    expect(result.worst?.id).toBe('a11y');
    expect(result.others).toBe(1);
    expect(result.variant).toBe('danger');
  });

  /**
   * Ties resolve by source order, so the chip shows the same metric on every
   * render instead of flickering between two equally bad ones.
   */
  it('breaks ties by source order', () => {
    const result = summarizeMetrics([
      metric('vrt', 'warn', '2 diffs'),
      metric('coverage', 'warn', '73%'),
    ]);
    expect(result.worst?.id).toBe('vrt');
    expect(result.others).toBe(1);
  });
});

describe('metrics without a threshold', () => {
  /**
   * A variant count is a fact, not a verdict. It renders grey like a missing
   * value and stays out of the tally, so the gauge's quiet number means "this
   * many metrics were measured against a threshold and all of them passed"
   * rather than counting a number that could not have failed.
   */
  it('keeps a plain count out of the tally', () => {
    const result = summarizeMetrics([
      metric('variants', 'none', '9'),
      metric('coverage', 'ok', '99%'),
      metric('a11y', 'ok', '100'),
    ]);
    expect(result.measured).toBe(2);
    expect(result.worst).toBeNull();
    expect(result.variant).toBe('ok');
  });
});
