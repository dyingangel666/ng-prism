import { Component, inject } from '@angular/core';
import { PrismNavigationService } from '../services/prism-navigation.service.js';

@Component({
  selector: 'prism-component-header',
  standalone: true,
  template: `
    @if (navigationService.activeComponent(); as comp) {
      <div class="prism-component-header">
        <h2 class="prism-component-header__title">{{ comp.meta.showcaseConfig.title }}</h2>
        @if (comp.meta.showcaseConfig.description) {
          <p class="prism-component-header__description">{{ comp.meta.showcaseConfig.description }}</p>
        }
        @if (comp.meta.showcaseConfig.tags?.length) {
          <div class="prism-component-header__tags">
            @for (tag of comp.meta.showcaseConfig.tags; track tag) {
              <span class="prism-component-header__tag">{{ tag }}</span>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .prism-component-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--prism-border);
      border-left: 3px solid;
      border-image: linear-gradient(180deg, var(--prism-primary-from), var(--prism-primary-to)) 1;
      background: var(--prism-bg-surface);
    }

    .prism-component-header__title {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--prism-text);
      font-family: var(--prism-font-sans);
    }

    .prism-component-header__description {
      margin: 4px 0 0;
      font-size: 13px;
      line-height: 1.6;
      color: var(--prism-text-2);
      font-family: var(--prism-font-sans);
    }

    .prism-component-header__tags {
      display: flex;
      gap: 6px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .prism-component-header__tag {
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 500;
      border-radius: var(--prism-radius-xs);
      background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
      color: var(--prism-primary);
      border: 1px solid color-mix(in srgb, var(--prism-primary) 20%, transparent);
      letter-spacing: 0.02em;
      font-family: var(--prism-font-sans);
    }
  `,
})
export class PrismComponentHeaderComponent {
  protected readonly navigationService = inject(PrismNavigationService);
}
