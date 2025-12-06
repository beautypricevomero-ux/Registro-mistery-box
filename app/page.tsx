import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <div className="card" style={{ marginTop: '40px' }}>
        <h1 className="title">Registro Spedizioni Mystery Box</h1>
        <p className="subtitle">App offline per iPad. Tutto resta salvato in locale.</p>
        <div className="grid-buttons">
          <Link href="/scan" className="button">
            Nuova spedizione
          </Link>
          <Link href="/search" className="button secondary">
            Cerca per ID
          </Link>
          <Link href="/registro" className="button secondary">
            Registro del giorno
          </Link>
        </div>
        <div style={{ marginTop: '26px', textAlign: 'right' }}>
          <Link href="/impostazioni" style={{ color: '#93c5fd', fontWeight: 600 }}>
            Impostazioni
          </Link>
        </div>
      </div>
    </div>
  );
}
