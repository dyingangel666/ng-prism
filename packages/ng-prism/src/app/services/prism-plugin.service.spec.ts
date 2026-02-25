import { Injector, runInInjectionContext } from '@angular/core';
import type { NgPrismConfig, NgPrismPlugin } from '../../plugin/plugin.types.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import { PrismPluginService } from './prism-plugin.service.js';

function setup(config: NgPrismConfig): PrismPluginService {
  const injector = Injector.create({
    providers: [{ provide: PRISM_CONFIG, useValue: config }],
  });
  return runInInjectionContext(injector, () => new PrismPluginService());
}

describe('PrismPluginService', () => {
  it('should return empty panels and controls with no plugins', () => {
    const service = setup({});
    expect(service.panels()).toEqual([]);
    expect(service.controls()).toEqual([]);
  });

  it('should collect panels from plugins', () => {
    const plugin: NgPrismPlugin = {
      name: 'test-plugin',
      panels: [
        { id: 'test', label: 'Test', component: class {} as any },
      ],
    };
    const service = setup({ plugins: [plugin] });
    expect(service.panels().length).toBe(1);
    expect(service.panels()[0].id).toBe('test');
  });

  it('should collect controls from plugins', () => {
    const plugin: NgPrismPlugin = {
      name: 'test-plugin',
      controls: [
        { matchType: () => true, component: class {} as any },
      ],
    };
    const service = setup({ plugins: [plugin] });
    expect(service.controls().length).toBe(1);
  });

  it('should merge panels from multiple plugins', () => {
    const plugin1: NgPrismPlugin = {
      name: 'p1',
      panels: [{ id: 'a', label: 'A', component: class {} as any }],
    };
    const plugin2: NgPrismPlugin = {
      name: 'p2',
      panels: [{ id: 'b', label: 'B', component: class {} as any }],
    };
    const service = setup({ plugins: [plugin1, plugin2] });
    expect(service.panels().length).toBe(2);
    expect(service.panels().map((p) => p.id)).toEqual(['a', 'b']);
  });
});
