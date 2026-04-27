import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismCanvasService, type CanvasBg } from '../services/prism-canvas.service.js';

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
            [class.tool-btn--active]="canvas.bg() === bg"
            (click)="canvas.setBg(bg)"
          >{{ capitalize(bg) }}</button>
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
          >{{ z.label }}</button>
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

  `,
})
export class PrismCanvasToolbarComponent {
  protected readonly canvas = inject(PrismCanvasService);

  protected readonly bgs: CanvasBg[] = ['dots', 'plain', 'light', 'dark', 'checker'];
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
