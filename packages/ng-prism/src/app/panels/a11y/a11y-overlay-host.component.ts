import { ChangeDetectionStrategy, Component } from '@angular/core';
import { A11yKeyboardOverlayComponent } from './a11y-keyboard-overlay.component.js';
import { A11ySrOverlayComponent } from './a11y-sr-overlay.component.js';

@Component({
  selector: 'prism-a11y-overlay-host',
  standalone: true,
  imports: [A11yKeyboardOverlayComponent, A11ySrOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <prism-a11y-kbd-overlay />
    <prism-a11y-sr-overlay />
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class A11yOverlayHostComponent {}
