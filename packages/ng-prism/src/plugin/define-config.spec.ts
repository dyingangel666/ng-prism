import { defineConfig } from './define-config.js';
import type { NgPrismPlugin } from './plugin.types.js';

describe('defineConfig', () => {
  it('should return the config unchanged', () => {
    const config = { plugins: [{ name: 'a' }, { name: 'b' }] };
    expect(defineConfig(config)).toBe(config);
  });

  it('should warn on duplicate plugin names', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    defineConfig({
      plugins: [{ name: 'a' }, { name: 'b' }, { name: 'a' }],
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('plugin "a" is registered more than once')
    );

    warnSpy.mockRestore();
  });

  it('should not warn when plugin names are unique', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    defineConfig({
      plugins: [{ name: 'a' }, { name: 'b' }],
    });

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('should not warn when no plugins are provided', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    defineConfig({});

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('should ignore plugins without a name field', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    defineConfig({
      plugins: [{} as NgPrismPlugin, {} as NgPrismPlugin],
    });

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
