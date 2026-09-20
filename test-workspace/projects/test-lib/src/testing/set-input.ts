/**
 * Overrides a signal input on a component instance built with `new`.
 *
 * `ComponentRef.setInput` is the supported way to drive a signal input, but it
 * needs a rendered component — and rendering is not available in this suite:
 * the SWC transform leaves components un-compiled, so TestBed would have to
 * JIT-compile them. An `input()` is a plain instance property holding a getter
 * function, so replacing it covers every test that only exercises class logic.
 *
 * Deliberately not used for `model()` inputs — those are writable signals and
 * the components under test write to them, which is behaviour worth keeping
 * real.
 */
export function setInput(
  component: object,
  name: string,
  value: unknown
): void {
  (component as Record<string, unknown>)[name] = () => value;
}
