import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PrismPanelService } from '../services/prism-panel.service.js';

@Component({
  selector: 'prism-view-tab-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prism-view-tab-bar.component.html',
  styleUrl: './prism-view-tab-bar.component.css',
})
export class PrismViewTabBarComponent {
  protected readonly panelService = inject(PrismPanelService);

  protected readonly viewPanels = this.panelService.visibleViewPanels;
}
