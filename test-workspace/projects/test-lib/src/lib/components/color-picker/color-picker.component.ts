import { FocusMonitor, FocusOrigin } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
    AfterContentInit,
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    forwardRef,
    inject,
    Injector,
    Input,
    input,
    model,
    OnDestroy,
    output,
    Renderer2,
    ViewChild,
    viewChild,
    ViewEncapsulation
} from '@angular/core';
import { ControlValueAccessor, FormControl, FormsModule, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { Subscription } from 'rxjs';
import { ColorPickerChangeEvent } from './typings/color-picker-change-event';
import { ColorPickerUtils } from './typings/color-picker.utils';
import { ColorPickerColorInterface } from './typings/color.interface';

interface ShowcaseConfig {
    title: string;
    description?: string;
    category?: string;
    variants?: { name: string; inputs?: Record<string, unknown>; description?: string }[];
    tags?: string[];
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
    return () => {};
}

@Showcase({
  title: 'Color Picker',
  category: 'Inputs',
  description:
    'HSV-based color picker with optional alpha channel support and reactive forms integration.',
  variants: [
    { name: 'Default', inputs: { value: '#6366f1' } },
    { name: 'Red', inputs: { value: '#ef4444' } },
    { name: 'With Alpha', inputs: { value: '#6366f180', alphaChannel: true } },
    { name: 'Disabled', inputs: { value: '#6366f1', disabled: true } },
    { name: 'Readonly', inputs: { value: '#8b5cf6', readonly: true } },
  ],
  tags: ['form', 'color', 'picker', 'input'],
})
@Component({
  selector: 'sg-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sg-color-picker',
    '[class.sg-color-picker--disabled]': 'disabled()',
    '[class.sg-color-picker--readonly]': 'readonly()',
    '[class.sg-color-picker--focused]': 'focused',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ColorPickerComponent),
      multi: true,
    },
  ],
  standalone: true,
  imports: [FormsModule, MatMenu, MatMenuTrigger],
})
export class ColorPickerComponent
  implements ControlValueAccessor, AfterViewInit, AfterContentInit, OnDestroy
{
  /**************************************************************************************************************
   * INJECTIONS
   *************************************************************************************************************/

  private readonly _focusMonitor = inject(FocusMonitor);
  private readonly _changeDetectorRef = inject(ChangeDetectorRef);
  private readonly _renderer = inject(Renderer2);
  private readonly _injector = inject(Injector);

  /**************************************************************************************************************
   * VARS
   *************************************************************************************************************/

  protected readonly DEFAULT_COLOR = '#ffffff';

  private readonly _isTouchDevice: number | boolean;
  private readonly _eventStart: string;
  private readonly _eventMove: string;
  private readonly _eventEnd: string;
  private onChange = (_: any) => {};
  private onTouched = () => {};

  private _required = false;
  private _alphaChannel = false;
  private _value: string | undefined;
  private _focused = false;

  private _control: FormControl | undefined;
  private _currentHue: number | undefined;
  private _currentSaturation: number | undefined;
  private _currentValue: number | undefined;
  private _currentAlpha: number | undefined;

  private readonly _windowResizeSubscribtion: Subscription | null | undefined;
  private _keyPressListener: any = null;
  private _saturationAreaMouseMoveListener: any = null;
  private _saturationAreaMouseUpListener: any = null;
  private _hueSliderMouseMoveListener: any = null;
  private _hueSliderMouseUpListener: any = null;
  private _alphaSliderMouseMoveListener: any = null;
  private _alphaSliderMouseUpListener: any = null;

  private _saturationAreaOffsetWidth: number | undefined;
  private _saturationAreaOffsetHeight: number | undefined;
  private _hueSliderOffsetWidth: number | undefined;
  private _alphaSliderOffsetWidth: number | undefined;

  currentColorHsl: ColorPickerColorInterface | undefined;
  currentColorRgb: ColorPickerColorInterface | undefined;
  currentColorHex: ColorPickerColorInterface | undefined;
  currentColorHexNoAlpha: ColorPickerColorInterface | undefined;
  valueNoAlpha: string | undefined;

  saturationHandleXPositionFromLeft = 0;
  saturationHandleYPositionFromTop = 0;
  hueSliderXPositionFromLeft = 0;
  alphaSliderXPositionFromLeft = 0;
  hueSliderColor: string | undefined;
  initialized = false;

  disabled = model<boolean>(false);
  readonly = input<boolean>(false);
  tabIndex = input<number | null>(null);

  readonly changeEvent = output<ColorPickerChangeEvent>();

  readonly _inputElement = viewChild.required<ElementRef>('input');
  readonly _flyoutElement = viewChild.required<MatMenuTrigger>(
    'colorPickerFlyoutTrigger'
  );
  readonly _saturationAreaElement =
    viewChild.required<ElementRef>('saturationArea');
  readonly _hueSliderElement = viewChild.required<ElementRef>('hueSlider');

  private _alphaSliderElement: ElementRef | undefined;
  private _alphaSliderHandleElement: ElementRef | undefined;
  private _debounceTimeout: ReturnType<typeof setTimeout> | undefined;

  @ViewChild('alphaSlider') set alphaSliderElement(
    alphaSliderElement: ElementRef
  ) {
    this._alphaSliderElement = alphaSliderElement;
  }

  @ViewChild('alphaSliderHandle') set alphaSliderHandleElement(
    alphaSliderHandleElement: ElementRef
  ) {
    this._alphaSliderHandleElement = alphaSliderHandleElement;
  }

  /**************************************************************************************************************
   * CTOR
   *************************************************************************************************************/

  constructor() {
    // When no value is passed set an initial one
    !this.value && (this.value = this.DEFAULT_COLOR);

    // Detect if used device supports touch and set correct event types
    this._isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints;
    this._eventStart = this._isTouchDevice ? 'touchstart' : 'mousedown';
    this._eventMove = this._isTouchDevice ? 'touchmove' : 'mousemove';
    this._eventEnd = this._isTouchDevice ? 'touchend' : 'mouseup';
  }

  /**************************************************************************************************************
   * LIFECYCLE HOOKS AND EVENTS
   *************************************************************************************************************/

  ngAfterViewInit(): void {
    const ngControl = this._injector.get(NgControl, null);

    /*
     * Check if ngControl can be injected (when not it's an indicator that formControlName property is missing and control isn't used
     * within reactive form)
     */
    if (ngControl) {
      this._control = ngControl.control as FormControl;
    }

    // Get the flyout element bounds first
    this._getFlyoutElementBounds();

    // Listen for mousedown/touchstart on the saturation area
    this._renderer.listen(
      this._saturationAreaElement()?.nativeElement,
      this._eventStart,
      (downEvent: any) => {
        downEvent.preventDefault();

        // Only allow mouse stuff with left mouse clicks and prevent others for non mobile devices
        if (!this._isTouchDevice && downEvent.which !== 1) {
          return;
        }

        const startXPos = this._isTouchDevice
          ? downEvent.touches[0].clientX
          : downEvent.clientX;
        const startYPos = this._isTouchDevice
          ? downEvent.touches[0].clientY
          : downEvent.clientY;
        const saturationAreaBBox =
          this._saturationAreaElement()?.nativeElement.getBoundingClientRect();

        // Calc the relative position within the saturation area box
        let newSliderXPos = startXPos - saturationAreaBBox.left;
        let newSliderYPos = startYPos - saturationAreaBBox.top;

        // Set values for the saturation area
        this._setSaturationAreaValues(newSliderXPos, newSliderYPos);

        // Tmp save last calculated top position which is used for offset calculation while moving
        const startXOffset = this.saturationHandleXPositionFromLeft;
        const startYOffset = this.saturationHandleYPositionFromTop;

        // Listen for mousemove/touchmove when element was moved while mouse was not released before
        this._saturationAreaMouseMoveListener = this._renderer.listen(
          document,
          this._eventMove,
          (moveEvent) => {
            if (!this._isTouchDevice) {
              moveEvent.preventDefault();
            }

            // Calc the relative position within the saturation area box
            newSliderXPos =
              startXOffset +
              (this._isTouchDevice
                ? moveEvent.touches[0].clientX
                : moveEvent.clientX) -
              startXPos;
            newSliderYPos =
              startYOffset +
              (this._isTouchDevice
                ? moveEvent.touches[0].clientY
                : moveEvent.clientY) -
              startYPos;

            // Set values for the saturation area
            this._setSaturationAreaValues(newSliderXPos, newSliderYPos);

            clearTimeout(this._debounceTimeout);
            this._debounceTimeout = setTimeout(() => {
              this._emitChangeEvent();
            }, 250);
          }
        );

        // Listen for mouseup/touchend when element was clicked before
        this._saturationAreaMouseUpListener = this._renderer.listen(
          document,
          this._eventEnd,
          () => {
            // Trigger change on input when mouse was released
            this._emitChangeEvent();

            // Destroy tmp event listeners for mousemove and mouseup
            this._saturationAreaMouseMoveListener();
            this._saturationAreaMouseUpListener();
          }
        );
      }
    );

    // Listen for mousedown/touchstart on the hue slider handle
    this._renderer.listen(
      this._hueSliderElement()?.nativeElement,
      this._eventStart,
      (downEvent) => {
        downEvent.preventDefault();

        // Only allow mouse stuff with left mouse clicks and prevent others for non mobile devices
        if (!this._isTouchDevice && downEvent.which !== 1) {
          return;
        }

        const startXPos = this._isTouchDevice
          ? downEvent.touches[0].clientX
          : downEvent.clientX;
        const hueSliderBBox =
          this._hueSliderElement()?.nativeElement.getBoundingClientRect();

        // Calc the relative position within the saturation area box and the percentage value of the slider
        let newSliderXPos = startXPos - hueSliderBBox.left;
        let percentageValue = (newSliderXPos * 100) / hueSliderBBox.width;

        if (this._hueSliderOffsetWidth === 0) {
          this._hueSliderOffsetWidth = hueSliderBBox.width;
        }

        // Set values for the slider and trigger cd
        this._setHueSliderValues(newSliderXPos, percentageValue);

        // Tmp save last calculated top position which is used for offset calculation while moving
        const startXOffset = this.hueSliderXPositionFromLeft;

        // Listen for mousemove/touchmove when element was clicked before
        this._hueSliderMouseMoveListener = this._renderer.listen(
          document,
          this._eventMove,
          (moveEvent) => {
            if (!this._isTouchDevice) {
              moveEvent.preventDefault();
            }

            newSliderXPos =
              startXOffset +
              (this._isTouchDevice
                ? moveEvent.touches[0].clientX
                : moveEvent.clientX) -
              startXPos;
            percentageValue =
              (this.hueSliderXPositionFromLeft * 100) / hueSliderBBox.width;

            // Set values for the slider and trigger cd
            this._setHueSliderValues(newSliderXPos, percentageValue);
          }
        );

        // Listen for mouseup/touchend when element was clicked before
        this._hueSliderMouseUpListener = this._renderer.listen(
          document,
          this._eventEnd,
          () => {
            // Trigger change on input when mouse was released
            this._emitChangeEvent();

            // Destroy tmp event listeners for mousemove and mouseup
            this._hueSliderMouseMoveListener();
            this._hueSliderMouseUpListener();
          }
        );
      }
    );

    // Listen for mousedown/touchstart on the alpha slider handle
    if (this.alphaChannel) {
      this._renderer.listen(
        this._alphaSliderElement?.nativeElement,
        this._eventStart,
        (downEvent) => {
          downEvent.preventDefault();

          // Only allow mouse stuff with left mouse clicks and prevent others for non mobile devices
          if (!this._isTouchDevice && downEvent.which !== 1) {
            return;
          }

          const startXPos = this._isTouchDevice
            ? downEvent.touches[0].clientX
            : downEvent.clientX;
          const alphaSliderBBox =
            this._alphaSliderElement?.nativeElement.getBoundingClientRect();

          // Calc the relative position within the saturation area box and the percentage value of the slider
          let newSliderXPos = startXPos - alphaSliderBBox.left;
          let percentageValue =
            (newSliderXPos * 100) / this._alphaSliderOffsetWidth!;

          // Set values for the slider and trigger cd
          this._setAlphaSliderValues(newSliderXPos, percentageValue);

          // Tmp save last calculated top position which is used for offset calculation while moving
          const startXOffset = this.alphaSliderXPositionFromLeft;

          // Listen for mousemove/touchmove when element was clicked before
          this._alphaSliderMouseMoveListener = this._renderer.listen(
            document,
            this._eventMove,
            (moveEvent) => {
              if (!this._isTouchDevice) {
                moveEvent.preventDefault();
              }

              newSliderXPos =
                startXOffset +
                (this._isTouchDevice
                  ? moveEvent.touches[0].clientX
                  : moveEvent.clientX) -
                startXPos;
              percentageValue =
                (this.alphaSliderXPositionFromLeft * 100) /
                this._alphaSliderOffsetWidth!;

              // Set values for the slider and trigger cd
              this._setAlphaSliderValues(newSliderXPos, percentageValue);
            }
          );

          // Listen for mouseup/touchend when element was clicked before
          this._alphaSliderMouseUpListener = this._renderer.listen(
            document,
            this._eventEnd,
            () => {
              // Trigger change on input when mouse was released
              this._emitChangeEvent();

              // Destroy tmp event listeners for mousemove and mouseup
              this._alphaSliderMouseMoveListener();
              this._alphaSliderMouseUpListener();
            }
          );
        }
      );
    }

    // Set picker from initially given hex color
    setTimeout(() => {
      this._setPickerFromHexColor(false, true);
      this.initialized = true;
    }, 250);
  }

  ngAfterContentInit() {
    this._focusMonitor
      .monitor(this._inputElement().nativeElement)
      .subscribe((focusOrigin) => this._onInputFocusChange(focusOrigin));
  }

  ngOnDestroy() {
    this._focusMonitor.stopMonitoring(this._inputElement().nativeElement);
    this._windowResizeSubscribtion?.unsubscribe();
    this._keyPressListener && this._keyPressListener();
  }

  onChangeEvent(event: Event) {
    // We always have to stop propagation on the change event. Otherwise the change event will bubble up
    event.stopPropagation();

    this._setPickerFromHexColor(true);
  }

  onFlyoutClosed() {
    // Unbind keypress listener when flyout was closed again
    this._keyPressListener && this._keyPressListener();
  }

  onFlyoutOpened() {
    // Detect when ENTER/ESC keys was pressed on keyboard to close flyout
    this._keyPressListener = this._renderer.listen(
      document,
      'keydown',
      (keyEvent) => {
        keyEvent.preventDefault();

        if (
          keyEvent.which === 13 ||
          keyEvent.key === 'Enter' ||
          keyEvent.which === 27 ||
          keyEvent.key === 'Escape'
        ) {
          this._flyoutElement()?.closeMenu();
        }
      }
    );
  }

  private _onInputFocusChange(focusOrigin: FocusOrigin) {
    if (!this.focused) {
      this.focused = true;
    } else if (!focusOrigin) {
      this.focused = false;
      this.onTouched();
    }
  }

  /**************************************************************************************************************
   * SETTERS & GETTERS
   *************************************************************************************************************/

  @Input()
  set required(value: boolean) {
    this._required = coerceBooleanProperty(value);
  }

  get required(): boolean {
    return this._required;
  }

  @Input()
  set alphaChannel(value: boolean) {
    this._alphaChannel = coerceBooleanProperty(value);
  }

  get alphaChannel(): boolean {
    return this._alphaChannel;
  }

  @Input()
  set value(value: string) {
    this._value = value;
    this._changeDetectorRef.markForCheck();
  }

  get value(): string {
    return this._value!;
  }

  @Input()
  set focused(value: boolean) {
    this._focused = coerceBooleanProperty(value);
    this._changeDetectorRef.markForCheck();
  }

  get focused(): boolean {
    return this._focused;
  }

  /**************************************************************************************************************
   * PUBLIC FUNCTIONS
   *************************************************************************************************************/

  focus(): void {
    this._focusMonitor.focusVia(this._inputElement().nativeElement, 'keyboard');
  }

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  /**************************************************************************************************************
   * PRIVATE FUNCTIONS
   *************************************************************************************************************/

  private _resetPickerColor() {
    // Set initial hue slider color (0% => 0 degree => red on HSV model)
    this.hueSliderColor = this._percHueValueToHslColor(0);

    this._currentHue = this._calcHueByPerc(0);
    this._currentSaturation = 0;
    this._currentValue = 100;
    this._currentAlpha = 100;
  }

  private _setPickerFromHexColor(
    emitChangeEvent = false,
    setPickerColors = false
  ) {
    // When user adds a hex code with missing #, we add it automatically in front of the hex code
    const _inputElement = this._inputElement();

    if (
      _inputElement.nativeElement.value.length > 1 &&
      !_inputElement.nativeElement.value.startsWith('#')
    ) {
      _inputElement.nativeElement.value =
        '#' + _inputElement.nativeElement.value;
    }

    // When alpha channel was disabled but user provides a alpha hex value, then we have to cut the alpha information from the hex str
    if (!this.alphaChannel && _inputElement.nativeElement.value.length === 9) {
      _inputElement.nativeElement.value =
        _inputElement.nativeElement.value.slice(0, -2);
    }

    if (ColorPickerUtils.isHexColor(_inputElement.nativeElement.value)) {
      // Sync the value from the underlying input element with the component instance.
      this.value = _inputElement.nativeElement.value;

      // Get a hsl color from the input's hex value and calculate back a y-position for the rhs hue slider value by current hsl hue value
      const hsvColor = ColorPickerUtils.hexToHsv(this.value);

      // (hsvHue * 100 / 360 => gets percentage part of the hue value (value 0-360) for the slider and calculate back the absolute pixel position for the handle depending on the the slider offset width
      const hueSliderHandleXPos =
        (((hsvColor.array![0] * 100) / 360) * this._hueSliderOffsetWidth!) / 100;

      // (hsvAlpha * 100 / 360 => gets percentage part of the alpha value (value 0 - 1) for the slider and calculate back the absolute pixel position for the handle depending on the the slider offset width
      const alphaSliderHandleXPos =
        (hsvColor.array![3] * 100 * this._alphaSliderOffsetWidth!) / 100;

      // Set the hue slider color which is used as static background color (only hue value with full saturation and lightning) for the lhs saturation area and overlapped by the two transparent gradients
      this.hueSliderColor = 'hsl(' + hsvColor.array![0] + ', 100%, 50%)';

      // Set hue and alpha slider handle positions
      this.hueSliderXPositionFromLeft = Math.max(
        0,
        Math.min(hueSliderHandleXPos, this._hueSliderOffsetWidth!)
      );
      this.alphaSliderXPositionFromLeft = Math.max(
        0,
        Math.min(alphaSliderHandleXPos, this._alphaSliderOffsetWidth!)
      );

      // Set hue value which is used for the setColors function
      this._currentHue = hsvColor.array![0];

      // /////////////////////////////////

      // Get the positions for the saturation area handle (x-axis => saturation, y-axis => value/brightness)
      const saturationAreaHandleXPos =
        (hsvColor.array![1] * this._saturationAreaOffsetWidth!) / 100;
      const saturationAreaHandleYPos = Math.abs(
        (hsvColor.array![2] * this._saturationAreaOffsetHeight!) / 100 -
          this._saturationAreaOffsetHeight!
      );

      // Clamp the saturation handle position to be within the saturation area bounds
      this.saturationHandleXPositionFromLeft = Math.max(
        0,
        Math.min(saturationAreaHandleXPos, this._saturationAreaOffsetWidth!)
      );
      this.saturationHandleYPositionFromTop = Math.max(
        0,
        Math.min(saturationAreaHandleYPos, this._saturationAreaOffsetHeight!)
      );

      // Set the saturation and value for the HSV model
      this._currentSaturation = hsvColor.array![1];
      this._currentValue = hsvColor.array![2];
      this._currentAlpha = hsvColor.array![3] * 100;

      // Set picker colors
      if (setPickerColors) {
        this._setColors();
      }

      /*
       * Emit our custom change event only if the underlying input emitted one. This ensures that
       * there is no change event, when the checked state changes programmatically.
       */
      if (emitChangeEvent) {
        this._emitChangeEvent();
      }
    } else {
      /*
       * When hex value is not valid and colorpicker is from type FormControl (used within a reactive form when it has the attribute formControlName)
       * we invalidate the control
       */
      this._resetPickerColor();
    }
  }

  private _getFlyoutElementBounds() {
    this._flyoutElement().openMenu();

    setTimeout(() => {
      this._saturationAreaOffsetWidth =
        this._saturationAreaElement().nativeElement.offsetWidth;
      this._saturationAreaOffsetHeight =
        this._saturationAreaElement().nativeElement.offsetHeight;
      this._hueSliderOffsetWidth =
        this._hueSliderElement().nativeElement.offsetWidth;

      if (this.alphaChannel) {
        this._alphaSliderOffsetWidth =
          this._alphaSliderElement?.nativeElement.offsetWidth;
      }

      this._flyoutElement().closeMenu();
    });
  }

  private _setSaturationAreaValues(
    newSliderXPos: number,
    newSliderYPos: number
  ) {
    // Directly set the handle to the clicked position on x and y axis
    this.saturationHandleXPositionFromLeft =
      (newSliderXPos < 0
        ? 0
        : newSliderXPos > this._saturationAreaOffsetWidth!
        ? this._saturationAreaOffsetWidth
        : newSliderXPos)!;
    this.saturationHandleYPositionFromTop =
      (newSliderYPos < 0
        ? 0
        : newSliderYPos > this._saturationAreaOffsetHeight!
        ? this._saturationAreaOffsetHeight
        : newSliderYPos)!;

    // Calculate the saturation and value for the HSV model
    this._currentSaturation =
      (this.saturationHandleXPositionFromLeft * 100) /
      this._saturationAreaOffsetWidth!;
    this._currentValue =
      (Math.abs(
        this.saturationHandleYPositionFromTop - this._saturationAreaOffsetHeight!
      ) *
        100) /
      this._saturationAreaOffsetHeight!;

    // Set colors and trigger change detection to update ui
    this._setColors();
    this._changeDetectorRef.markForCheck();
  }

  private _setHueSliderValues(newSliderXPos: number, percentageValue: number) {
    // Set handle position on y axis
    this.hueSliderXPositionFromLeft =
      (newSliderXPos < 0
        ? 0
        : newSliderXPos > this._hueSliderOffsetWidth!
        ? this._hueSliderOffsetWidth
        : newSliderXPos)!;

    // Get an hsl color string from percentage hue value which is used as background for the saturation area
    this.hueSliderColor = this._percHueValueToHslColor(percentageValue);

    // Calculate the hue for the HSV model
    this._currentHue = this._calcHueByPerc(percentageValue);

    // Set colors and trigger change detection to update ui
    this._setColors();
    this._changeDetectorRef.markForCheck();
  }

  private _setAlphaSliderValues(
    newSliderXPos: number,
    percentageValue: number
  ) {
    // Set handle position on y axis
    this.alphaSliderXPositionFromLeft =
      (newSliderXPos < 0
        ? 0
        : newSliderXPos > this._alphaSliderOffsetWidth!
        ? this._alphaSliderOffsetWidth
        : newSliderXPos)!;

    // Set alpha value
    this._currentAlpha = percentageValue;

    // Set colors and trigger change detection to update ui
    this._setColors();
    this._changeDetectorRef.markForCheck();
  }

  private _calcHueByPerc(perc: number) {
    return (360 - 0) * (perc / 100);
  }

  private _setColors() {
    this.currentColorHsl = ColorPickerUtils.hsvToHsl(
      this._currentHue!,
      this._currentSaturation!,
      this._currentValue!,
      this._currentAlpha
    );
    this.currentColorRgb = ColorPickerUtils.hsvToRgb(
      this._currentHue!,
      this._currentSaturation!,
      this._currentValue!,
      this._currentAlpha
    );
    this.currentColorHex = ColorPickerUtils.rgbToHex(
      this.currentColorRgb.array![0],
      this.currentColorRgb.array![1],
      this.currentColorRgb.array![2],
      this.currentColorRgb.array![3] * 100
    );
    this.currentColorHexNoAlpha = ColorPickerUtils.rgbToHex(
      this.currentColorRgb.array![0],
      this.currentColorRgb.array![1],
      this.currentColorRgb.array![2]
    );

    this.value = this.currentColorHex.string!;
    this.valueNoAlpha = this.currentColorHexNoAlpha.string as string;

    // Ensure errors (when used as form control with reactive forms) are resetted properly
    this._control && this._control.setErrors(null);
  }

  private _percHueValueToHslColor(percent: number) {
    return 'hsl(' + (360 - 0) * (percent / 100) + ', 100%, 50%)';
  }

  private _emitChangeEvent() {
    this.onChange(this.value);
    this.changeEvent.emit(new ColorPickerChangeEvent(this, this.value));
  }
}
