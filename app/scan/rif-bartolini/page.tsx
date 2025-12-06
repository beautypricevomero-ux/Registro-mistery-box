'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { compressImage } from '@/lib/image';
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
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error('Fotocamera non pronta');
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas non supportato');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const roiX = canvas.width * 0.2;
      const roiWidth = canvas.width * 0.6;
      const roiY = canvas.height * 0.1;
      const roiHeight = canvas.height * 0.8;

      const roiCanvas = document.createElement('canvas');
      roiCanvas.width = roiWidth;
      roiCanvas.height = roiHeight;
      const roiCtx = roiCanvas.getContext('2d');
      if (!roiCtx) throw new Error('Canvas non supportato');

      roiCtx.drawImage(canvas, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

      const roiBlob = await new Promise<Blob | null>((resolve) =>
        roiCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
      );
      if (!roiBlob) return;

      const compressed = await compressImage(roiBlob);
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
    <AppShell
      title="Scatta RIF Bartolini"
      subtitle="Inquadra il codice RIF al centro del riquadro, poi premi 'Scatta RIF'."
    >
      <div className="app-section" style={{ textAlign: 'center' }}>
        {error && <div className="error-banner">{error}</div>}
        <div className="camera-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '640px', margin: '0 auto' }}>
          <video ref={videoRef} playsInline muted />
          <div
            style={{
              position: 'absolute',
              border: '3px solid #00BFFF',
              borderRadius: '12px',
              left: '20%',
              right: '20%',
              top: '10%',
              bottom: '10%',
              pointerEvents: 'none',
              boxShadow: '0 0 15px rgba(0,0,0,0.6) inset'
            }}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={handleCaptureRif} disabled={processing} className="app-primary-button">
            {processing ? 'Elaborazione...' : 'Scatta RIF'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
