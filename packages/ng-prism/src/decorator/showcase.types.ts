import type { Provider } from '@angular/core';

export interface DirectiveHost {
  selector: string;
  import: { name: string; from: string };
  inputs?: Record<string, unknown>;
}

export interface ShowcaseConfig {
  /** Display name in the ng-prism UI */
  title: string;
  /** Description text — Markdown supported */
  description?: string;
  /** Groups the component in the sidebar */
  category?: string;
  /** Controls the order of this category in the sidebar (lower = higher). Categories without this sort alphabetically after ordered ones. */
  categoryOrder?: number;
  /** Controls the order of this component within its category (lower = higher). Components without this sort alphabetically after ordered ones. */
  componentOrder?: number;
  /** Predefined variants shown as tabs */
  variants?: Variant[];
  /** Tags for search and filtering */
  tags?: string[];
  /**
   * Providers for a child injector scoped to this component.
   * Use for components that require specific services (e.g. DialogService, OverlayService).
   * For library-wide providers, use defineConfig({ appProviders }).
   */
  providers?: Provider[];
  /** Arbitrary metadata for plugins (e.g. { figma: 'https://...' }) */
  meta?: Record<string, unknown>;
  /** Host element for directive showcases. String = HTML element (e.g. '<button class="btn">'), object = Angular component. */
  host?: string | DirectiveHost;
  /** Title of a registered ComponentPage to render instead of the component itself. Use for complex components that need template projections or mock data. The page component can inject PrismRendererService to react to control panel changes. */
  renderPage?: string;
}

export interface Variant {
  /** Tab label */
  name: string;
  /** @Input() values for this variant */
  inputs?: Record<string, unknown>;
  /**
   * Content projected into <ng-content>.
   * - string → projected into the default (unnamed) slot
   * - Record<string, string> → keys are slot selectors (e.g. '[card-header]'), 'default' is the unnamed slot
   */
  content?: string | Record<string, string>;
  /** Optional description for this variant */
  description?: string;
  /** Arbitrary metadata for plugins (e.g. { figma: 'https://...?node-id=12-34' }) */
  meta?: Record<string, unknown>;
}
