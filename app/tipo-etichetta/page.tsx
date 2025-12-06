'use client';

import { useRouter } from 'next/navigation';

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
    <div className="page">
      <h1>Scegli il tipo di etichetta</h1>
      <p style={{ marginBottom: 16 }}>Seleziona il corriere per avviare la scansione.</p>
      <div className="nav-buttons">
        <button onClick={() => handleSelect('GLS')} style={{ width: '100%' }}>
          GLS
        </button>
        <button onClick={() => handleSelect('SPEDIZIONE_NAPOLI')} style={{ width: '100%' }}>
          Spedizione Napoli
        </button>
        <button onClick={() => handleSelect('BARTOLINI')} style={{ width: '100%' }}>
          Bartolini
        </button>
      </div>
    </div>
  );
}
