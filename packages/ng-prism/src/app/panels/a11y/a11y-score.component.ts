import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const R = 54;
const CIRCUMFERENCE = 2 * Math.PI * R;

@Component({
  selector: 'prism-a11y-score',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="score-ring">
      <svg viewBox="0 0 128 128">
        <defs>
          <linearGradient id="prism-sg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#a78bfa"/>
            <stop offset="100%" stop-color="#3b82f6"/>
          </linearGradient>
        </defs>
        <circle class="track" cx="64" cy="64" [attr.r]="R" />
        <circle
          class="fill"
          cx="64" cy="64"
          [attr.r]="R"
          [attr.stroke-dasharray]="CIRC"
          [attr.stroke-dashoffset]="dashOffset()"
        />
      </svg>
      @if (!compact()) {
        <div class="score-val">
          <div class="score-num">{{ score() }}</div>
          <div class="score-max">/ 100</div>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: inline-flex; }

    .score-ring {
      position: relative;
      width: 128px;
      height: 128px;
    }
    :host-context(.compact) .score-ring,
    :host([style*="width:18px"]) .score-ring {
      width: 100%;
      height: 100%;
    }

    .score-ring svg {
      transform: rotate(-90deg);
      width: 100%;
      height: 100%;
    }

    .score-ring circle {
      fill: none;
      stroke-width: 10;
    }
    .track { stroke: var(--prism-input-bg); }
    .fill {
      stroke: url(#prism-sg);
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease;
    }

    .score-val {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
    }
    .score-num {
      font-size: 30px;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #a78bfa, #ec4899);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      font-family: var(--font-mono);
    }
    .score-max {
      font-size: 11px;
      color: var(--prism-text-ghost);
      font-weight: 500;
    }
  `,
})
export class A11yScoreComponent {
  readonly score = input.required<number>();
  readonly compact = input(false);

  protected readonly R = R;
  protected readonly CIRC = CIRCUMFERENCE;

  protected readonly dashOffset = computed(
    () => CIRCUMFERENCE - (this.score() / 100) * CIRCUMFERENCE,
  );
}
