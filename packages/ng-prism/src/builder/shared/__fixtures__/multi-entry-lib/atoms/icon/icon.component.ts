import { Component, input } from '@angular/core';

function Showcase(config: Record<string, unknown>): ClassDecorator {
  return () => {};
}

@Showcase({
  title: 'Icon',
  category: 'Atoms',
})
@Component({
  selector: 'ui-icon',
  standalone: true,
  template: `<i>{{ name() }}</i>`,
})
export class IconComponent {
  name = input.required<string>();
}
