import type { HeaderWidgetDefinition } from '../../plugin/plugin.types.js';
import { A11yHeaderBadgeComponent } from './a11y/a11y-header-badge.component.js';

export const BUILTIN_HEADER_WIDGETS: HeaderWidgetDefinition[] = [
  {
    id: 'a11y-total',
    component: A11yHeaderBadgeComponent,
    placement: 'end',
    order: -20,
  },
];
