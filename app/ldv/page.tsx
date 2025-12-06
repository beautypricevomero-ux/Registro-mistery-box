'use client';

import Link from 'next/link';

export default function LdvPage() {
  return (
    <div className="page">
      <h1>Scansione LDV disattivata</h1>
      <p>Usa il nuovo flusso:</p>
      <ul style={{ marginTop: 8, marginBottom: 16 }}>
        <li>1. Vai su "Nuova spedizione"</li>
        <li>2. Scegli il tipo di etichetta</li>
        <li>3. Scansiona barcode o RIF</li>
      </ul>
      <Link href="/tipo-etichetta">
        <button>Vai alla scelta etichetta</button>
      </Link>
    </div>
  );
}
