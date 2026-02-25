import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { StyleguidePage } from '../../plugin/page.types.js';

export type NavigationItem =
  | { kind: 'component'; data: RuntimeComponent }
  | { kind: 'page'; data: StyleguidePage };
