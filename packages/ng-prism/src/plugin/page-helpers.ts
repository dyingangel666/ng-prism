import type { Type } from '@angular/core';
import type { CustomPage, ComponentPage } from './page.types.js';

export interface CustomPageOptions {
  title: string;
  category?: string;
  categoryOrder?: number;
  order?: number;
  data: Record<string, unknown>;
}

export function customPage(options: CustomPageOptions): CustomPage {
  return {
    type: 'custom',
    title: options.title,
    category: options.category,
    categoryOrder: options.categoryOrder,
    order: options.order,
    data: options.data,
  };
}

export interface ComponentPageOptions {
  title: string;
  category?: string;
  categoryOrder?: number;
  order?: number;
  component: Type<unknown>;
}

export function componentPage(options: ComponentPageOptions): ComponentPage {
  return {
    type: 'component',
    title: options.title,
    category: options.category,
    categoryOrder: options.categoryOrder,
    order: options.order,
    component: options.component,
  };
}
