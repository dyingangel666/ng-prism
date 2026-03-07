import type { InputMeta } from '../../plugin/plugin.types.js';

function pushAttribute(attributes: string[], name: string, value: unknown): void {
  if (typeof value === 'string') {
    attributes.push(`${name}="${value}"`);
  } else if (typeof value === 'boolean') {
    attributes.push(`[${name}]="true"`);
  } else if (typeof value === 'number') {
    attributes.push(`[${name}]="${value}"`);
  } else if (typeof value === 'object' || Array.isArray(value)) {
    attributes.push(`[${name}]="yourData"`);
  } else {
    attributes.push(`[${name}]="${String(value)}"`);
  }
}

export function generateSnippet(
  selector: string,
  inputs: InputMeta[],
  values: Record<string, unknown>,
  explicitKeys?: ReadonlySet<string>,
): string {
  const attributes: string[] = [];
  const processed = new Set<string>();

  for (const input of inputs) {
    processed.add(input.name);
    const value = values[input.name];

    if (value === undefined) continue;
    if (typeof value === 'boolean' && !value) continue;
    if (
      input.defaultValue !== undefined &&
      value === input.defaultValue &&
      !explicitKeys?.has(input.name)
    ) continue;

    pushAttribute(attributes, input.name, value);
  }

  for (const [name, value] of Object.entries(values)) {
    if (processed.has(name)) continue;
    if (value === undefined) continue;
    if (typeof value === 'boolean' && !value) continue;
    pushAttribute(attributes, name, value);
  }

  if (attributes.length === 0) {
    return `<${selector} />`;
  }

  const singleLine = `<${selector} ${attributes.join(' ')} />`;
  if (singleLine.length <= 80) {
    return singleLine;
  }

  const indented = attributes.map((attr) => `  ${attr}`).join('\n');
  return `<${selector}\n${indented} />`;
}
