import { Injector, runInInjectionContext } from '@angular/core';
import type { RuntimeComponent, RuntimeManifest } from '../../plugin/plugin.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';

function createComponent(
  overrides: Partial<{ title: string; category: string; className: string }> = {},
): RuntimeComponent {
  return {
    type: class {} as any,
    meta: {
      className: overrides.className ?? 'TestComponent',
      filePath: '/test.ts',
      showcaseConfig: {
        title: overrides.title ?? 'Test',
        category: overrides.category,
      },
      inputs: [],
      outputs: [],
      componentMeta: { selector: 'test', standalone: true },
    },
  };
}

function setup(manifest: RuntimeManifest): PrismManifestService {
  const injector = Injector.create({
    providers: [{ provide: PRISM_MANIFEST, useValue: manifest }],
  });
  return runInInjectionContext(injector, () => new PrismManifestService());
}

describe('PrismManifestService', () => {
  it('should expose components from manifest', () => {
    const comps = [createComponent(), createComponent({ className: 'Other' })];
    const service = setup({ components: comps });
    expect(service.components()).toEqual(comps);
  });

  it('should compute unique sorted categories', () => {
    const service = setup({
      components: [
        createComponent({ category: 'Forms' }),
        createComponent({ category: 'Layout' }),
        createComponent({ category: 'Forms' }),
      ],
    });
    expect(service.categories()).toEqual(['Forms', 'Layout']);
  });

  it('should use "Uncategorized" for components without category', () => {
    const service = setup({ components: [createComponent()] });
    expect(service.categories()).toEqual(['Uncategorized']);
  });

  it('should group components by category', () => {
    const a = createComponent({ category: 'A', className: 'A1' });
    const b = createComponent({ category: 'A', className: 'A2' });
    const c = createComponent({ category: 'B', className: 'B1' });
    const service = setup({ components: [a, b, c] });

    const grouped = service.groupedByCategory();
    expect(grouped.get('A')).toEqual([a, b]);
    expect(grouped.get('B')).toEqual([c]);
  });

  it('should handle empty manifest', () => {
    const service = setup({ components: [] });
    expect(service.components()).toEqual([]);
    expect(service.categories()).toEqual([]);
    expect(service.groupedByCategory().size).toBe(0);
  });
});
