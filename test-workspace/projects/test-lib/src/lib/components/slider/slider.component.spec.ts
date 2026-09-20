import { Injector, runInInjectionContext } from '@angular/core';
import { setInput } from '../../../testing/set-input';
import { SliderComponent } from './slider.component';

function createSlider(): SliderComponent {
  const injector = Injector.create({ providers: [] });
  return runInInjectionContext(injector, () => new SliderComponent());
}

/** The component reads `event.target.value`; nothing else of the DOM event. */
function inputEvent(value: string): Event {
  return { target: { value } } as unknown as Event;
}

describe('SliderComponent', () => {
  it('should be defined', () => {
    expect(SliderComponent).toBeDefined();
  });

  it('onInput() should write the numeric value and emit it', () => {
    const component = createSlider();
    let emitted: number | undefined;
    component.valueChanged.subscribe((v: number) => {
      emitted = v;
    });

    component.onInput(inputEvent('42'));

    expect(component.value()).toBe(42);
    expect(emitted).toBe(42);
  });

  it('reset() should move the value to the midpoint of the default range', () => {
    const component = createSlider();
    component.value.set(10);

    component.reset();

    expect(component.value()).toBe(50);
  });

  it('reset() should round the midpoint of an odd range', () => {
    const component = createSlider();
    setInput(component, 'min', 1);
    setInput(component, 'max', 6);
    let emitted: number | undefined;
    component.valueChanged.subscribe((v: number) => {
      emitted = v;
    });

    component.reset();

    // (1 + 6) / 2 = 3.5, rounded to 4.
    expect(component.value()).toBe(4);
    expect(emitted).toBe(4);
  });
});
