import type { Metadata } from 'next';
import './globals.css';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Registro Spedizioni Mystery Box',
  description:
    'App offline per registrare spedizioni di mystery box con barcode e foto salvati in locale su iPad.',
  manifest: '/manifest.json',
  themeColor: '#0b1221',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <ServiceWorkerRegister />
        <main>{children}</main>
      </body>
    </html>
  );
}
