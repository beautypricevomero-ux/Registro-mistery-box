'use client';

import { BrowserMultiFormatReader } from '@zxing/browser';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let stop = false;

    async function startScan() {
      try {
        const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId = videoInputDevices[0]?.deviceId;
        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              const text = result.getText();
              setDetected(text);
              setTimeout(() => {
                if (!stop) {
                  router.push(`/order/${encodeURIComponent(text)}`);
                }
              }, 600);
            }
            if (err) {
              // ignore repeated not found errors
            }
          }
        );
        return () => controls.stop();
      } catch (e) {
        console.error(e);
        setError(
          'Per usare questa funzione devi abilitare la fotocamera nelle impostazioni dell’iPad.'
        );
      }
    }

    startScan();
    return () => {
      stop = true;
      reader.reset();
    };
  }, [router]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="topbar">
        <h2 className="section-title">Scansiona LDV</h2>
        <Link href="/">
          <small>Home</small>
        </Link>
      </div>
      <div className="card" style={{ minHeight: '70vh', position: 'relative' }}>
        {error ? (
          <div>
            <p>{error}</p>
            <Link href="/">
              <button style={{ marginTop: 12 }}>Torna alla Home</button>
            </Link>
          </div>
        ) : (
          <>
            <video ref={videoRef} style={{ width: '100%', borderRadius: 12 }} muted playsInline />
            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                right: 20,
                display: 'flex',
                justifyContent: 'center',
                color: '#cbd5e1'
              }}
            >
              Inquadra il codice a barre dell’etichetta di spedizione
            </div>
            <div
              style={{
                position: 'absolute',
                top: '30%',
                left: '10%',
                right: '10%',
                bottom: '30%',
                border: detected ? '4px solid #22c55e' : '4px dashed #38bdf8',
                borderRadius: 16,
                pointerEvents: 'none',
                transition: 'border 0.2s'
              }}
            />
            {detected && (
              <div className="toast" style={{ position: 'absolute', bottom: 16 }}>
                Codice rilevato: {detected}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
