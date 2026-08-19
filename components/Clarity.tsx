import Script from 'next/script';

/**
 * Microsoft Clarity: session replay and heatmaps.
 *
 * Same shape as the GA tag next to it. The project id is public (it ships in
 * the page source) and it is HARD-CODED: this deployment reports to the India
 * property and nowhere else. The env var that used to override it is gone on
 * purpose — a stale NEXT_PUBLIC_CLARITY_PROJECT_ID left on the host would have
 * quietly sent India's sessions to the UK project, with nothing on the page to
 * show for it.
 *
 * Skipped in local development, so a morning of clicking around `npm run dev`
 * does not become a pile of recorded sessions.
 *
 * PRIVACY NOTE, because this one records what people do rather than counting
 * it: the checkout form collects a name, an email and a phone number. Clarity
 * masks input values by default, and that default must stay on for this site.
 * Check it under Settings ▸ Masking in the Clarity dashboard before running
 * traffic; card details are never at risk here because they are entered on
 * Stripe's own domain, which Clarity cannot see.
 */

export const CLARITY_PROJECT_ID = 'y4nw2m76lq';

export default function Clarity() {
  if (process.env.NODE_ENV === 'development') return null;

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
    </Script>
  );
}
