import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
  type Type,
} from '@angular/core';
import type { HeaderWidgetDefinition } from '../../plugin/plugin.types.js';

const lazyCache = new Map<string, Type<unknown>>();

@Component({
  selector: 'prism-header-widget-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    @if (resolved(); as comp) {
    <ng-container *ngComponentOutlet="comp" />
    }
  `,
  styles: `
    :host { display: contents; }
  `,
})
export class PrismHeaderWidgetHostComponent {
  readonly widget = input.required<HeaderWidgetDefinition>();

  protected readonly resolved = signal<Type<unknown> | null>(null);

  constructor() {
    effect(() => {
      const w = this.widget();
      if (w.component) {
        this.resolved.set(w.component);
        return;
      }
      if (!w.loadComponent) {
        this.resolved.set(null);
        return;
      }
      const cached = lazyCache.get(w.id);
      if (cached) {
        this.resolved.set(cached);
        return;
      }
      this.resolved.set(null);
      w.loadComponent().then((comp) => {
        lazyCache.set(w.id, comp);
        if (this.widget().id === w.id) {
          this.resolved.set(comp);
        }
      });
    });
  }
}
