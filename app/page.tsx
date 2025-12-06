'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="grid" style={{ alignItems: 'center', justifyItems: 'center' }}>
      <div style={{ maxWidth: 640, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: '32px', margin: '12px 0' }}>Registro Spedizioni Mystery Box</h1>
          <p style={{ color: '#cbd5e1' }}>Operatività 100% offline su questo iPad</p>
        </div>
        <div className="nav-buttons">
          <Link href="/ldv" className="link-button">
            <button>Nuova spedizione</button>
          </Link>
          <Link href="/search" className="link-button">
            <button>Cerca</button>
          </Link>
          <Link href="/registro" className="link-button">
            <button>Registro del giorno</button>
          </Link>
        </div>
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Link href="/impostazioni">
            <small>Impostazioni</small>
          </Link>
        </div>
      </div>
    </div>
  );
}
