import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

interface ShowcaseConfig {
  title: string;
  description?: string;
  category?: string;
  variants?: { name: string; inputs?: Record<string, unknown>; description?: string }[];
  tags?: string[];
  meta?: Record<string, unknown>;
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
  return () => {};
}

export type ButtonVariant = 'filled' | 'outlined' | 'elevated' | 'text' | 'icon-only';

@Showcase({
  title: 'Button',
  category: 'Inputs',
  description: 'Flexible button with five visual variants.',
  meta: { figma: 'https://www.figma.com/file/LbcvMJxDtshDmYtdyfJfkA72/storybook-addon-figma' },
  variants: [
    { name: 'Filled', inputs: { variant: 'filled', label: 'Filled' } },
    { name: 'Outlined', inputs: { variant: 'outlined', label: 'Outlined' } },
    { name: 'Elevated', inputs: { variant: 'elevated', label: 'Elevated' } },
    { name: 'Text', inputs: { variant: 'text', label: 'Text' } },
    { name: 'Icon Only', inputs: { variant: 'icon-only', icon: '★' } },
    {
      name: 'Disabled',
      inputs: { variant: 'filled', label: 'Disabled', disabled: true },
    },
    {
      name: 'Readonly',
      inputs: { variant: 'filled', label: 'Readonly', readonly: true },
    },
  ],
  tags: ['form', 'action', 'button'],
})
@Component({
  selector: 'lib-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="btn"
      [class]="'btn--' + variant()"
      [disabled]="disabled() || null"
      (click)="clicked.emit()"
    >
      @if (variant() === 'icon-only') {
      <span class="btn__icon" aria-hidden="true">{{ icon() }}</span>
      } @else {
      {{ label() }}
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-block;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      line-height: 1;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      outline: none;
      transition: background 120ms ease, box-shadow 120ms ease, color 120ms ease;
      white-space: nowrap;
    }

    .btn:focus-visible {
      outline: 2px solid #6366f1;
      outline-offset: 2px;
    }

    .btn:disabled {
      cursor: not-allowed;
      opacity: 0.45;
      pointer-events: none;
    }

    /* filled */
    .btn--filled {
      padding: 10px 20px;
      background: #6366f1;
      color: #fff;
    }
    .btn--filled:hover:not(:disabled) {
      background: #4f46e5;
    }
    .btn--filled:active:not(:disabled) {
      background: #4338ca;
    }

    /* outlined */
    .btn--outlined {
      padding: 9px 19px;
      background: transparent;
      color: #6366f1;
      border: 1px solid #6366f1;
    }
    .btn--outlined:hover:not(:disabled) {
      background: #eef2ff;
    }
    .btn--outlined:active:not(:disabled) {
      background: #e0e7ff;
    }

    /* elevated */
    .btn--elevated {
      padding: 10px 20px;
      background: #fff;
      color: #6366f1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);
    }
    .btn--elevated:hover:not(:disabled) {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.14), 0 2px 4px rgba(0, 0, 0, 0.08);
      background: #f8f8ff;
    }
    .btn--elevated:active:not(:disabled) {
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    /* text */
    .btn--text {
      padding: 10px 12px;
      background: transparent;
      color: #6366f1;
    }
    .btn--text:hover:not(:disabled) {
      background: #eef2ff;
    }
    .btn--text:active:not(:disabled) {
      background: #e0e7ff;
    }

    /* icon-only */
    .btn--icon-only {
      width: 40px;
      height: 40px;
      padding: 0;
      border-radius: 50%;
      background: #6366f1;
      color: #fff;
      font-size: 16px;
    }
    .btn--icon-only:hover:not(:disabled) {
      background: #4f46e5;
    }
    .btn--icon-only:active:not(:disabled) {
      background: #4338ca;
    }

    .btn__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
  `,
})
export class ButtonComponent {
  /** Visual style variant */
  readonly variant = input<ButtonVariant>('filled');

  /** Button label text (not used for icon-only) */
  readonly label = input<string>('Button');

  /** Icon character for icon-only variant */
  readonly icon = input<string>('★');

  /** Whether the button is disabled */
  readonly disabled = input<boolean>(false);

  /** Whether the button is disabled */
  readonly readonly = input<boolean>(false);

  /** Emits when the button is clicked */
  readonly clicked = output<void>();
}
