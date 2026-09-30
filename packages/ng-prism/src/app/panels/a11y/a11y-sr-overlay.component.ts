import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { A11ySrService } from './a11y-sr.service.js';
import { A11yPerspectiveService } from './a11y-perspective.service.js';
import { A11yPanelStateService } from './a11y-panel-state.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';

interface SrBadgePosition {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
}

@Component({
  selector: 'prism-a11y-sr-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './a11y-sr-overlay.component.html',
  styleUrl: './a11y-sr-overlay.component.css',
})
export class A11ySrOverlayComponent {
  private readonly perspective = inject(A11yPerspectiveService);
  private readonly panelState = inject(A11yPanelStateService);
  private readonly rendererService = inject(PrismRendererService);
  private readonly srService = inject(A11ySrService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly badges = signal<SrBadgePosition[]>([]);
  protected readonly showOverlay = signal(false);

  private activeIdx = 0;
  private rafId: number | null = null;

  constructor() {
    effect(() => {
      const isSrMode = this.perspective.mode() === 'screen-reader';
      const isSrTab = this.panelState.activeTab() === 'sr';
      const root = this.rendererService.renderedElement();
      this.rendererService.inputValues();
      this.rendererService.activeVariantIndex();

      const shouldShow = isSrMode && isSrTab && !!root;
      this.showOverlay.set(shouldShow);

      if (!shouldShow || !root) {
        this.badges.set([]);
        return;
      }

      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.computeBadges(root);
      });
    });
  }

  setActiveIndex(idx: number): void {
    this.activeIdx = idx;
    this.badges.update((bs) =>
      bs.map((b, i) => ({ ...b, isActive: i === idx }))
    );
  }

  private computeBadges(root: Element): void {
    const canvas = this.elementRef.nativeElement.closest(
      '.prism-canvas-stage'
    ) as HTMLElement | null;
    if (!canvas) return;

    const doc = (root as HTMLElement).ownerDocument;
    const announcements = this.srService.buildAnnouncementList(
      root,
      doc ? (id) => doc.getElementById(id) : undefined
    );

    const canvasRect = canvas.getBoundingClientRect();
    const scrollLeft = canvas.scrollLeft;
    const scrollTop = canvas.scrollTop;

    const positions: SrBadgePosition[] = announcements
      .map((a, i) => {
        const el = a.element as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (!rect.width && !rect.height) return null;
        return {
          index: a.index,
          x: rect.left - canvasRect.left + scrollLeft,
          y: rect.top - canvasRect.top + scrollTop,
          width: rect.width,
          height: rect.height,
          isActive: i === this.activeIdx,
        };
      })
      .filter((p): p is SrBadgePosition => p !== null);

    this.badges.set(positions);
  }
}
