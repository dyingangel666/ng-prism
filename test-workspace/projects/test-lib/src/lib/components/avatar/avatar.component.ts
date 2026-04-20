import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

export type AvatarSizeType = 'sm' | 'md' | 'lg';

/**
 * Displays a user avatar with image, initials fallback, or placeholder icon.
 * @since 1.0.0
 */
@Showcase({
  title: 'Avatar',
  category: 'Components / Data Display',
  description: 'User avatar with image source, initials fallback, and size variants.',
  variants: [
    { name: 'Initials Small', inputs: { name: 'John Doe', size: 'sm' } },
    { name: 'Initials Medium', inputs: { name: 'Jane Smith', size: 'md' } },
    { name: 'Initials Large', inputs: { name: 'Alex P.', size: 'lg' } },
    { name: 'Placeholder', inputs: { size: 'md' } },
  ],
  tags: ['display', 'avatar', 'user', 'profile'],
})
@Component({
  selector: 'sg-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sg-avatar',
    '[attr.data-size]': 'size()',
  },
  template: `
    @if (src()) {
      <img class="sg-avatar__img" [src]="src()" [alt]="name() || 'Avatar'" />
    } @else if (initials()) {
      <span class="sg-avatar__initials">{{ initials() }}</span>
    } @else {
      <svg class="sg-avatar__placeholder" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    }
  `,
  styles: `
    .sg-avatar {
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 50%; background: #e5e7eb; color: #6b7280;
      overflow: hidden; flex-shrink: 0;
    }
    .sg-avatar[data-size="sm"] { width: 28px; height: 28px; font-size: 11px; }
    .sg-avatar[data-size="md"] { width: 36px; height: 36px; font-size: 13px; }
    .sg-avatar[data-size="lg"] { width: 48px; height: 48px; font-size: 16px; }
    .sg-avatar__img { width: 100%; height: 100%; object-fit: cover; }
    .sg-avatar__initials { font-weight: 600; text-transform: uppercase; color: #4b5563; }
    .sg-avatar__placeholder { width: 60%; height: 60%; color: #9ca3af; }
  `,
})
export class AvatarComponent {
  readonly src = input<string>('');
  readonly name = input<string>('');
  readonly size = input<AvatarSizeType>('md');

  protected readonly initials = computed(() => {
    const n = this.name();
    if (!n) return '';
    return n.split(' ').map((p) => p[0]).join('').slice(0, 2);
  });

  /** Returns the computed initials string based on the name input. */
  getInitials(): string {
    return this.initials();
  }
}
