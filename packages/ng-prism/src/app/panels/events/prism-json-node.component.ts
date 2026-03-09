import { Component } from '@angular/core';

export function summarizeValue(val: unknown): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const items = val.slice(0, 3).map(summarizeValue);
    return val.length > 3 ? `[${items.join(', ')}, …]` : `[${items.join(', ')}]`;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const pairs = keys.slice(0, 2).map((k) => `${k}: ${summarizeValue(obj[k])}`);
    return keys.length > 2 ? `{${pairs.join(', ')}, …}` : `{${pairs.join(', ')}}`;
  }
  return String(val);
}

@Component({
  selector: 'prism-json-node',
  standalone: true,
  template: ``,
})
export class PrismJsonNodeComponent {}
