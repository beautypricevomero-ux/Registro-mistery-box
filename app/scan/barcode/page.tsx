'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { compressImage, captureFrameFromVideo } from '@/lib/image';
import { saveLabelImage } from '@/lib/db';

const CARRIER_KEY = 'currentCarrier';
const LAST_CODE_KEY = 'lastCodeData';

type Carrier = 'GLS' | 'SPEDIZIONE_NAPOLI' | 'BARTOLINI';

type CodeData = {
  orderId: string;
  carrier: Carrier;
  labelImageId?: string;
};

export default function BarcodeScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const carrierRaw = typeof window !== 'undefined' ? window.localStorage.getItem(CARRIER_KEY) : null;
    if (carrierRaw !== 'GLS' && carrierRaw !== 'SPEDIZIONE_NAPOLI') {
      router.replace('/tipo-etichetta');
      return;
    }
    const reader = new BrowserMultiFormatReader();

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        reader.decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
          if (result) {
            const text = result.getText().trim();
            handleBarcodeDetected(text, carrierRaw as Carrier);
            reader.reset();
          }
          if (err) {
            // Ignore decoding errors while scanning
          }
        });
      } catch (err) {
        console.error(err);
        setError('Impossibile accedere alla fotocamera.');
      }
    };

    start();

    return () => {
      reader.reset();
      if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBarcodeDetected = async (text: string, carrier: Carrier) => {
    if (!videoRef.current) return;
    try {
      const blob = await captureFrameFromVideo(videoRef.current);
      let labelImageId: string | undefined;
      try {
        const compressed = await compressImage(blob);
        labelImageId = await saveLabelImage(compressed);
      } catch (err) {
        console.warn('Impossibile salvare immagine etichetta', err);
      }

      const codeData: CodeData = { orderId: text, carrier, labelImageId };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_CODE_KEY, JSON.stringify(codeData));
      }
      router.push('/spedizione/nuova');
    } catch (err) {
      console.error(err);
      setError('Errore durante la lettura del codice.');
    }
  };

  return (
    <AppShell
      title="Scansione barcode"
      subtitle="Inquadra il codice a barre GLS / Spedizione Napoli all'interno dell'area."
    >
      <div className="app-section">
        {error && <div className="error-banner">{error}</div>}
        <div className="camera-wrapper" style={{ maxWidth: 640, margin: '0 auto' }}>
          <video ref={videoRef} playsInline muted />
        </div>
        <p className="app-subtitle" style={{ marginTop: '0.75rem' }}>
          La lettura avviene automaticamente quando il codice è nitido.
        </p>
      </div>
    </AppShell>
  );
}
