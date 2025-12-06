'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { compressImage, captureFrameFromVideo } from '@/lib/image';
import {
  createShipment,
  getCustomer,
  saveBoxPhotos
} from '@/lib/db';

export default function NuovaSpedizionePage() {
  const params = useSearchParams();
  const customerId = params.get('customerId');
  const labelImageId = params.get('labelImageId');
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [customer, setCustomer] = useState<Awaited<ReturnType<typeof getCustomer>> | null>(null);
  const [boxPhotos, setBoxPhotos] = useState<{ blob: Blob; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    getCustomer(customerId).then((c) => setCustomer(c || null));
  }, [customerId]);

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
    if (!customerId || !labelImageId || !customer) {
      setError('Dati mancanti per salvare la spedizione.');
      return;
    }
    if (boxPhotos.length === 0) {
      setError('Devi scattare almeno una foto del pacco per registrare la spedizione.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const boxPhotoIds = await saveBoxPhotos(boxPhotos.map((p) => p.blob));
      await createShipment({
        customerId,
        labelImageId,
        boxPhotoIds,
        ocrText: customer.ocrText,
        tracking: customer.trackingFromLabel,
        layoutType: customer.layoutType
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

  if (!customerId || !labelImageId) {
    return (
      <div className="page">
        <h1>Nuova spedizione</h1>
        <p>Dati mancanti. Torna alla home.</p>
        <button onClick={() => router.push('/')}>Home</button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Nuova spedizione</h1>
      {customer ? (
        <div className="card">
          <div><strong>Cliente:</strong> {customer.fullName}</div>
          <div>{customer.address}</div>
          <div>
            {customer.cap} {customer.city} {customer.province ? `(${customer.province})` : ''}
          </div>
          {customer.phone && <div>Telefono: {customer.phone}</div>}
        </div>
      ) : (
        <p>Caricamento cliente...</p>
      )}

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
              <button onClick={() => handleRemovePhoto(p.url)} className="small">✕</button>
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
