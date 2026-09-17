import type {
  DiscoveryComponent,
  DiscoveryManifest,
  DiscoveryVariant,
  RuntimeManifest,
} from '../plugin/plugin.types.js';

/**
 * External tooling reads `__PRISM_MANIFEST__` through a structured-clone bridge
 * (`page.evaluate()` in Playwright, `postMessage`, devtools). `ShowcaseConfig.meta`
 * is declared as an open `Record<string, unknown>`, so a consumer is free to put
 * a component class, a function or a cyclic object in there — any of which makes
 * that bridge throw or silently drop the whole payload.
 *
 * Everything crossing into the global is therefore reduced to plain JSON-safe
 * values: primitives, arrays, and objects with a plain prototype. Class
 * instances (Angular types included), functions, symbols, Dates, Maps and DOM
 * nodes are dropped rather than half-serialised, and cycles are broken.
 *
 * Array elements become `null` when they cannot be represented, matching
 * `JSON.stringify` so indices stay stable.
 */
function toSerializable(value: unknown, seen: Set<object>): unknown {
  if (value === null) return null;

  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') return Number.isFinite(value) ? value : undefined;
  if (type !== 'object') return undefined;

  const object = value as object;
  if (seen.has(object)) return undefined;

  if (Array.isArray(object)) {
    seen.add(object);
    const items = object.map((item) => {
      const serialized = toSerializable(item, seen);
      return serialized === undefined ? null : serialized;
    });
    seen.delete(object);
    return items;
  }

  const proto = Object.getPrototypeOf(object) as object | null;
  if (proto !== Object.prototype && proto !== null) return undefined;

  seen.add(object);
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(object)) {
    const serialized = toSerializable(item, seen);
    if (serialized !== undefined) result[key] = serialized;
  }
  seen.delete(object);
  return result;
}

/** Sanitised `meta`, or `undefined` when there is nothing worth exposing. */
export function serializableMeta(
  meta: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const serialized = toSerializable(meta, new Set()) as
    | Record<string, unknown>
    | undefined;
  if (!serialized || Object.keys(serialized).length === 0) return undefined;
  return serialized;
}

/**
 * Builds the discovery view of the manifest — what `__PRISM_MANIFEST__` exposes.
 *
 * It is deliberately not the runtime manifest: no Angular class references, no
 * providers, no scanned input/output metadata. It carries what an external tool
 * needs to enumerate and address variants, plus the `@Showcase` metadata that
 * lets a tool decide how to treat one.
 */
export function buildDiscoveryManifest(
  manifest: RuntimeManifest
): DiscoveryManifest {
  return {
    components: manifest.components.map((component): DiscoveryComponent => {
      const { className, showcaseConfig } = component.meta;
      const variants: DiscoveryVariant[] = showcaseConfig.variants?.map(
        (variant, index) => {
          const meta = serializableMeta(variant.meta);
          return meta
            ? { name: variant.name, index, meta }
            : { name: variant.name, index };
        }
      ) ?? [{ name: 'Default', index: 0 }];

      const meta = serializableMeta(showcaseConfig.meta);
      const discovered: DiscoveryComponent = {
        className,
        title: showcaseConfig.title,
        variants,
      };
      if (meta) discovered.meta = meta;
      return discovered;
    }),
    pages: (manifest.pages ?? []).map((page) => ({ title: page.title })),
  };
}
