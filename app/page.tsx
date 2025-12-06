'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';

export default function HomePage() {
  const router = useRouter();

  return (
    <AppShell
      title="Registro Mistery Box"
      subtitle="Gestisci le spedizioni dal tuo iPad, in modo semplice e offline."
    >
      <div className="app-section">
        <div className="app-section-title">Azioni rapide</div>
        <p className="app-subtitle">Scegli cosa vuoi fare adesso.</p>
        <div className="app-button-row" style={{ marginTop: '1rem' }}>
          <button className="app-primary-button" onClick={() => router.push('/tipo-etichetta')}>
            Nuova spedizione
          </button>
          <button className="app-secondary-button" onClick={() => router.push('/registro')}>
            Registro del giorno
          </button>
          <button className="app-secondary-button" onClick={() => router.push('/impostazioni')}>
            Backup & impostazioni
          </button>
        </div>
      </div>

      <div className="app-section">
        <div className="app-section-title">Riepilogo rapido</div>
        <p className="app-subtitle">
          Qui puoi in futuro mostrare il numero di spedizioni di oggi e l’ultima registrata.
        </p>
      </div>
    </AppShell>
  );
}
