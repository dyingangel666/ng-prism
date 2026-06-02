import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

const FENCE_RE = /^```([^\n`]*)\n([\s\S]*?)\n?```$/;

export interface ParsedExample {
  lang: string;
  code: string;
}

export function parseExample(raw: string): ParsedExample {
  const trimmed = raw.trim();
  const match = FENCE_RE.exec(trimmed);
  if (!match) {
    return { lang: 'typescript', code: raw };
  }
  const lang = match[1].trim() || 'typescript';
  return { lang, code: match[2] };
}

export function renderBlockMarkdown(text: string | undefined): string | null {
  if (!text) return null;
  return marked.parse(text, { async: false }) as string;
}

export function renderInlineMarkdown(text: string | undefined): string {
  if (!text) return '';
  return marked.parseInline(text, { async: false }) as string;
}
