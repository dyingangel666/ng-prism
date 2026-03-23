import type { DiffResult } from './figma-diff.types.js';

export async function computeDesignDiff(
  componentCanvas: HTMLCanvasElement,
  figmaBlob: Blob,
): Promise<DiffResult> {
  const { default: pixelmatch } = await import('pixelmatch');

  const w = componentCanvas.width;
  const h = componentCanvas.height;
  const figmaCanvas = await blobToCanvas(figmaBlob, w, h);

  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = w;
  diffCanvas.height = h;

  const img1 = componentCanvas.getContext('2d')!.getImageData(0, 0, w, h);
  const img2 = figmaCanvas.getContext('2d')!.getImageData(0, 0, w, h);
  const ctxDiff = diffCanvas.getContext('2d')!;
  const imgDiff = ctxDiff.createImageData(w, h);

  const diffPixels = pixelmatch(img1.data, img2.data, imgDiff.data, w, h, {
    threshold: 0.1,
    includeAA: false,
  });

  ctxDiff.putImageData(imgDiff, 0, 0);

  const totalPixels = w * h;

  return {
    similarity: ((totalPixels - diffPixels) / totalPixels) * 100,
    diffPixels,
    totalPixels,
    componentDataUrl: componentCanvas.toDataURL(),
    figmaDataUrl: figmaCanvas.toDataURL(),
    diffDataUrl: diffCanvas.toDataURL(),
  };
}

function blobToCanvas(blob: Blob, width: number, height: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Figma-Bild konnte nicht geladen werden'));
    };
    img.src = url;
  });
}
