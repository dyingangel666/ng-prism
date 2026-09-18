import type { NavigationDecorationDefinition } from '../../plugin/plugin.types.js';
import type { A11yComponentMeta } from './a11y/a11y.types.js';

/**
 * Core-owned navigation markers — the counterpart to `BUILTIN_PANELS` and
 * `BUILTIN_HEADER_WIDGETS`. A11y is a core feature, not a plugin, so its
 * marker lives here rather than in a plugin's contribution list.
 */
export const BUILTIN_NAVIGATION_DECORATIONS: NavigationDecorationDefinition[] =
  [
    {
      id: 'a11y',
      icon: 'accessibility',
      order: 10,
      badge: (component) => {
        const meta = component.meta.showcaseConfig.meta?.['a11y'] as
          | A11yComponentMeta
          | undefined;
        if (!meta?.found || !meta.summary) return null;
        if (meta.summary.variant === 'ok') return null;
        return { variant: meta.summary.variant, label: meta.summary.label };
      },
    },
  ];
