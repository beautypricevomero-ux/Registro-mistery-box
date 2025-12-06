'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Tesseract from 'tesseract.js';
import { compressImage, captureFrameFromVideo, blobToBase64 } from '@/lib/image';
import { parseLabelFields, LabelLayoutType } from '@/lib/layouts';
import { saveLabelImage } from '@/lib/db';

const PENDING_KEY = 'pendingCustomerDraft';

type PendingCustomerDraft = {
  fullName: string;
  address: string;
  cap?: string;
  city?: string;
  province?: string;
  phone?: string;
  notes?: string;
  ocrText: string;
  layoutType?: LabelLayoutType;
  trackingFromLabel?: string;
  labelImageId: string;
};

export default function LdvPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error(err);
        setError('Per usare questa funzione devi abilitare la fotocamera nelle impostazioni dell’iPad.');
      }
    };
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setProcessing(true);
    setMessage('Acquisizione immagine LDV...');
    setError(null);
    try {
      const rawBlob = await captureFrameFromVideo(videoRef.current);
      const compressed = await compressImage(rawBlob);
      setMessage('Esecuzione OCR in corso...');
      const base64 = await blobToBase64(compressed);
      const ocrResult = await Tesseract.recognize(base64, 'ita');
      const ocrText = ocrResult.data.text || '';
      const parsed = parseLabelFields(ocrText);
      const labelImageId = await saveLabelImage(compressed);
      const draft: PendingCustomerDraft = {
        fullName: parsed.name || '',
        address: parsed.address || '',
        cap: parsed.cap,
        city: parsed.city,
        province: parsed.province,
        phone: parsed.phone,
        notes: '',
        ocrText,
        layoutType: parsed.layoutType,
        trackingFromLabel: parsed.tracking,
        labelImageId
      };
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(draft));
      router.push('/cliente/nuovo');
    } catch (err) {
      console.error(err);
      setError('Errore durante la lettura dell’etichetta. Riprova.');
    } finally {
      setProcessing(false);
      setMessage(null);
    }
  };

  return (
    <div className="page">
      <h1>Scatta LDV</h1>
      <p style={{ marginBottom: 12 }}>Inquadra tutta l’etichetta di spedizione (LDV) e scatta la foto.</p>
      {error && <div className="error-banner">{error}</div>}
      <div className="camera-box">
        <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 12, background: '#111' }} />
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={handleCapture} disabled={processing} className="primary">
          {processing ? 'Elaborazione...' : 'Scatta LDV'}
        </button>
      </div>
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
