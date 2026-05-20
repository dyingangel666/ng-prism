import { Component } from '@angular/core';

export interface ShowcaseConfig {
  title: string;
  status?: string;
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
  return () => {};
}

@Showcase({
  title: 'Invalid Status',
  status: 'banana',
})
@Component({ selector: 'invalid-status', standalone: true, template: '' })
export class InvalidStatusComponent {}
