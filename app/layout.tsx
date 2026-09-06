import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import AttributionCapture from '@/components/AttributionCapture';
import Clarity from '@/components/Clarity';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import MetaPixel from '@/components/MetaPixel';
import { inr, OFFER } from '@/lib/offer';
import { SITE_ORIGIN, SITE_URL } from '@/lib/site';
import { VARIANT_SCRIPT } from '@/lib/variants';

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

/* Both read from lib/offer.ts, the file that owns the ladder, rather than from
   checkout-config's single frozen price. The two disagreed: the share card and
   the search snippet were advertising a start date that had already passed.

   The PRICE here is the FIRST rung, deliberately, and it is the one place on
   the site that is allowed to be a fixed figure. Metadata is evaluated once at
   build time — it cannot be resolved per request the way every visible price
   is — so quoting the live rung would freeze whichever rung happened to be
   current when the build ran and then go stale. The opening price is the
   honest thing to put on a share card, and it matches the ad creative. */
const PRICE = inr(OFFER.priceSteps[0].amount);
const START = OFFER.startDate;

/* Description stays inside the same compliance line as the page: no outcome
   promise, no percentage, no "pain-free". */
const DESCRIPTION = `A live, coach-led 5-day pain reset challenge for adults 35+ with persistent back, neck or knee pain. Guided movement, breath work, strengthening and real-time correction. Starts ${START}, live on Zoom, for ${PRICE}.`;

export const metadata: Metadata = {
  /* Every relative URL below — canonical, og:url, images — resolves against
     this. Without it Next emits relative og tags, which crawlers and the
     WhatsApp/Facebook scrapers cannot follow. */
  metadataBase: SITE_ORIGIN,
  title: '5-Day Pain Reset Challenge | SuperMe',
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
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
  /* REQUIRED for env(safe-area-inset-*) to return anything but 0.
     Three components already ask for it — the landing sticky CTA, the mobile
     CTA bar and the checkout picker's bottom bar all pad themselves with
     env(safe-area-inset-bottom) so the iPhone home indicator does not sit on
     top of the button. Without viewport-fit=cover iOS resolves every one of
     those to 0px and the padding silently does nothing, which is precisely
     how the bottom third of "Reserve My Spot" ended up under the indicator
     on every iPhone X and later.
     The cost is that content may now run under the notch in LANDSCAPE, so
     anything full-bleed must pad with the left/right insets — globals.css
     does that for the fixed bars. */
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={inter.variable}>
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
        {/* Ad message match, and it has to run HERE — before first paint and
            before the hero exists — or the reader sees variant A swap to
            variant B, which is worse than never matching at all. Sets data-h
            and data-p on <html>; CSS in globals.css does the rest. Also
            mirrors both values to a cookie, the only copy /go can read.
            See lib/variants.ts. */}
        <script dangerouslySetInnerHTML={{ __html: VARIANT_SCRIPT }} />
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
