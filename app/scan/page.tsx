'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    let active = true;

    const start = async () => {
      const videoElement = videoRef.current;
      if (!videoElement) {
        setError(
          'Per usare questa funzione devi abilitare la fotocamera nelle impostazioni dell’iPad.'
        );
        return;
      }

      try {
        await codeReader.decodeFromVideoDevice(
          undefined,
          videoElement,
          (result, err) => {
            if (!active) return;
            if (result) {
              const text = result.getText();
              if (!detected) {
                setDetected(text);
                setTimeout(() => {
                  router.push(`/order/${encodeURIComponent(text)}`);
                }, 500);
              }
            }
            if (err && !(err instanceof NotFoundException)) {
              console.error('Decoding error', err);
            }
          }
        );
      } catch (e) {
        console.error(e);
        setError(
          'Per usare questa funzione devi abilitare la fotocamera nelle impostazioni dell’iPad.'
        );
      }
    };

    start();
    return () => {
      active = false;
      codeReader.reset();
    };
  }, [detected, router]);

  return (
    <div className="container">
      <div className="top-bar">
        <h1 className="title">Scansiona LDV</h1>
        <Link href="/" className="pill">
          Torna alla Home
        </Link>
      </div>
      <p className="subtitle">Inquadra il codice a barre dell’etichetta di spedizione.</p>
      {error ? (
        <div className="card">
          <p className="error">{error}</p>
          <Link href="/" className="button" style={{ marginTop: '12px' }}>
            Torna alla Home
          </Link>
        </div>
      ) : (
        <div className="card" style={{ position: 'relative' }}>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '12px',
              border: detected ? '3px solid #22c55e' : '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <video
              ref={videoRef}
              style={{ width: '100%', borderRadius: '12px' }}
              autoPlay
              muted
              playsInline
            />
            <div
              style={{
                position: 'absolute',
                inset: '15%',
                border: '3px dashed rgba(255,255,255,0.5)',
                borderRadius: '16px',
                pointerEvents: 'none'
              }}
            />
          </div>
          <p style={{ marginTop: '12px', color: detected ? '#22c55e' : 'var(--muted)' }}>
            {detected ? `Codice rilevato: ${detected}` : 'Attendi la lettura del codice...'}
          </p>
        </div>
      )}
    </div>
  );
}
