import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  checkA11yThresholds,
  clearA11yReportCache,
  loadA11yReport,
  readA11yMeta,
} from './a11y-report-reader.js';
import { A11Y_UNLIMITED } from '../../app/panels/a11y/a11y-thresholds.js';
import type { A11yReport } from '../../app/panels/a11y/a11y.types.js';

function makeReport(overrides?: Partial<A11yReport['total']>): A11yReport {
  return {
    total: {
      score: 92,
      violations: 2,
      critical: 0,
      serious: 0,
      moderate: 1,
      minor: 1,
      passes: 50,
      incomplete: 3,
      auditedComponents: 5,
      auditedVariants: 12,
      ...overrides,
    },
    components: {},
    generatedAt: '2026-06-01T10:00:00.000Z',
  };
}

describe('a11y-report-reader', () => {
  let tmpDir: string;
  let reportPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'prism-a11y-'));
    reportPath = path.join(tmpDir, 'a11y-report.json');
    clearA11yReportCache();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadA11yReport', () => {
    it('returns null when the file does not exist', () => {
      expect(loadA11yReport('/nonexistent/a11y.json')).toBeNull();
    });

    it('reads and parses an existing report', () => {
      writeFileSync(reportPath, JSON.stringify(makeReport()), 'utf-8');
      const result = loadA11yReport(reportPath);
      expect(result?.total.score).toBe(92);
    });

    it('caches by mtime', () => {
      const fs = require('node:fs');
      writeFileSync(reportPath, JSON.stringify(makeReport()), 'utf-8');
      const spy = jest.spyOn(fs, 'readFileSync');
      loadA11yReport(reportPath);
      loadA11yReport(reportPath);
      const matchingCalls = spy.mock.calls.filter(
        (c) => typeof c[0] === 'string' && (c[0] as string).includes('a11y-report'),
      );
      expect(matchingCalls).toHaveLength(1);
      spy.mockRestore();
    });
  });

  describe('readA11yMeta', () => {
    it('combines report.total with resolved thresholds', () => {
      writeFileSync(reportPath, JSON.stringify(makeReport()), 'utf-8');
      const meta = readA11yMeta(reportPath, { score: 90 });
      expect(meta?.total.score).toBe(92);
      expect(meta?.thresholds.score).toBe(90);
      expect(meta?.thresholds.critical).toBe(0); // default
    });

    it('returns null when report missing', () => {
      expect(readA11yMeta('/nonexistent/a11y.json')).toBeNull();
    });
  });

  describe('checkA11yThresholds', () => {
    it('returns empty when nothing is violated', () => {
      const meta = {
        total: makeReport().total,
        thresholds: { score: 80, critical: 0, serious: 0, moderate: A11Y_UNLIMITED },
      };
      expect(checkA11yThresholds(meta)).toEqual([]);
    });

    it('flags score below threshold', () => {
      const meta = {
        total: makeReport({ score: 70 }).total,
        thresholds: { score: 80, critical: 0, serious: 0, moderate: A11Y_UNLIMITED },
      };
      const violations = checkA11yThresholds(meta);
      expect(violations).toEqual([{ metric: 'score', actual: 70, threshold: 80 }]);
    });

    it('flags excess critical and serious violations', () => {
      const meta = {
        total: makeReport({ critical: 2, serious: 1 }).total,
        thresholds: { score: 80, critical: 0, serious: 0, moderate: A11Y_UNLIMITED },
      };
      const violations = checkA11yThresholds(meta);
      expect(violations.map((v) => v.metric).sort()).toEqual(['critical', 'serious']);
    });

    it('does not flag moderate violations when unlimited (default)', () => {
      const meta = {
        total: makeReport({ moderate: 50 }).total,
        thresholds: { score: 80, critical: 0, serious: 0, moderate: A11Y_UNLIMITED },
      };
      expect(checkA11yThresholds(meta)).toEqual([]);
    });

    it('flags moderate violations when threshold is set', () => {
      const meta = {
        total: makeReport({ moderate: 3 }).total,
        thresholds: { score: 80, critical: 0, serious: 0, moderate: 2 },
      };
      const violations = checkA11yThresholds(meta);
      expect(violations).toEqual([{ metric: 'moderate', actual: 3, threshold: 2 }]);
    });
  });
});
