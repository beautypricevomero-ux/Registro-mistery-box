'use client';

import Link from 'next/link';
import { useState } from 'react';
import { clearAllData, getShipmentsByDate } from '@/lib/db';

export default function ImpostazioniPage() {
  const [confirming, setConfirming] = useState(false);
  const [info, setInfo] = useState<string>('');

  const estimate = async () => {
    // Simple estimate: count shipments today
    const today = new Date().toISOString().slice(0, 10);
    const shipments = await getShipmentsByDate(today);
    setInfo(`Spedizioni di oggi: ${shipments.length}`);
  };

  const wipe = async () => {
    await clearAllData();
    setInfo('Dati locali eliminati.');
    setConfirming(false);
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="topbar">
        <h2 className="section-title">Impostazioni</h2>
        <Link href="/">
          <small>Home</small>
        </Link>
      </div>

      <div className="card" style={{ lineHeight: 1.5 }}>
        <p>
          Tutti i dati (foto e spedizioni) sono salvati solo su questo dispositivo tramite il browser. Se l’app
          viene disinstallata o se la memoria viene svuotata, i dati potrebbero andare persi.
        </p>
        <p>Versione app: 1.0.0</p>
        <div className="grid" style={{ gap: 10 }}>
          <button onClick={estimate}>Verifica spazio utilizzato (stima)</button>
          <button onClick={() => setConfirming(true)} style={{ background: '#ef4444', color: '#fff' }}>
            Cancella tutti i dati locali
          </button>
          <Link href="/">
            <button style={{ background: '#475569', color: '#e2e8f0' }}>Torna alla Home</button>
          </Link>
        </div>
        {info && <p style={{ marginTop: 12 }}>{info}</p>}
        {confirming && (
          <div className="card" style={{ marginTop: 12, background: '#0b1224' }}>
            <p>Questa operazione eliminerà tutte le spedizioni e le foto salvate. Sei sicuro?</p>
            <div className="grid" style={{ gap: 8 }}>
              <button onClick={wipe} style={{ background: '#dc2626', color: '#fff' }}>
                Sì, elimina tutto
              </button>
              <button onClick={() => setConfirming(false)} style={{ background: '#475569', color: '#e2e8f0' }}>
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
