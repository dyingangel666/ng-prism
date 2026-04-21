import { Component, input } from '@angular/core';

@Component({
  selector: 'prism-coverage-panel',
  standalone: true,
  template: `<p>Coverage panel placeholder</p>`,
})
export class CoveragePanelComponent {
  readonly activeComponent = input<unknown>(null);
}
