'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { blobToBase64 } from '@/lib/image';
import { getPhotoById, getShipmentsByDate, Shipment } from '@/lib/db';

interface RegistryItem {
  id: string;
  createdAt: string;
  orderId: string;
  carrier: 'GLS' | 'SPEDIZIONE_NAPOLI' | 'BARTOLINI';
  photoCount: number;
  photos: { id: string; url: string; mimeType: string }[];
  expanded: boolean;
  data: Shipment;
}

export default function RegistroPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, filter]);

  useEffect(() => {
    return () => {
      items.forEach((item) => item.photos.forEach((p) => URL.revokeObjectURL(p.url)));
    };
  }, [items]);

  const loadData = async () => {
    const shipments = await getShipmentsByDate(selectedDate);
    const normalizedFilter = filter.trim().toLowerCase();
    const filtered = normalizedFilter
      ? shipments.filter((shipment) => shipment.orderId.toLowerCase().includes(normalizedFilter))
      : shipments;
    const list: RegistryItem[] = [];
    for (const shipment of filtered) {
      const photos = [] as { id: string; url: string; mimeType: string }[];
      for (const pid of shipment.boxPhotoIds) {
        const ph = await getPhotoById(pid);
        if (ph) {
          const url = URL.createObjectURL(ph.blob);
          photos.push({ id: pid, url, mimeType: ph.mimeType });
        }
      }
      list.push({
        id: shipment.id,
        createdAt: shipment.createdAt,
        orderId: shipment.orderId,
        carrier: shipment.carrier,
        photoCount: photos.length,
        photos,
        expanded: false,
        data: shipment
      });
    }
    setItems(list.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)));
  };

  const toggle = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, expanded: !item.expanded } : item)));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const shipments = await getShipmentsByDate(selectedDate);
      const exportData: any = { date: selectedDate, shipments: [] as any[] };
      for (const shipment of shipments) {
        const boxPhotos = [] as any[];
        for (const pid of shipment.boxPhotoIds) {
          const ph = await getPhotoById(pid);
          if (ph) {
            boxPhotos.push({ mimeType: ph.mimeType, base64: await blobToBase64(ph.blob) });
          }
        }
        const labelImage = shipment.labelImageId ? await getPhotoById(shipment.labelImageId) : undefined;
        exportData.shipments.push({
          orderId: shipment.orderId,
          carrier: shipment.carrier,
          createdAt: shipment.createdAt,
          boxPhotos,
          labelImage: labelImage
            ? { mimeType: labelImage.mimeType, base64: await blobToBase64(labelImage.blob) }
            : undefined
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
            Filtra per ID ordine
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
                <div style={{ color: '#cbd5e1' }}>Corriere: {item.carrier}</div>
                <div style={{ color: '#cbd5e1' }}>
                  Ora: {new Date(item.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ color: '#cbd5e1' }}>Foto pacco: {item.photoCount}</div>
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
