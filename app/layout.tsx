import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import AttributionCapture from '@/components/AttributionCapture';
import Clarity from '@/components/Clarity';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import MetaPixel from '@/components/MetaPixel';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

import LegoObserver from './_landing/lego';
import './globals.css';

/**
 * One face, Inter, across the whole site. The Lora + Inter Tight pairing it
 * replaces is gone entirely.
 *
 * Hierarchy is carried by WEIGHT and SIZE rather than by a change of face:
 * 400 body, 500/600 for emphasis and UI labels, 700/800 for headlines. Both
 * CSS variables resolve to the same font on purpose, so every existing
 * font-heading and font-body class keeps working and the roles stay named for
 * whenever a second face comes back.
 *
 * One family, one download: the extra weights ride the axis Inter already
 * ships, so they cost nothing beyond what is being loaded anyway.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
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
    <html lang="en-GB" className={inter.variable}>
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
        {/* One pair of observers for the whole document, mounted here rather
            than per-page so the lego entrances work identically on the landing
            page, the checkout and the thank-you page. Renders nothing. */}
        <LegoObserver />
        {/* Sets the _fbp cookie and captures ?fbclid into _fbc, both of which
            the checkout POSTs to our server so the Stripe webhook can send
            them on to the Conversions API. Renders nothing without a pixel id. */}
        <MetaPixel />
        {/* Last-touch UTM + first-touch referrer/landing_url into localStorage
            and a first-party cookie, read again at checkout submit. Every
            attribution field on the CRM row comes from here. */}
        <AttributionCapture />
        <GoogleAnalytics />
        <Clarity />
        {children}
      </body>
    </html>
  );
}
