import type { Provider } from '@angular/core';

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
}

export interface Variant {
  /** Tab label */
  name: string;
  /** @Input() values for this variant */
  inputs?: Record<string, unknown>;
  /** Optional description for this variant */
  description?: string;
}
