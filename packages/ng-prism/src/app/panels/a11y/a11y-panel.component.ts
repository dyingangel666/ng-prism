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
import type { A11yCoreConfig } from './a11y.types.js';

@Component({
  selector: 'prism-a11y-panel',
  standalone: true,
  imports: [
    A11yViolationsComponent,
    A11yKeyboardComponent,
    A11yTreeComponent,
    A11ySrComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="a11y-panel">
      <div class="subtabs">
        <button
          class="st-tab"
          [class.st-tab--active]="state.activeTab() === 'violations'"
          (click)="state.activeTab.set('violations')"
        >
          Violations @if (violationCount() !== null) {
          <span
            class="st-badge"
            [class.st-badge--ok]="violationCount() === 0"
            [class.st-badge--warn]="violationCount()! > 0"
          >
            {{ violationCount() }}
          </span>
          }
        </button>
        <button
          class="st-tab"
          [class.st-tab--active]="state.activeTab() === 'keyboard'"
          (click)="state.activeTab.set('keyboard')"
        >
          Keyboard
        </button>
        <button
          class="st-tab"
          [class.st-tab--active]="state.activeTab() === 'tree'"
          (click)="state.activeTab.set('tree')"
        >
          ARIA Tree
        </button>
        <button
          class="st-tab"
          [class.st-tab--active]="state.activeTab() === 'sr'"
          (click)="state.activeTab.set('sr')"
        >
          Screen Reader
        </button>
      </div>

      <div class="a11y-content">
        @if (disabled()) {
        <div class="a11y-disabled">
          Accessibility audit disabled for this component.
        </div>
        } @else { @switch (state.activeTab()) { @case ('violations') {
        <prism-a11y-violations /> } @case ('keyboard') {
        <prism-a11y-keyboard [activeComponent]="activeComponent()" /> } @case
        ('tree') { <prism-a11y-tree [activeComponent]="activeComponent()" /> }
        @case ('sr') { <prism-a11y-sr [activeComponent]="activeComponent()" /> }
        } }
      </div>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; }

    .a11y-panel { display: flex; flex-direction: column; height: 100%; }

    .subtabs {
      display: flex;
      gap: 2px;
      padding: 10px 20px 0;
      border-bottom: 1px solid var(--prism-border);
      background: var(--prism-bg-elevated);
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .st-tab {
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 500;
      color: var(--prism-text-muted);
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      position: relative;
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--font-sans);
      transition: color var(--dur-fast);
    }
    .st-tab:hover { color: var(--prism-text-2); }
    .st-tab--active { color: var(--prism-text); }
    .st-tab--active::after {
      content: '';
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: -1px;
      height: 2px;
      background: var(--prism-primary);
      border-radius: 1px;
    }

    .st-badge {
      min-width: 16px;
      height: 16px;
      padding: 0 5px;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--prism-primary) 18%, transparent);
      color: var(--prism-primary);
    }
    .st-badge--ok {
      background: color-mix(in srgb, var(--prism-success) 18%, transparent);
      color: var(--prism-success);
    }
    .st-badge--warn {
      background: color-mix(in srgb, var(--prism-warn) 18%, transparent);
      color: var(--prism-warn);
    }

    .a11y-content { flex: 1; overflow: auto; min-height: 0; }

    .a11y-disabled {
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
  protected readonly state = inject(A11yPanelStateService);

  readonly activeComponent = input<unknown>(null);

  protected readonly disabled = computed(() => {
    const comp = this.activeComponent() as any;
    const config: A11yCoreConfig | undefined =
      comp?.meta?.showcaseConfig?.meta?.['a11y'];
    return config?.disable === true;
  });

  protected readonly violationCount = computed(() => {
    const r = this.auditService.results();
    return r ? r.violations.length : null;
  });
}
