import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { PRISM_MANIFEST } from '@ng-prism/core/plugin';
import type { RuntimeManifest } from '@ng-prism/core/plugin';
import type { VrtManifestMeta } from './visual-regression.types.js';

type Variant = 'ok' | 'warn' | 'danger';

@Component({
  selector: 'prism-visual-regression-header-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data(); as d) {
    <span
      class="vrt-pill"
      [class.vrt-pill--ok]="d.variant === 'ok'"
      [class.vrt-pill--warn]="d.variant === 'warn'"
      [class.vrt-pill--danger]="d.variant === 'danger'"
      [title]="d.title"
    >
      <span class="vrt-pill__dot"></span>
      <span class="vrt-pill__label">VRT</span>
      <span class="vrt-pill__value">{{ d.score }}<small>%</small></span>
    </span>
    }
  `,
  styles: `
    :host { display: inline-flex; align-items: center; }

    .vrt-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      padding: 2px 10px;
      border-radius: 9999px;
      line-height: 1.4;
      border: 1px solid var(--prism-border);
      background: var(--prism-input-bg);
      color: var(--prism-text-muted);
      white-space: nowrap;
    }

    .vrt-pill__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .vrt-pill__label {
      color: var(--prism-text-ghost);
      letter-spacing: 0.02em;
    }

    .vrt-pill__value {
      color: var(--prism-text);
      font-weight: 600;
    }
    .vrt-pill__value small {
      font-size: 9px;
      margin-left: 1px;
      color: var(--prism-text-muted);
      font-weight: 500;
    }

    .vrt-pill--ok {
      color: var(--prism-success);
      border-color: color-mix(in srgb, var(--prism-success) 35%, transparent);
      background: color-mix(in srgb, var(--prism-success) 12%, transparent);
    }
    .vrt-pill--ok .vrt-pill__label,
    .vrt-pill--ok .vrt-pill__value { color: var(--prism-success); }

    .vrt-pill--warn {
      color: var(--prism-warn);
      border-color: color-mix(in srgb, var(--prism-warn) 35%, transparent);
      background: color-mix(in srgb, var(--prism-warn) 12%, transparent);
    }
    .vrt-pill--warn .vrt-pill__label,
    .vrt-pill--warn .vrt-pill__value { color: var(--prism-warn); }

    .vrt-pill--danger {
      color: var(--prism-danger);
      border-color: color-mix(in srgb, var(--prism-danger) 35%, transparent);
      background: color-mix(in srgb, var(--prism-danger) 12%, transparent);
    }
    .vrt-pill--danger .vrt-pill__label,
    .vrt-pill--danger .vrt-pill__value { color: var(--prism-danger); }
  `,
})
export class VisualRegressionHeaderBadgeComponent {
  private readonly manifest = inject<RuntimeManifest>(PRISM_MANIFEST);

  protected readonly data = computed(() => {
    const meta = this.manifest.meta?.['visualRegression'] as
      | VrtManifestMeta
      | undefined;
    if (!meta?.found || !meta.total) return null;

    const { total, thresholds } = meta;
    const variant: Variant =
      total.score >= thresholds.score
        ? 'ok'
        : total.score >= thresholds.score * 0.75
        ? 'warn'
        : 'danger';

    // `new` and `excluded` stay out of the headline counts on purpose — neither
    // has regressed, so both are reported but never framed as a fault.
    const parts = [
      `Visual regression: ${total.score}% unchanged (target ${thresholds.score}%)`,
      `${total.unchanged} unchanged · ${total.changed} changed · ${total.sizeMismatch} resized`,
      `${total.new} new (no baseline yet)`,
    ];
    if (total.excluded) parts.push(`${total.excluded} excluded`);
    parts.push(
      `${total.auditedVariants} variants across ${total.auditedComponents} components`
    );

    return { score: total.score, variant, title: parts.join('\n') };
  });
}
