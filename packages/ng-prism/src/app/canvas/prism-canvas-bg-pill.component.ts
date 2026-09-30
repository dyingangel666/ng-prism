import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PrismVariantBgService } from '../services/prism-variant-bg.service.js';

@Component({
  selector: 'prism-canvas-bg-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prism-canvas-bg-pill.component.html',
  styleUrl: './prism-canvas-bg-pill.component.css',
})
export class PrismCanvasBgPillComponent {
  private readonly variantBg = inject(PrismVariantBgService);

  protected readonly recommended = this.variantBg.recommended;
  protected readonly visible = this.variantBg.isDeviating;

  protected reset(): void {
    this.variantBg.clearOverride();
  }
}
