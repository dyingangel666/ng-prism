import { ICON_NAMES } from '../icons/prism-icon.component.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { BUILTIN_NAVIGATION_DECORATIONS } from './builtin-navigation-decorations.js';

function component(meta?: Record<string, unknown>): RuntimeComponent {
  return {
    type: class {} as unknown as RuntimeComponent['type'],
    meta: {
      className: 'Dialog',
      filePath: '',
      showcaseConfig: { title: 'Dialog', meta },
      inputs: [],
      outputs: [],
      componentMeta: { selector: 'x', standalone: true, isDirective: false },
    },
  };
}

const a11y = BUILTIN_NAVIGATION_DECORATIONS.find((d) => d.id === 'a11y')!;

describe('built-in navigation decorations', () => {
  it('names an icon the registry can draw', () => {
    for (const decoration of BUILTIN_NAVIGATION_DECORATIONS) {
      expect(ICON_NAMES).toContain(decoration.icon);
    }
  });

  it('contributes the a11y source at order 10', () => {
    expect(a11y.order).toBe(10);
    expect(a11y.icon).toBe('accessibility');
  });
});

describe('a11y navigation decoration', () => {
  it('says nothing without a11y meta', () => {
    expect(a11y.badge(component())).toBeNull();
  });

  it('says nothing when the report found no entry', () => {
    expect(a11y.badge(component({ a11y: { found: false } }))).toBeNull();
  });

  it('says nothing for a healthy component', () => {
    const meta = {
      a11y: {
        found: true,
        summary: { variant: 'ok', label: 'A11y score 100' },
      },
    };
    expect(a11y.badge(component(meta))).toBeNull();
  });

  it('says nothing when the report predates the summary field', () => {
    expect(a11y.badge(component({ a11y: { found: true } }))).toBeNull();
  });

  it('passes the derived verdict straight through', () => {
    const meta = {
      a11y: {
        found: true,
        summary: { variant: 'danger', label: 'A11y: 2 critical' },
      },
    };
    expect(a11y.badge(component(meta))).toEqual({
      variant: 'danger',
      label: 'A11y: 2 critical',
    });
  });
});
