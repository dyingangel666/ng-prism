import { figmaPlugin } from './figma-plugin.js';
import { FigmaPanelComponent } from './figma-panel.component.js';
import { FIGMA_PLUGIN_CONFIG } from './figma-config.token.js';

describe('figmaPlugin', () => {
  it('should return a plugin with the correct name', () => {
    const plugin = figmaPlugin();
    expect(plugin.name).toBe('@ng-prism/plugin-figma');
  });

  it('should register two panels', () => {
    const plugin = figmaPlugin();
    expect(plugin.panels).toHaveLength(2);
  });

  it('should define the figma embed panel with correct properties', () => {
    const plugin = figmaPlugin();
    const panel = plugin.panels![0];
    expect(panel.id).toBe('figma');
    expect(panel.label).toBe('Figma');
    expect(panel.position).toBe('bottom');
    expect(panel.component).toBe(FigmaPanelComponent);
  });

  it('should define the design diff panel with lazy loading', () => {
    const plugin = figmaPlugin();
    const panel = plugin.panels![1];
    expect(panel.id).toBe('figma-diff');
    expect(panel.label).toBe('Design Diff');
    expect(panel.position).toBe('bottom');
    expect(panel.loadComponent).toBeInstanceOf(Function);
  });

  it('should provide FIGMA_PLUGIN_CONFIG with the given options', () => {
    const plugin = figmaPlugin({ accessToken: 'test-token' });
    const diffPanel = plugin.panels![1];
    const provider = diffPanel.providers?.find(
      (p: any) => p.provide === FIGMA_PLUGIN_CONFIG,
    ) as any;
    expect(provider).toBeDefined();
    expect(provider.useValue.accessToken).toBe('test-token');
  });

  it('should not define any build-time hooks', () => {
    const plugin = figmaPlugin();
    expect(plugin.onComponentScanned).toBeUndefined();
    expect(plugin.onPageScanned).toBeUndefined();
    expect(plugin.onManifestReady).toBeUndefined();
  });
});
