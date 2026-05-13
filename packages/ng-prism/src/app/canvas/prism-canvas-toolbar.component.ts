import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import {
  PrismCanvasService,
  type CanvasBg,
} from '../services/prism-canvas.service.js';
import { PrismVariantBgService } from '../services/prism-variant-bg.service.js';
import { PrismLayoutService } from '../services/prism-layout.service.js';

@Component({
  selector: 'prism-canvas-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismIconComponent],
  template: `
    <div class="canvas-toolbar">
      <span class="tool-label">Canvas</span>
      <div class="tool-group">
        @for (bg of bgs; track bg) {
        <button
          class="tool-btn"
          [class.tool-btn--active]="variantBg.effective() === bg"
          [class.tool-btn--recommended]="variantBg.recommended() === bg"
          [title]="
            variantBg.recommended() === bg
              ? 'Recommended background for this variant'
              : null
          "
          (click)="setBg(bg)"
        >
          @if (variantBg.recommended() === bg) {
          <svg
            class="bg-star"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="#facc15"
            aria-label="Recommended"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"
            />
          </svg>
          }
          {{ capitalize(bg) }}
        </button>
        }
      </div>
      <div class="tool-sep"></div>
      <span class="tool-label">Zoom</span>
      <div class="tool-group">
        @for (z of zooms; track z.value) {
        <button
          class="tool-btn"
          [class.tool-btn--active]="canvas.zoom() === z.value"
          (click)="canvas.setZoom(z.value)"
        >
          {{ z.label }}
        </button>
        }
      </div>
      <div class="tool-sep"></div>
      <button
        class="tool-btn"
        [class.tool-btn--active]="canvas.guides()"
        (click)="canvas.toggleGuides()"
        title="Toggle guides"
        aria-label="Toggle guides"
      >
        <prism-icon name="crosshair" [size]="13" />
        Guides
      </button>
      <button
        class="tool-btn"
        [class.tool-btn--active]="canvas.rulers()"
        (click)="canvas.toggleRulers()"
        title="Toggle rulers"
        aria-label="Toggle rulers"
      >
        <prism-icon name="move" [size]="13" />
        Rulers
      </button>

      <div class="tool-spacer"></div>

      <button
        class="tool-btn tool-btn--tpl"
        [class.tool-btn--tpl-active]="layout.templatePopoverVisible()"
        (click)="layout.toggleTemplatePopover()"
        title="Toggle Angular template"
        aria-label="Toggle Angular template"
      >
        <prism-icon name="code" [size]="13" />
        Template
      </button>
    </div>
  `,
  styles: `
    .canvas-toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 20px;
      border-bottom: 1px solid var(--prism-border);
      background: var(--prism-bg);
      min-height: 44px;
    }

    .tool-group {
      display: flex;
      align-items: center;
      gap: 1px;
      padding: 2px;
      background: var(--prism-input-bg);
      border: 1px solid var(--prism-border);
      border-radius: var(--radius-md);
    }

    .tool-btn {
      height: 24px;
      padding: 0 9px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: var(--fs-sm);
      color: var(--prism-text-muted);
      transition: all var(--dur-fast);
      font-weight: 500;
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--font-sans);
    }
    .tool-btn:hover {
      color: var(--prism-text);
      background: color-mix(in srgb, var(--prism-primary) 8%, transparent);
    }
    .tool-btn--active {
      color: var(--prism-text);
      background: color-mix(in srgb, var(--prism-primary) 15%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--prism-primary) 30%, transparent);
    }
    .bg-star {
      flex-shrink: 0;
      filter: drop-shadow(0 0 2px rgba(250, 204, 21, 0.4));
    }

    .tool-sep {
      width: 1px;
      height: 18px;
      background: var(--prism-border);
      margin: 0 4px;
    }

    .tool-label {
      font-size: var(--fs-xs);
      color: var(--prism-text-ghost);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      margin-right: 2px;
    }

    .tool-spacer { flex: 1; }

    .tool-btn--tpl {
      color: var(--prism-primary);
      background: color-mix(in srgb, var(--prism-primary) 10%, transparent);
      border: 1px solid
        color-mix(in srgb, var(--prism-primary) 25%, transparent);
      font-family: var(--font-mono);
    }
    .tool-btn--tpl:hover {
      color: var(--prism-primary);
      background: color-mix(in srgb, var(--prism-primary) 18%, transparent);
    }
    .tool-btn--tpl.tool-btn--tpl-active {
      background: color-mix(in srgb, var(--prism-primary) 22%, transparent);
      box-shadow: inset 0 0 0 1px
        color-mix(in srgb, var(--prism-primary) 35%, transparent);
    }
  `,
})
export class PrismCanvasToolbarComponent {
  protected readonly canvas = inject(PrismCanvasService);
  protected readonly variantBg = inject(PrismVariantBgService);
  protected readonly layout = inject(PrismLayoutService);

  protected setBg(bg: CanvasBg): void {
    if (this.variantBg.recommended() !== null) {
      this.variantBg.setOverride(bg);
    } else {
      this.canvas.setBg(bg);
    }
  }

  protected readonly bgs: CanvasBg[] = [
    'dots',
    'plain',
    'light',
    'dark',
    'checker',
  ];
  protected readonly zooms = [
    { value: 0.75, label: '75%' },
    { value: 1, label: '100%' },
    { value: 1.5, label: '150%' },
    { value: 2, label: '200%' },
  ];

  protected capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
