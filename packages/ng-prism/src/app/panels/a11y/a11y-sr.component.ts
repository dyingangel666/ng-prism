import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { A11ySrService } from './a11y-sr.service.js';
import { A11yPerspectiveService } from './a11y-perspective.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';
import type { SrAnnouncement } from './a11y.types.js';

@Component({
  selector: 'prism-a11y-sr',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-a11y-sr">
      <div class="prism-a11y-sr__perspective">
        <button
          class="prism-a11y-sr__persp-btn"
          [class.prism-a11y-sr__persp-btn--active]="perspective.mode() === 'visual'"
          (click)="perspective.mode.set('visual')"
        >
          👁 Visual
        </button>
        <button
          class="prism-a11y-sr__persp-btn prism-a11y-sr__persp-btn--sr"
          [class.prism-a11y-sr__persp-btn--active]="perspective.mode() === 'screen-reader'"
          (click)="perspective.mode.set('screen-reader')"
        >
          🎧 Screen Reader
        </button>
      </div>

      @if (!rendererService.renderedElement()) {
        <div class="prism-a11y-sr__empty">Select a component to simulate screen reader output.</div>
      } @else if (!announcements().length) {
        <div class="prism-a11y-sr__empty">No announced elements found.</div>
      } @else if (perspective.mode() === 'screen-reader') {
        <div class="prism-a11y-sr__player">
          <div class="prism-a11y-sr__player-card">
            <div class="prism-a11y-sr__player-counter">
              {{ activeIndex() + 1 }} / {{ announcements().length }}
            </div>
            <div class="prism-a11y-sr__player-name">
              @if (active()?.name) { "{{ active()?.name }}" }
            </div>
            <div class="prism-a11y-sr__player-role">{{ active()?.role }}</div>
            @if (activeStates().length) {
              <div class="prism-a11y-sr__player-states">
                @for (s of activeStates(); track s) { <span>{{ s }}</span> }
              </div>
            }
          </div>
          <div class="prism-a11y-sr__nav-btns">
            <button class="prism-a11y-sr__nav-btn" (click)="prev()" [disabled]="activeIndex() === 0">◀</button>
            <button class="prism-a11y-sr__nav-btn" (click)="next()" [disabled]="activeIndex() === announcements().length - 1">▶</button>
          </div>
          <div class="prism-a11y-sr__dots">
            @for (a of announcements(); track a.index; let i = $index) {
              <div
                class="prism-a11y-sr__dot"
                [class.prism-a11y-sr__dot--active]="i === activeIndex()"
                (click)="activeIndex.set(i)"
              ></div>
            }
          </div>
        </div>
      } @else {
        <div class="prism-a11y-sr__header">
          <span>{{ announcements().length }} Announcements</span>
        </div>
        <div class="prism-a11y-sr__list">
          @for (a of announcements(); track a.index) {
            <div
              class="prism-a11y-sr__item"
              [class.prism-a11y-sr__item--active]="a.index === activeIndex() + 1"
              (click)="activeIndex.set(a.index - 1)"
            >
              <div class="prism-a11y-sr__idx">{{ a.index }}</div>
              <div class="prism-a11y-sr__text-wrap">
                <span class="prism-a11y-sr__announcement">{{ a.text }}</span>
                <span class="prism-a11y-sr__role-label">{{ a.role }}</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; }

    .prism-a11y-sr { display: flex; flex-direction: column; height: 100%; }

    .prism-a11y-sr__perspective {
      display: flex;
      gap: 2px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--prism-border);
      flex-shrink: 0;
    }
    .prism-a11y-sr__persp-btn {
      padding: 4px 12px;
      font-size: 12px;
      font-family: var(--prism-font-sans, system-ui, sans-serif);
      border: 1px solid var(--prism-border);
      background: none;
      color: var(--prism-text-muted);
      cursor: pointer;
      border-radius: 5px;
      transition: all 0.12s;
    }
    .prism-a11y-sr__persp-btn:hover { color: var(--prism-text-2); }
    .prism-a11y-sr__persp-btn--active {
      background: rgba(124, 159, 236, 0.1);
      border-color: rgba(124, 159, 236, 0.3);
      color: var(--prism-primary);
    }
    .prism-a11y-sr__persp-btn--sr.prism-a11y-sr__persp-btn--active {
      background: rgba(167, 139, 250, 0.1);
      border-color: rgba(167, 139, 250, 0.3);
      color: #a78bfa;
    }

    .prism-a11y-sr__empty {
      display: flex; align-items: center; justify-content: center;
      min-height: 100px; color: var(--prism-text-muted); font-size: 13px;
    }

    /* ── List mode ── */
    .prism-a11y-sr__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid var(--prism-border);
      font-size: 12px;
      color: var(--prism-text-muted);
      flex-shrink: 0;
    }

    .prism-a11y-sr__hint {
      font-size: 11px;
      color: #a78bfa;
      cursor: default;
    }

    .prism-a11y-sr__list { flex: 1; overflow: auto; }

    .prism-a11y-sr__item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 16px;
      border-bottom: 1px solid var(--prism-border);
      cursor: pointer;
      transition: background 0.1s;
    }
    .prism-a11y-sr__item:hover { background: rgba(167, 139, 250, 0.04); }
    .prism-a11y-sr__item--active { background: rgba(167, 139, 250, 0.08); }

    .prism-a11y-sr__idx {
      width: 18px; height: 18px;
      background: #a78bfa;
      color: white;
      border-radius: 9px;
      font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 2px;
      font-family: var(--prism-font-sans, system-ui, sans-serif);
    }
    .prism-a11y-sr__item--active .prism-a11y-sr__idx {
      box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.3);
    }

    .prism-a11y-sr__text-wrap {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .prism-a11y-sr__announcement {
      font-size: 12.5px;
      color: var(--prism-text);
      font-style: italic;
      line-height: 1.4;
    }
    .prism-a11y-sr__role-label {
      font-size: 11px;
      font-family: var(--prism-font-mono, monospace);
      color: var(--prism-text-muted);
    }

    /* ── Player mode ── */
    .prism-a11y-sr__player {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex: 1;
      padding: 20px;
    }

    .prism-a11y-sr__player-card {
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-top: 2px solid #a78bfa;
      border-radius: 10px;
      padding: 20px 28px;
      text-align: center;
      min-width: 180px;
    }
    .prism-a11y-sr__player-counter {
      font-size: 11px;
      color: var(--prism-text-muted);
      margin-bottom: 8px;
      font-family: var(--prism-font-mono, monospace);
    }
    .prism-a11y-sr__player-name {
      font-size: 17px;
      font-weight: 600;
      color: var(--prism-text);
      margin-bottom: 4px;
      min-height: 24px;
    }
    .prism-a11y-sr__player-role {
      font-size: 13px;
      color: #a78bfa;
    }
    .prism-a11y-sr__player-states {
      display: flex;
      gap: 5px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .prism-a11y-sr__player-states span {
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      background: color-mix(in srgb, #fbbf24 12%, transparent);
      color: #fbbf24;
      font-family: var(--prism-font-sans, system-ui, sans-serif);
    }

    .prism-a11y-sr__nav-btns { display: flex; gap: 8px; }
    .prism-a11y-sr__nav-btn {
      width: 36px; height: 36px;
      background: rgba(167, 139, 250, 0.1);
      border: 1px solid rgba(167, 139, 250, 0.2);
      border-radius: 6px;
      color: #a78bfa;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.1s;
    }
    .prism-a11y-sr__nav-btn:hover:not(:disabled) { background: rgba(167, 139, 250, 0.18); }
    .prism-a11y-sr__nav-btn:disabled { opacity: 0.3; cursor: default; }

    .prism-a11y-sr__dots {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      justify-content: center;
      max-width: 200px;
    }
    .prism-a11y-sr__dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--prism-text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .prism-a11y-sr__dot--active {
      background: #a78bfa;
      width: 14px;
      border-radius: 3px;
    }
  `,
})
export class A11ySrComponent {
  protected readonly rendererService = inject(PrismRendererService);
  private readonly srService = inject(A11ySrService);
  protected readonly perspective = inject(A11yPerspectiveService);

  readonly activeComponent = input<unknown>(null);

  protected readonly activeIndex = signal(0);

  protected readonly announcements = computed(() => {
    const root = this.rendererService.renderedElement();
    if (!root) return [];
    const doc = (root as HTMLElement).ownerDocument;
    return this.srService.buildAnnouncementList(
      root,
      doc ? (id) => doc.getElementById(id) : undefined,
    );
  });

  protected readonly active = computed((): SrAnnouncement | null => {
    const list = this.announcements();
    const idx = this.activeIndex();
    return list[idx] ?? null;
  });

  protected readonly activeStates = computed(
    () => this.active()?.states.filter((s) => !s.startsWith('level')) ?? [],
  );

  protected next(): void {
    this.activeIndex.update((i) => Math.min(i + 1, this.announcements().length - 1));
  }

  protected prev(): void {
    this.activeIndex.update((i) => Math.max(i - 1, 0));
  }
}
