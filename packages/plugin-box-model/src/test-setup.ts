import '@angular/compiler';

const globalWindow = globalThis as unknown as Window & typeof globalThis;
if (!('window' in globalThis)) {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}
if (!('getComputedStyle' in globalThis)) {
  globalWindow.getComputedStyle = () => ({} as CSSStyleDeclaration);
}
