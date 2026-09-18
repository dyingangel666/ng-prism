import type { RuntimeComponent } from '@ng-prism/core/plugin';
import {
  coverageBadge,
  COVERAGE_NAVIGATION_DECORATION,
} from './coverage-contributions.js';

function component(
  meta: Record<string, unknown> | null = null
): RuntimeComponent {
  return {
    meta: { showcaseConfig: { meta: meta ?? {} } },
  } as unknown as RuntimeComponent;
}

describe('COVERAGE_NAVIGATION_DECORATION', () => {
  it('says nothing about a component with no coverage data', () => {
    expect(COVERAGE_NAVIGATION_DECORATION.badge(component())).toBeNull();
  });

  it('says nothing when the report found no entry', () => {
    expect(
      COVERAGE_NAVIGATION_DECORATION.badge(
        component({ coverage: { found: false } })
      )
    ).toBeNull();
  });

  it('says nothing when the report predates the summary field', () => {
    expect(
      COVERAGE_NAVIGATION_DECORATION.badge(
        component({ coverage: { found: true } })
      )
    ).toBeNull();
  });

  it('says nothing for a healthy component', () => {
    expect(
      COVERAGE_NAVIGATION_DECORATION.badge(
        component({
          coverage: {
            found: true,
            summary: { variant: 'ok', label: 'Coverage 92%' },
          },
        })
      )
    ).toBeNull();
  });

  it('passes the derived verdict straight through', () => {
    expect(
      COVERAGE_NAVIGATION_DECORATION.badge(
        component({
          coverage: {
            found: true,
            summary: { variant: 'warn', label: 'Coverage 62%' },
          },
        })
      )
    ).toEqual({ variant: 'warn', label: 'Coverage 62%' });
  });
});

describe('coverageBadge', () => {
  it('says nothing about a component with no coverage data', () => {
    expect(coverageBadge(component())).toBeNull();
  });

  it('says nothing when the report found no entry', () => {
    expect(coverageBadge(component({ coverage: { found: false } }))).toBeNull();
  });

  it('carries the derived verdict, not a fixed scale', () => {
    // The core's built-in chain used to grade every score at 90/70, so a
    // component at 85 came out amber on the tab while this plugin's own
    // thresholds called it green in the sidebar.
    expect(
      coverageBadge(
        component({
          coverage: {
            found: true,
            score: 85,
            summary: { variant: 'ok', label: 'Coverage: 85% (target 80%)' },
          },
        })
      )
    ).toEqual({ text: '85', variant: 'ok' });
  });

  it('derives the verdict itself when no build step wrote one', () => {
    expect(
      coverageBadge(
        component({
          coverage: {
            found: true,
            score: 85,
            thresholds: {
              lines: 80,
              branches: 80,
              functions: 80,
              statements: 80,
            },
          },
        })
      )
    ).toEqual({ text: '85', variant: 'ok' });
  });

  it('stays neutral when it has neither a summary nor thresholds', () => {
    expect(
      coverageBadge(component({ coverage: { found: true, score: 85 } }))
    ).toEqual({ text: '85', variant: 'default' });
  });
});
