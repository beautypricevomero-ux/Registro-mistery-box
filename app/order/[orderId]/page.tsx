'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Toast from '@/app/components/Toast';
import { compressImage, captureImageFromCamera } from '@/lib/image';
import { saveShipmentWithPhotos } from '@/lib/db';

interface LocalPhoto {
  id: string;
  url: string;
  blob: Blob;
}

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(
    null
  );
  const router = useRouter();

  useEffect(() => {
    if (!orderId) {
      router.push('/');
    }
  }, [orderId, router]);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [photos, preview]);

  const handleCapture = useCallback(async () => {
    try {
      const raw = await captureImageFromCamera();
      if (!raw) return;
      const url = URL.createObjectURL(raw);
      setPreview({ url, blob: raw });
    } catch (error) {
      console.error(error);
      setToast({ message: 'Errore durante la cattura. Riprova.', type: 'error' });
    }
  }, []);

  const handleDelete = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSave = async () => {
    if (photos.length === 0) {
      setToast({ message: 'Devi aggiungere almeno una foto prima di salvare.', type: 'error' });
      return;
    }
    try {
      await saveShipmentWithPhotos(orderId, photos.map((p) => p.blob));
      setToast({ message: 'Spedizione salvata.' });
      setTimeout(() => router.push('/registro'), 800);
    } catch (error) {
      console.error(error);
      setToast({
        message: 'Errore durante il salvataggio. Libera spazio sul dispositivo e riprova.',
        type: 'error'
      });
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="topbar">
        <div>
          <h2 className="section-title">Nuova spedizione</h2>
          <div style={{ color: '#bae6fd' }}>ID ordine: {orderId}</div>
        </div>
        <Link href="/">
          <small>Home</small>
        </Link>
      </div>

      <div className="card">
        <div className="grid" style={{ gap: 12 }}>
          <button onClick={handleCapture}>Scatta foto</button>
          <div>
            <h3 className="section-title">Foto acquisite</h3>
            {photos.length === 0 && <p>Nessuna foto ancora.</p>}
            <div className="thumb-grid">
              {photos.map((photo) => (
                <div className="thumb" key={photo.id}>
                  <img src={photo.url} alt="Foto spedizione" />
                  <button className="delete" onClick={() => handleDelete(photo.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="grid" style={{ gap: 10 }}>
            <button onClick={handleSave}>Salva spedizione</button>
            <Link href="/">
              <button style={{ background: '#475569', color: '#e2e8f0' }}>Annulla</button>
            </Link>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {preview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200
          }}
        >
          <div className="card" style={{ maxWidth: '90%', width: 600 }}>
            <h3 className="section-title">Anteprima foto</h3>
            <img src={preview.url} alt="Anteprima" style={{ width: '100%', borderRadius: 12 }} />
            <div className="grid" style={{ gap: 10, marginTop: 12 }}>
              <button
                onClick={async () => {
                  try {
                    const compressed = await compressImage(preview.blob);
                    const finalUrl = URL.createObjectURL(compressed);
                    setPhotos((prev) => [...prev, { id: crypto.randomUUID(), url: finalUrl, blob: compressed }]);
                  } catch (error) {
                    console.error(error);
                    setToast({ message: 'Errore durante la compressione della foto.', type: 'error' });
                  } finally {
                    URL.revokeObjectURL(preview.url);
                    setPreview(null);
                  }
                }}
              >
                Usa questa foto
              </button>
              <button
                style={{ background: '#475569', color: '#e2e8f0' }}
                onClick={() => {
                  URL.revokeObjectURL(preview.url);
                  setPreview(null);
                  handleCapture();
                }}
              >
                Riprova
              </button>
              <button
                style={{ background: '#1f2937', color: '#e2e8f0' }}
                onClick={() => {
                  URL.revokeObjectURL(preview.url);
                  setPreview(null);
                }}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
