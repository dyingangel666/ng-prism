import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PrismEventLogService } from '../../services/prism-event-log.service.js';
import { PrismJsonNodeComponent } from './prism-json-node.component.js';

@Component({
  selector: 'prism-events-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismJsonNodeComponent],
  template: `
    <div class="ev-panel">
      <div class="ev-body">
        @for (entry of eventLogService.events(); track entry.id; let i = $index)
        {
        <div class="ev">
          <span class="ev-time">{{ formatTime(entry.timestamp) }}</span>
          <span class="ev-idx"
            >#{{ padIdx(eventLogService.events().length - i) }}</span
          >
          <span class="ev-name">{{ entry.name }}</span>
          <span class="ev-args"><prism-json-node [value]="entry.value" /></span>
        </div>
        } @empty {
        <p class="ev-empty">No events recorded</p>
        }
      </div>
    </div>
  `,
  styles: `
    .ev-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .ev-body {
      padding: 6px 0;
      overflow-y: auto;
      flex: 1;
    }

    .ev {
      display: grid;
      grid-template-columns: auto auto 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 6px 20px;
      font-family: var(--font-mono);
      font-size: 12px;
      border-bottom: 1px solid var(--prism-border);
      min-height: 32px;
    }
    .ev:hover {
      background: color-mix(in srgb, var(--prism-primary) 3%, transparent);
    }

    .ev-time {
      color: var(--prism-text-ghost);
      font-size: 11px;
    }
    .ev-idx {
      color: var(--prism-text-muted);
      font-size: 11px;
    }
    .ev-name {
      color: var(--prism-primary);
      font-weight: 500;
    }
    .ev-args {
      color: var(--prism-text-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ev-empty {
      color: var(--prism-text-ghost);
      font-size: 13px;
      padding: 16px 20px;
      margin: 0;
    }
  `,
})
export class PrismEventsPanelComponent {
  protected readonly eventLogService = inject(PrismEventLogService);

  protected formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      fractionalSecondDigits: 3,
    });
  }

  protected padIdx(n: number): string {
    return String(n).padStart(3, '0');
  }
}
