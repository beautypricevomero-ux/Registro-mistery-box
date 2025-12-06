'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compressImage, captureFrameFromVideo } from '@/lib/image';
import { saveLabelImage } from '@/lib/db';
import { recognizeDigitsOnly } from '@/lib/ocr';

const LAST_CODE_KEY = 'lastCodeData';

export default function RifBartoliniPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const start = async () => {
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
    start();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleCaptureRif = async () => {
    if (!videoRef.current) return;
    setProcessing(true);
    setError(null);
    try {
      const blob = await captureFrameFromVideo(videoRef.current);
      const compressed = await compressImage(blob);
      const labelImageId = await saveLabelImage(compressed);
      const digits = await recognizeDigitsOnly(compressed);
      if (!digits || digits.length < 4) {
        alert('Non sono riuscito a leggere il RIF. Avvicina ancora di più il codice e riprova.');
        return;
      }
      const codeData = {
        orderId: digits,
        carrier: 'BARTOLINI' as const,
        labelImageId
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_CODE_KEY, JSON.stringify(codeData));
      }
      router.push('/spedizione/nuova');
    } catch (err) {
      console.error(err);
      setError('Errore durante la lettura del RIF. Riprova.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page">
      <h1>Scatta RIF Bartolini</h1>
      <p>Inquadra solo il codice RIF da vicino, poi premi "Scatta RIF".</p>
      {error && <div className="error-banner">{error}</div>}
      <div className="camera-box">
        <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 12, background: '#111' }} />
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={handleCaptureRif} disabled={processing} className="primary">
          {processing ? 'Elaborazione...' : 'Scatta RIF'}
        </button>
      </div>
    </div>
  );
}
