import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  clearReportCache,
  readVariantsForComponent,
  readTotals,
} from './report-reader.js';

const FIXTURE = join(__dirname, '__fixtures__', 'vrt-report.json');
const MISSING = join(__dirname, '__fixtures__', 'does-not-exist.json');

/** Writes `content` verbatim to a throwaway report file and returns its path. */
function writeReport(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'vrt-report-'));
  scratchDirs.push(dir);
  const file = join(dir, 'vrt-report.json');
  writeFileSync(file, content, 'utf-8');
  return file;
}

const scratchDirs: string[] = [];

afterAll(() => {
  for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true });
});

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

/**
 * A malformed report must degrade exactly like a missing one. These run inside
 * `onComponentScanned`, where the plugin runner rethrows and fails the whole
 * styleguide build — the one moment you most want the report to be readable.
 */
describe('a malformed report', () => {
  beforeEach(() => clearReportCache());

  it('degrades when byVariant is not an array', () => {
    const file = writeReport('{ "byVariant": { "ButtonComponent": [] } }');
    expect(() =>
      readVariantsForComponent(file, 'ButtonComponent')
    ).not.toThrow();
    expect(readVariantsForComponent(file, 'ButtonComponent')).toEqual([]);
  });

  it('degrades when the file is truncated mid-write', () => {
    const file = writeReport('{ "total": { "score": 9');
    expect(readVariantsForComponent(file, 'ButtonComponent')).toEqual([]);
    expect(readTotals(file)).toBeNull();
  });

  it('degrades when the JSON root is not an object', () => {
    const file = writeReport('[]');
    expect(readVariantsForComponent(file, 'ButtonComponent')).toEqual([]);
    expect(readTotals(file)).toBeNull();
  });

  it('skips null entries instead of dereferencing them', () => {
    const file = writeReport(
      '{ "byVariant": [null, { "className": "ButtonComponent", "variantIndex": 0, "status": "unchanged" }] }'
    );
    const variants = readVariantsForComponent(file, 'ButtonComponent');
    expect(variants).toHaveLength(1);
    expect(variants[0].status).toBe('unchanged');
  });

  it('returns null totals when total is not an object', () => {
    const file = writeReport('{ "total": 99, "byVariant": [] }');
    expect(readTotals(file)).toBeNull();
  });
});
