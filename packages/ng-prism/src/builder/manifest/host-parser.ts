export interface ParsedHost {
  tag: string;
  attrs: string;
}

export function parseHostString(host: string): ParsedHost | null {
  const trimmed = host.trim();
  const match = trimmed.match(/^<\s*([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*?)?)\s*\/?\s*>$/);
  if (!match) return null;

  const tag = match[1];
  const attrs = match[2].trim();

  return { tag, attrs };
}
