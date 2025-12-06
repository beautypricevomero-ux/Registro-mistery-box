'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clearAllData, getShipmentsByDate } from '../../lib/db';

export default function ImpostazioniPage() {
  const [counts, setCounts] = useState<{ shipments: number; photos: number } | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Rough estimate: count all shipments for the current month to provide feedback.
    const load = async () => {
      const today = new Date();
      let totalShipments = 0;
      let totalPhotos = 0;
      for (let i = 0; i < 31; i += 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const isoDate = date.toISOString().slice(0, 10);
        const entries = await getShipmentsByDate(isoDate);
        totalShipments += entries.length;
        entries.forEach((s) => {
          totalPhotos += s.photoIds.length;
        });
      }
      setCounts({ shipments: totalShipments, photos: totalPhotos });
    };
    load();
  }, []);

  const handleClear = async () => {
    const confirmed = window.confirm(
      'Questa operazione eliminerà tutte le spedizioni e le foto salvate. Sei sicuro?'
    );
    if (!confirmed) return;
    await clearAllData();
    setMessage('Dati locali cancellati.');
    setCounts({ shipments: 0, photos: 0 });
  };

  return (
    <div className="container">
      <div className="top-bar">
        <h1 className="title">Impostazioni</h1>
        <Link href="/" className="pill">
          Torna alla Home
        </Link>
      </div>
      <div className="card">
        <p className="subtitle">
          Tutti i dati (foto e spedizioni) sono salvati solo su questo dispositivo tramite il browser. Se
          l’app viene disinstallata o se la memoria viene svuotata, i dati potrebbero andare persi.
        </p>
        <p className="badge">Versione app: 1.0.0</p>
        {counts && (
          <p style={{ marginTop: '8px', color: 'var(--muted)' }}>
            Stima dati locali – Spedizioni: {counts.shipments}, Foto: {counts.photos}
          </p>
        )}
        {message && <div className="error" style={{ marginTop: '10px' }}>{message}</div>}
        <div className="section" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="button danger" style={{ maxWidth: '240px' }} onClick={handleClear}>
            Cancella tutti i dati locali
          </button>
        </div>
      </div>
    </div>
  );
}
