import { randomUUID } from 'node:crypto';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { browserContext, capiConfigured, sendCapiEvent } from '@/lib/meta-capi';
import { chunkRefId, type Attr } from '@/lib/refid';

/**
 * /go — the CTA target, and the last moment we are the server answering the
 * buyer's own browser.
 *
 * Every CTA on the site points here rather than at the Razorpay page directly.
 * Nothing renders; it reads what only a first-party request can read, fires
 * atc_event, and redirects.
 *
 * ── WHY THIS ROUTE HAS TO EXIST ─────────────────────────────────────────────
 * Four Meta match keys live ONLY in the buyer's browser, and all four die the
 * moment the buyer leaves for a payment page we do not host:
 *
 *     _fbp                our cookie
 *     _fbc                our cookie, or rebuilt from ?fbclid
 *     client_ip_address   this request's IP
 *     client_user_agent   this request's UA
 *
 * The Razorpay webhook cannot supply any of them — that request comes from
 * Razorpay's servers, so its IP is Razorpay's and it carries none of our
 * cookies. Read them there and you would report a datacentre as the buyer.
 * So they are captured HERE and carried through the payment in `ref_id`.
 *
 * This also depends on lib/track.ts mirroring attribution to a COOKIE and not
 * only to localStorage. A server route cannot read localStorage. That mirror
 * went in for ITP resilience; it is what makes this route possible at all.
 */

export const runtime = 'nodejs';
/* Without this Next caches the redirect and every buyer inherits the first
   buyer's ref_id — one attribution blob shared by the whole cohort. */
export const dynamic = 'force-dynamic';

/** Razorpay's own page. NOT the rzp.io shortlink: a redirect is not guaranteed
    to preserve query parameters, and an attribution blob dropped by a redirect
    is the kind of failure nobody notices for a month. */
const PAGE_URL =
  process.env.NEXT_PUBLIC_RAZORPAY_PAGE_URL?.trim() ||
  'https://pages.razorpay.com/pl_TS7plD5cahZ5oX/view';

function cookie(header: string, name: string): string {
  const hit = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
}

/** Trim, strip anything that would break a query string, and cap. */
function clean(v: unknown, max: number): string {
  return String(v ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, max);
}

export async function GET(req: Request) {
  const jar = req.headers.get('cookie') ?? '';
  const { clientIp, clientUserAgent } = browserContext(req);

  /* Last-touch UTM + first-touch referrer/landing_url, written by
     lib/track.ts. Malformed JSON is treated as absent rather than fatal. */
  let stored: Record<string, unknown> = {};
  try {
    const raw = cookie(jar, 'superme_attr');
    if (raw) stored = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* a corrupt cookie is not a reason to block a buyer */
  }

  /* Live URL wins over the stored set: someone can land straight on a CTA with
     fresh attribution before captureParams() has run for that page. */
  const q = new URL(req.url).searchParams;
  const pick = (urlKey: string, storeKey: string) =>
    clean(q.get(urlKey) || stored[storeKey], 200);

  const fbclid = clean(q.get('fbclid') || stored.fbclid, 255);
  const ts = Number(stored.ts) > 0 ? Number(stored.ts) : Date.now();

  /* HYBRID fbc. The cookie when the Pixel wrote one, otherwise rebuilt from the
     click id — which is the normal case on iOS and inside in-app browsers,
     exactly the traffic where attribution is worth most. Built ONCE here so the
     same value reaches atc_event, the token, `sales` and the CRM row. */
  const fbcCookie = cookie(jar, '_fbc');
  const fbc = fbcCookie || (fbclid ? `fb.1.${ts}.${fbclid}` : '');
  const fbp = cookie(jar, '_fbp');

  /* One id: event_id for atc_event, and later lead_id and purchase_event_id
     on the sale. Minted here so every event about this buyer shares it. */
  const eventId = randomUUID();

  const attr: Attr = {
    i: eventId,
    p: fbp || undefined,
    c: fbc || undefined,
    a: clientIp || undefined,
    u: clientUserAgent || undefined,
    s: pick('utm_source', 'source') || undefined,
    m: pick('utm_medium', 'medium') || undefined,
    n: pick('utm_campaign', 'campaign') || undefined,
    o: pick('utm_content', 'content') || undefined,
    t: pick('utm_term', 'term') || undefined,
    d: pick('utm_id', 'utm_id') || undefined,
    r: clean(stored.referrer, 400) || undefined,
    l: clean(stored.landing_url, 400) || undefined,
  };

  /* ── atc_event ──────────────────────────────────────────────────────────
     AWAITED, not fire-and-forget: a serverless function can be frozen the
     instant it returns a response, and a dangling promise is simply never
     delivered. Wrapped, because a Meta outage must never stop someone paying. */
  if (capiConfigured()) {
    try {
      await sendCapiEvent({
        eventName: CHECKOUT_CONFIG.capi.events.addToCart,
        eventId,
        eventTime: Math.floor(Date.now() / 1000),
        eventSourceUrl: req.headers.get('referer') ?? '',
        user: { fbp, fbc, clientIp, clientUserAgent },
      });
    } catch (err) {
      console.error('[go] atc_event failed', err);
    }
  }

  /* Razorpay rejects a `notes` value over 512 characters AT SUBMIT — the field
     happily prefills longer than that, so an over-long token looks fine on the
     page and then blocks the payment. Chunked across ref_id and ref_id2, both
     of which must exist as input fields on the Payment Page. */
  const url = new URL(PAGE_URL);
  chunkRefId(attr).forEach((chunk, i) => {
    url.searchParams.set(i === 0 ? 'ref_id' : `ref_id${i + 1}`, chunk);
  });

  /* 302, not 307: this is a GET and a redirect endpoint is what browsers
     expect to be temporary. */
  return Response.redirect(url.toString(), 302);
}
