'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compressImage, captureFrameFromVideo } from '@/lib/image';
import { createShipment, saveBoxPhotos } from '@/lib/db';

type CodeData = { code: string; labelImageId?: string };

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
      if (data && data.code) {
        setCodeData({ code: data.code, labelImageId: data.labelImageId });
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
      setError('Nessun codice disponibile. Torna indietro e leggi la LDV.');
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
      await createShipment({ code: codeData.code, labelImageId: codeData.labelImageId, boxPhotoIds });
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
      <div className="page">
        <h1>Nuova spedizione</h1>
        <p>Nessun codice letto. Torna indietro e leggi prima il codice dalla LDV.</p>
        <button onClick={() => router.push('/')}>Home</button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Nuova spedizione</h1>
      <div className="card">
        <p>
          Codice spedizione: <strong>{codeData.code}</strong>
        </p>
      </div>

      <section style={{ marginTop: 16 }}>
        <h2>Foto pacco</h2>
        {error && <div className="error-banner">{error}</div>}
        <div className="camera-box">
          <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 12, background: '#111' }} />
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={handleCapture}>Scatta foto</button>
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
      </section>

      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <button className="primary" onClick={handleSave} disabled={saving || boxPhotos.length === 0}>
          {saving ? 'Salvataggio...' : 'Salva spedizione'}
        </button>
        <button className="secondary" onClick={() => router.push('/')}>Annulla</button>
      </div>
    </div>
  );
}
