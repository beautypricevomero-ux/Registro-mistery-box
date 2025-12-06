'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { compressImage, captureFrameFromVideo } from '@/lib/image';
import { createShipment, saveBoxPhotos } from '@/lib/db';

type CodeData = { orderId: string; carrier: 'GLS' | 'SPEDIZIONE_NAPOLI' | 'BARTOLINI'; labelImageId?: string };

export default function NuovaSpedizionePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [codeData, setCodeData] = useState<CodeData | null>(null);
  const [boxPhotos, setBoxPhotos] = useState<{ blob: Blob; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('lastCodeData');
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as CodeData;
      if (data && data.orderId && data.carrier) {
        setCodeData({ orderId: data.orderId, carrier: data.carrier, labelImageId: data.labelImageId });
      }
    } catch (err) {
      console.error('Invalid lastCodeData', err);
    }
  }, []);

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
      boxPhotos.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setError(null);
    try {
      const blob = await captureFrameFromVideo(videoRef.current);
      const compressed = await compressImage(blob);
      const url = URL.createObjectURL(compressed);
      setBoxPhotos((prev) => [...prev, { blob: compressed, url }]);
    } catch (err) {
      console.error(err);
      setError('Impossibile scattare la foto.');
    }
  };

  const handleRemovePhoto = (url: string) => {
    setBoxPhotos((prev) => {
      const updated = prev.filter((p) => p.url !== url);
      URL.revokeObjectURL(url);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!codeData) {
      setError('Nessun codice disponibile. Torna indietro e avvia una nuova scansione.');
      return;
    }
    if (boxPhotos.length === 0) {
      setError('Devi scattare almeno una foto del pacco.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const boxPhotoIds = await saveBoxPhotos(boxPhotos.map((p) => p.blob));
      await createShipment({
        orderId: codeData.orderId,
        carrier: codeData.carrier,
        labelImageId: codeData.labelImageId,
        boxPhotoIds
      });
      boxPhotos.forEach((p) => URL.revokeObjectURL(p.url));
      setBoxPhotos([]);
      router.push('/');
      alert('Spedizione registrata.');
    } catch (err) {
      console.error(err);
      setError('Errore durante il salvataggio della spedizione.');
    } finally {
      setSaving(false);
    }
  };

  if (!codeData) {
    return (
      <AppShell title="Nuova spedizione" subtitle="Nessun codice letto. Torna indietro e riprova.">
        <div className="app-section">
          <button className="app-secondary-button" onClick={() => router.push('/')}>Home</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Nuova spedizione" subtitle="Acquisisci le foto del pacco e salva la spedizione.">
      <div className="app-section">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className="chip">Corriere: {codeData.carrier}</span>
          <span className="chip">ID ordine: {codeData.orderId}</span>
        </div>

        <div className="app-section-title">Foto pacco</div>
        {error && <div className="error-banner">{error}</div>}
        <div className="camera-box" style={{ marginTop: '0.5rem' }}>
          <video ref={videoRef} playsInline muted />
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="app-primary-button" onClick={handleCapture}>
            Scatta foto
          </button>
        </div>
        <div className="thumb-grid" style={{ marginTop: 12 }}>
          {boxPhotos.map((p) => (
            <div key={p.url} className="thumb">
              <img src={p.url} alt="Foto pacco" />
              <button onClick={() => handleRemovePhoto(p.url)} className="small">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="app-section" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="app-primary-button" onClick={handleSave} disabled={saving || boxPhotos.length === 0}>
          {saving ? 'Salvataggio...' : 'Salva spedizione'}
        </button>
        <button className="app-secondary-button" onClick={() => router.push('/')}>Annulla</button>
      </div>
    </AppShell>
  );
}
