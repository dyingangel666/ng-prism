import { inject, Injectable, signal } from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { PrismNavigationService } from './prism-navigation.service.js';

@Injectable({ providedIn: 'root' })
export class PrismRendererService {
  private readonly navigationService = inject(PrismNavigationService);

  readonly activeVariantIndex = signal(0);
  readonly inputValues = signal<Record<string, unknown>>({});
  readonly activeContent = signal<string | Record<string, string> | undefined>(undefined);
  readonly renderedElement = signal<Element | null>(null);

  private _lastClassName: string | null = null;

  resetForComponent(comp: RuntimeComponent): void {
    this._lastClassName = comp.meta.className;
    this.activeVariantIndex.set(0);
    this.applyVariant(0, comp);
  }

  reconcileForComponent(comp: RuntimeComponent): void {
    const prev = this._lastClassName;
    this._lastClassName = comp.meta.className;

    if (prev !== comp.meta.className) {
      this.activeVariantIndex.set(0);
      this.applyVariant(0, comp);
      return;
    }

    const variants = comp.meta.showcaseConfig.variants ?? [];
    const maxIndex = Math.max(0, variants.length - 1);
    const preservedIndex = Math.min(this.activeVariantIndex(), maxIndex);
    this.activeVariantIndex.set(preservedIndex);

    const validKeys = new Set(comp.meta.inputs.map((i) => i.name));
    const currentValues = this.inputValues();
    const preserved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(currentValues)) {
      if (validKeys.has(key) || key === '__prismContent__') {
        preserved[key] = value;
      }
    }

    const variant = variants[preservedIndex];
    const variantInputs = variant?.inputs ?? {};
    const merged: Record<string, unknown> = { ...variantInputs, ...preserved };

    if (comp.meta.componentMeta.isDirective && variant?.content && preserved['__prismContent__'] === undefined) {
      merged['__prismContent__'] = typeof variant.content === 'string' ? variant.content : '';
    }

    this.inputValues.set(merged);
    this.activeContent.set(comp.meta.componentMeta.isDirective ? undefined : variant?.content);
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
    const values = { ...reset, ...defaults, ...(variant?.inputs ?? {}) };

    if (comp.meta.componentMeta.isDirective && variant?.content) {
      values['__prismContent__'] = typeof variant.content === 'string' ? variant.content : '';
    }

    this.inputValues.set(values);
    this.activeContent.set(comp.meta.componentMeta.isDirective ? undefined : variant?.content);
  }
}
