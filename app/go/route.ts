import { randomUUID } from 'node:crypto';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { canonicalCheckoutUrl } from '@/lib/checkout-url';
import { browserContext, capiConfigured, sendCapiEvent } from '@/lib/meta-capi';
import { paymentPageFor, resolveOffer } from '@/lib/offer';
import { chunkRefId, type Attr } from '@/lib/refid';
import { parseVariantCookie, VARIANT_COOKIE } from '@/lib/variants';

/**
 * /go — the CTA target, and the last moment we are the server answering the
 * buyer's own browser.
 *
 * Every CTA on the site points here rather than at the Razorpay page directly.
 * Nothing renders; it reads what only a first-party request can read, stamps it
 * into the payment, and redirects.
 *
 * ── IT FIRES ic_event, SERVER-SIDE ──────────────────────────────────────────
 * This is the "buyer tapped pay" moment: they have chosen a tier on /checkout
 * and are being handed to Razorpay. Nothing later in the funnel is a request
 * from their browser, so this is the LAST point an InitiateCheckout-shaped
 * event can be reported with the buyer's real IP, user agent and cookies.
 *
 * There is deliberately no Facebook Pixel id configured on either Razorpay
 * Payment Page. That is a Health & Wellness decision, not an oversight:
 * Razorpay's integration fires Meta's STANDARD Purchase event, which is
 * blocked by name for a restricted dataset, so it would report nothing while
 * looking like it worked. Every event in this funnel is sent server-side from
 * our own code — atc_event from /api/track, ic_event here, `sales` from the
 * Razorpay webhook.
 *
 * AWAITED, not fired and forgotten. A serverless function can be frozen the
 * instant it returns a response, and a dangling promise would simply never be
 * delivered. The cost is one Graph API round trip in front of the redirect;
 * failures are swallowed so a Meta outage can never block a payment.
 *
 * What this route also does, and why it still has to exist, is CAPTURE. The
 * identifiers below live only in the buyer's browser and die the moment they
 * leave for a payment page we do not host, so they are read here and carried
 * through the payment in `ref_id` for the webhook to hand to the CRM.
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

/**
 * Which Razorpay page this buyer opens.
 *
 * Razorpay's own page, NOT the rzp.io shortlink: a redirect is not guaranteed
 * to preserve query parameters, and an attribution blob dropped by a redirect
 * is the kind of failure nobody notices for a month.
 *
 * THE PAGE DEPENDS ON THE CLOCK. A Payment Page's amount is fixed in the
 * Razorpay dashboard, so the ₹497 / ₹697 / ₹997 ladder is three separate
 * pages and this route picks the one whose step is live. Resolved per request
 * rather than at module load, for the same reason the price on the page is:
 * a warm lambda would keep sending buyers to the ₹497 page for hours after
 * the rise. See lib/offer.ts.
 */
