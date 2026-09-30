import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'prism-boolean-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boolean-control.component.html',
  styleUrl: './boolean-control.component.css',
})
export class BooleanControlComponent {
  readonly value = input(false);
  readonly label = input('');
  readonly typeName = input('');
  readonly valueChange = output<boolean>();
}
