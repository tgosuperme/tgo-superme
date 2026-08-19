import Script from 'next/script';

/**
 * Google Analytics 4 (gtag.js).
 *
 * The measurement id is public by definition, it ships in the page source of
 * every site that uses one, so it is safe to keep it in the source. It is
 * HARD-CODED: this deployment reports to the India property and nowhere else.
 * The env var that used to override it is gone on purpose — a stale
 * NEXT_PUBLIC_GA_MEASUREMENT_ID left on the host would have quietly sent
 * India's traffic to the UK property, and nothing on the page would show it.
 *
 * `afterInteractive` rather than the raw async tag: Next loads it after
 * hydration, so analytics never competes with the hero for the main thread.
 * The behaviour is identical to the snippet, the timing is just better.
 *
 * Skipped in local development so a morning of `npm run dev` does not land in
 * the real property as traffic. Preview and production both report normally.
 */

export const GA_MEASUREMENT_ID = 'G-EKT4VPX6PV';

export default function GoogleAnalytics() {
  if (process.env.NODE_ENV === 'development') return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-gtag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
