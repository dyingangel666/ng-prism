import { Component, Input } from '@angular/core';

export interface ShowcaseConfig {
  title: string;
  description?: string;
  category?: string;
  variants?: { name: string; inputs?: Record<string, unknown>; description?: string }[];
  tags?: string[];
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
  return () => {};
}

@Showcase({
  title: 'Card',
  category: 'Layout',
})
@Component({
  selector: 'my-card',
  standalone: true,
  template: `<div class="card"><ng-content /></div>`,
})
export class CardComponent {
  /** Card title */
  @Input() title = '';

  /** Whether to show a border */
  @Input() bordered = true;
}
