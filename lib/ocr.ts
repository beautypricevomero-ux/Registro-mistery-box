import Tesseract from 'tesseract.js';
import { blobToBase64 } from './image';

/**
 * Run OCR on the provided image blob and return raw text.
 */
export async function recognizeLabelText(blob: Blob, language = 'ita'): Promise<string> {
  const base64 = await blobToBase64(blob);
  const result = await Tesseract.recognize(base64, language);
  return result.data.text || '';
}
