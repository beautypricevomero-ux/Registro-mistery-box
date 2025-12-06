'use client';

import Link from 'next/link';

export default function ClienteNonUsatoPage() {
  return (
    <div className="page">
      <h1>Pagina non utilizzata</h1>
      <p>Il profilo cliente non è più richiesto. Torna alla home e avvia una nuova spedizione.</p>
      <Link href="/">Torna alla Home</Link>
    </div>
  );
}
