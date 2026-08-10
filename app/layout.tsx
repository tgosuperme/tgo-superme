import type { Metadata, Viewport } from 'next';
import { Inter_Tight, Lora } from 'next/font/google';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

import './globals.css';

/**
 * Typography follows the Dr Deepali pairing rather than the postpartum one:
 * Lora for display, Inter Tight for body. A serif headline reads considered
 * rather than energetic, which is the register this audience needs.
 */
const heading = Lora({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const body = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
  preload: false,
});

const PRICE = `${CHECKOUT_CONFIG.currencySymbol}${CHECKOUT_CONFIG.amountGbpString}`;
const START = CHECKOUT_CONFIG.startDate;

/* Description stays inside the same compliance line as the page: no outcome
   promise, no percentage, no "pain-free". */
const DESCRIPTION = `A live, coach-led 5-day pain reset challenge for adults 35+ with persistent back, neck or knee pain. Guided movement, breath work, strengthening and real-time correction. Starts ${START}, live on Zoom, for ${PRICE}.`;

export const metadata: Metadata = {
  title: '5-Day Pain Reset Challenge | SuperMe',
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    title: '5-Day Pain Reset Challenge | SuperMe',
    description: DESCRIPTION,
    siteName: 'SuperMe',
  },
  twitter: {
    card: 'summary_large_image',
    title: '5-Day Pain Reset Challenge | SuperMe',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#1054C2',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={`${heading.variable} ${body.variable}`}>
      <body>
        {/* Marks the document as JS-capable BEFORE first paint, so the CSS
            scroll reveals (.bw-js .bw-reveal-*) only hide content when JS is
            there to reveal it. No-JS users and crawlers see everything, and
            there is no reveal flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('bw-js')",
          }}
        />
        {children}
      </body>
    </html>
  );
}
