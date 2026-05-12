import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PrismVariantBgService } from '../services/prism-variant-bg.service.js';

@Component({
  selector: 'prism-canvas-bg-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
    <div class="prism-bg-pill" role="status">
      <span class="label">Recommended: {{ recommended() }}</span>
      <button
        type="button"
        class="reset"
        title="Reset to recommended background"
        aria-label="Reset to recommended background"
        (click)="reset()"
      >
        Reset
      </button>
    </div>
    }
  `,
  styles: `
    :host {
      position: absolute;
      top: 12px;
      right: 20px;
      pointer-events: none;
      z-index: 2;
    }
    .prism-bg-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 4px 4px 10px;
      border-radius: 999px;
      font-size: var(--fs-xs);
      font-family: var(--font-sans);
      background: color-mix(in srgb, var(--prism-bg-elevated) 90%, transparent);
      border: 1px solid var(--prism-border);
      color: var(--prism-text-muted);
      backdrop-filter: blur(8px);
      pointer-events: auto;
      animation: fadeIn var(--dur-base) ease-out;
    }
    .label { letter-spacing: 0.02em; }
    .reset {
      height: 22px;
      padding: 0 10px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
      color: var(--prism-text);
      border: 1px solid color-mix(in srgb, var(--prism-primary) 25%, transparent);
      font-family: inherit;
      font-size: inherit;
      font-weight: 500;
      cursor: pointer;
      transition: background var(--dur-fast);
    }
    .reset:hover {
      background: color-mix(in srgb, var(--prism-primary) 20%, transparent);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
})
export class PrismCanvasBgPillComponent {
  private readonly variantBg = inject(PrismVariantBgService);

  protected readonly recommended = this.variantBg.recommended;
  protected readonly visible = computed(
    () => this.variantBg.recommended() !== null && this.variantBg.override() !== null,
  );

  protected reset(): void {
    this.variantBg.clearOverride();
  }
}
