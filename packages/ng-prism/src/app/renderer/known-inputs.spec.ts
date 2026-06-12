import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { buildKnownInputs, PRISM_CONTENT_INPUT } from './known-inputs.js';

function makeComp(
  overrides: Partial<{
    inputs: RuntimeComponent['meta']['inputs'];
    isDirective: boolean;
  }> = {}
): RuntimeComponent {
  return {
    type: class {} as any,
    meta: {
      className: 'Comp',
      filePath: '/test.ts',
      showcaseConfig: { title: 'Test' },
      inputs: overrides.inputs ?? [],
      outputs: [],
      componentMeta: {
        selector: 'test',
        standalone: true,
        isDirective: overrides.isDirective ?? false,
      },
    },
  };
}

describe('buildKnownInputs', () => {
  it('returns the set of declared input names for a component', () => {
    const comp = makeComp({
      inputs: [
        { name: 'label', type: 'string', required: false },
        { name: 'disabled', type: 'boolean', required: false },
      ],
    });

    const known = buildKnownInputs(comp);

    expect(known.has('label')).toBe(true);
    expect(known.has('disabled')).toBe(true);
    expect(known.has(PRISM_CONTENT_INPUT)).toBe(false);
  });

  it('adds __prismContent__ for directives so the synthetic content input is not filtered out', () => {
    const comp = makeComp({
      isDirective: true,
      inputs: [{ name: 'tooltipText', type: 'string', required: false }],
    });

    const known = buildKnownInputs(comp);

    expect(known.has('tooltipText')).toBe(true);
    expect(known.has(PRISM_CONTENT_INPUT)).toBe(true);
  });

  it('does not add __prismContent__ for non-directive components', () => {
    const comp = makeComp({ isDirective: false });
    expect(buildKnownInputs(comp).has(PRISM_CONTENT_INPUT)).toBe(false);
  });
});
