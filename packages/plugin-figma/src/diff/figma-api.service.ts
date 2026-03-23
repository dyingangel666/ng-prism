export async function fetchFigmaImage(fileKey: string, nodeId: string, token: string): Promise<Blob> {
  const res = await fetch(
    `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=2`,
    { headers: { 'X-Figma-Token': token } },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Figma API ${res.status}${text ? `: ${text}` : ''}`);
  }

  const json = await res.json() as { err?: string; images?: Record<string, string> };
  if (json.err) throw new Error(json.err);

  const imageUrl: string | undefined = json.images?.[nodeId];
  if (!imageUrl) throw new Error(`Kein Bild für Node-ID "${nodeId}"`);

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`CDN Fehler ${imgRes.status}`);

  return imgRes.blob();
}
