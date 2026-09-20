import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';

/**
 * Identity disclosure for the component head.
 *
 * Selector, description and tags all answer "what is this component" — a
 * question you read once on arrival and never again while building. Keeping
 * them permanently on screen cost a 128px band to say something that belongs
 * behind one glyph.
 *
 * Opening is click-only, through the native Popover API. Escape, click-outside
 * dismissal and top-layer placement come with it declaratively; a hover panel
 * would mean rebuilding all three by hand, and crossing the gap between icon
 * and card without the card closing is its own problem.
 */
@Component({
  selector: 'prism-head-info',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismIconComponent],
  template: `
    <button
      class="info-btn"
      type="button"
      popovertarget="prism-head-info"
      title="Component details"
      aria-label="Component details"
    >
      <prism-icon name="info" [size]="13" />
    </button>

    <div popover id="prism-head-info" class="info-card">
      <code class="info-card__selector">&lt;{{ selector() }}&gt;</code>
      @if (description()) {
      <p class="info-card__desc">{{ description() }}</p>
      } @if (tags().length) {
      <div class="info-card__tags">
        @for (tag of tags(); track tag) {
        <span class="info-card__tag">{{ tag }}</span>
        }
      </div>
      }
    </div>
  `,
  styles: `
    :host { display: inline-flex; }

    .info-btn {
      display: grid;
      place-items: center;
      width: 20px;
      height: 20px;
      padding: 0;
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      color: var(--prism-text-ghost);
      cursor: pointer;
      anchor-name: --prism-head-info;
    }
    .info-btn:hover { color: var(--prism-text-2); }
    .info-btn:focus-visible {
      outline: 2px solid var(--prism-primary);
      outline-offset: 1px;
    }

    .info-card {
      margin: 0;
      padding: var(--sp-4);
      width: 320px;
      max-width: calc(100vw - var(--sp-6));
      border: 1px solid var(--prism-border-strong);
      border-radius: var(--radius-md);
      background: var(--prism-bg-elevated);
      color: var(--prism-text-2);
      box-shadow: 0 8px 28px -10px rgba(0, 0, 0, 0.45);
      position-anchor: --prism-head-info;
      position-area: block-end span-inline-end;
      position-try-fallbacks: flip-block, flip-inline;
      inset: auto;
    }

    .info-card__selector {
      display: block;
      font-family: var(--font-mono);
      font-size: var(--fs-md);
      color: var(--prism-primary);
      user-select: all;
    }
    .info-card__desc {
      margin: var(--sp-3) 0 0;
      font-size: var(--fs-lg);
      line-height: 1.55;
    }
    .info-card__tags {
      margin-top: var(--sp-4);
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-2);
    }
    .info-card__tag {
      padding: 1px var(--sp-3);
      font-size: var(--fs-xs);
      border-radius: var(--radius-xs);
      border: 1px solid var(--prism-border);
      color: var(--prism-text-muted);
    }
  `,
})
export class PrismHeadInfoComponent {
  readonly selector = input.required<string>();
  readonly description = input<string | undefined>(undefined);
  readonly tags = input<readonly string[]>([]);
}
