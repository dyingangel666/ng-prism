export type FigmaMeta = string | { url: string; nodeId?: string };

export type DiffMode = 'side-by-side' | 'overlay' | 'diff-only';

export type DiffState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: DiffResult }
  | { status: 'error-no-token' }
  | { status: 'error-no-node' }
  | { status: 'error-api'; message: string };

export interface DiffResult {
  similarity: number;
  diffPixels: number;
  totalPixels: number;
  componentDataUrl: string;
  figmaDataUrl: string;
  diffDataUrl: string;
}

export function parseFigmaMeta(raw: unknown): { url: string; nodeId: string } | null {
  if (typeof raw === 'string') {
    return extractNodeId(raw);
  }
  if (raw && typeof raw === 'object' && 'url' in raw) {
    const obj = raw as { url: string; nodeId?: string };
    if (obj.nodeId) {
      return { url: obj.url, nodeId: obj.nodeId };
    }
    return extractNodeId(obj.url);
  }
  return null;
}

function extractNodeId(url: string): { url: string; nodeId: string } | null {
  try {
    const u = new URL(url);
    const nodeId = u.searchParams.get('node-id');
    if (!nodeId) return null;
    return { url, nodeId: nodeId.replace(/-/g, ':') };
  } catch {
    return null;
  }
}

export function extractFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(?:design|file)\/([^/?#]+)/);
  return match?.[1] ?? null;
}
