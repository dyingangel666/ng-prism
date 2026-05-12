import { Component } from '@angular/core';

export interface ShowcaseConfig {
  title: string;
  bg?: string;
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
  return () => {};
}

@Showcase({
  title: 'Invalid Bg',
  bg: 'rainbow',
})
@Component({ selector: 'invalid-bg', standalone: true, template: '' })
export class InvalidBgComponent {}
