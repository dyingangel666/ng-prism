import { a11yPlugin } from './a11y-plugin.js';

describe('a11yPlugin', () => {
  it('should return a plugin with the correct name', () => {
    const plugin = a11yPlugin();
    expect(plugin.name).toBe('@ng-prism/plugin-a11y');
  });

  it('should register a single panel', () => {
    const plugin = a11yPlugin();
    expect(plugin.panels).toHaveLength(1);
  });

  it('should define the a11y panel with correct properties', () => {
    const plugin = a11yPlugin();
    const panel = plugin.panels![0];
    expect(panel.id).toBe('a11y');
    expect(panel.label).toBe('Accessibility');
    expect(panel.position).toBe('bottom');
    expect(panel.loadComponent).toBeDefined();
    expect(panel.component).toBeUndefined();
  });

  it('should lazy-load the panel component', async () => {
    const plugin = a11yPlugin();
    const panel = plugin.panels![0];
    const Component = await panel.loadComponent!();
    expect(Component).toBeDefined();
    expect(Component.name).toBe('A11yPanelComponent');
  });

  it('should not define any build-time hooks', () => {
    const plugin = a11yPlugin();
    expect(plugin.onComponentScanned).toBeUndefined();
    expect(plugin.onPageScanned).toBeUndefined();
    expect(plugin.onManifestReady).toBeUndefined();
  });

  it('should accept optional configuration', () => {
    const plugin = a11yPlugin({ rules: { 'color-contrast': { enabled: false } } });
    expect(plugin.name).toBe('@ng-prism/plugin-a11y');
  });
});
