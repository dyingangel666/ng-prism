import { Injector, runInInjectionContext } from '@angular/core';
import { setInput } from '../../../testing/set-input';
import { ChipComponent } from './chip.component';

function createChip(label = 'Angular'): ChipComponent {
  const injector = Injector.create({ providers: [] });
  const component = runInInjectionContext(injector, () => new ChipComponent());
  setInput(component, 'label', label);
  return component;
}

describe('ChipComponent', () => {
  it('should be defined', () => {
    expect(ChipComponent).toBeDefined();
  });

  it('remove() should emit the label', () => {
    const component = createChip('TypeScript');
    let emitted: string | undefined;
    component.removed.subscribe((label: string) => {
      emitted = label;
    });

    component.remove();

    expect(emitted).toBe('TypeScript');
  });

  it('remove() should stay silent while disabled', () => {
    const component = createChip();
    setInput(component, 'disabled', true);
    let emitted: string | undefined;
    component.removed.subscribe((label: string) => {
      emitted = label;
    });

    component.remove();

    expect(emitted).toBeUndefined();
  });
});
