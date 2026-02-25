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
      padding: 16px 24px;
      border-bottom: 1px solid var(--prism-border);
    }
    .prism-component-header__title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--prism-text);
    }
    .prism-component-header__description {
      margin: 4px 0 0;
      font-size: 14px;
      color: var(--prism-text-muted);
    }
    .prism-component-header__tags {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }
    .prism-component-header__tag {
      padding: 2px 8px;
      font-size: 11px;
      border-radius: 9999px;
      background: var(--prism-bg-surface);
      color: var(--prism-text-muted);
      border: 1px solid var(--prism-border);
    }
  `,
})
export class PrismComponentHeaderComponent {
  protected readonly navigationService = inject(PrismNavigationService);
}
