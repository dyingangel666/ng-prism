import 'reflect-metadata';
import type { ShowcaseConfig } from './showcase.types.js';

export const SHOWCASE_METADATA_KEY = 'ngPrism:config';

export function Showcase(config: ShowcaseConfig): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(SHOWCASE_METADATA_KEY, config, target);
  };
}
