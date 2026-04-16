import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';

function highlightJson(json: string): string {
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*(:)|("(?:\\.|[^"\\])*")|(true|false)|(null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, key, colon, str, bool, nil, num) => {
      if (key && colon) return `<span class="jh-key">${key}</span>${colon}`;
      if (str) return `<span class="jh-string">${str}</span>`;
      if (bool) return `<span class="jh-bool">${bool}</span>`;
      if (nil) return `<span class="jh-null">${nil}</span>`;
      if (num) return `<span class="jh-number">${num}</span>`;
      return match;
    },
  );
}

@Component({
  selector: 'prism-json-control',
  standalone: true,
  template: `
    <div class="prism-json-control">
      <div class="prism-json-control__label">
        <span class="prism-json-control__label-text">{{ label() }}</span>
        @if (typeName()) { <code class="prism-json-control__type">{{ typeName() }}</code> }
      </div>
      <div class="prism-json-control__editor">
        <div class="prism-json-control__overlay">
          <pre class="prism-json-control__pre" #preEl><code [innerHTML]="highlightedHtml()"></code></pre>
          <textarea
            #textareaEl
            class="prism-json-control__input"
            [value]="displayText()"
            (input)="onInput($any($event.target).value)"
            (scroll)="syncScroll()"
            spellcheck="false"
          ></textarea>
        </div>
        @if (parseError()) {
          <span class="prism-json-control__error">Invalid JSON</span>
        }
      </div>
    </div>
  `,
  styles: `
    .prism-json-control {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 6px 16px;
      min-height: 36px;
    }

    .prism-json-control__label {
      flex-shrink: 0;
      width: 140px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding-top: 4px;
    }
    .prism-json-control__label-text {
      font-size: 13px;
      font-family: var(--prism-font-sans);
      color: var(--prism-text-muted);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .prism-json-control__type {
      font-size: 10px;
      font-family: var(--prism-font-mono, monospace);
      color: var(--prism-text-ghost);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .prism-json-control__editor {
      flex: 1;
      min-width: 0;
    }

    .prism-json-control__overlay {
      position: relative;
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-sm);
      overflow: hidden;
      transition: border-color 0.15s;
    }
    .prism-json-control__overlay:focus-within {
      border-color: var(--prism-primary);
      box-shadow: 0 0 0 2px var(--prism-glow);
    }

    .prism-json-control__pre,
    .prism-json-control__input {
      margin: 0;
      padding: 4px 8px;
      font-family: var(--prism-font-mono, monospace);
      font-size: 12px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
      tab-size: 2;
    }

    .prism-json-control__pre {
      min-height: 56px;
      pointer-events: none;
    }

    .prism-json-control__pre code {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
    }

    :host ::ng-deep .jh-key { color: #93c5fd; }
    :host ::ng-deep .jh-string { color: #7dd3fc; }
    :host ::ng-deep .jh-number { color: #fbbf24; }
    :host ::ng-deep .jh-bool { color: #a78bfa; }
    :host ::ng-deep .jh-null { color: var(--prism-text-ghost); }

    .prism-json-control__input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      color: transparent;
      caret-color: var(--prism-text);
      border: none;
      resize: none;
      overflow: auto;
      box-sizing: border-box;
    }
    .prism-json-control__input:focus {
      outline: none;
    }
    .prism-json-control__input::selection {
      background: rgba(99, 102, 241, 0.3);
    }

    .prism-json-control__error {
      font-size: 11px;
      color: #ef4444;
      display: block;
      margin-top: 2px;
    }
  `,
})
export class JsonControlComponent {
  readonly value = input<unknown>(null);
  readonly label = input('');
  readonly typeName = input('');
  readonly valueChange = output<unknown>();

  readonly parseError = signal(false);
  readonly localText = signal<string | null>(null);

  private readonly textareaEl = viewChild<ElementRef<HTMLTextAreaElement>>('textareaEl');
  private readonly preEl = viewChild<ElementRef<HTMLPreElement>>('preEl');

  readonly displayText = computed(() => {
    const local = this.localText();
    if (local !== null) return local;
    return this.stringify(this.value());
  });

  readonly highlightedHtml = computed(() => highlightJson(this.displayText()));

  stringify(val: unknown): string {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }

  onInput(raw: string): void {
    this.localText.set(raw);
    try {
      const parsed = JSON.parse(raw);
      this.parseError.set(false);
      this.valueChange.emit(parsed);
    } catch {
      this.parseError.set(true);
    }
  }

  syncScroll(): void {
    const textarea = this.textareaEl()?.nativeElement;
    const pre = this.preEl()?.nativeElement;
    if (textarea && pre) {
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
    }
  }
}
