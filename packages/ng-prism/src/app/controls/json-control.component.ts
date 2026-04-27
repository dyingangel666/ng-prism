import { Component, ChangeDetectionStrategy, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="json-editor">
      <div class="json-overlay">
        <pre class="json-pre" #preEl><code [innerHTML]="highlightedHtml()"></code></pre>
        <textarea
          #textareaEl
          class="json-input"
          [value]="displayText()"
          (input)="onInput($any($event.target).value)"
          (scroll)="syncScroll()"
          spellcheck="false"
        ></textarea>
      </div>
      @if (parseError()) {
        <span class="json-error">Invalid JSON</span>
      }
    </div>
  `,
  styles: `
    .json-editor { flex: 1; min-width: 0; }

    .json-overlay {
      position: relative;
      border: 1px solid var(--prism-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      transition: border-color var(--dur-fast);
    }
    .json-overlay:focus-within {
      border-color: var(--prism-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--prism-primary) 30%, transparent);
    }

    .json-pre, .json-input {
      margin: 0;
      padding: 4px 8px;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
      tab-size: 2;
    }

    .json-pre {
      min-height: 56px;
      pointer-events: none;
    }
    .json-pre code { font-family: inherit; }

    :host ::ng-deep .jh-key { color: #93c5fd; }
    :host ::ng-deep .jh-string { color: #86efac; }
    :host ::ng-deep .jh-number { color: #fbbf24; }
    :host ::ng-deep .jh-bool { color: #a78bfa; }
    :host ::ng-deep .jh-null { color: var(--prism-text-ghost); }

    .json-input {
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
    .json-input:focus { outline: none; }
    .json-input::selection { background: rgba(99, 102, 241, 0.3); }

    .json-error {
      font-size: 11px;
      color: var(--prism-danger);
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
