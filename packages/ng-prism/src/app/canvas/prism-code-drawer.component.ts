import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
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
  selector: 'prism-code-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismIconComponent],
  template: `
    <div class="code-drawer" [class.is-collapsed]="collapsed()">
      <div class="code-head" (click)="collapsed.update(v => !v)">
        <prism-icon name="chevron-down" [size]="12" class="chev" />
        <prism-icon name="copy" [size]="12" />
        <span>Angular Template</span>
        <div class="code-head-actions">
          <button class="mini" (click)="copy($event)" title="Copy to clipboard">
            <prism-icon name="copy" [size]="11" />
            Copy
          </button>
        </div>
      </div>
      <pre class="code-body" [innerHTML]="highlighted()"></pre>
    </div>
  `,
  styles: `
    .code-drawer {
      border-top: 1px solid var(--prism-border);
      background: var(--prism-bg);
      max-height: 260px;
      transition: max-height 0.25s var(--ease-default), opacity var(--dur-base);
      overflow: hidden;
    }
    .code-drawer.is-collapsed { max-height: 40px; }
    .code-drawer.is-collapsed .code-body { opacity: 0; }

    .code-head {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding: 0 20px;
      color: var(--prism-text-muted);
      font-size: var(--fs-sm);
      font-weight: 600;
      letter-spacing: 0.04em;
      cursor: pointer;
      border-bottom: 1px solid var(--prism-border);
      background: linear-gradient(180deg, var(--prism-bg-surface), var(--prism-bg));
    }
    .code-head > span:first-of-type {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--prism-text-2);
    }
    .code-head .chev {
      transition: transform var(--dur-fast);
    }
    .is-collapsed .code-head .chev {
      transform: rotate(-90deg);
    }

    .code-head-actions {
      margin-left: auto;
      display: flex;
      gap: 2px;
    }
    .mini {
      height: 22px;
      padding: 0 8px;
      font-size: 10.5px;
      border-radius: 4px;
      color: var(--prism-text-ghost);
      display: flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--font-sans);
    }
    .mini:hover {
      color: var(--prism-text);
      background: var(--prism-input-bg);
    }

    .code-body {
      margin: 0;
      padding: 12px 20px 16px;
      font-family: var(--font-mono);
      font-size: var(--fs-md);
      line-height: 1.7;
      color: var(--prism-text-2);
      overflow-x: auto;
      transition: opacity var(--dur-base);
      background: var(--prism-bg);
      white-space: pre;
    }
    .code-body::-webkit-scrollbar { height: 6px; }
    .code-body::-webkit-scrollbar-thumb { background: var(--prism-border-strong); border-radius: 3px; }

    :host ::ng-deep .tok-tag { color: var(--prism-code-tag); }
    :host ::ng-deep .tok-attr { color: var(--prism-code-attr); }
    :host ::ng-deep .tok-str { color: var(--prism-code-str); }
    :host ::ng-deep .tok-com { color: var(--prism-code-com); font-style: italic; }
  `,
})
export class PrismCodeDrawerComponent {
  private readonly navigationService = inject(PrismNavigationService);
  private readonly rendererService = inject(PrismRendererService);

  protected readonly collapsed = signal(false);

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

  protected copy(e: MouseEvent): void {
    e.stopPropagation();
    const code = this.snippet();
    if (code) navigator.clipboard.writeText(code);
  }
}
