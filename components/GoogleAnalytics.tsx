import Script from 'next/script';

/**
 * Google Analytics 4 (gtag.js).
 *
 * The measurement id is public by definition, it ships in the page source of
 * every site that uses one, so it is safe to keep a working default here. The
 * env var exists so a second property (a staging one, say) can be pointed at
 * without a code change.
 *
 * `afterInteractive` rather than the raw async tag: Next loads it after
 * hydration, so analytics never competes with the hero for the main thread.
 * The behaviour is identical to the snippet, the timing is just better.
 *
 * Skipped in local development so a morning of `npm run dev` does not land in
 * the real property as traffic. Preview and production both report normally.
 */

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || 'G-BX2CK1ZSGB';

export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;
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
