import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BoxModelStateService } from './box-model-state.service.js';
import type { BoxModelData } from './box-model.types.js';

@Component({
  selector: 'prism-box-model-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-bmp">
      @if (stateService.hoveredBoxModel(); as bm) {
      <div class="prism-bmp__diagram">
        <div class="prism-bmp__region prism-bmp__region--margin">
          <span class="prism-bmp__region-label">margin</span>
          <div class="prism-bmp__sides">
            <span class="prism-bmp__side">{{ fmt(bm.margin.top) }}</span>
            <div class="prism-bmp__inner-row">
              <span class="prism-bmp__side">{{ fmt(bm.margin.left) }}</span>
              <div class="prism-bmp__region prism-bmp__region--border">
                <span class="prism-bmp__region-label">border</span>
                <div class="prism-bmp__inner-row">
                  <span class="prism-bmp__side prism-bmp__side--dim">{{
                    fmt(bm.border.left)
                  }}</span>
                  <div class="prism-bmp__region prism-bmp__region--padding">
                    <span class="prism-bmp__region-label">padding</span>
                    <div class="prism-bmp__sides">
                      <span class="prism-bmp__side">{{
                        fmt(bm.padding.top)
                      }}</span>
                      <div class="prism-bmp__inner-row">
                        <span class="prism-bmp__side">{{
                          fmt(bm.padding.left)
                        }}</span>
                        <div class="prism-bmp__content-box">
                          {{ contentW(bm) }} × {{ contentH(bm) }}
                        </div>
                        <span class="prism-bmp__side">{{
                          fmt(bm.padding.right)
                        }}</span>
                      </div>
                      <span class="prism-bmp__side">{{
                        fmt(bm.padding.bottom)
                      }}</span>
                    </div>
                  </div>
                  <span class="prism-bmp__side prism-bmp__side--dim">{{
                    fmt(bm.border.right)
                  }}</span>
                </div>
              </div>
              <span class="prism-bmp__side">{{ fmt(bm.margin.right) }}</span>
            </div>
            <span class="prism-bmp__side">{{ fmt(bm.margin.bottom) }}</span>
          </div>
        </div>
      </div>
      } @else {
      <div class="prism-bmp__empty">
        Hover over an element to inspect its box model.
      </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; overflow: auto; }
    .prism-bmp {
      padding: 24px;
      font-family: var(--font-sans);
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
    }
    .prism-bmp__diagram { width: 100%; max-width: 340px; }
    .prism-bmp__region {
      border: 1px dashed; position: relative;
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-mono); font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;
    }
    .prism-bmp__region--margin {
      border-color: color-mix(in srgb, #fbbf24 70%, transparent);
      background: color-mix(in srgb, #fbbf24 8%, transparent);
      padding: 32px; color: #fbbf24;
    }
    .prism-bmp__region--border {
      border-color: color-mix(in srgb, #f472b6 70%, transparent);
      background: color-mix(in srgb, #f472b6 8%, transparent);
      padding: 14px; color: #f472b6; flex: 1;
    }
    .prism-bmp__region--padding {
      border-color: color-mix(in srgb, #34d399 70%, transparent);
      background: color-mix(in srgb, #34d399 10%, transparent);
      padding: 20px; color: #34d399; flex: 1;
    }
    .prism-bmp__region-label {
      position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
      font-size: 10px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: inherit; opacity: 0.8;
    }
    .prism-bmp__sides { display: flex; flex-direction: column; align-items: center; gap: 2px; padding-top: 14px; }
    .prism-bmp__inner-row { display: flex; align-items: center; gap: 2px; width: 100%; }
    .prism-bmp__inner-row > .prism-bmp__region { flex: 1; }
    .prism-bmp__side {
      font-family: var(--font-mono); font-size: 10px;
      color: var(--prism-text-muted);
      min-width: 28px; text-align: center; padding: 1px 4px;
    }
    .prism-bmp__side--dim { color: var(--prism-text-ghost); }
    .prism-bmp__content-box {
      flex: 1; text-align: center;
      font-family: var(--font-mono); font-size: 12px;
      color: var(--prism-primary);
      border: 1px solid var(--prism-primary);
      background: color-mix(in srgb, var(--prism-primary) 15%, transparent);
      border-radius: var(--radius-xs); padding: 22px 36px;
      text-transform: none; letter-spacing: 0; font-weight: 500;
    }
    .prism-bmp__empty { color: var(--prism-text-muted); font-size: 13px; }
  `,
})
export class BoxModelPanelComponent {
  protected readonly stateService = inject(BoxModelStateService);

  fmt(value: number): string {
    return value === 0 ? '-' : `${value}`;
  }

  contentW(bm: BoxModelData): string {
    return String(
      Math.round(
        bm.content.width -
          bm.border.left -
          bm.border.right -
          bm.padding.left -
          bm.padding.right
      )
    );
  }

  contentH(bm: BoxModelData): string {
    return String(
      Math.round(
        bm.content.height -
          bm.border.top -
          bm.border.bottom -
          bm.padding.top -
          bm.padding.bottom
      )
    );
  }
}
