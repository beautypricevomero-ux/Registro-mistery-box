'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getAllShipments, getPhotoById } from '@/lib/db';

interface ResultItem {
  shipmentId: string;
  createdAt: string;
  orderId: string;
  carrier: 'GLS' | 'SPEDIZIONE_NAPOLI' | 'BARTOLINI';
  photos: { id: string; url: string }[];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      results.forEach((r) => r.photos.forEach((p) => URL.revokeObjectURL(p.url)));
    };
  }, [results]);

  const handleSearch = async () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const shipmentRows = await getAllShipments();
    const filtered = shipmentRows.filter((shipment) => shipment.orderId.toLowerCase().includes(q));
    if (filtered.length === 0) {
      setResults([]);
      setMessage('Nessuna spedizione trovata.');
      return;
    }
    const enriched: ResultItem[] = [];
    for (const shipment of filtered) {
      const photos: { id: string; url: string }[] = [];
      for (const id of shipment.boxPhotoIds) {
        const ph = await getPhotoById(id);
        if (ph) {
          const url = URL.createObjectURL(ph.blob);
          photos.push({ id, url });
        }
      }
      enriched.push({
        shipmentId: shipment.id,
        createdAt: shipment.createdAt,
        orderId: shipment.orderId,
        carrier: shipment.carrier,
        photos
      });
    }
    setResults(enriched);
    setMessage(null);
  };

  return (
    <AppShell title="Cerca spedizione" subtitle="Trova una spedizione per ID ordine." rightSlot={<Link href="/">Home</Link>}>
      <div className="app-section">
        <div className="app-section-title">Ricerca</div>
        <div className="button-row-spread" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label>Cerca per ID ordine</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Inserisci ID ordine"
            />
          </div>
          <button className="app-primary-button" onClick={handleSearch}>
            Cerca
          </button>
        </div>
        {message && <p style={{ marginTop: 8 }}>{message}</p>}
      </div>

      <div className="app-section" style={{ display: 'grid', gap: 16 }}>
        {results.map((res) => (
          <div key={res.shipmentId} className="app-section" style={{ boxShadow: '0 6px 16px rgba(148,163,184,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>ID ordine: {res.orderId}</div>
                <div className="app-subtitle">Corriere: {res.carrier}</div>
                <div className="app-subtitle">
                  Data: {res.createdAt.slice(0, 10)} – Ora:{' '}
                  {new Date(res.createdAt).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
            <div className="thumb-grid" style={{ marginTop: 12 }}>
              {res.photos.map((p) => (
                <div key={p.id} className="thumb" onClick={() => setModalUrl(p.url)} style={{ cursor: 'pointer' }}>
                  <img src={p.url} alt="Foto" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modalUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}
          onClick={() => setModalUrl(null)}
        >
          <div style={{ maxWidth: '90%', maxHeight: '90%' }}>
            <img src={modalUrl} alt="Foto grande" style={{ maxWidth: '100%', maxHeight: '100%' }} />
            <button style={{ marginTop: 12 }} className="app-secondary-button" onClick={() => setModalUrl(null)}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
