import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, input } from '@angular/core';
import { ICON_NAMES, ICONS } from './icon-registry.js';

// Re-exported for existing consumers of this module. The registry itself
// lives in `icon-registry.js`, a dependency-free module, so a plugin barrel
// can re-export `ICON_NAMES` without dragging this `@Component` class (and
// `@angular/core`) into a module graph the builder evaluates in Node.js.
export { ICON_NAMES };

const SVG_NS = 'http://www.w3.org/2000/svg';

const warnedIcons = new Set<string>();

/**
 * The glyph markup for `name`, or `undefined` when the registry has no entry.
 *
 * A miss is warned about rather than passed over, because the symptom is
 * invisible: the `<svg>` is still built at the right size, so a missing entry
 * renders as a correctly-spaced blank and reads like a CSS bug. Plugins declare
 * `icon` as a free-form string and are compiled separately from this registry,
 * so no other check catches the typo. The visual regression panel once shipped
 * with a blank tab icon this way.
 *
 * Warned once per name: an icon on a panel tab re-renders constantly.
 */
export function resolveIcon(name: string): string | undefined {
    const content = ICONS[name];

    if (content === undefined && !warnedIcons.has(name)) {
        warnedIcons.add(name);
        console.warn(`[ng-prism] Unknown icon "${name}", rendering an empty glyph. Available: ${ICON_NAMES.join(', ')}.`);
    }
    return content;
}

@Component({
    selector: 'prism-icon',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-icon.component.html',
    styleUrl: './prism-icon.component.css'
})
export class PrismIconComponent {
    readonly name = input.required<string>();
    readonly size = input(16);

    private readonly el = inject(ElementRef<HTMLElement>);

    constructor() {
        effect(() => {
            const iconName = this.name();
            const iconSize = this.size();
            const content = resolveIcon(iconName) ?? '';
            const host = this.el.nativeElement;

            host.innerHTML = '';

            const svg = document.createElementNS(SVG_NS, 'svg');

            svg.setAttribute('width', String(iconSize));
            svg.setAttribute('height', String(iconSize));
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '2');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');

            const temp = document.createElementNS(SVG_NS, 'svg');

            temp.innerHTML = content;
            while (temp.firstChild) {
                svg.appendChild(temp.firstChild);
            }

            host.appendChild(svg);
        });
    }
}
