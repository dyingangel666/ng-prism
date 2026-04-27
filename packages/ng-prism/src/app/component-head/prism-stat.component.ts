import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'prism-stat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat">
      <div class="stat-val">
        {{ value() }}
        @if (pill()) {
          <span class="pill" [class.warn]="pillVariant() === 'warn'">{{ pill() }}</span>
        }
      </div>
      <div class="stat-lbl">{{ label() }}</div>
    </div>
  `,
  styles: `
    .stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      min-width: 64px;
    }
    .stat-val {
      font-family: var(--font-mono);
      font-size: var(--fs-xl);
      font-weight: 600;
      color: var(--prism-text);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .pill {
      padding: 0 5px;
      font-size: 9.5px;
      border-radius: 3px;
      background: color-mix(in srgb, var(--prism-success) 15%, transparent);
      color: var(--prism-success);
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .pill.warn {
      background: color-mix(in srgb, var(--prism-warn) 15%, transparent);
      color: var(--prism-warn);
    }
    .stat-lbl {
      font-size: var(--fs-xs);
      color: var(--prism-text-ghost);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }
  `,
})
export class PrismStatComponent {
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
  readonly pill = input<string>();
  readonly pillVariant = input<'ok' | 'warn'>('ok');
}
