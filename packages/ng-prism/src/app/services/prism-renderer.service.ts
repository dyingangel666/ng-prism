import { inject, Injectable, signal } from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { PrismNavigationService } from './prism-navigation.service.js';

@Injectable({ providedIn: 'root' })
export class PrismRendererService {
  private readonly navigationService = inject(PrismNavigationService);

  readonly activeVariantIndex = signal(0);
  readonly inputValues = signal<Record<string, unknown>>({});
  readonly renderedElement = signal<Element | null>(null);

  resetForComponent(comp: RuntimeComponent): void {
    this.activeVariantIndex.set(0);
    this.applyVariant(0, comp);
  }

  selectVariant(index: number): void {
    this.activeVariantIndex.set(index);
    const comp = this.navigationService.activeComponent();
    if (comp) this.applyVariant(index, comp);
  }

  updateInput(name: string, value: unknown): void {
    this.inputValues.update((prev) => ({ ...prev, [name]: value }));
  }

  private applyVariant(index: number, comp: RuntimeComponent): void {
    const defaults: Record<string, unknown> = {};
    for (const input of comp.meta.inputs) {
      if (input.defaultValue !== undefined) {
        defaults[input.name] = input.defaultValue;
      }
    }

    const requiredInputNames = new Set(
      comp.meta.inputs.filter((i) => i.required).map((i) => i.name),
    );

    const reset: Record<string, unknown> = {};
    for (const v of comp.meta.showcaseConfig.variants ?? []) {
      for (const key of Object.keys(v.inputs ?? {})) {
        if (!requiredInputNames.has(key) && !(key in reset)) {
          reset[key] = undefined;
        }
      }
    }

    const variant = comp.meta.showcaseConfig.variants?.[index];
    this.inputValues.set({ ...reset, ...defaults, ...(variant?.inputs ?? {}) });
  }
}
