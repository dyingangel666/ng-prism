import type { Type } from '@angular/core';
import type { CustomPage, ComponentPage } from './page.types.js';

export interface CustomPageOptions {
  title: string;
  category?: string;
  data: Record<string, unknown>;
}

export function customPage(options: CustomPageOptions): CustomPage {
  return {
    type: 'custom',
    title: options.title,
    category: options.category,
    data: options.data,
  };
}

export interface ComponentPageOptions {
  title: string;
  category?: string;
  component: Type<unknown>;
}

export function componentPage(options: ComponentPageOptions): ComponentPage {
  return {
    type: 'component',
    title: options.title,
    category: options.category,
    component: options.component,
  };
}
