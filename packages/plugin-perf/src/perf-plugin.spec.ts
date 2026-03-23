import { perfPlugin } from './perf-plugin.js';

describe('perfPlugin', () => {
  it('should return a plugin with the correct name', () => {
    const plugin = perfPlugin();
    expect(plugin.name).toBe('@ng-prism/plugin-perf');
  });

  it('should register one panel', () => {
    const plugin = perfPlugin();
    expect(plugin.panels).toHaveLength(1);
  });

  it('should define the panel with correct properties', () => {
    const plugin = perfPlugin();
    const panel = plugin.panels![0];
    expect(panel.id).toBe('perf');
    expect(panel.label).toBe('Performance');
    expect(panel.position).toBe('bottom');
    expect(panel.loadComponent).toBeDefined();
  });

  it('should have an onComponentScanned hook', () => {
    const plugin = perfPlugin();
    expect(plugin.onComponentScanned).toBeDefined();
  });

  it('should not require panel providers', () => {
    const plugin = perfPlugin();
    const panel = plugin.panels![0];
    expect(panel.providers).toBeUndefined();
  });

  it('should accept custom options', () => {
    const plugin = perfPlugin({
      thresholds: { bundleWarnKb: 30 },
      bundle: { maxTreeDepth: 3 },
    });
    expect(plugin.name).toBe('@ng-prism/plugin-perf');
  });
});
