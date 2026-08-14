'use client';

import Script from 'next/script';

/**
 * Meta Pixel base code.
 *
 * It is here for three reasons, only one of which is the browser event:
 *
 *   1. It sets the `_fbp` cookie. Without a Pixel on the site that cookie
 *      never exists, so the server CAPI events lose one of their strongest
 *      match keys and attribution gets noticeably worse.
 *   2. It captures `?fbclid` off the ad click into `_fbc`, which is the single
 *      best signal for tying a sale back to the exact ad.
 *   3. It fires the browser half of the funnel's three CUSTOM events.
 *
 * NO STANDARD CONVERSION EVENTS. This funnel does not send AddToCart,
 * InitiateCheckout or Purchase. It sends atc_event, ic_event and sales, which
 * is why every helper below uses fbq('trackCustom', ...) and never
 * fbq('track', ...). The names live in CHECKOUT_CONFIG.capi.events.
 *
 * PageView is the one exception and it stays: it is the Pixel's base page
 * signal, not a conversion, and removing it would break audience building and
 * stop the cookie being set on the landing page.
 *
 * Renders nothing when NEXT_PUBLIC_META_PIXEL_ID is unset, so local and
 * preview environments do not pollute the ad account with test traffic.
 */

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || '';

export default function MetaPixel() {
  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');
fbq('track','PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}

/* ── browser-side helpers ────────────────────────────────────────────────── */

type Fbq = (...args: unknown[]) => void;
function fbq(): Fbq | null {
  const w = window as unknown as { fbq?: Fbq };
  return typeof w.fbq === 'function' ? w.fbq : null;
}

/**
 * The browser half of one custom event.
 *
 * `trackCustom`, never `track`: fbq('track', 'atc_event') would be rejected as
 * an unknown STANDARD event rather than accepted as a custom one.
 *
 * eventId must be the same id the server sends for this action, so Meta
 * deduplicates the pair into a single conversion.
 */
export function trackCustom(
  eventName: string,
  eventId: string,
  params: Record<string, unknown> = {},
) {
  fbq()?.('trackCustom', eventName, params, { eventID: eventId });
}

/** A browser-side id for one action, shared with the server copy. */
export function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  /* Older Safari. Collisions do not matter here: the id only has to be unique
     between the two halves of the SAME action. */
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Reads a cookie in the browser. Used for `_fbp` and `_fbc`, which have to be
 * sent to our own server at checkout time: the Stripe webhook that eventually
 * fires the CAPI event cannot see the buyer's cookies at all.
 */
export function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const hit = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
}

/**
 * The click id, in Meta's required `fb.1.<timestamp>.<fbclid>` shape.
 *
 * Prefers the `_fbc` cookie the Pixel wrote. Falls back to building it from
 * ?fbclid in the URL, which covers the case where the Pixel script has not
 * finished loading by the time the buyer submits, and the one where an ad
 * blocker stopped it entirely but the click id is still in the address bar.
 */
export function getFbc(): string {
  const cookie = readCookie('_fbc');
  if (cookie) return cookie;
  if (typeof window === 'undefined') return '';
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : '';
}
