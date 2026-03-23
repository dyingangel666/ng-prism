import { Component, model } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
  return () => {};
}

@Showcase({ title: 'ModelInput' })
@Component({
  selector: 'my-model-input',
  standalone: true,
  template: `<input [value]="value()" />`,
})
export class ModelInputComponent {
  /** Current string value */
  value = model<string>('');

  /** Whether the field is disabled */
  disabled = model<boolean>(false);
}