async function pageUrlFor(product: 'base' | 'vip', now: Date): Promise<string> {
  /* Resolved through canonicalCheckoutUrl because the link the Razorpay
     dashboard offers is an rzp.io shortlink, and that shortlink DROPS THE
     QUERY STRING on its 302 — which would throw away the ref_id this entire
     route exists to attach. See lib/checkout-url.ts. */
  return canonicalCheckoutUrl(paymentPageFor(product, now));
}

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

  /* Set before first paint by VARIANT_SCRIPT. A server route cannot read
     localStorage, so the cookie is the only copy that survives the hop. */
  const variant = parseVariantCookie(cookie(jar, VARIANT_COOKIE));
  const offer = resolveOffer();

  /* Which tier the buyer picked in the selector. Anything unrecognised is
     treated as the base product: an unreadable parameter must land somebody on
     the cheaper page, never the dearer one. */
  const product: 'base' | 'vip' = q.get('product') === 'vip' ? 'vip' : 'base';

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
    /* Which ad copy sold this seat. The URL wins over the cookie for the same
       reason the UTMs do — someone can land straight on a CTA with ?h= before
       the pre-paint script has run for that page view. */
    h: clean(q.get('h') || variant.headline, 1) || undefined,
    w: clean(q.get('p') || variant.pain, 8) || undefined,
    /* The rung this buyer bought at, recorded rather than inferred later from
       the amount: the amounts are configurable and a step could be repriced,
       at which point historic rows would be re-read as the wrong step. */
    g: String(offer.stepIndex),
    /* Which tier. Recorded here because the hosted Payment Page cannot tell
       us — with no API keys there is no order to stamp, so the only place
       this can be captured is the last request we serve. */
    k: product,
  };

  /* Razorpay rejects a `notes` value over 512 characters AT SUBMIT — the field
     happily prefills longer than that, so an over-long token looks fine on the
     page and then blocks the payment. Chunked across ref_id and ref_id2, both
     of which must exist as input fields on the Payment Page. */
  /**
   * An unset or malformed page URL must not become a 500.
   *
   * `new URL('')` throws, and an unconfigured tier is the likeliest state of
   * this route on a fresh environment — so without this guard the very first
   * thing anyone testing the funnel meets is a stack trace, with nothing on
   * screen saying which variable is missing.
   *
   * The buyer goes back to /checkout with a flag the page can explain, and the
   * log names the exact env var. Never falls through to the OTHER tier's page:
   * sending a Standard buyer to the VIP page charges them ₹999.
   */
  const now = new Date();

  /* The ₹997 rung is a SEPARATE Razorpay page — a hosted page's amount is
     fixed in the dashboard — so if the ladder has stepped up and that page is
     not configured, paymentPageFor falls back to the ₹497 page and the site
     quietly sells at the old price. That fallback is the right call in the
     moment (a live buyer beats a dead button) but it must not be silent. */
  if (offer.stepIndex >= 2 && product === 'base') {
    const step2 =
      process.env.RAZORPAY_PAGE_BASE_STEP_2?.trim() ||
      process.env.NEXT_PUBLIC_RAZORPAY_PAGE_BASE_STEP_2?.trim();
    if (!step2) {
      console.error(
        `[go] price step ${offer.stepIndex} (${offer.priceLabel}) is live but ` +
          'NEXT_PUBLIC_RAZORPAY_PAGE_BASE_STEP_2 is unset — this buyer is being ' +
          'sent to the step-1 page and will be charged the OLD price',
      );
    }
  }

  const target = await pageUrlFor(product, now);
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    const envVar =
      product === 'vip'
        ? 'NEXT_PUBLIC_RAZORPAY_PAGE_VIP'
        : 'NEXT_PUBLIC_RAZORPAY_PAGE_BASE';
    console.error(
      `[go] ${envVar} is not set or is not a valid URL (got ${JSON.stringify(target)}) — ` +
        `cannot send this buyer to a ${product} checkout`,
    );
    return Response.redirect(
      new URL(`${CHECKOUT_CONFIG.checkoutPath}?unavailable=${product}`, req.url).toString(),
      302,
    );
  }

  chunkRefId(attr).forEach((chunk, i) => {
    url.searchParams.set(i === 0 ? 'ref_id' : `ref_id${i + 1}`, chunk);
  });

  /* ── Meta Conversions API · ic_event ──────────────────────────────────
     Sent from here because this request is the buyer's own browser and the
     next one will not be: everything after this belongs to Razorpay.

     No PII yet — the name, email and phone are typed on Razorpay's page, not
     ours — so this event carries the four browser keys and nothing else. That
     is expected, and it is why `sales` is the event the ad account optimises
     on rather than this one.

     NO VALUE OR CURRENCY, matching the rule stated in lib/meta-capi.ts:
     `sales` is the only event in this funnel that carries money. Nobody has
     paid at this point, and reporting ₹497 of intent as though it were
     revenue would train value-based bidding on money that does not exist.

     The event id is derived from the same uuid the token carries, suffixed so
     it is unmistakable in Events Manager and can never be confused with the
     `sales` event that reuses the bare uuid as purchase_event_id. */
  if (capiConfigured()) {
    try {
      await sendCapiEvent({
        eventName: CHECKOUT_CONFIG.capi.events.initiateCheckout,
        eventId: `${eventId}-ic`,
        /* Seconds, not milliseconds. Meta rejects the latter. */
        eventTime: Math.floor(Date.now() / 1000),
        /* Reduced to the origin inside sendCapiEvent, per the H&W rules. */
        eventSourceUrl: req.url,
        user: {
          fbp: fbp || undefined,
          fbc: fbc || undefined,
          clientIp: clientIp || undefined,
          clientUserAgent: clientUserAgent || undefined,
        },
      });
    } catch (err) {
      /* Swallowed, never thrown. A reporting outage must not stand between a
         buyer and a payment page; the redirect below happens regardless. */
      console.error(`[go] ic_event failed for ${eventId}`, err);
    }
  }

  /* 302, not 307: this is a GET and a redirect endpoint is what browsers
     expect to be temporary. */
  return Response.redirect(url.toString(), 302);
}
