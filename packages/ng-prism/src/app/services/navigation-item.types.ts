import type { StyleguidePage } from '../../plugin/page.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';

export type NavigationItem = { kind: 'component'; data: RuntimeComponent } | { kind: 'page'; data: StyleguidePage };
