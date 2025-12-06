'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPhotosByShipmentId, getShipmentsByOrderId, type Shipment } from '../../lib/db';

interface ResultItem {
  shipment: Shipment;
  photos: { id: string; url: string }[];
}

export default function SearchPage() {
  const [orderId, setOrderId] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      results.forEach((r) => r.photos.forEach((p) => URL.revokeObjectURL(p.url)));
    };
  }, [results]);

  const handleSearch = async () => {
    if (!orderId.trim()) return;
    setStatus('Ricerca in corso...');
    const shipments = await getShipmentsByOrderId(orderId.trim());
    const mapped: ResultItem[] = [];
    for (const shipment of shipments) {
      const photos = await getPhotosByShipmentId(shipment.id);
      mapped.push({
        shipment,
        photos: photos.map((p) => ({ id: p.id, url: URL.createObjectURL(p.blob) }))
      });
    }
    setResults(mapped);
    setStatus(mapped.length === 0 ? 'Nessuna spedizione trovata per questo ID.' : '');
  };

  const formattedTime = (iso: string) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="container">
      <div className="top-bar">
        <h1 className="title">Cerca spedizione</h1>
        <Link href="/" className="pill">
          Torna alla Home
        </Link>
      </div>
      <div className="card">
        <label className="label" htmlFor="orderId">
          Inserisci ID ordine (LDV)
        </label>
        <input
          id="orderId"
          className="input"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Es. 1234567890"
        />
        <button className="button" style={{ marginTop: '12px', maxWidth: '220px' }} onClick={handleSearch}>
          Cerca
        </button>
        {status && <p className="subtitle" style={{ marginTop: '10px' }}>{status}</p>}
      </div>

      <div className="section">
        {results.map((item) => (
          <div className="card" key={item.shipment.id} style={{ marginTop: '16px' }}>
            <p className="badge">ID ordine: {item.shipment.orderId}</p>
            <p className="subtitle">Data: {item.shipment.date} – Ora: {formattedTime(item.shipment.createdAt)}</p>
            <div className="photo-grid">
              {item.photos.map((photo) => (
                <div className="photo-thumb" key={photo.id} onClick={() => setModal(photo.url)} style={{ cursor: 'zoom-in' }}>
                  <img src={photo.url} alt="Foto" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={modal} alt="Foto grande" />
            <button className="button secondary" style={{ marginTop: '10px', width: '100%' }} onClick={() => setModal(null)}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
