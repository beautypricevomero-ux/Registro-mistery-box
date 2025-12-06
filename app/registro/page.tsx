'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getPhotosByShipmentId,
  getShipmentsByDate,
  type Shipment
} from '../../lib/db';
import { blobToBase64 } from '../../lib/image';

type ShipmentWithPhotos = {
  shipment: Shipment;
  photos: { id: string; url: string; blob: Blob; mimeType: string }[];
};

const today = () => new Date().toISOString().slice(0, 10);

export default function RegistroPage() {
  const [date, setDate] = useState(today());
  const [filterId, setFilterId] = useState('');
  const [data, setData] = useState<ShipmentWithPhotos[]>([]);
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      data.forEach((item) => item.photos.forEach((p) => URL.revokeObjectURL(p.url)));
    };
  }, [data]);

  const loadData = async () => {
    setStatus('Caricamento...');
    const shipments = await getShipmentsByDate(date);
    const filtered = filterId.trim()
      ? shipments.filter((s) => s.orderId.includes(filterId.trim()))
      : shipments;
    const mapped: ShipmentWithPhotos[] = [];
    for (const shipment of filtered) {
      const photos = await getPhotosByShipmentId(shipment.id);
      mapped.push({
        shipment,
        photos: photos.map((p) => ({
          id: p.id,
          url: URL.createObjectURL(p.blob),
          blob: p.blob,
          mimeType: p.mimeType
        }))
      });
    }
    setData(mapped);
    setStatus(mapped.length === 0 ? 'Nessuna spedizione per questa data.' : '');
  };

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formattedTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  const exportDay = async () => {
    const payload: any = { date, shipments: [] as any[] };
    for (const item of data) {
      const photosBase64 = [] as any[];
      for (let i = 0; i < item.photos.length; i += 1) {
        const photo = item.photos[i];
        const base64 = await blobToBase64(photo.blob);
        photosBase64.push({ index: i, mimeType: photo.mimeType, base64 });
      }
      payload.shipments.push({
        orderId: item.shipment.orderId,
        createdAt: item.shipment.createdAt,
        photos: photosBase64
      });
    }
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registro-spedizioni-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <div className="top-bar">
        <h1 className="title">Registro spedizioni</h1>
        <Link href="/" className="pill">
          Torna alla Home
        </Link>
      </div>
      <div className="card">
        <div className="section" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '220px' }}>
            <label className="label" htmlFor="data">
              Data
            </label>
            <input
              id="data"
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label" htmlFor="filter">
              Filtra per ID ordine (opzionale)
            </label>
            <input
              id="filter"
              className="input"
              value={filterId}
              onChange={(e) => setFilterId(e.target.value)}
              placeholder="Inserisci ID ordine"
            />
          </div>
        </div>
        <div className="top-nav">
          <button className="button" style={{ maxWidth: '200px' }} onClick={loadData}>
            Aggiorna elenco
          </button>
          <button className="button secondary" style={{ maxWidth: '240px' }} onClick={exportDay}>
            Esporta registro del giorno
          </button>
        </div>
        {status && <p className="subtitle" style={{ marginTop: '10px' }}>{status}</p>}
      </div>

      <div className="section">
        {data.map((item) => (
          <div className="card" key={item.shipment.id} style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="badge">ID ordine: {item.shipment.orderId}</p>
                <p className="subtitle">Ora: {formattedTime(item.shipment.createdAt)}</p>
                <p style={{ color: 'var(--muted)' }}>Foto: {item.photos.length}</p>
              </div>
              <button className="button secondary" style={{ maxWidth: '150px' }} onClick={() => toggle(item.shipment.id)}>
                Dettagli
              </button>
            </div>
            {expanded[item.shipment.id] && (
              <div className="photo-grid" style={{ marginTop: '12px' }}>
                {item.photos.map((photo) => (
                  <div className="photo-thumb" key={photo.id}>
                    <img src={photo.url} alt="Foto" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
