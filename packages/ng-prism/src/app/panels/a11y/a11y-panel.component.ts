import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { A11yAuditService } from './a11y-audit.service.js';
import { A11yViolationsComponent } from './a11y-violations.component.js';
import { A11yKeyboardComponent } from './a11y-keyboard.component.js';
import { A11yTreeComponent } from './a11y-tree.component.js';
import { A11ySrComponent } from './a11y-sr.component.js';
import { A11yPanelStateService } from './a11y-panel-state.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';
import type { A11yCoreConfig } from './a11y.types.js';

@Component({
  selector: 'prism-a11y-panel',
  standalone: true,
  imports: [A11yViolationsComponent, A11yKeyboardComponent, A11yTreeComponent, A11ySrComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-a11y-panel">
      <div class="prism-a11y-panel__sub-tabs">
        <button
          class="prism-a11y-panel__sub-tab"
          [class.prism-a11y-panel__sub-tab--active]="state.activeTab() === 'violations'"
          (click)="state.activeTab.set('violations')"
        >
          Violations
          @if (violationCount() !== null) {
            <span
              class="prism-a11y-panel__sub-badge"
              [class.prism-a11y-panel__sub-badge--ok]="violationCount() === 0"
            >{{ violationCount() }}</span>
          }
        </button>
        <button
          class="prism-a11y-panel__sub-tab"
          [class.prism-a11y-panel__sub-tab--active]="state.activeTab() === 'keyboard'"
          (click)="state.activeTab.set('keyboard')"
        >
          Keyboard
          @if (focusableCount() !== null) {
            <span class="prism-a11y-panel__sub-badge prism-a11y-panel__sub-badge--kbd">
              {{ focusableCount() }}
            </span>
          }
        </button>
        <button
          class="prism-a11y-panel__sub-tab"
          [class.prism-a11y-panel__sub-tab--active]="state.activeTab() === 'tree'"
          (click)="state.activeTab.set('tree')"
        >
          ARIA Tree
        </button>
        <button
          class="prism-a11y-panel__sub-tab"
          [class.prism-a11y-panel__sub-tab--active]="state.activeTab() === 'sr'"
          (click)="state.activeTab.set('sr')"
        >
          Screen Reader
        </button>
      </div>

      <div class="prism-a11y-panel__content">
        @if (disabled()) {
          <div class="prism-a11y-panel__disabled">Accessibility audit disabled for this component.</div>
        } @else {
          @switch (state.activeTab()) {
            @case ('violations') { <prism-a11y-violations /> }
            @case ('keyboard')   { <prism-a11y-keyboard [activeComponent]="activeComponent()" /> }
            @case ('tree')       { <prism-a11y-tree [activeComponent]="activeComponent()" /> }
            @case ('sr')         { <prism-a11y-sr [activeComponent]="activeComponent()" /> }
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; }

    .prism-a11y-panel { display: flex; flex-direction: column; height: 100%; }

    .prism-a11y-panel__sub-tabs {
      display: flex;
      border-bottom: 1px solid var(--prism-border);
      padding: 0 8px;
      flex-shrink: 0;
      background: var(--prism-bg-elevated);
    }

    .prism-a11y-panel__sub-tab {
      padding: 8px 12px;
      font-size: 12px;
      font-family: var(--prism-font-sans, system-ui, sans-serif);
      border: none;
      background: none;
      color: var(--prism-text-muted);
      cursor: pointer;
      position: relative;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: color 0.12s;
    }
    .prism-a11y-panel__sub-tab::after {
      content: '';
      position: absolute;
      bottom: -1px; left: 6px; right: 6px;
      height: 2px;
      background: var(--prism-primary);
      opacity: 0;
    }
    .prism-a11y-panel__sub-tab:hover { color: var(--prism-text-2); }
    .prism-a11y-panel__sub-tab--active { color: var(--prism-primary); font-weight: 500; }
    .prism-a11y-panel__sub-tab--active::after { opacity: 1; }
    .prism-a11y-panel__sub-tab--soon { opacity: 0.45; cursor: default; }

    .prism-a11y-panel__sub-badge {
      padding: 0 5px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 700;
      background: color-mix(in srgb, #f87171 18%, transparent);
      color: #f87171;
    }
    .prism-a11y-panel__sub-badge--ok {
      background: color-mix(in srgb, #4ade80 12%, transparent);
      color: #4ade80;
    }
    .prism-a11y-panel__sub-badge--kbd {
      background: color-mix(in srgb, #818cf8 15%, transparent);
      color: #818cf8;
    }

    .prism-a11y-panel__content { flex: 1; overflow: auto; min-height: 0; }

    .prism-a11y-panel__soon,
    .prism-a11y-panel__disabled {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100px;
      color: var(--prism-text-muted);
      font-size: 13px;
    }
  `,
})
export class A11yPanelComponent {
  private readonly auditService = inject(A11yAuditService);
  private readonly rendererService = inject(PrismRendererService);
  protected readonly state = inject(A11yPanelStateService);

  readonly activeComponent = input<unknown>(null);

  protected readonly disabled = computed(() => {
    const comp = this.activeComponent() as any;
    const config: A11yCoreConfig | undefined = comp?.meta?.showcaseConfig?.meta?.['a11y'];
    return config?.disable === true;
  });

  protected readonly violationCount = computed(() => {
    const r = this.auditService.results();
    return r ? r.violations.length : null;
  });

  protected readonly focusableCount = computed(() => {
    const el = this.rendererService.renderedElement();
    if (!el) return null;
    return el.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]',
    ).length;
  });
}
