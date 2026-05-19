import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatFormFieldModule } from "@angular/material/form-field";
import { OverlayModule } from "@angular/cdk/overlay";
import { Showcase } from "@ng-prism/core";

@Showcase({
  title: "FormField",
  category: "Components",
  description: "FormFieldComponent from test-ui-kit/form-field secondary entry point.",
  variants: [
    { name: "Default", inputs: { label: "FormField" } },
  ],
})
@Component({
  selector: "uk-form-field",
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class FormFieldComponent {
  readonly label = input<string>("FormField");
}
