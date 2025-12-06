export async function captureImageFromCamera(): Promise<Blob | null> {
  // Uses an invisible input to leverage native camera UI on iPad
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        resolve(file);
      } else {
        resolve(null);
      }
    };
    document.body.appendChild(input);
    input.click();
    // Cleanup after a short delay
    setTimeout(() => input.remove(), 1000);
  });
}

export async function compressImage(blob: Blob, maxSize = 1280, quality = 0.7): Promise<Blob> {
  const imageBitmap = await createImageBitmap(blob);
  const { width, height } = imageBitmap;
  const ratio = Math.min(1, maxSize / Math.max(width, height));
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  const compressed = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', quality);
  });
  return compressed;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}
