import type {
  PanelDefinition,
  RuntimeComponent,
} from '../../../plugin/plugin.types.js';
import { resolvePanelBadge, type PanelBadgeContext } from './panel-badge.js';
import { DEFAULT_A11Y_THRESHOLDS } from '../a11y/a11y-thresholds.js';
import { deriveA11ySummary } from '../a11y/a11y-summary.js';
import type { A11yScoreResult } from '../a11y/a11y.types.js';

const EMPTY_CONTEXT: PanelBadgeContext = {
  inputCount: 0,
  a11yResult: null,
  a11yThresholds: DEFAULT_A11Y_THRESHOLDS,
};

/** An audit result that is clean apart from the score it is asked to carry. */
function auditResult(
  overrides: Partial<A11yScoreResult> = {}
): A11yScoreResult {
  return {
    score: 100,
    violations: 0,
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    passes: 0,
    incomplete: 0,
    ...overrides,
  };
}

function panel(id: string, badge?: PanelDefinition['badge']): PanelDefinition {
  return { id, label: id, ...(badge ? { badge } : {}) };
}

const COMPONENT = { meta: {} } as unknown as RuntimeComponent;

describe('resolvePanelBadge', () => {
  it('lets a panel speak for itself', () => {
    const own = panel('visual-regression', () => ({
      text: '3',
      variant: 'danger' as const,
    }));
    expect(resolvePanelBadge(own, COMPONENT, EMPTY_CONTEXT)).toEqual({
      text: '3',
      variant: 'danger',
    });
  });

  it('passes the active component to the panel', () => {
    const seen: unknown[] = [];
    const own = panel('x', (component) => {
      seen.push(component);
      return null;
    });
    resolvePanelBadge(own, COMPONENT, EMPTY_CONTEXT);
    expect(seen).toEqual([COMPONENT]);
  });

  it('honours a panel that says there is nothing to report', () => {
    expect(
      resolvePanelBadge(
        panel('x', () => null),
        COMPONENT,
        EMPTY_CONTEXT
      )
    ).toBeNull();
  });

  it('lets a panel override a built-in of the same id', () => {
    // The built-in chain is a fallback, not a floor — a plugin that replaces a
    // panel id owns its tab entirely.
    const own = panel('a11y', () => ({ text: 'AA', variant: 'ok' as const }));
    const badge = resolvePanelBadge(own, COMPONENT, {
      ...EMPTY_CONTEXT,
      a11yResult: auditResult({ score: 42 }),
    });
    expect(badge).toEqual({ text: 'AA', variant: 'ok' });
  });

  it('asks nothing of a panel when no component is active', () => {
    let called = false;
    const own = panel('x', () => {
      called = true;
      return { text: '1' };
    });
    expect(resolvePanelBadge(own, null, EMPTY_CONTEXT)).toBeNull();
    expect(called).toBe(false);
  });

  it('counts inputs on the controls tab', () => {
    expect(
      resolvePanelBadge(panel('controls'), COMPONENT, {
        ...EMPTY_CONTEXT,
        inputCount: 6,
      })
    ).toEqual({ text: '6', variant: 'default' });
  });

  it('leaves the controls tab bare when there is nothing to control', () => {
    expect(
      resolvePanelBadge(panel('controls'), COMPONENT, EMPTY_CONTEXT)
    ).toBeNull();
  });

  it('grades the a11y tab against the configured thresholds', () => {
    // The tab and the navigation marker look at different numbers — a running
    // audit versus the build-time report — but never at different scales. The
    // expectations come from the same derivation the marker uses, so a change
    // to one cannot quietly leave the other behind.
    const thresholds = { ...DEFAULT_A11Y_THRESHOLDS, score: 80 };
    const grade = (result: A11yScoreResult) =>
      resolvePanelBadge(panel('a11y'), COMPONENT, {
        ...EMPTY_CONTEXT,
        a11yResult: result,
        a11yThresholds: thresholds,
      });

    for (const result of [
      auditResult({ score: 85 }),
      auditResult({ score: 79 }),
      auditResult({ score: 65 }),
      auditResult({ score: 95, serious: 1 }),
    ]) {
      expect(grade(result)).toEqual({
        text: String(result.score),
        variant: deriveA11ySummary(result, thresholds).variant,
      });
    }
  });

  it('does not call a component amber on the tab and green in the sidebar', () => {
    // The concrete disagreement the shared derivation removes: 85 was 'warn'
    // on the old hardcoded 90/70 scale and 'ok' against a configured 80.
    const thresholds = { ...DEFAULT_A11Y_THRESHOLDS, score: 80 };
    expect(
      resolvePanelBadge(panel('a11y'), COMPONENT, {
        ...EMPTY_CONTEXT,
        a11yResult: auditResult({ score: 85 }),
        a11yThresholds: thresholds,
      })
    ).toEqual({ text: '85', variant: 'ok' });
  });

  it('shows a zero score rather than hiding it', () => {
    // Distinct from "no score yet": an audit that ran and found the component
    // unusable is the single most important thing the tab can say.
    expect(
      resolvePanelBadge(panel('a11y'), COMPONENT, {
        ...EMPTY_CONTEXT,
        a11yResult: auditResult({ score: 0, critical: 3 }),
      })
    ).toEqual({ text: '0', variant: 'danger' });
  });

  it('has nothing to say about the coverage tab', () => {
    // The coverage plugin badges its own tab now, using its own thresholds.
    expect(
      resolvePanelBadge(panel('coverage'), COMPONENT, EMPTY_CONTEXT)
    ).toBeNull();
  });

  it('has nothing to say about a panel it does not know', () => {
    expect(resolvePanelBadge(panel('events'), COMPONENT, EMPTY_CONTEXT)).toBe(
      null
    );
  });
});
