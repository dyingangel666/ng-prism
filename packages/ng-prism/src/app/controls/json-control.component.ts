import {
  Component,
  ChangeDetectionStrategy,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export function highlightJson(json: unknown): string {
  if (typeof json !== 'string') return '';
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*(:)|("(?:\\.|[^"\\])*")|(true|false)|(null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, key, colon, str, bool, nil, num) => {
      if (key && colon) return `<span class="jh-key">${key}</span>${colon}`;
      if (str) return `<span class="jh-string">${str}</span>`;
      if (bool) return `<span class="jh-bool">${bool}</span>`;
      if (nil) return `<span class="jh-null">${nil}</span>`;
      if (num) return `<span class="jh-number">${num}</span>`;
      return match;
    }
  );
}

export function stringifyForJsonControl(val: unknown): string {
  try {
    const serialized = JSON.stringify(val, null, 2);
    // JSON.stringify returns `undefined` (the value, not a string) for
    // `undefined`, functions, and symbols. Surface that as visible text so the
    // textarea + highlighter never see a non-string.
    return serialized ?? 'undefined';
  } catch {
    return String(val);
  }
}

@Component({
  selector: 'prism-json-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './json-control.component.html',
  styleUrl: './json-control.component.css',
})
export class JsonControlComponent {
  readonly value = input<unknown>(null);
  readonly label = input('');
  readonly typeName = input('');
  readonly valueChange = output<unknown>();

  readonly parseError = signal(false);
  readonly localText = signal<string | null>(null);

  private readonly textareaEl =
    viewChild<ElementRef<HTMLTextAreaElement>>('textareaEl');
  private readonly preEl = viewChild<ElementRef<HTMLPreElement>>('preEl');

  readonly displayText = computed(() => {
    const local = this.localText();
    if (local !== null) return local;
    return stringifyForJsonControl(this.value());
  });

  readonly highlightedHtml = computed(() => highlightJson(this.displayText()));

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
