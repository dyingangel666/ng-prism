import type { Type } from '@angular/core';

export type StyleguidePage = CustomPage | ComponentPage;

export interface CustomPage {
  type: 'custom';
  title: string;
  category?: string;
  categoryOrder?: number;
  order?: number;
  data: Record<string, unknown>;
}

export interface ComponentPage {
  type: 'component';
  title: string;
  category?: string;
  categoryOrder?: number;
  order?: number;
  component: Type<unknown>;
}
