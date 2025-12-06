'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { compressImage, captureImageFromFileInput } from '../../../lib/image';
import { saveShipmentWithPhotos } from '../../../lib/db';

type LocalPhoto = {
  id: string;
  blob: Blob;
  url: string;
};

export default function OrderPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = useMemo(() => decodeURIComponent(params.orderId), [params.orderId]);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [preview, setPreview] = useState<LocalPhoto | null>(null);
  const [saving, setSaving] = useState(false);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    urlsRef.current = [...photos.map((p) => p.url), ...(preview ? [preview.url] : [])];
  }, [photos, preview]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleCapture = async () => {
    setError(null);
    const file = await captureImageFromFileInput();
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1280, 0.7);
      const url = URL.createObjectURL(compressed);
      setPreview({ id: crypto.randomUUID(), blob: compressed, url });
    } catch (e) {
      console.error(e);
      setError('Errore durante l\'acquisizione. Riprova.');
    }
  };

  const confirmPreview = () => {
    if (!preview) return;
    setPhotos((prev) => [...prev, preview]);
    setPreview(null);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const saveShipment = async () => {
    if (photos.length === 0) {
      setError('Devi aggiungere almeno una foto prima di salvare.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveShipmentWithPhotos(orderId, photos.map((p) => p.blob));
      setToast('Spedizione salvata.');
      setTimeout(() => setToast(null), 2500);
      router.push('/registro');
    } catch (e) {
      console.error(e);
      setError('Errore durante il salvataggio. Libera spazio sul dispositivo e riprova.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <div className="top-bar">
        <h1 className="title">Nuova spedizione</h1>
        <Link href="/" className="pill">
          Torna alla Home
        </Link>
      </div>
      <div className="card">
        <p className="badge">ID ordine: {orderId}</p>
        <div className="section">
          <button className="button" onClick={handleCapture} style={{ maxWidth: '260px' }}>
            Scatta foto
          </button>
          <p className="subtitle" style={{ marginTop: '8px' }}>
            Aggiungi una o più foto della spedizione prima di salvare.
          </p>
          {error && <div className="error">{error}</div>}
          {preview && (
            <div className="modal-backdrop">
              <div className="modal-content" style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: '10px' }}>Anteprima foto</p>
                <img src={preview.url} alt="Anteprima" />
                <div className="top-nav" style={{ justifyContent: 'center', marginTop: '12px' }}>
                  <button className="button" style={{ maxWidth: '180px' }} onClick={confirmPreview}>
                    Usa questa foto
                  </button>
                  <button
                    className="button secondary"
                    style={{ maxWidth: '140px' }}
                    onClick={() => {
                      URL.revokeObjectURL(preview.url);
                      setPreview(null);
                    }}
                  >
                    Riprova
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="photo-grid">
            {photos.map((photo) => (
              <div className="photo-thumb" key={photo.id}>
                <img src={photo.url} alt="Foto" />
                <button
                  aria-label="Rimuovi foto"
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    cursor: 'pointer'
                  }}
                  onClick={() => removePhoto(photo.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="section" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="button" style={{ flex: 1, minWidth: '220px' }} onClick={saveShipment} disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva spedizione'}
          </button>
          <Link href="/" className="button secondary" style={{ flex: 1, minWidth: '160px', textAlign: 'center' }}>
            Annulla
          </Link>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
