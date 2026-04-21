import { Injector, runInInjectionContext } from '@angular/core';
import { AlertComponent, AlertSeverityType } from './alert.component';

function createComponent(): AlertComponent {
  const injector = Injector.create({ providers: [] });
  return runInInjectionContext(injector, () => new AlertComponent());
}

describe('AlertComponent', () => {
  it('should be defined', () => {
    expect(AlertComponent).toBeDefined();
  });

  it('should export AlertSeverityType', () => {
    const severities: AlertSeverityType[] = ['info', 'success', 'warning', 'error'];
    expect(severities).toHaveLength(4);
  });

  it('should be instantiable in injection context', () => {
    const component = createComponent();
    expect(component).toBeDefined();
  });

  it('should be visible by default', () => {
    const component = createComponent();
    expect(component.visible()).toBe(true);
  });

  it('should have default severity "info"', () => {
    const component = createComponent();
    expect(component.severity()).toBe('info');
  });

  it('should have default dismissible false', () => {
    const component = createComponent();
    expect(component.dismissible()).toBe(false);
  });

  it('dismiss() should hide the alert', () => {
    const injector = Injector.create({ providers: [] });
    runInInjectionContext(injector, () => {
      const component = new AlertComponent();
      expect(component.visible()).toBe(true);
      component.dismiss();
      expect(component.visible()).toBe(false);
    });
  });

  it('dismiss() should emit the dismissed event', () => {
    const injector = Injector.create({ providers: [] });
    runInInjectionContext(injector, () => {
      const component = new AlertComponent();
      let emitted = false;
      component.dismissed.subscribe(() => { emitted = true; });
      component.dismiss();
      expect(emitted).toBe(true);
    });
  });

  it('show() should make the alert visible again after dismiss', () => {
    const injector = Injector.create({ providers: [] });
    runInInjectionContext(injector, () => {
      const component = new AlertComponent();
      component.dismiss();
      expect(component.visible()).toBe(false);
      component.show();
      expect(component.visible()).toBe(true);
    });
  });

  it('should have a dismissed output', () => {
    const component = createComponent();
    expect(component.dismissed).toBeDefined();
  });
});
