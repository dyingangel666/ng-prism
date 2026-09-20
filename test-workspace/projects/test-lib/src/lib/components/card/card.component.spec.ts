import { Injector, runInInjectionContext } from '@angular/core';
import { setInput } from '../../../testing/set-input';
import { CardComponent } from './card.component';

function createCard(): CardComponent {
  const injector = Injector.create({ providers: [] });
  return runInInjectionContext(injector, () => new CardComponent());
}

describe('CardComponent', () => {
  it('should be defined', () => {
    expect(CardComponent).toBeDefined();
  });

  it('should default to a non-clickable, elevated card', () => {
    const component = createCard();
    expect(component.clickable()).toBe(false);
    expect(component.elevated()).toBe(true);
    expect(component.showImage()).toBe(false);
  });

  it('onClick() should emit clicked when the card is clickable', () => {
    const component = createCard();
    setInput(component, 'clickable', true);
    let emitted = false;
    component.clicked.subscribe(() => {
      emitted = true;
    });

    component.onClick();

    expect(emitted).toBe(true);
  });

  it('onClick() should stay silent when the card is not clickable', () => {
    const component = createCard();
    let emitted = false;
    component.clicked.subscribe(() => {
      emitted = true;
    });

    component.onClick();

    expect(emitted).toBe(false);
  });
});
