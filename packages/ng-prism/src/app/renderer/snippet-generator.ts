import type { InputMeta } from '../../plugin/plugin.types.js';

export function generateSnippet(
  selector: string,
  inputs: InputMeta[],
  values: Record<string, unknown>,
): string {
  const attributes: string[] = [];

  for (const input of inputs) {
    const value = values[input.name];

    if (value === undefined) continue;
    if (typeof value === 'boolean' && !value) continue;
    if (input.defaultValue !== undefined && value === input.defaultValue) continue;

    if (typeof value === 'string') {
      attributes.push(`${input.name}="${value}"`);
    } else if (typeof value === 'boolean') {
      attributes.push(`[${input.name}]="true"`);
    } else if (typeof value === 'number') {
      attributes.push(`[${input.name}]="${value}"`);
    } else if (typeof value === 'object' || Array.isArray(value)) {
      attributes.push(`[${input.name}]="yourData"`);
    } else {
      attributes.push(`[${input.name}]="${String(value)}"`);
    }
  }

  if (attributes.length === 0) {
    return `<${selector} />`;
  }

  if (attributes.length === 1) {
    return `<${selector} ${attributes[0]} />`;
  }

  const indented = attributes.map((attr) => `  ${attr}`).join('\n');
  return `<${selector}\n${indented} />`;
}
