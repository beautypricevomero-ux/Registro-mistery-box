'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { clearAllData, getShipmentsByDate } from '@/lib/db';

export default function ImpostazioniPage() {
  const [confirming, setConfirming] = useState(false);
  const [info, setInfo] = useState<string>('');

  const estimate = async () => {
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
    <AppShell title="Impostazioni" subtitle="Gestisci backup e spazio locale." rightSlot={<Link href="/">Home</Link>}>
      <div className="app-section" style={{ lineHeight: 1.5 }}>
        <div className="app-section-title">Informazioni</div>
        <p>
          Tutti i dati (foto e spedizioni) sono salvati solo su questo dispositivo tramite il browser. Se l’app
          viene disinstallata o se la memoria viene svuotata, i dati potrebbero andare persi.
        </p>
        <p>Versione app: 1.0.0</p>
      </div>

      <div className="app-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="app-section-title">Strumenti</div>
        <div className="app-button-row">
          <button className="app-secondary-button" onClick={estimate}>
            Verifica spazio utilizzato (stima)
          </button>
          <button
            className="app-secondary-button"
            style={{ color: '#b91c1c', borderColor: 'rgba(185,28,28,0.4)' }}
            onClick={() => setConfirming(true)}
          >
            Cancella tutti i dati locali
          </button>
          <Link href="/">
            <button className="app-secondary-button">Torna alla Home</button>
          </Link>
        </div>
        {info && <p style={{ marginTop: 8 }}>{info}</p>}
        {confirming && (
          <div className="app-section" style={{ background: '#fff5f5' }}>
            <p>Questa operazione eliminerà tutte le spedizioni e le foto salvate. Sei sicuro?</p>
            <div className="app-button-row">
              <button className="app-primary-button" style={{ background: '#ef4444' }} onClick={wipe}>
                Sì, elimina tutto
              </button>
              <button className="app-secondary-button" onClick={() => setConfirming(false)}>
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
