import { decodeBarcodeFromBlob } from './barcode';
import { recognizeDigitsOnly } from './ocr';

export async function detectTrackingCode(blob: Blob): Promise<string | null> {
  const barcodeText = await decodeBarcodeFromBlob(blob);
  if (barcodeText && barcodeText.trim().length > 0) {
    return barcodeText.trim();
  }

  const digits = await recognizeDigitsOnly(blob);
  if (digits && digits.length > 0) {
    return digits;
  }

  return null;
}
