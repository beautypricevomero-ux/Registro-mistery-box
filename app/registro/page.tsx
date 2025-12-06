'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { blobToBase64 } from '@/lib/image';
import { getPhotosByShipmentId, getShipmentsByDate } from '@/lib/db';

interface RegistryItem {
  id: string;
  orderId: string;
  createdAt: string;
  photoCount: number;
  photos: { id: string; url: string; mimeType: string }[];
  expanded: boolean;
}

export default function RegistroPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    const shipments = await getShipmentsByDate(selectedDate);
    const filtered = filter
      ? shipments.filter((s) => s.orderId.includes(filter.trim()))
      : shipments;
    const list: RegistryItem[] = [];
    for (const sh of filtered) {
      const photos = await getPhotosByShipmentId(sh.id);
      list.push({
        id: sh.id,
        orderId: sh.orderId,
        createdAt: sh.createdAt,
        photoCount: photos.length,
        photos: photos.map((p) => ({ id: p.id, url: URL.createObjectURL(p.blob), mimeType: p.mimeType })),
        expanded: false
      });
    }
    setItems(list.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, filter]);

  const toggle = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, expanded: !item.expanded } : item)));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const shipments = await getShipmentsByDate(selectedDate);
      const exportData = { date: selectedDate, shipments: [] as any[] };
      for (const sh of shipments) {
        const photos = await getPhotosByShipmentId(sh.id);
        const photoExports = [];
        for (let i = 0; i < photos.length; i++) {
          const base64 = await blobToBase64(photos[i].blob);
          photoExports.push({ index: i, mimeType: photos[i].mimeType, base64 });
        }
        exportData.shipments.push({
          orderId: sh.orderId,
          createdAt: sh.createdAt,
          photos: photoExports
        });
      }
      const filename = `registro-spedizioni-${selectedDate}.json`;
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="topbar">
        <h2 className="section-title">Registro spedizioni</h2>
        <Link href="/">
          <small>Home</small>
        </Link>
      </div>

      <div className="card">
        <div className="grid" style={{ gap: 12 }}>
          <label>
            Data
            <input
              type="date"
              className="input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>
          <label>
            Filtra per ID ordine (opzionale)
            <input className="input" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </label>
          <button onClick={loadData}>Aggiorna elenco</button>
        </div>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        {items.map((item) => (
          <div className="card" key={item.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>ID ordine: {item.orderId}</div>
                <div style={{ color: '#cbd5e1' }}>
                  Ora: {new Date(item.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ color: '#cbd5e1' }}>Foto: {item.photoCount}</div>
              </div>
              <button style={{ width: 'auto', padding: '10px 16px' }} onClick={() => toggle(item.id)}>
                Dettagli
              </button>
            </div>
            {item.expanded && (
              <div className="thumb-grid" style={{ marginTop: 12 }}>
                {item.photos.map((p) => (
                  <div key={p.id} className="thumb">
                    <img src={p.url} alt="Foto" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p>Nessuna spedizione per questa data.</p>}
      </div>

      <button onClick={handleExport} disabled={exporting}>
        {exporting ? 'Creazione file...' : 'Esporta registro del giorno'}
      </button>
    </div>
  );
}
