import { Component, inject } from '@angular/core';
import { PrismEventLogService } from '../../services/prism-event-log.service.js';
import { PrismJsonNodeComponent } from './prism-json-node.component.js';

@Component({
  selector: 'prism-events-panel',
  standalone: true,
  imports: [PrismJsonNodeComponent],
  template: `
    <div class="prism-events-panel">
      <div class="prism-events-panel__header">
        <span class="prism-events-panel__title">Events</span>
        <button
          class="prism-events-panel__clear"
          (click)="eventLogService.clear()"
        >
          Clear
        </button>
      </div>
      <div class="prism-events-panel__list">
        @for (entry of eventLogService.events(); track $index) {
          <div class="prism-events-panel__entry">
            <span class="prism-events-panel__time">{{ formatTime(entry.timestamp) }}</span>
            <span class="prism-events-panel__name">{{ entry.name }}</span>
            <span class="prism-events-panel__value">
              <prism-json-node [value]="entry.value" />
            </span>
          </div>
        } @empty {
          <p class="prism-events-panel__empty">No events recorded</p>
        }
      </div>
    </div>
  `,
  styles: `
    .prism-events-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .prism-events-panel__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid var(--prism-border);
    }
    .prism-events-panel__title {
      font-size: 12px;
      font-weight: 600;
      color: var(--prism-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .prism-events-panel__clear {
      padding: 2px 8px;
      font-size: 12px;
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-sm);
      background: var(--prism-bg);
      color: var(--prism-text-muted);
      cursor: pointer;
    }
    .prism-events-panel__clear:hover {
      color: var(--prism-text);
      border-color: var(--prism-text-muted);
    }
    .prism-events-panel__list {
      overflow-y: auto;
      flex: 1;
    }
    .prism-events-panel__entry {
      display: flex;
      gap: 12px;
      padding: 4px 16px;
      font-size: 12px;
      font-family: var(--prism-font-mono);
      border-bottom: 1px solid var(--prism-border);
      align-items: baseline;
      flex-wrap: wrap;
    }
    .prism-events-panel__time {
      color: var(--prism-text-muted);
      flex-shrink: 0;
    }
    .prism-events-panel__name {
      color: var(--prism-primary);
      font-weight: 600;
      flex-shrink: 0;
    }
    .prism-events-panel__value {
      flex: 1;
      min-width: 0;
    }
    .prism-events-panel__empty {
      color: var(--prism-text-muted);
      font-size: 13px;
      padding: 12px 16px;
      margin: 0;
    }
  `,
})
export class PrismEventsPanelComponent {
  protected readonly eventLogService = inject(PrismEventLogService);

  protected formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
  }
}
