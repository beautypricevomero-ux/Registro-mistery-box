import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

const reader = new BrowserMultiFormatReader();

export async function decodeBarcodeFromBlob(blob: Blob): Promise<string | undefined> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const result = await reader.decodeFromImageElement(img);
    return result?.getText();
  } catch (err) {
    if (err instanceof NotFoundException) {
      console.warn('Nessun barcode trovato in questa immagine');
      return undefined;
    }
    console.error('Errore lettura barcode', err);
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}
