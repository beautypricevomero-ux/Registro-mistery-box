'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getPhotosByShipmentId, getShipmentsByOrderId } from '@/lib/db';

interface ResultItem {
  shipmentId: string;
  orderId: string;
  createdAt: string;
  photos: { id: string; url: string }[];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query) return;
    const shipments = await getShipmentsByOrderId(query.trim());
    if (shipments.length === 0) {
      setResults([]);
      setMessage('Nessuna spedizione trovata per questo ID.');
      return;
    }
    const aggregated: ResultItem[] = [];
    for (const sh of shipments) {
      const photos = await getPhotosByShipmentId(sh.id);
      aggregated.push({
        shipmentId: sh.id,
        orderId: sh.orderId,
        createdAt: sh.createdAt,
        photos: photos.map((p) => ({ id: p.id, url: URL.createObjectURL(p.blob) }))
      });
    }
    setResults(aggregated);
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
            Inserisci ID ordine (LDV)
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
                <div style={{ fontWeight: 700 }}>ID ordine: {res.orderId}</div>
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
