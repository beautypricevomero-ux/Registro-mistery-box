/** Utility functions for camera capture and image compression */

export async function compressImage(blob: Blob, maxSize = 1280, quality = 0.7): Promise<Blob> {
  const imageBitmap = await createImageBitmap(blob);
  const ratio = Math.min(maxSize / imageBitmap.width, maxSize / imageBitmap.height, 1);
  const width = Math.round(imageBitmap.width * ratio);
  const height = Math.round(imageBitmap.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');
  ctx.drawImage(imageBitmap, 0, 0, width, height);
  const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!output) {
    throw new Error('Compressione immagine fallita');
  }
  return output;
}

export async function captureImageFromFileInput(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    (input as HTMLInputElement & { capture?: string }).capture = 'environment';
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ?? null);
    };
    input.click();
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
