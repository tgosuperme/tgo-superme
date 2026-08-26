import Script from 'next/script';

/**
 * Microsoft Clarity: session replay and heatmaps.
 *
 * Same shape as the GA tag next to it. The project id is public (it ships in
 * the page source), so a working default lives here and the env var exists
 * only so a second property can be pointed at without a code change.
 *
 * Skipped in local development, so a morning of clicking around `npm run dev`
 * does not become a pile of recorded sessions.
 *
 * PRIVACY NOTE, because this one records what people do rather than counting
 * it: the registration form collects a name, an email, a phone number and a
 * town. Clarity masks input values by default, and that default must stay on
 * for this site. Check it under Settings ▸ Masking in the Clarity dashboard
 * before running traffic.
 *
 * The note this replaces leaned on card details being entered on Stripe's own
 * domain, out of Clarity's reach. That reassurance is now void AND unnecessary
 * in the same breath: there is no Stripe, and there are no card details to
 * record anywhere on this site. Masking still matters — the four fields above
 * are personal data and a session replay captures keystrokes.
 */

export const CLARITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() || 'y26epp6x9f';

export default function Clarity() {
  if (!CLARITY_PROJECT_ID) return null;
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
