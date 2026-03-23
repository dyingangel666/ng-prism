import { Component, inject } from '@angular/core';
import { BooleanControlComponent } from '../../controls/boolean-control.component.js';
import { JsonControlComponent } from '../../controls/json-control.component.js';
import { NumberControlComponent } from '../../controls/number-control.component.js';
import { StringControlComponent } from '../../controls/string-control.component.js';
import { UnionControlComponent } from '../../controls/union-control.component.js';
import { PrismNavigationService } from '../../services/prism-navigation.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';

@Component({
  selector: 'prism-controls-panel',
  standalone: true,
  imports: [
    BooleanControlComponent,
    StringControlComponent,
    NumberControlComponent,
    UnionControlComponent,
    JsonControlComponent,
  ],
  template: `
    @if (navigationService.activeComponent(); as comp) {
      <div class="prism-controls-panel">
        @for (input of comp.meta.inputs; track input.name) {
          <div class="prism-controls-panel__row">
            @switch (input.type) {
              @case ('boolean') {
                <prism-boolean-control
                  [value]="asBoolean(rendererService.inputValues()[input.name])"
                  [label]="input.name"
                  [typeName]="input.rawType ?? ''"
                  (valueChange)="rendererService.updateInput(input.name, $event)"
                />
              }
              @case ('number') {
                <prism-number-control
                  [value]="asNumber(rendererService.inputValues()[input.name])"
                  [label]="input.name"
                  [typeName]="input.rawType ?? ''"
                  (valueChange)="rendererService.updateInput(input.name, $event)"
                />
              }
              @case ('union') {
                <prism-union-control
                  [value]="asString(rendererService.inputValues()[input.name])"
                  [label]="input.name"
                  [typeName]="input.rawType ?? ''"
                  [options]="input.values ?? []"
                  (valueChange)="rendererService.updateInput(input.name, $event)"
                />
              }
              @case ('string') {
                <prism-string-control
                  [value]="asString(rendererService.inputValues()[input.name])"
                  [label]="input.name"
                  [typeName]="input.rawType ?? ''"
                  (valueChange)="rendererService.updateInput(input.name, $event)"
                />
              }
              @default {
                <prism-json-control
                  [value]="rendererService.inputValues()[input.name]"
                  [label]="input.name"
                  [typeName]="input.rawType ?? ''"
                  (valueChange)="rendererService.updateInput(input.name, $event)"
                />
              }
            }
          </div>
        }
        @if (comp.meta.inputs.length === 0) {
          <p class="prism-controls-panel__empty">No inputs available</p>
        }
      </div>
    }
  `,
  styles: `
    .prism-controls-panel {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      height: 100%;
    }

    .prism-controls-panel__row {
      border-bottom: 1px solid var(--prism-border);
    }

    .prism-controls-panel__row:last-child { border-bottom: none; }

    .prism-controls-panel__empty {
      color: var(--prism-text-ghost);
      font-size: 13px;
      font-family: var(--prism-font-sans);
      margin: 0;
      padding: 16px;
    }
  `,
})
export class PrismControlsPanelComponent {
  protected readonly navigationService = inject(PrismNavigationService);
  protected readonly rendererService = inject(PrismRendererService);

  protected asBoolean(val: unknown): boolean {
    return Boolean(val);
  }

  protected asNumber(val: unknown): number {
    return Number(val) || 0;
  }

  protected asString(val: unknown): string {
    return String(val ?? '');
  }
}
