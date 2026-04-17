import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from 'test-lib';
import { TooltipDirective } from 'test-lib';

@Component({
  selector: 'prism-button-tooltip-page',
  standalone: true,
  imports: [ButtonComponent, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h3 class="page__heading">Button + Tooltip Directive</h3>
      <p class="page__description">
        The <code>[libTooltip]</code> directive can be applied to any element.
        Below are examples showing all four positions on a <code>lib-button</code>.
      </p>

      <div class="page__grid">
        <div class="page__example">
          <span class="page__label">Top</span>
          <lib-button libTooltip="Tooltip on top" tooltipPosition="top" label="Top" variant="filled" />
        </div>
        <div class="page__example">
          <span class="page__label">Bottom</span>
          <lib-button libTooltip="Tooltip on bottom" tooltipPosition="bottom" label="Bottom" variant="outlined" />
        </div>
        <div class="page__example">
          <span class="page__label">Left</span>
          <lib-button libTooltip="Tooltip on left" tooltipPosition="left" label="Left" variant="elevated" />
        </div>
        <div class="page__example">
          <span class="page__label">Right</span>
          <lib-button libTooltip="Tooltip on right" tooltipPosition="right" label="Right" variant="text" />
        </div>
      </div>
    </div>
  `,
  styles: `
    .page { max-width: 640px; font-family: system-ui, -apple-system, sans-serif; }
    .page__heading { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 8px; }
    .page__description { font-size: 14px; color: #6b7280; line-height: 1.5; margin: 0 0 24px; }
    .page__description code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #6366f1; }
    .page__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; }
    .page__example { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafafa; }
    .page__label { font-size: 12px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
  `,
})
export class ButtonTooltipPageComponent {}
