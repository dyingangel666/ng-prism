import { Injector, runInInjectionContext } from '@angular/core';
import { ToggleComponent } from './toggle.component';

describe('ToggleComponent', () => {
  it('should be defined', () => {
    expect(ToggleComponent).toBeDefined();
  });

  it('should be instantiable in injection context', () => {
    const injector = Injector.create({ providers: [] });
    const component = runInInjectionContext(injector, () => new ToggleComponent());
    expect(component).toBeDefined();
  });

  it('toggle() should flip checked state from false to true', () => {
    const injector = Injector.create({ providers: [] });
    runInInjectionContext(injector, () => {
      const component = new ToggleComponent();
      expect(component.checked()).toBe(false);
      component.toggle();
      expect(component.checked()).toBe(true);
    });
  });

  it('toggle() should emit changed event with new value', () => {
    const injector = Injector.create({ providers: [] });
    runInInjectionContext(injector, () => {
      const component = new ToggleComponent();
      let emittedValue: boolean | undefined;
      component.changed.subscribe((v: boolean) => { emittedValue = v; });
      component.toggle();
      expect(emittedValue).toBe(true);
    });
  });
});
