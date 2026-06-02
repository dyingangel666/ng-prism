import type { ShowcaseConfig } from './showcase.types.js';

export function Showcase<T = unknown>(
  _config: ShowcaseConfig<T>
): ClassDecorator {
  return () => {};
}
