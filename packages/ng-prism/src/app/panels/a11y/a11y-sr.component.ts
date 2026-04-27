import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { A11ySrService } from './a11y-sr.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';

@Component({
  selector: 'prism-a11y-sr',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!rendererService.renderedElement()) {
    <div class="sr-empty">
      Select a component to simulate screen reader output.
    </div>
    } @else if (!announcements().length) {
    <div class="sr-empty">No announced elements found.</div>
    } @else {
    <div class="sr-body">
      @for (a of announcements(); track a.index) {
      <div class="sr-line">
        <div class="sr-step">VO · {{ a.index }}</div>
        <div class="sr-text">
          @if (a.name) { "<span class="sr-name">{{ a.name }}</span
          >", }
          <code>{{ a.role }}</code>
          @if (a.states.length) { · {{ a.states.join(', ') }}
          }
        </div>
      </div>
      }
    </div>
    }
  `,
  styles: `
    :host { display: block; height: 100%; overflow: auto; }

    .sr-empty {
      display: flex; align-items: center; justify-content: center;
      min-height: 100px; color: var(--prism-text-muted); font-size: 13px;
    }

    .sr-body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .sr-line {
      display: grid;
      grid-template-columns: 56px 1fr;
      gap: 12px;
      padding: 10px 12px;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-radius: 8px;
    }

    .sr-step {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--prism-text-ghost);
      font-weight: 600;
    }

    .sr-text {
      font-size: 13px;
      color: var(--prism-text);
      line-height: 1.5;
    }

    .sr-name {
      color: var(--prism-primary);
      font-weight: 600;
      font-style: normal;
    }

    .sr-text code {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--prism-text-muted);
      padding: 1px 5px;
      background: var(--prism-input-bg);
      border-radius: var(--radius-xs);
    }
  `,
})
export class A11ySrComponent {
  protected readonly rendererService = inject(PrismRendererService);
  private readonly srService = inject(A11ySrService);

  readonly activeComponent = input<unknown>(null);

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
