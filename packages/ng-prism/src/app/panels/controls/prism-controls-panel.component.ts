import { NgComponentOutlet } from '@angular/common';
import { Component, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { BooleanControlComponent } from '../../controls/boolean-control.component.js';
import { JsonControlComponent } from '../../controls/json-control.component.js';
import { NumberControlComponent } from '../../controls/number-control.component.js';
import { StringControlComponent } from '../../controls/string-control.component.js';
import { UnionControlComponent } from '../../controls/union-control.component.js';
import type {
  ControlDefinition,
  InputMeta,
  RuntimeComponent,
} from '../../../plugin/plugin.types.js';
import { PrismNavigationService } from '../../services/prism-navigation.service.js';
import { PrismPluginService } from '../../services/prism-plugin.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';

@Component({
  selector: 'prism-controls-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgComponentOutlet,
    BooleanControlComponent,
    StringControlComponent,
    NumberControlComponent,
    UnionControlComponent,
    JsonControlComponent,
  ],
  template: `
    @if (navigationService.activeComponent(); as comp) {
    <div class="ctl-panel">
      @if (rendererService.dirtyInputCount(); as dirtyCount) {
      <div class="ctl-toolbar">
        <span class="ctl-dirty-info">
          <span class="ctl-dirty-dot" aria-hidden="true"></span>
          {{ dirtyCount }} {{ dirtyCount === 1 ? 'input' : 'inputs' }} modified
        </span>
        <button
          type="button"
          class="ctl-reset-btn"
          (click)="rendererService.resetInputsToVariantDefaults()"
          title="Reset all inputs to variant defaults"
        >
          <span aria-hidden="true">&#x21BB;</span> Reset
        </button>
      </div>
      }
      @for (input of comp.meta.inputs; track input.name) {
      <div class="ctl-row">
        @if (getCustomControl(input); as customCtrl) {
        <ng-container
          [ngComponentOutlet]="customCtrl.component"
          [ngComponentOutletInputs]="{
            inputMeta: input,
            rendererService: rendererService
          }"
        />
        } @else {
        <div class="ctl-label">
          <span class="ctl-name">{{ input.name }}</span>
          <span class="ctl-type"
            ><b>{{ input.rawType ?? input.type }}</b></span
          >
        </div>
        <div class="ctl-input">
          @switch (input.type) { @case ('boolean') {
          <prism-boolean-control
            [value]="asBoolean(rendererService.inputValues()[input.name])"
            (valueChange)="rendererService.updateInput(input.name, $event)"
          />
          } @case ('number') {
          <prism-number-control
            [value]="asNumber(rendererService.inputValues()[input.name])"
            (valueChange)="rendererService.updateInput(input.name, $event)"
          />
          } @case ('union') {
          <prism-union-control
            [value]="asString(rendererService.inputValues()[input.name])"
            [options]="input.values ?? []"
            (valueChange)="rendererService.updateInput(input.name, $event)"
          />
          } @case ('string') {
          <prism-string-control
            [value]="asString(rendererService.inputValues()[input.name])"
            (valueChange)="rendererService.updateInput(input.name, $event)"
          />
          } @default {
          <prism-json-control
            [value]="rendererService.inputValues()[input.name]"
            (valueChange)="rendererService.updateInput(input.name, $event)"
          />
          } }
        </div>
        }
      </div>
      } @if (comp.meta.inputs.length === 0) {
      <p class="ctl-empty">No inputs available</p>
      }
    </div>
    }
  `,
  styles: `
    .ctl-panel {
      overflow-y: auto;
      height: 100%;
    }

    .ctl-toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 20px;
      background: var(--prism-bg-elevated);
      border-bottom: 1px solid var(--prism-border);
    }
    .ctl-dirty-info {
      font-size: 11.5px;
      font-family: var(--font-mono);
      color: var(--prism-text-muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .ctl-dirty-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--prism-primary);
      box-shadow: 0 0 6px color-mix(in srgb, var(--prism-primary) 60%, transparent);
    }
    .ctl-reset-btn {
      height: 24px;
      padding: 0 10px;
      border-radius: 5px;
      font-size: 11.5px;
      font-weight: 500;
      font-family: var(--font-sans);
      color: var(--prism-text-muted);
      background: transparent;
      border: 1px solid var(--prism-border);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: color var(--dur-fast), background var(--dur-fast), border-color var(--dur-fast);
    }
    .ctl-reset-btn:hover {
      color: var(--prism-text);
      border-color: color-mix(in srgb, var(--prism-primary) 40%, var(--prism-border));
      background: color-mix(in srgb, var(--prism-primary) 8%, transparent);
    }
    .ctl-reset-btn:focus-visible {
      outline: 2px solid var(--prism-primary);
      outline-offset: 1px;
    }

    .ctl-row {
      display: grid;
      grid-template-columns: 180px 1fr;
      align-items: center;
      gap: 12px;
      padding: 8px 20px;
      min-height: 40px;
      border-bottom: 1px solid var(--prism-border);
    }
    .ctl-row:hover {
      background: color-mix(in srgb, var(--prism-primary) 3%, transparent);
    }

    .ctl-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ctl-name {
      font-size: 13px;
      color: var(--prism-text);
      font-weight: 500;
    }
    .ctl-type {
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--prism-text-ghost);
    }
    .ctl-type b {
      color: var(--prism-primary);
      font-weight: 500;
    }

    .ctl-input {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .ctl-empty {
      color: var(--prism-text-ghost);
      font-size: 13px;
      margin: 0;
      padding: 16px 20px;
    }
  `,
})
export class PrismControlsPanelComponent {
  protected readonly navigationService = inject(PrismNavigationService);
  protected readonly rendererService = inject(PrismRendererService);
  private readonly pluginService = inject(PrismPluginService);

  readonly activeComponent = input<RuntimeComponent | null>(null);

  protected getCustomControl(input: InputMeta): ControlDefinition | null {
    return (
      this.pluginService.controls().find((ctrl) => ctrl.matchType(input)) ??
      null
    );
  }

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
