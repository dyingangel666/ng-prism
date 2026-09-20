import type { PanelDefinition } from '../../plugin/plugin.types.js';
import { showsOverview } from './overview-visibility.js';
import { PrismOverviewComponent } from './prism-overview.component.js';

export const OVERVIEW_PANEL: PanelDefinition = {
  id: 'overview',
  label: 'Overview',
  placement: 'view',
  component: PrismOverviewComponent,
  isVisible: showsOverview,
};
