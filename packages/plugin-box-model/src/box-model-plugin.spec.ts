import { boxModelPlugin } from './box-model-plugin.js';

describe('boxModelPlugin', () => {
  it('returns a plugin with name "box-model"', () => {
    expect(boxModelPlugin().name).toBe('box-model');
  });

  it('registers exactly one panel', () => {
    expect(boxModelPlugin().panels).toHaveLength(1);
  });

  it('panel has id "box-model" and label "Box Model"', () => {
    const [panel] = boxModelPlugin().panels!;
    expect(panel.id).toBe('box-model');
    expect(panel.label).toBe('Box Model');
  });

  it('panel has loadComponent for lazy loading', () => {
    const [panel] = boxModelPlugin().panels!;
    expect(typeof panel.loadComponent).toBe('function');
  });

  it('panel has loadOverlayComponent for lazy overlay', () => {
    const [panel] = boxModelPlugin().panels!;
    expect(typeof panel.loadOverlayComponent).toBe('function');
  });

  it('has no build-time hooks', () => {
    const plugin = boxModelPlugin();
    expect(plugin.onComponentScanned).toBeUndefined();
    expect(plugin.onPageScanned).toBeUndefined();
    expect(plugin.onManifestReady).toBeUndefined();
  });
});
