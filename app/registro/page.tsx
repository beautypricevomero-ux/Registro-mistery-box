'use client';

// @ts-ignore
import { Buffer } from 'buffer';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { blobToBase64 } from '@/lib/image';
import { getPhotoById, getPhotosByShipmentId, getShipmentsByDate, Photo, Shipment } from '@/lib/db';

interface RegistryItem {
  id: string;
  createdAt: string;
  orderId: string;
  carrier: 'GLS' | 'SPEDIZIONE_NAPOLI' | 'BARTOLINI';
  photoCount: number;
  photos: { id: string; url: string; mimeType: string; blob: Blob }[];
  expanded: boolean;
  data: Shipment;
}

export default function RegistroPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).Buffer = (window as any).Buffer || Buffer;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    return () => {
      items.forEach((item) => item.photos.forEach((p) => URL.revokeObjectURL(p.url)));
    };
  }, [items]);

  const loadData = async () => {
    const shipments = await getShipmentsByDate(selectedDate);
    const list: RegistryItem[] = [];
    for (const shipment of shipments) {
      const rawPhotos: Photo[] = await getPhotosByShipmentId(shipment.id);
      const photos = rawPhotos.map((ph) => ({
        id: ph.id,
        url: URL.createObjectURL(ph.blob),
        mimeType: ph.mimeType,
        blob: ph.blob
      }));
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

  const filteredItems = items.filter((item) =>
    item.orderId.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

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

  const handleExportCsv = () => {
    if (filteredItems.length === 0) {
      alert('Non ci sono spedizioni da esportare.');
      return;
    }

    let csv = 'orderId;createdAt;boxPhotos\n';
    for (const s of filteredItems) {
      const orderId = s.orderId.replace(/;/g, ',');
      const createdAt = new Date(s.createdAt).toISOString();
      const numPhotos = s.photoCount ?? 0;
      csv += `${orderId};${createdAt};${numPhotos}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = selectedDate || new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `registro-spedizioni-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const blobToArrayBuffer = async (blob: Blob) => {
    return blob.arrayBuffer();
  };

  const handleExportExcelWithPhotos = async () => {
    if (filteredItems.length === 0) {
      alert('Non ci sono spedizioni da esportare.');
      return;
    }

    const ExcelJS = (await import('exceljs')).default;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registro');

    worksheet.columns = [
      { header: 'ID ordine', key: 'orderId', width: 30 },
      { header: 'Data e ora', key: 'createdAt', width: 25 },
      { header: 'Foto pacco', key: 'photos', width: 40 }
    ];

    let rowIndex = 2;

    for (const s of filteredItems) {
      const row = worksheet.getRow(rowIndex);
      row.getCell('orderId').value = s.orderId;
      row.getCell('createdAt').value = new Date(s.createdAt).toISOString();

      row.height = 80;

      const photos = s.photos || [];
      let imageRowTop = rowIndex;
      for (const photo of photos) {
        const arrayBuffer = await blobToArrayBuffer(photo.blob);
        const imageId = workbook.addImage({
          buffer: Buffer.from(arrayBuffer),
          extension: 'jpeg'
        });

        worksheet.addImage(imageId, {
          tl: { col: 2, row: imageRowTop - 1 + 0.1 },
          br: { col: 3, row: imageRowTop - 1 + 0.9 },
          editAs: 'oneCell'
        });

        imageRowTop += 0.9;
      }

      row.commit();
      rowIndex++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const dateStr = selectedDate || new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registro-spedizioni-${dateStr}-con-foto.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
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
          <button onClick={loadData}>Aggiorna elenco</button>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '0.5rem' }}>Cerca per ID ordine:</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Inserisci ID ordine"
          style={{ padding: '0.25rem 0.5rem', minWidth: '240px' }}
        />
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #444', textAlign: 'left', padding: '0.5rem' }}>ID ordine</th>
              <th style={{ borderBottom: '1px solid #444', textAlign: 'left', padding: '0.5rem' }}>Data e ora</th>
              <th style={{ borderBottom: '1px solid #444', textAlign: 'left', padding: '0.5rem' }}>Foto pacco</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '0.5rem' }}>
                  Nessuna spedizione trovata per questa data / filtro.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td style={{ borderBottom: '1px solid #333', padding: '0.5rem' }}>{item.orderId}</td>
                  <td style={{ borderBottom: '1px solid #333', padding: '0.5rem' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td style={{ borderBottom: '1px solid #333', padding: '0.5rem' }}>
                    {item.photos.length === 0 ? (
                      <span>Nessuna foto</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {item.photos.map((photo) => (
                          <a
                            key={photo.id}
                            href={photo.url}
                            download={`pacco-${item.orderId}-${photo.id}.jpg`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={photo.url}
                              alt="Foto pacco"
                              style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={handleExport} disabled={exporting}>
          {exporting ? 'Creazione file...' : 'Esporta registro del giorno'}
        </button>
        <button onClick={handleExportCsv}>Esporta CSV per Excel</button>
        <button onClick={handleExportExcelWithPhotos}>Esporta Excel con foto</button>
      </div>
    </div>
  );
}
