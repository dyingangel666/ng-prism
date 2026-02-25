import { figmaPlugin } from './figma-plugin.js';
import { FigmaPanelComponent } from './figma-panel.component.js';

describe('figmaPlugin', () => {
  it('should return a plugin with the correct name', () => {
    const plugin = figmaPlugin();
    expect(plugin.name).toBe('@ng-prism/plugin-figma');
  });

  it('should register a single panel', () => {
    const plugin = figmaPlugin();
    expect(plugin.panels).toHaveLength(1);
  });

  it('should define the figma panel with correct properties', () => {
    const plugin = figmaPlugin();
    const panel = plugin.panels![0];
    expect(panel.id).toBe('figma');
    expect(panel.label).toBe('Figma');
    expect(panel.position).toBe('bottom');
    expect(panel.component).toBe(FigmaPanelComponent);
  });

  it('should not define any build-time hooks', () => {
    const plugin = figmaPlugin();
    expect(plugin.onComponentScanned).toBeUndefined();
    expect(plugin.onPageScanned).toBeUndefined();
    expect(plugin.onManifestReady).toBeUndefined();
  });
});
