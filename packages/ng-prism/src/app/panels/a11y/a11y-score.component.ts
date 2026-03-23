import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const CIRCUMFERENCE = 2 * Math.PI * 14;

@Component({
  selector: 'prism-a11y-score',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="prism-score-ring"
      viewBox="0 0 36 36"
      [attr.data-level]="level()"
      [attr.aria-label]="'Accessibility score: ' + score() + ' out of 100'"
      role="img"
    >
      <circle
        class="prism-score-ring__track"
        cx="18" cy="18" r="14"
        fill="none" stroke-width="3.5"
      />
      <circle
        class="prism-score-ring__arc"
        cx="18" cy="18" r="14"
        fill="none" stroke-width="3.5"
        stroke-linecap="round"
        transform="rotate(-90 18 18)"
        [attr.stroke-dasharray]="CIRC + ' ' + CIRC"
        [attr.stroke-dashoffset]="dashOffset()"
      />
      @if (!compact()) {
        <text x="18" y="23" class="prism-score-ring__label" text-anchor="middle">{{ score() }}</text>
      }
    </svg>
  `,
  styles: `
    :host { display: inline-flex; }

    .prism-score-ring { overflow: visible; }

    .prism-score-ring__track {
      stroke: rgba(255, 255, 255, 0.08);
    }

    .prism-score-ring__arc {
      transition: stroke-dashoffset 0.4s ease, stroke 0.3s ease;
    }

    [data-level="good"]  .prism-score-ring__arc { stroke: #4ade80; }
    [data-level="warn"]  .prism-score-ring__arc { stroke: #fbbf24; }
    [data-level="bad"]   .prism-score-ring__arc { stroke: #f87171; }

    .prism-score-ring__label {
      fill: var(--prism-text, #e2e4e9);
      font-size: 9px;
      font-weight: 700;
      font-family: var(--prism-font-sans, system-ui, sans-serif);
    }
  `,
})
export class A11yScoreComponent {
  readonly score = input.required<number>();
  readonly compact = input(false);

  protected readonly CIRC = CIRCUMFERENCE;

  protected readonly dashOffset = computed(
    () => CIRCUMFERENCE - (this.score() / 100) * CIRCUMFERENCE,
  );

  protected readonly level = computed(() => {
    const s = this.score();
    if (s >= 80) return 'good';
    if (s >= 50) return 'warn';
    return 'bad';
  });
}
