import type { PanelDefinition } from '../../plugin/plugin.types.js';
import { CONTROLS_PLUGIN } from './controls/controls-plugin.js';
import { EVENTS_PLUGIN } from './events/events-plugin.js';
import { A11Y_CORE_PANEL } from './a11y/a11y-core.plugin.js';

export const BUILTIN_PANELS: PanelDefinition[] = [
  ...(CONTROLS_PLUGIN.panels ?? []),
  ...(EVENTS_PLUGIN.panels ?? []),
  A11Y_CORE_PANEL,
];
