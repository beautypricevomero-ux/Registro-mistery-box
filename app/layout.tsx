import './globals.css';
import type { Metadata } from 'next';
import ServiceWorkerRegister from './components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Registro Spedizioni Mystery Box',
  description: 'App locale per registrare spedizioni con foto e barcode',
  manifest: '/manifest.json',
  themeColor: '#0f172a'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <ServiceWorkerRegister />
        <main>{children}</main>
      </body>
    </html>
  );
}
