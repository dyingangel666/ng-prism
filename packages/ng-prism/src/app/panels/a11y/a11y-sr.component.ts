import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { A11ySrService } from './a11y-sr.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';

@Component({
  selector: 'prism-a11y-sr',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './a11y-sr.component.html',
  styleUrl: './a11y-sr.component.css',
})
export class A11ySrComponent {
  protected readonly rendererService = inject(PrismRendererService);
  private readonly srService = inject(A11ySrService);

  protected readonly announcements = computed(() => {
    const root = this.rendererService.renderedElement();
    if (!root) return [];
    const doc = (root as HTMLElement).ownerDocument;
    return this.srService.buildAnnouncementList(
      root,
      doc ? (id) => doc.getElementById(id) : undefined
    );
  });
}
