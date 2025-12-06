'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllShipments, getPhotoById } from '@/lib/db';

interface ResultItem {
  shipmentId: string;
  createdAt: string;
  code: string;
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
    const filtered = shipmentRows.filter((shipment) => shipment.code.toLowerCase().includes(q));
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
        code: shipment.code,
        photos
      });
    }
    setResults(enriched);
    setMessage(null);
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="topbar">
        <h2 className="section-title">Cerca spedizione</h2>
        <Link href="/">
          <small>Home</small>
        </Link>
      </div>

      <div className="card">
        <div className="grid" style={{ gap: 12 }}>
          <label>
            Cerca per codice spedizione
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </label>
          <button onClick={handleSearch}>Cerca</button>
        </div>
      </div>

      {message && <p>{message}</p>}

      <div className="grid" style={{ gap: 16 }}>
        {results.map((res) => (
          <div className="card" key={res.shipmentId}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700 }}>Codice: {res.code}</div>
                <div style={{ color: '#cbd5e1' }}>
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
            <button style={{ marginTop: 12 }} onClick={() => setModalUrl(null)}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
