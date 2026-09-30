import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

const R = 54;
const CIRCUMFERENCE = 2 * Math.PI * R;
let nextId = 0;

@Component({
  selector: 'prism-a11y-score',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './a11y-score.component.html',
  styleUrl: './a11y-score.component.css',
})
export class A11yScoreComponent {
  readonly score = input.required<number>();
  readonly compact = input(false);

  protected readonly gradientId = `prism-sg-${nextId++}`;
  protected readonly R = R;
  protected readonly CIRC = CIRCUMFERENCE;

  protected readonly dashOffset = computed(
    () => CIRCUMFERENCE - (this.score() / 100) * CIRCUMFERENCE
  );
}
