import { ChangeDetectionStrategy, Component, input, model, output, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * A toggle switch component for boolean on/off states.
 * @since 1.0.0
 * @see ButtonComponent
 */
@Showcase({
  title: 'Toggle',
  category: 'Inputs',
  description: 'Binary toggle switch with optional label and disabled state.',
  variants: [
    { name: 'Default Off', inputs: { checked: false, label: 'Notifications' } },
    { name: 'Default On', inputs: { checked: true, label: 'Dark Mode' } },
    { name: 'Disabled Off', inputs: { checked: false, label: 'Locked', disabled: true } },
    { name: 'Disabled On', inputs: { checked: true, label: 'Locked On', disabled: true } },
    { name: 'No Label', inputs: { checked: false } },
  ],
  tags: ['form', 'toggle', 'switch', 'input'],
})
@Component({
  selector: 'sg-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sg-toggle',
    '[class.sg-toggle--checked]': 'checked()',
    '[class.sg-toggle--disabled]': 'disabled()',
  },
  template: `
    <button
      class="sg-toggle__track"
      role="switch"
      [attr.aria-checked]="checked()"
      [disabled]="disabled()"
      (click)="toggle()"
    >
      <span class="sg-toggle__thumb"></span>
    </button>
    @if (label()) {
      <span class="sg-toggle__label">{{ label() }}</span>
    }
  `,
  styles: `
    .sg-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
    .sg-toggle--disabled { opacity: 0.5; cursor: not-allowed; }
    .sg-toggle__track {
      position: relative; width: 40px; height: 22px; border-radius: 11px;
      background: #d1d5db; border: none; cursor: inherit; padding: 0;
      transition: background 0.2s;
    }
    .sg-toggle--checked .sg-toggle__track { background: #6366f1; }
    .sg-toggle__thumb {
      position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
      border-radius: 50%; background: #fff; transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .sg-toggle--checked .sg-toggle__thumb { transform: translateX(18px); }
    .sg-toggle__label { font-size: 14px; color: #374151; user-select: none; }
  `,
})
export class ToggleComponent {
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly checked = model<boolean>(false);
  readonly changed = output<boolean>();

  /** Toggles the checked state and emits the new value. */
  toggle(): void {
    if (this.disabled()) return;
    this.checked.set(!this.checked());
    this.changed.emit(this.checked());
  }
}
