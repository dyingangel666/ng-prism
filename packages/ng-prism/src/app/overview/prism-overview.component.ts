import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { PrismOverviewCellComponent } from './prism-overview-cell.component.js';

/**
 * All variants of one component at once — a contact sheet rather than a
 * viewfinder.
 *
 * Deliberately without controls of any kind: columns follow the window, and
 * everything else a cell shows is what the variant itself declared.
 */
@Component({
  selector: 'prism-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismOverviewCellComponent],
  template: `
    @if (activeComponent(); as component) {
    <div class="prism-overview" role="list">
      @for (_ of variants(); track $index) {
      <prism-overview-cell [component]="component" [index]="$index" />
      }
    </div>
    }
  `,
  styles: `
    :host { display: block; }

    .prism-overview {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--sp-4);
      padding: var(--sp-6);
      align-content: start;
    }
  `,
})
export class PrismOverviewComponent {
  /** Input name fixed by `prism-view-panel-host`, which feeds every view panel. */
  readonly activeComponent = input<RuntimeComponent | null>(null);

  protected readonly variants = computed(
    () => this.activeComponent()?.meta.showcaseConfig.variants ?? []
  );
}
