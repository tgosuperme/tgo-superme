import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import Analytics from '@/components/Analytics';
import MetaPixel from '@/components/MetaPixel';
import { SITE_ORIGIN, SITE_URL } from '@/lib/site';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
  display: 'swap',
});

const TITLE = 'Book Your Free Pain Assessment Call | SuperMe';
const DESCRIPTION =
  'Free 30-minute call with the SuperMe team, using the Inner Brace Method. No obligation.';

export const metadata: Metadata = {
  metadataBase: SITE_ORIGIN,
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'SuperMe',
  },
  twitter: { card: 'summary_large_image', title: TITLE },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body>
        <MetaPixel />
        <Analytics />
        {children}
      </body>
    </html>
  );
}
