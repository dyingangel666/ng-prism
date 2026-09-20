import { BUILTIN_PANELS } from '../panels/builtin-panels.js';
import { ICON_NAMES, resolveIcon } from './prism-icon.component.js';

describe('resolveIcon', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  it('returns the glyph markup for a known icon', () => {
    expect(resolveIcon('shield-check')).toContain('<path');
    expect(warn).not.toHaveBeenCalled();
  });

  it('returns the camera glyph the visual regression panel asks for', () => {
    expect(resolveIcon('camera')).toContain('<circle');
  });

  it('warns on an unknown name instead of failing silently', () => {
    expect(resolveIcon('no-such-icon')).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Unknown icon "no-such-icon"')
    );
  });

  it('warns only once per name', () => {
    resolveIcon('another-missing-icon');
    resolveIcon('another-missing-icon');
    resolveIcon('another-missing-icon');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('names every icon it can draw', () => {
    expect(ICON_NAMES).toContain('camera');
    expect(ICON_NAMES.length).toBeGreaterThan(20);
  });
});

describe('built-in panel icons', () => {
  it('every built-in panel names an icon the registry can draw', () => {
    const blank = BUILTIN_PANELS.filter(
      (panel) =>
        panel.icon !== undefined && resolveIcon(panel.icon) === undefined
    ).map((panel) => `${panel.id} → "${panel.icon}"`);

    expect(blank).toEqual([]);
  });
});
