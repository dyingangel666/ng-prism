import type { Type } from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import { showsOverview } from './overview-visibility.js';

function makeComp(config: Partial<ShowcaseConfig> = {}): RuntimeComponent {
  return {
    type: class {} as Type<unknown>,
    meta: {
      className: 'ButtonComponent',
      filePath: '/button.ts',
      showcaseConfig: { title: 'Button', ...config },
      inputs: [],
      outputs: [],
      componentMeta: {
        selector: 'lib-button',
        standalone: true,
        isDirective: false,
      },
    },
  };
}

describe('showsOverview', () => {
  it('is false when the component declares no variants', () => {
    expect(showsOverview(makeComp())).toBe(false);
  });

  it('is false for a single variant — one cell says nothing', () => {
    const comp = makeComp({ variants: [{ name: 'Default' }] });
    expect(showsOverview(comp)).toBe(false);
  });

  it('is true from two variants on', () => {
    const comp = makeComp({
      variants: [{ name: 'Primary' }, { name: 'Secondary' }],
    });
    expect(showsOverview(comp)).toBe(true);
  });

  it('is false for a renderPage component regardless of variant count', () => {
    const comp = makeComp({
      renderPage: 'Button Patterns',
      variants: [{ name: 'Primary' }, { name: 'Secondary' }],
    });
    expect(showsOverview(comp)).toBe(false);
  });
});
