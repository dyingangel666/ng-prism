import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { summaryTiles, type VrtSummary } from './vrt-summarize.js';

/**
 * The strip that opens the panel.
 *
 * Every other ng-prism panel leads with a summary — the a11y score ring, the
 * coverage stat row — so the visual regression panel does too, and it borrows
 * their card, micro-label and mono-numeral treatment rather than inventing a
 * third one.
 */
@Component({
  selector: 'prism-vrt-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vrt-sum">
      @for (tile of tiles(); track tile.key) {
      <div class="vrt-sum__tile" [attr.data-tone]="tile.tone">
        <div class="vrt-sum__label">{{ tile.label }}</div>
        <div class="vrt-sum__value">{{ tile.value }}</div>
        <div class="vrt-sum__bar">
          <div
            class="vrt-sum__bar-fill"
            [style.width.%]="tile.ratio * 100"
          ></div>
        </div>
      </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }

    .vrt-sum {
      display: grid;
      /* auto-fit rather than a fixed column count: the strip carries between
         two and six tiles depending on what the run produced. */
      grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
      gap: 10px;
    }

    .vrt-sum__tile {
      padding: 10px 12px;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-radius: var(--radius-lg);
      min-width: 0;
    }

    .vrt-sum__label {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      color: var(--prism-text-ghost);
      margin-bottom: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .vrt-sum__value {
      font-family: var(--font-mono);
      font-size: 21px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--tone-color, var(--prism-text));
      line-height: 1.1;
    }

    .vrt-sum__bar {
      margin-top: 8px;
      height: 4px;
      background: var(--prism-input-bg);
      border-radius: 2px;
      overflow: hidden;
    }
    .vrt-sum__bar-fill {
      height: 100%;
      border-radius: 2px;
      background: var(--tone-color, var(--prism-primary));
      transition: width var(--dur-slow) var(--ease-default);
    }

    [data-tone='success'] { --tone-color: var(--prism-success); }
    [data-tone='danger'] { --tone-color: var(--prism-danger); }
    [data-tone='warn'] { --tone-color: var(--prism-warn); }
    [data-tone='neutral'] { --tone-color: var(--prism-primary); }
    [data-tone='muted'] { --tone-color: var(--prism-text-muted); }
  `,
})
export class VrtSummaryComponent {
  readonly summary = input.required<VrtSummary>();

  protected readonly tiles = computed(() => summaryTiles(this.summary()));
}
