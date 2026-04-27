import {
  Component,
  inject,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { A11yAuditService } from '../panels/a11y/a11y-audit.service.js';
import { PrismStatComponent } from './prism-stat.component.js';

@Component({
  selector: 'prism-component-head',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismIconComponent, PrismStatComponent],
  template: `
    @if (comp(); as c) {
    <section class="comp-head">
      <div class="comp-head-top">
        <div>
          <div class="comp-crumb">
            <span>{{ category() }}</span>
            <prism-icon name="chevron-right" [size]="10" />
            <span>{{ c.meta.showcaseConfig.title }}</span>
          </div>
          <h1 class="comp-title">
            {{ c.meta.showcaseConfig.title }}
            <span class="comp-selector"
              >&lt;{{ c.meta.componentMeta.selector }}&gt;</span
            >
          </h1>
          @if (c.meta.showcaseConfig.description) {
          <p class="comp-desc">{{ c.meta.showcaseConfig.description }}</p>
          } @if (c.meta.showcaseConfig.tags?.length) {
          <div class="comp-tags">
            @for (tag of c.meta.showcaseConfig.tags; track tag) {
            <span class="comp-tag">{{ tag }}</span>
            }
          </div>
          }
        </div>
        <div class="comp-head-stats">
          @if (variantCount() > 0) {
          <prism-stat [value]="variantCount()" label="Variants" />
          } @if (coveragePercent() !== null) {
          <prism-stat
            [value]="coveragePercent()! + '%'"
            label="Coverage"
            [pill]="coveragePercent()! >= 90 ? 'OK' : 'WARN'"
            [pillVariant]="coveragePercent()! >= 90 ? 'ok' : 'warn'"
          />
          } @if (bundleSize() !== null) {
          <prism-stat [value]="bundleSize()!" label="Bundle" />
          } @if (a11yScore() !== null) {
          <prism-stat
            [value]="a11yScore()!"
            label="Score"
            pill="A11y"
            [pillVariant]="a11yScore()! >= 90 ? 'ok' : 'warn'"
          />
          }
        </div>
      </div>
    </section>
    }
  `,
  styles: `
    :host { display: block; flex-shrink: 0; }

    .comp-head {
      padding: 12px 28px;
      background: var(--prism-bg);
      border-bottom: 1px solid var(--prism-border);
      position: relative;
    }
    .comp-head::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      background: linear-gradient(180deg, var(--prism-primary-from) 0%, #ec4899 50%, var(--prism-primary-to) 100%);
    }

    .comp-head-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .comp-crumb {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--fs-sm);
      color: var(--prism-text-ghost);
      margin-bottom: 6px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .comp-crumb prism-icon { opacity: 0.6; }

    .comp-title {
      margin: 0;
      font-size: var(--fs-2xl);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--prism-text);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .comp-selector {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--prism-primary);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: color-mix(in srgb, var(--prism-primary) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--prism-primary) 20%, transparent);
      font-weight: 500;
    }

    .comp-desc {
      margin: 6px 0 0;
      font-size: var(--fs-lg);
      color: var(--prism-text-2);
      max-width: 72ch;
      line-height: 1.55;
    }

    .comp-tags {
      margin-top: 10px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .comp-tag {
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 500;
      border-radius: var(--radius-xs);
      background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
      color: var(--prism-primary);
      border: 1px solid color-mix(in srgb, var(--prism-primary) 20%, transparent);
    }

    .comp-head-stats {
      display: flex;
      gap: 18px;
      flex-shrink: 0;
    }
  `,
})
export class PrismComponentHeadComponent {
  private readonly navigationService = inject(PrismNavigationService);
  private readonly auditService = inject(A11yAuditService);

  protected readonly comp = computed(() =>
    this.navigationService.activeComponent()
  );

  protected readonly category = computed(() => {
    const c = this.comp();
    return c?.meta.showcaseConfig.category ?? 'Uncategorized';
  });

  protected readonly variantCount = computed(() => {
    const c = this.comp();
    return c?.meta.showcaseConfig.variants?.length ?? 0;
  });

  protected readonly coveragePercent = computed<number | null>(() => {
    const meta = this.componentMeta();
    const coverage = meta?.['coverage'] as Record<string, unknown> | undefined;
    if (coverage?.['found'] && typeof coverage['score'] === 'number')
      return coverage['score'];
    return null;
  });

  protected readonly bundleSize = computed<string | null>(() => {
    const meta = this.componentMeta();
    const perf = meta?.['perf'] as Record<string, unknown> | undefined;
    const bundle = perf?.['bundle'] as Record<string, unknown> | undefined;
    if (bundle && typeof bundle['gzipKb'] === 'number')
      return bundle['gzipKb'] + ' kb';
    if (bundle && typeof bundle['sizeKb'] === 'number')
      return bundle['sizeKb'] + ' kb';
    return null;
  });

  protected readonly a11yScore = computed<number | null>(() => {
    return this.auditService.scoreResult()?.score ?? null;
  });

  private readonly componentMeta = computed(() => {
    const c = this.comp();
    const meta = c?.meta.showcaseConfig.meta;
    return meta && typeof meta === 'object'
      ? (meta as Record<string, unknown>)
      : null;
  });
}
