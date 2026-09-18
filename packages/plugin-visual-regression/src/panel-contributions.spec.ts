import type { RuntimeComponent } from '@ng-prism/core/plugin';
import { hasResults, reviewBadge } from './panel-contributions.js';
import type { VrtStatus, VrtVariantResult } from './visual-regression.types.js';

function variant(status: VrtStatus, index: number): VrtVariantResult {
  return { className: 'ButtonComponent', variantIndex: index, status };
}

function component(
  meta: Record<string, unknown> | null = null
): RuntimeComponent {
  return {
    meta: { showcaseConfig: { meta: meta ?? {} } },
  } as unknown as RuntimeComponent;
}

function withVariants(...statuses: VrtStatus[]): RuntimeComponent {
  return component({
    visualRegression: {
      found: statuses.length > 0,
      assetBaseUrl: '',
      variants: statuses.map(variant),
    },
  });
}

describe('hasResults', () => {
  it('is false for a component the runner never reported on', () => {
    expect(hasResults(component())).toBe(false);
  });

  it('is false when the report was found but held nothing', () => {
    expect(
      hasResults(
        component({
          visualRegression: { found: true, assetBaseUrl: '', variants: [] },
        })
      )
    ).toBe(false);
  });

  it('is true once there is a variant to show', () => {
    expect(hasResults(withVariants('unchanged'))).toBe(true);
  });

  it('survives a component with no meta at all', () => {
    expect(hasResults({} as RuntimeComponent)).toBe(false);
  });
});

describe('reviewBadge', () => {
  it('says nothing about a component with no results', () => {
    expect(reviewBadge(component())).toBeNull();
  });

  it('leaves a clean component unbadged', () => {
    // Not a green zero: a badge on every tab is a badge that gets ignored.
    expect(reviewBadge(withVariants('unchanged', 'unchanged'))).toBeNull();
  });

  it('counts only what is waiting on a person', () => {
    const badge = reviewBadge(
      withVariants('changed', ...Array<VrtStatus>(14).fill('unchanged'))
    );
    expect(badge).toEqual({ text: '1', variant: 'danger' });
  });

  it('counts every kind of open item, not just the changed ones', () => {
    const badge = reviewBadge(withVariants('changed', 'new', 'size-mismatch'));
    expect(badge?.text).toBe('3');
  });

  it('stays amber while nothing has actually regressed', () => {
    // Resized and new could not be compared. Neither is a regression, so
    // neither earns the colour a regression gets.
    expect(reviewBadge(withVariants('new', 'size-mismatch'))?.variant).toBe(
      'warn'
    );
  });

  it('turns red as soon as one variant really changed', () => {
    expect(reviewBadge(withVariants('new', 'changed'))?.variant).toBe('danger');
  });

  it('ignores excluded variants entirely', () => {
    expect(reviewBadge(withVariants('unchanged', 'excluded'))).toBeNull();
  });
});
