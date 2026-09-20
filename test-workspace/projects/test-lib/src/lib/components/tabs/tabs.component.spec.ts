import { Injector, runInInjectionContext } from '@angular/core';
import { setInput } from '../../../testing/set-input';
import { TabsComponent, type TabItem } from './tabs.component';

const TABS: TabItem[] = [
  { id: 'general', label: 'General' },
  { id: 'security', label: 'Security' },
  { id: 'advanced', label: 'Advanced', disabled: true },
];

function createTabs(): TabsComponent {
  const injector = Injector.create({ providers: [] });
  const component = runInInjectionContext(injector, () => new TabsComponent());
  setInput(component, 'tabs', TABS);
  return component;
}

describe('TabsComponent', () => {
  it('should be defined', () => {
    expect(TabsComponent).toBeDefined();
  });

  it('selectTab() should activate the tab and emit its id', () => {
    const component = createTabs();
    let emitted: string | undefined;
    component.tabChanged.subscribe((id: string) => {
      emitted = id;
    });

    component.selectTab('security');

    expect(component.activeTabId()).toBe('security');
    expect(emitted).toBe('security');
  });

  it('selectTab() should ignore a disabled tab', () => {
    const component = createTabs();
    component.selectTab('general');
    let emitted: string | undefined;
    component.tabChanged.subscribe((id: string) => {
      emitted = id;
    });

    component.selectTab('advanced');

    expect(component.activeTabId()).toBe('general');
    expect(emitted).toBeUndefined();
  });
});
