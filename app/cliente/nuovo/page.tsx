'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ParsedFields } from '@/lib/layouts';
import { createCustomerFromOcr } from '@/lib/db';

const PENDING_KEY = 'pendingCustomerDraft';

type PendingCustomerDraft = ParsedFields & {
  ocrText: string;
  trackingFromLabel?: string;
  labelImageId: string;
};

export default function NuovoClientePage() {
  const [draft, setDraft] = useState<PendingCustomerDraft | null>(null);
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [cap, setCap] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PendingCustomerDraft;
      setDraft(parsed);
      setFullName(parsed.name || '');
      setAddress(parsed.address || '');
      setCap(parsed.cap || '');
      setCity(parsed.city || '');
      setProvince(parsed.province || '');
      setPhone(parsed.phone || '');
    }
  }, []);

  const handleConfirm = async () => {
    if (!draft) {
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
      const customer = await createCustomerFromOcr(
        {
          ...draft,
          name: fullName,
          address,
          cap,
          city,
          province,
          phone
        },
        draft.ocrText,
        notes
      );
      sessionStorage.removeItem(PENDING_KEY);
      const params = new URLSearchParams({ customerId: customer.id, labelImageId: draft.labelImageId });
      router.push(`/spedizione/nuova?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setError('Errore nel salvataggio del cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem(PENDING_KEY);
    router.push('/');
  };

  if (!draft) {
    return (
      <div className="page">
        <h1>Profilo cliente</h1>
        <p>Dati LDV non trovati. Torna alla home e ripeti la scansione.</p>
        <button onClick={() => router.push('/')}>Torna alla Home</button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Profilo cliente</h1>
      <p>Conferma o correggi i dati estratti dalla LDV.</p>
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
    </div>
  );
}
