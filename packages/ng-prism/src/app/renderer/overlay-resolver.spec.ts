import type { Type } from '@angular/core';
import type { PanelDefinition } from '../../plugin/plugin.types.js';
import { resolveOverlay } from './overlay-resolver.js';

const EagerOverlay = class {} as Type<unknown>;
const LazyOverlay = class {} as Type<unknown>;

function panel(overrides: Partial<PanelDefinition> = {}): PanelDefinition {
  return { id: 'p', label: 'P', ...overrides };
}

const NO_CACHE = new Map<string, Type<unknown>>();

describe('resolveOverlay', () => {
  it('returns none when no panel matches the active id', () => {
    const result = resolveOverlay([panel({ id: 'other' })], 'p', {
      captureActive: false,
      cache: NO_CACHE,
    });
    expect(result).toEqual({ kind: 'none' });
  });

  it('returns none when the matching panel declares no overlay', () => {
    const result = resolveOverlay([panel()], 'p', {
      captureActive: false,
      cache: NO_CACHE,
    });
    expect(result).toEqual({ kind: 'none' });
  });

  it('returns the eager overlay component', () => {
    const result = resolveOverlay(
      [panel({ overlayComponent: EagerOverlay })],
      'p',
      {
        captureActive: false,
        cache: NO_CACHE,
      }
    );
    expect(result).toEqual({ kind: 'eager', component: EagerOverlay });
  });

  it('returns a lazy overlay as a pending load', async () => {
    const load = jest.fn(() => Promise.resolve(LazyOverlay));
    const result = resolveOverlay(
      [panel({ loadOverlayComponent: load })],
      'p',
      {
        captureActive: false,
        cache: NO_CACHE,
      }
    );
    expect(result).toMatchObject({ kind: 'lazy', panelId: 'p' });
    expect(load).not.toHaveBeenCalled();
    if (result.kind !== 'lazy') throw new Error('expected a lazy resolution');
    await expect(result.load()).resolves.toBe(LazyOverlay);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('calls the loader on its own panel', async () => {
    // Written in method shorthand and reading its own object, which is what
    // handing the bare method reference on would break: the renderer would
    // call it detached, `this` would be undefined, and the resulting throw
    // lands in a promise nothing catches — the overlay just never appears.
    const definition = {
      id: 'p',
      label: 'P',
      overlay: LazyOverlay,
      loadOverlayComponent(this: { overlay: Type<unknown> }) {
        return Promise.resolve(this.overlay);
      },
    } as unknown as PanelDefinition;

    const result = resolveOverlay([definition], 'p', {
      captureActive: false,
      cache: NO_CACHE,
    });

    if (result.kind !== 'lazy') throw new Error('expected a lazy resolution');
    await expect(result.load()).resolves.toBe(LazyOverlay);
  });

  it('returns a cached lazy overlay eagerly', () => {
    const result = resolveOverlay(
      [panel({ loadOverlayComponent: () => Promise.resolve(LazyOverlay) })],
      'p',
      { captureActive: false, cache: new Map([['p', LazyOverlay]]) }
    );
    expect(result).toEqual({ kind: 'eager', component: LazyOverlay });
  });

  describe('capture mode', () => {
    it('suppresses an eager overlay', () => {
      const result = resolveOverlay(
        [panel({ overlayComponent: EagerOverlay })],
        'p',
        {
          captureActive: true,
          cache: NO_CACHE,
        }
      );
      expect(result).toEqual({ kind: 'none' });
    });

    it('suppresses a cached overlay', () => {
      const result = resolveOverlay(
        [panel({ loadOverlayComponent: () => Promise.resolve(LazyOverlay) })],
        'p',
        { captureActive: true, cache: new Map([['p', LazyOverlay]]) }
      );
      expect(result).toEqual({ kind: 'none' });
    });

    it('does not even request a lazy overlay', () => {
      const load = jest.fn(() => Promise.resolve(LazyOverlay));
      const result = resolveOverlay(
        [panel({ loadOverlayComponent: load })],
        'p',
        {
          captureActive: true,
          cache: NO_CACHE,
        }
      );
      expect(result).toEqual({ kind: 'none' });
      expect(load).not.toHaveBeenCalled();
    });
  });
});
