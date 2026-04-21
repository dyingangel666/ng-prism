import { Injector, runInInjectionContext } from '@angular/core';
import { ProgressBarComponent, ProgressBarVariantType } from './progress-bar.component';

describe('ProgressBarComponent', () => {
  it('should be defined', () => {
    expect(ProgressBarComponent).toBeDefined();
  });

  it('should export ProgressBarVariantType', () => {
    const variants: ProgressBarVariantType[] = ['default', 'success', 'warning', 'error'];
    expect(variants).toHaveLength(4);
  });

  it('should be instantiable in injection context', () => {
    const injector = Injector.create({ providers: [] });
    const component = runInInjectionContext(injector, () => new ProgressBarComponent());
    expect(component).toBeDefined();
  });

  it('getClampedValue() should return 0 for default value', () => {
    const injector = Injector.create({ providers: [] });
    runInInjectionContext(injector, () => {
      const component = new ProgressBarComponent();
      expect(component.getClampedValue()).toBe(0);
    });
  });
});
