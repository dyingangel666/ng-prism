import { join } from 'node:path';
import {
  clearReportCache,
  readVariantsForComponent,
  readTotals,
} from './report-reader.js';

const FIXTURE = join(__dirname, '__fixtures__', 'vrt-report.json');
const MISSING = join(__dirname, '__fixtures__', 'does-not-exist.json');

describe('readVariantsForComponent', () => {
  beforeEach(() => clearReportCache());

  it('returns every variant recorded for the component', () => {
    const variants = readVariantsForComponent(FIXTURE, 'DividerComponent');
    expect(variants).toHaveLength(2);
    expect(variants.map((v) => v.variantName)).toEqual([
      'Horizontal',
      'Vertical',
    ]);
  });

  it('orders variants by variantIndex', () => {
    const variants = readVariantsForComponent(FIXTURE, 'ButtonComponent');
    expect(variants.map((v) => v.variantIndex)).toEqual([0, 1, 2]);
  });

  it('does not leak variants from other components', () => {
    const variants = readVariantsForComponent(FIXTURE, 'ButtonComponent');
    expect(variants.every((v) => v.className === 'ButtonComponent')).toBe(true);
  });

  it('passes an excluded variant through with its reason', () => {
    const variants = readVariantsForComponent(FIXTURE, 'TooltipDirective');
    expect(variants).toHaveLength(1);
    expect(variants[0].status).toBe('excluded');
    expect(variants[0].reason).toContain('hover');
  });

  it('returns an empty list for a component with no results', () => {
    expect(readVariantsForComponent(FIXTURE, 'UnknownComponent')).toEqual([]);
  });

  it('returns an empty list when the report does not exist', () => {
    expect(readVariantsForComponent(MISSING, 'ButtonComponent')).toEqual([]);
  });

  it('preserves a new variant without a baseline', () => {
    const ghost = readVariantsForComponent(FIXTURE, 'ButtonComponent')[1];
    expect(ghost.status).toBe('new');
    expect(ghost.baselinePath).toBeUndefined();
    expect(ghost.currentPath).toBe('vrt/current/ButtonComponent/01-ghost.png');
  });
});

describe('readTotals', () => {
  beforeEach(() => clearReportCache());

  it('reads the totals block', () => {
    expect(readTotals(FIXTURE)).toEqual({
      auditedVariants: 6,
      auditedComponents: 2,
      unchanged: 3,
      changed: 1,
      sizeMismatch: 0,
      new: 1,
      excluded: 1,
      maxDiffRatio: 0.5,
      score: 75,
    });
  });

  it('returns null when the report does not exist', () => {
    expect(readTotals(MISSING)).toBeNull();
  });
  it('reports the excluded count when the runner provides one', () => {
    expect(readTotals(FIXTURE)?.excluded).toBe(1);
  });
});
