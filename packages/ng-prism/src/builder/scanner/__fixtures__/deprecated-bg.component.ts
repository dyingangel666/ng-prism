import { Component } from '@angular/core';

export interface ShowcaseConfig {
  title: string;
  bg?: string;
  variants?: { name: string; bg?: string }[];
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
  return () => {};
}

@Showcase({
  title: 'Deprecated Bg',
  bg: 'checker',
  variants: [{ name: 'Also checker', bg: 'checker' }, { name: 'Fine' }],
})
@Component({ selector: 'deprecated-bg', standalone: true, template: '' })
export class DeprecatedBgComponent {}
