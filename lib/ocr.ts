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

/**
 * Recognize only digits from an image blob (used for BeautyPrice RIF fallback).
 */
export async function recognizeDigitsOnly(blob: Blob): Promise<string> {
  const imageUrl = URL.createObjectURL(blob);
  try {
    const { data } = await Tesseract.recognize(imageUrl, 'eng', {
      tessedit_char_whitelist: '0123456789',
      tessedit_pageseg_mode: 7 // single line
    } as any);
    return (data.text || '').replace(/\D/g, '');
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
