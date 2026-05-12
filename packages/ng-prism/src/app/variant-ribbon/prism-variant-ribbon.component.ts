import {
  Component,
  inject,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';

function variantColor(name: string, index: number): string {
  const palette = [
    '#a78bfa',
    '#60a5fa',
    '#34d399',
    '#fbbf24',
    '#f472b6',
    '#8476a2',
    '#ec4899',
    '#06b6d4',
  ];
  return palette[index % palette.length];
}

@Component({
  selector: 'prism-variant-ribbon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismIconComponent],
  template: `
    @if (variants().length > 0) {
    <nav class="variant-ribbon">
      @for (v of variants(); track v.name; let i = $index) {
      <button
        class="v-tab"
        [class.v-tab--active]="rendererService.activeVariantIndex() === i"
        [style.--vc]="variantColor(v.name, i)"
        (click)="rendererService.selectVariant(i)"
      >
        <span class="v-dot"></span>
        {{ v.name }}
      </button>
      }
      <div class="variant-ribbon-right">
        <button
          class="tool-btn"
          title="Previous variant"
          aria-label="Previous variant"
          [disabled]="rendererService.activeVariantIndex() === 0"
          (click)="prev()"
        >
          <prism-icon
            name="chevron-right"
            [size]="14"
            style="transform: rotate(180deg)"
          />
        </button>
        <button
          class="tool-btn"
          title="Next variant"
          aria-label="Next variant"
          [disabled]="
            rendererService.activeVariantIndex() >= variants().length - 1
          "
          (click)="next()"
        >
          <prism-icon name="chevron-right" [size]="14" />
        </button>
      </div>
    </nav>
    }
  `,
  styles: `
    :host { display: block; flex-shrink: 0; }

    .variant-ribbon {
      display: flex;
      align-items: center;
      padding: 0 28px;
      background: var(--prism-bg);
      border-bottom: 1px solid var(--prism-border);
      height: 42px;
      gap: 2px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .variant-ribbon::-webkit-scrollbar { display: none; }

    .v-tab {
      position: relative;
      height: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 14px;
      font-size: 13px;
      font-weight: 500;
      color: var(--prism-text-muted);
      white-space: nowrap;
      transition: color var(--dur-fast);
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--font-sans);
    }
    .v-tab::after {
      content: '';
      position: absolute;
      left: 10px;
      right: 10px;
      bottom: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--prism-primary-from), var(--prism-primary-to));
      opacity: 0;
      transition: opacity var(--dur-fast);
      border-radius: 1px 1px 0 0;
    }
    .v-tab:hover { color: var(--prism-text-2); }
    .v-tab--active { color: var(--prism-text); }
    .v-tab--active::after { opacity: 1; }

    .v-dot {
      width: 6px;
      height: 6px;
      border-radius: 2px;
      background: var(--vc, var(--prism-primary));
      opacity: 0.6;
    }
    .v-tab--active .v-dot {
      opacity: 1;
      box-shadow: 0 0 6px var(--vc);
    }

    .variant-ribbon-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: 12px;
      border-left: 1px solid var(--prism-border);
      height: 24px;
    }

    .tool-btn {
      height: 24px;
      width: 24px;
      display: grid;
      place-items: center;
      border-radius: var(--radius-sm);
      color: var(--prism-text-muted);
      background: none;
      border: none;
      cursor: pointer;
      transition: all var(--dur-fast);
    }
    .tool-btn:hover:not(:disabled) {
      color: var(--prism-text);
      background: color-mix(in srgb, var(--prism-primary) 8%, transparent);
    }
    .tool-btn:disabled {
      opacity: 0.3;
      cursor: default;
    }

    :focus-visible {
      outline: 2px solid var(--prism-primary);
      outline-offset: 2px;
    }
  `,
})
export class PrismVariantRibbonComponent {
  private readonly navigationService = inject(PrismNavigationService);
  protected readonly rendererService = inject(PrismRendererService);

  protected readonly variants = computed(() => {
    const comp = this.navigationService.activeComponent();
    return comp?.meta.showcaseConfig.variants ?? [];
  });

  protected variantColor(name: string, index: number): string {
    return variantColor(name, index);
  }

  protected prev(): void {
    const idx = this.rendererService.activeVariantIndex();
    if (idx > 0) this.rendererService.selectVariant(idx - 1);
  }

  protected next(): void {
    const idx = this.rendererService.activeVariantIndex();
    if (idx < this.variants().length - 1)
      this.rendererService.selectVariant(idx + 1);
  }
}
