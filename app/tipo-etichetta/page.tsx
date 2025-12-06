'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';

const CARRIER_KEY = 'currentCarrier';

type Carrier = 'GLS' | 'SPEDIZIONE_NAPOLI' | 'BARTOLINI';

export default function TipoEtichettaPage() {
  const router = useRouter();

  const handleSelect = (carrier: Carrier) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CARRIER_KEY, carrier);
    }
    if (carrier === 'BARTOLINI') {
      router.push('/scan/rif-bartolini');
    } else {
      router.push('/scan/barcode');
    }
  };

  return (
    <AppShell title="Nuova spedizione" subtitle="Seleziona il corriere per questa etichetta.">
      <div className="app-section">
        <div className="app-section-title">Tipo di etichetta</div>
        <div className="app-button-row" style={{ marginTop: '0.75rem' }}>
          <button className="app-primary-button" onClick={() => handleSelect('GLS')}>
            GLS
          </button>
          <button className="app-secondary-button" onClick={() => handleSelect('SPEDIZIONE_NAPOLI')}>
            Spedizione Napoli
          </button>
          <button className="app-secondary-button" onClick={() => handleSelect('BARTOLINI')}>
            Bartolini (RIF)
          </button>
        </div>
      </div>
    </AppShell>
  );
}
