import type {
  PanelDefinition,
  RuntimeComponent,
} from '../../../plugin/plugin.types.js';
import { resolvePanelBadge, type PanelBadgeContext } from './panel-badge.js';

const EMPTY_CONTEXT: PanelBadgeContext = {
  inputCount: 0,
  a11yScore: null,
  coverageScore: null,
};

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
      a11yScore: 42,
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

  it('grades the a11y and coverage scores the same way', () => {
    const grade = (id: string, score: number) =>
      resolvePanelBadge(panel(id), COMPONENT, {
        ...EMPTY_CONTEXT,
        a11yScore: score,
        coverageScore: score,
      })?.variant;

    for (const id of ['a11y', 'coverage']) {
      expect(grade(id, 90)).toBe('ok');
      expect(grade(id, 89)).toBe('warn');
      expect(grade(id, 70)).toBe('warn');
      expect(grade(id, 69)).toBe('danger');
    }
  });

  it('shows a zero score rather than hiding it', () => {
    // Distinct from "no score yet": an audit that ran and found the component
    // unusable is the single most important thing the tab can say.
    expect(
      resolvePanelBadge(panel('a11y'), COMPONENT, {
        ...EMPTY_CONTEXT,
        a11yScore: 0,
      })
    ).toEqual({ text: '0', variant: 'danger' });
  });

  it('has nothing to say about a panel it does not know', () => {
    expect(resolvePanelBadge(panel('events'), COMPONENT, EMPTY_CONTEXT)).toBe(
      null
    );
  });
});
