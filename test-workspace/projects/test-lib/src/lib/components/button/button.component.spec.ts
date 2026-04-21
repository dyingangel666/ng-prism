import { Injector, runInInjectionContext } from '@angular/core';
import { ButtonComponent, ButtonVariantType } from './button.component';

function createComponent(): ButtonComponent {
  const injector = Injector.create({ providers: [] });
  return runInInjectionContext(injector, () => new ButtonComponent());
}

describe('ButtonComponent', () => {
  it('should be defined', () => {
    expect(ButtonComponent).toBeDefined();
  });

  it('should export ButtonVariantType', () => {
    const variants: ButtonVariantType[] = ['filled', 'outlined', 'elevated', 'text', 'icon-only'];
    expect(variants).toHaveLength(5);
  });

  it('should be instantiable in injection context', () => {
    const component = createComponent();
    expect(component).toBeDefined();
  });

  it('should have default variant "filled"', () => {
    const component = createComponent();
    expect(component.variant()).toBe('filled');
  });

  it('should have default label "Button"', () => {
    const component = createComponent();
    expect(component.label()).toBe('Button');
  });

  it('should have default icon "★"', () => {
    const component = createComponent();
    expect(component.icon()).toBe('★');
  });

  it('should have default disabled false', () => {
    const component = createComponent();
    expect(component.disabled()).toBe(false);
  });

  it('should have default readonly false', () => {
    const component = createComponent();
    expect(component.readonly()).toBe(false);
  });

  it('should have a clicked output', () => {
    const component = createComponent();
    expect(component.clicked).toBeDefined();
  });

  it('should have clicked output with subscribe method', () => {
    const component = createComponent();
    expect(typeof component.clicked.subscribe).toBe('function');
  });
});
