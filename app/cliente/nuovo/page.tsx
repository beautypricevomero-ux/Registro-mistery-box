'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LabelLayoutType, ParsedFields } from '@/lib/layouts';
import { createCustomerFromOcr } from '@/lib/db';

const LAST_LDV_KEY = 'lastLdvData';

type StoredLdvData = {
  fullName?: string;
  address?: string;
  cap?: string;
  city?: string;
  province?: string;
  phone?: string;
  notes?: string;
  ocrText?: string;
  layoutType?: string;
  trackingFromLabel?: string;
  labelImageId?: string;
};

export default function NuovoClientePage() {
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [cap, setCap] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [layoutType, setLayoutType] = useState<string | null>(null);
  const [labelImageId, setLabelImageId] = useState<string | null>(null);
  const [trackingFromLabel, setTrackingFromLabel] = useState<string | null>(null);
  const [loadingLdv, setLoadingLdv] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(LAST_LDV_KEY);
    if (!raw) {
      setLoadingLdv(false);
      return;
    }

    try {
      const data = JSON.parse(raw) as StoredLdvData;
      setFullName(data.fullName ?? '');
      setAddress(data.address ?? '');
      setCap(data.cap ?? '');
      setCity(data.city ?? '');
      setProvince(data.province ?? '');
      setPhone(data.phone ?? '');
      setNotes(data.notes ?? '');
      setOcrText(data.ocrText ?? '');
      setLayoutType(data.layoutType ?? null);
      setLabelImageId(data.labelImageId ?? null);
      setTrackingFromLabel(data.trackingFromLabel ?? null);
    } catch (err) {
      console.error('Errore nel parsing di lastLdvData', err);
    } finally {
      setLoadingLdv(false);
    }
  }, []);

  const handleConfirm = async () => {
    if (!labelImageId) {
      setError('Nessun dato LDV trovato. Torna indietro e ripeti.');
      return;
    }
    if (!fullName.trim() || !address.trim()) {
      setError('Inserisci almeno nome e indirizzo per creare il profilo cliente.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const parsedFields: ParsedFields = {
        name: fullName,
        address,
        cap,
        city,
        province,
        phone,
        tracking: trackingFromLabel || undefined,
        layoutType: (layoutType as LabelLayoutType) || undefined
      };
      const customer = await createCustomerFromOcr(
        parsedFields,
        ocrText,
        notes
      );
      window.localStorage.removeItem(LAST_LDV_KEY);
      const params = new URLSearchParams({ customerId: customer.id, labelImageId });
      router.push(`/spedizione/nuova?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setError('Errore nel salvataggio del cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    window.localStorage.removeItem(LAST_LDV_KEY);
    router.push('/');
  };

  if (loadingLdv) {
    return (
      <div className="page">
        <h1>Profilo cliente</h1>
        <p>Caricamento dati dalla LDV...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Profilo cliente</h1>
      <p>Conferma o correggi i dati estratti dalla LDV.</p>
      {!ocrText && (
        <p style={{ color: 'red', marginBottom: '1rem' }}>
          Nessun dato letto dalla LDV. Compila i campi manualmente oppure torna indietro e scatta di nuovo
          l'etichetta.
        </p>
      )}
      {error && <div className="error-banner">{error}</div>}
      <div className="form-grid">
        <label>
          Nome e cognome
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          Indirizzo
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label>
          CAP
          <input value={cap} onChange={(e) => setCap(e.target.value)} />
        </label>
        <label>
          Città
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label>
          Provincia
          <input value={province} onChange={(e) => setProvince(e.target.value)} />
        </label>
        <label>
          Telefono
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          Note
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <button className="primary" onClick={handleConfirm} disabled={saving}>
          {saving ? 'Salvataggio...' : 'Conferma cliente e continua'}
        </button>
        <button className="secondary" onClick={handleCancel}>Annulla</button>
      </div>
      {ocrText && (
        <div style={{ marginTop: '1rem', padding: '0.5rem', border: '1px solid #ccc' }}>
          <strong>Testo letto dalla LDV:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{ocrText}</pre>
          {layoutType && (
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Layout rilevato: {layoutType}</p>
          )}
        </div>
      )}
    </div>
  );
}
