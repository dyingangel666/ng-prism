import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismLayoutService } from '../services/prism-layout.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { generateSnippet } from '../renderer/snippet-generator.js';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tokenizeXml(code: string): string {
  const re =
    /(\/\/[^\n]*)|(<\/?[\w-]+)|(\[[\w.]+\]|[\w-]+)=|"([^"]*)"|(\/>|>)|(\n)|([^<\["\n/>=]+|[/=])/g;
  let out = '';
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[1] != null) {
      out += `<span class="tok-com">${esc(m[1])}</span>`;
    } else if (m[2] != null) {
      out += `<span class="tok-tag">${esc(m[2])}</span>`;
    } else if (m[3] != null) {
      out += `<span class="tok-attr">${esc(m[3])}</span>=`;
    } else if (m[4] != null) {
      out += `"<span class="tok-str">${esc(m[4])}</span>"`;
    } else if (m[5] != null) {
      out += `<span class="tok-tag">${esc(m[5])}</span>`;
    } else if (m[6] != null) {
      out += '\n';
    } else {
      out += esc(m[0]);
    }
  }
  return out;
}

@Component({
  selector: 'prism-template-popover',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismIconComponent],
  template: `
    @if (layoutService.templatePopoverVisible()) {
    <div
      class="tpl-popover"
      role="dialog"
      aria-label="Angular template"
      (click)="$event.stopPropagation()"
    >
      <div class="tpl-popover-head">
        <prism-icon name="code" [size]="13" />
        <span>Angular Template</span>
        <button
          class="tpl-popover-copy"
          (click)="copy()"
          [title]="copied() ? 'Copied!' : 'Copy to clipboard'"
        >
          <prism-icon [name]="copied() ? 'shield-check' : 'copy'" [size]="12" />
          {{ copied() ? 'Copied' : 'Copy' }}
        </button>
        <button
          class="tpl-popover-close"
          (click)="layoutService.closeTemplatePopover()"
          aria-label="Close"
          title="Close (Esc)"
        >
          <prism-icon name="x" [size]="13" />
        </button>
      </div>
      <pre class="tpl-popover-body" [innerHTML]="highlighted()"></pre>
    </div>
    }
  `,
  styles: `
    :host { display: contents; }

    .tpl-popover {
      position: absolute;
      right: 20px;
      top: 8px;
      width: 520px;
      max-width: calc(100% - 40px);
      max-height: min(420px, calc(100% - 16px));
      background: var(--prism-bg-elevated);
      border: 1px solid var(--prism-border-strong);
      border-radius: var(--radius-lg, 10px);
      box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.45),
        0 0 0 1px color-mix(in srgb, var(--prism-primary) 10%, transparent);
      display: flex;
      flex-direction: column;
      z-index: 30;
      overflow: hidden;
      animation: tpl-fade-in var(--dur-fast, 0.15s) var(--ease-default, ease-out);
    }

    @keyframes tpl-fade-in {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .tpl-popover-head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px 0 16px;
      height: 40px;
      border-bottom: 1px solid var(--prism-border);
      background: linear-gradient(
        180deg,
        var(--prism-bg-surface),
        var(--prism-bg-elevated)
      );
      flex-shrink: 0;
    }
    .tpl-popover-head > prism-icon {
      color: var(--prism-text-muted);
    }
    .tpl-popover-head > span {
      flex: 1;
      font-size: var(--fs-xs);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--prism-text-2);
    }

    .tpl-popover-copy {
      height: 26px;
      padding: 0 10px;
      font-size: var(--fs-sm);
      font-family: var(--font-sans);
      font-weight: 500;
      color: var(--prism-primary);
      background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--prism-primary) 25%, transparent);
      border-radius: var(--radius-sm, 5px);
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      transition: background var(--dur-fast);
    }
    .tpl-popover-copy:hover {
      background: color-mix(in srgb, var(--prism-primary) 20%, transparent);
    }

    .tpl-popover-close {
      width: 26px;
      height: 26px;
      display: grid;
      place-items: center;
      border-radius: var(--radius-sm, 5px);
      color: var(--prism-text-muted);
      background: transparent;
      border: 0;
      cursor: pointer;
      transition: background var(--dur-fast), color var(--dur-fast);
    }
    .tpl-popover-close:hover {
      color: var(--prism-text);
      background: var(--prism-input-bg);
    }

    .tpl-popover-body {
      margin: 0;
      padding: 14px 18px;
      font-family: var(--font-mono);
      font-size: var(--fs-md);
      line-height: 1.7;
      color: var(--prism-text-2);
      overflow: auto;
      background: var(--prism-bg);
      flex: 1;
      min-height: 0;
      white-space: pre;
    }
    .tpl-popover-body::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .tpl-popover-body::-webkit-scrollbar-thumb {
      background: var(--prism-border-strong);
      border-radius: 3px;
    }

    :host ::ng-deep .tok-tag { color: var(--prism-code-tag); }
    :host ::ng-deep .tok-attr { color: var(--prism-code-attr); }
    :host ::ng-deep .tok-str { color: var(--prism-code-str); }
    :host ::ng-deep .tok-com { color: var(--prism-code-com); font-style: italic; }
  `,
})
export class PrismTemplatePopoverComponent {
  private readonly navigationService = inject(PrismNavigationService);
  private readonly rendererService = inject(PrismRendererService);
  protected readonly layoutService = inject(PrismLayoutService);

  protected readonly copied = signal(false);
  private copiedResetTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly snippet = computed(() => {
    const comp = this.navigationService.activeComponent();
    if (!comp) return '';
    const variant =
      comp.meta.showcaseConfig.variants?.[
        this.rendererService.activeVariantIndex()
      ];
    const explicitKeys = variant?.inputs
      ? new Set(Object.keys(variant.inputs))
      : undefined;
    const directiveOptions = comp.meta.componentMeta.isDirective
      ? { host: comp.meta.showcaseConfig.host }
      : undefined;
    return generateSnippet(
      comp.meta.componentMeta.selector,
      comp.meta.inputs,
      this.rendererService.inputValues(),
      explicitKeys,
      this.rendererService.activeContent(),
      directiveOptions
    );
  });

  protected readonly highlighted = computed(() => {
    const code = this.snippet();
    if (!code) return '';
    return tokenizeXml(code);
  });

  protected copy(): void {
    const code = this.snippet();
    if (!code) return;
    navigator.clipboard?.writeText(code);
    this.copied.set(true);
    if (this.copiedResetTimer) clearTimeout(this.copiedResetTimer);
    this.copiedResetTimer = setTimeout(() => this.copied.set(false), 1500);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.layoutService.templatePopoverVisible()) {
      this.layoutService.closeTemplatePopover();
    }
  }
}
