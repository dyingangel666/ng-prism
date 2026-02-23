import { Component, Input } from '@angular/core';

@Component({
  selector: 'my-internal',
  standalone: true,
  template: `<div>internal</div>`,
})
export class NoShowcaseComponent {
  @Input() value = '';
}
