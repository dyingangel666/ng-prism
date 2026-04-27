import {
  Component,
  computed,
  inject,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismLayoutMenuComponent } from '../layout-menu/prism-layout-menu.component.js';
import type { NgPrismConfig } from '../../plugin/plugin.types.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import { PrismSearchService } from '../services/prism-search.service.js';
import { PrismThemeService } from '../services/prism-theme.service.js';

@Component({
  selector: 'prism-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismIconComponent, PrismLayoutMenuComponent],
  template: `
    <header class="prism-header">
      <div class="prism-header__brand">
        @if (logoUrl()) {
        <img class="prism-header__logo-img" [src]="logoUrl()" [alt]="title()" />
        } @else {
        <div class="prism-header__logo-default">
          <!-- @formatter:off -->
          <!-- prettier-ignore -->
          <img alt="ng prism logo" src="data:image/png;base64,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" />
          <!-- @formatter:on -->
        </div>
        }
        <div class="prism-header__brand-text">
          <span class="prism-header__brand-name">{{ title() }}</span>
          @if (subtitle()) {
          <span class="prism-header__brand-sub">{{ subtitle() }}</span>
          }
        </div>
      </div>
      <div class="prism-header__actions">
        <button
          class="prism-header__icon-btn"
          (click)="themeService.toggle()"
          [title]="
            themeService.isDark()
              ? 'Switch to light mode'
              : 'Switch to dark mode'
          "
          [attr.aria-label]="
            themeService.isDark()
              ? 'Switch to light mode'
              : 'Switch to dark mode'
          "
          [attr.aria-pressed]="themeService.isDark()"
        >
          @if (themeService.isDark()) {
          <prism-icon name="sun" [size]="16" />
          } @else {
          <prism-icon name="moon" [size]="16" />
          }
        </button>
        <prism-layout-menu />
      </div>
    </header>
  `,
  styles: `
    .prism-header {
      height: 52px;
      display: grid;
      grid-template-columns: var(--sw, 264px) 1fr auto;
      align-items: center;
      padding: 0 14px 0 0;
      background: var(--prism-bg);
      border-bottom: 1px solid var(--prism-border);
    }

    .prism-header__brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 16px;
      cursor: pointer;
    }

    .prism-header__logo-default {
      width: 26px;
      height: 26px;
      flex: 0 0 26px;
      color: var(--prism-primary);
      filter: drop-shadow(0 0 8px var(--prism-glow-strong));
    }
    .prism-header__logo-default img { width: 30px; }

    .prism-header__logo-img {
      height: 26px;
      width: auto;
      object-fit: contain;
    }

    .prism-header__brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .prism-header__brand-name {
      font-weight: 700;
      font-size: var(--fs-xl);
      letter-spacing: -0.01em;
      background: linear-gradient(90deg, var(--prism-primary), var(--prism-accent) 60%, var(--prism-primary-to));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .prism-header__brand-sub {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      color: var(--prism-text-ghost);
    }

    .prism-header__cmdbar {
      max-width: 540px;
      width: 100%;
      justify-self: center;
      display: flex;
      align-items: center;
      gap: 10px;
      height: 32px;
      padding: 0 12px;
      background: var(--prism-input-bg);
      border: 1px solid var(--prism-border);
      border-radius: 8px;
      color: var(--prism-text-muted);
      font-size: var(--fs-lg);
      cursor: pointer;
      transition: border-color var(--dur-fast), background var(--dur-fast);
    }
    .prism-header__cmdbar:hover {
      border-color: var(--prism-border-strong);
      color: var(--prism-text-2);
    }

    .prism-header__cmdbar-text {
      flex: 1;
      text-align: left;
    }

    .prism-header__cmdbar-shortcut {
      display: flex;
      gap: 3px;
    }
    .prism-header__cmdbar-shortcut kbd {
      font-family: var(--font-mono);
      font-size: 10.5px;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--prism-input-bg);
      border: 1px solid var(--prism-border);
      color: var(--prism-text-muted);
    }

    .prism-header__actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }

    .prism-header__icon-btn {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      color: var(--prism-text-muted);
      background: none;
      border: none;
      cursor: pointer;
      position: relative;
      transition: all var(--dur-fast);
    }
    .prism-header__icon-btn:hover {
      background: var(--prism-input-bg);
      color: var(--prism-text);
    }

    :focus-visible {
      outline: 2px solid var(--prism-primary);
      outline-offset: 2px;
    }
  `,
})
export class PrismHeaderComponent {
  private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);
  protected readonly searchService = inject(PrismSearchService);
  protected readonly themeService = inject(PrismThemeService);

  protected readonly logoUrl = computed(() => {
    const logo = this.config.logo;
    if (!logo) return null;
    const isDark = this.themeService.isDark();
    return (isDark ? logo.dark ?? logo.light : logo.light ?? logo.dark) ?? null;
  });

  protected readonly title = computed(() => this.config.title ?? 'ng-prism');
  protected readonly subtitle = computed(() => this.config.subtitle ?? null);

  @HostListener('document:keydown', ['$event'])
  protected onGlobalKey(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.onSearchFocus();
    }
  }

  protected onSearchFocus(): void {
    // Placeholder — will be wired to command palette later
  }
}
