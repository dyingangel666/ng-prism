import { Component, input } from '@angular/core';

function Showcase(config: Record<string, unknown>): ClassDecorator {
  return () => {};
}

@Showcase({
  title: 'Pill',
  category: 'Atoms',
  variants: [
    { name: 'Default', inputs: { label: 'Tag' } },
  ],
})
@Component({
  selector: 'ui-pill',
  standalone: true,
  template: `<span>{{ label() }}</span>`,
})
export class PillComponent {
  label = input<string>('');
}
