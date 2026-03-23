export async function captureDomElement(element: HTMLElement | null): Promise<HTMLCanvasElement> {
  if (!element) throw new Error('Kein gerendertes Element gefunden');

  type Html2CanvasFn = (el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement>;
  const { default: html2canvas } = await import('html2canvas') as unknown as { default: Html2CanvasFn };
  return html2canvas(element, {
    useCORS: true,
    scale: window.devicePixelRatio || 1,
    backgroundColor: null,
    logging: false,
  });
}
