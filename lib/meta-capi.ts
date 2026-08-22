import { createHash } from 'node:crypto';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

/**
 * Meta Conversions API for the 5-Day Pain Reset.
 *
 * ── THE THREE EVENTS ────────────────────────────────────────────────────────
 * This funnel reports CUSTOM events, not Meta's standard ones. No AddToCart,
 * no InitiateCheckout, no Purchase. The ad account optimises on these three
 * and nothing else:
 *
 *     atc_event   the reader taps a CTA on the landing page
 *     ic_event    the buyer taps the pay button on the checkout page
 *     sales       the money actually moved, confirmed on the Stripe webhook
 *
 * Custom events are sent exactly like standard ones: the name simply is not
 * one Meta reserves, so it arrives as a custom conversion and gets used from
 * Events Manager.
 *
 * ── THAT IS NOT A STYLE CHOICE, IT IS THE RESTRICTION ───────────────────────
 * This dataset is categorised "Health and wellness condition". Meta blocks
 * mid/lower-funnel STANDARD events BY NAME for such datasets — Purchase,
 * AddToCart, InitiateCheckout, Subscribe, Lead — while confirmed custom events
 * with PHI-free payloads keep flowing and keep optimising. So the three names
 * above are the whole conversion surface, and reintroducing any standard event
 * would take the funnel's reporting down with it.
 *
 * Two payload rules follow from the same restriction, both enforced below in
 * sendCapiEvent so no caller can regress them:
 *   · custom_data carries value and currency ONLY — no content_name, no
 *     product or category string. "Pain Reset" is a condition term.
 *   · event_source_url is reduced to the ORIGIN. The path and query would hand
 *     Meta the landing page's UTMs and fbclid on every event.
 *
 * ── SERVER ONLY. THE BROWSER FIRES NOTHING BUT PageView ─────────────────────
 * All three events are sent from here and ONLY from here. There is no browser
 * half to deduplicate against.
 *
 * The Pixel stays on the page for its cookies — `_fbp`, and `_fbc` from the ad
 * click — because those are two of the strongest match keys these server
 * events carry. It just is not asked to report conversions, which it does
 * badly: ad blockers, ITP, iOS and a buyer closing the tab on Stripe's success
 * redirect all cost it events the server never loses.
 *
 * Every event still carries an event_id. With one copy there is no pair to
 * collapse, but the id is what makes a retry, a double-click or a replayed
 * Stripe webhook land as one conversion rather than several.
 *
 * ── THE PARAMETER PROBLEM, AND HOW IT IS SOLVED ─────────────────────────────
 * An event is only as good as its match keys, and four of them exist ONLY in
 * the buyer's browser:
 *
 *     _fbp                 the Pixel's own browser cookie
 *     _fbc                 the click id, derived from ?fbclid on the ad click
 *     client_ip_address    the buyer's IP
 *     client_user_agent    the buyer's browser
 *
 * atc_event and ic_event are sent from a request the buyer's own browser made,
 * so the IP and user agent come straight off that request and the cookies come
 * in the body.
 *
 * `sales` is the hard one. The Stripe webhook cannot read any of the four: that
 * request comes from Stripe's servers, so its IP is Stripe's, its user agent is
 * Stripe's, and it carries none of our cookies. Reading them there would send
 * Meta a datacentre instead of a buyer. So they are captured at checkout time
 * and carried through the payment:
 *
 *     browser  ──POST /api/checkout──▶  server captures IP + UA from the
 *     (_fbp, _fbc, page URL)            request, mints an event_id, and writes
 *                                       all of it into the Checkout Session's
 *                                       metadata
 *                                              │
 *                                              ▼
 *                                    Stripe stores it on the session
 *                                              │
 *                        checkout.session.completed hands it all back
 *                                              │
 *                                              ▼
 *                                    webhook fires the `sales` event
 *
 * Stripe's metadata is the Razorpay `notes` of this flow: up to 50 keys, 500
 * characters per value, returned verbatim on the webhook. No database needed.
 */

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || 'v21.0';

/** The only three names this funnel is allowed to send. */
export const CAPI_EVENTS = CHECKOUT_CONFIG.capi.events;
export type CapiEventName = (typeof CAPI_EVENTS)[keyof typeof CAPI_EVENTS];

export function capiConfigured(): boolean {
  return Boolean(
    process.env.META_PIXEL_ID?.trim() && process.env.META_CAPI_ACCESS_TOKEN?.trim(),
  );
}

/** SHA-256 hex, the only hashing Meta accepts for the PII keys. */
function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/* Meta's normalisation rules. Getting these wrong does not error, it silently
   lowers the match rate, which is the worst kind of bug: invisible. */
const norm = {
  email: (v: string) => v.trim().toLowerCase(),
  /** Digits only, country code included, no plus sign. */
  phone: (v: string) => v.replace(/\D/g, ''),
  name: (v: string) => v.trim().toLowerCase().replace(/[^a-zÀ-ɏ\s'-]/gi, ''),
  /** City: lowercase, no spaces or punctuation at all. */
  city: (v: string) => v.trim().toLowerCase().replace(/[^a-zÀ-ɏ]/gi, ''),
  country: (v: string) => v.trim().toLowerCase().slice(0, 2),
};

function hashed(value: string | undefined, fn: (v: string) => string) {
  const v = (value ?? '').trim();
  if (!v) return undefined;
  const normalised = fn(v);
  return normalised ? hash(normalised) : undefined;
}

/**
 * The `external_id` sent to Meta, exposed so the CRM row can carry the SAME
 * value.
 *
 * It MUST be produced here rather than re-implemented at the call site. The
 * whole point of external_id is that Meta links the browser event, the server
 * event and every downstream Apps Script event into one person; two
 * implementations that drift by a `.trim()` silently break that link, and
 * nothing errors to tell you.
 */
export function externalIdFor(email: string): string {
  return hashed(email, norm.email) ?? '';
}

/** Whatever is known about the person at the moment the event fires. */
export type CapiUser = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
  /** Unhashed, browser-captured. Absent is fine; wrong is harmful. */
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  clientUserAgent?: string;
};

export type CapiEvent = {
  eventName: CapiEventName;
  /** Shared with the browser copy so Meta deduplicates the pair. */
  eventId: string;
  /** Unix SECONDS. Meta rejects milliseconds. */
  eventTime: number;
  eventSourceUrl?: string;
  user: CapiUser;
  /** Only `sales` carries money; the other two are intent. */
  value?: number;
  currency?: string;
};

/**
 * Any URL reduced to its origin — https://india.mysuperme.com and nothing more.
 *
 * Required by the Health & Wellness override: the path and query are where a
 * restricted dataset leaks, both through health-y path segments and through the
 * UTMs and fbclid a landing URL carries. Returns '' for anything unparseable,
 * because an absent event_source_url is better than a malformed one.
 *
 * The host itself is the last residual signal, and this one is clean:
 * `india.mysuperme.com` carries no condition word. A subdomain like `prenatal.`
 * would still be readable to Meta and would need a neutral host to fix.
 */
function hostOnly(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/**
 * Sends one event to the Conversions API.
 *
 * Throws on failure. Each caller decides what that means: the webhook logs and
 * carries on (a retry there would re-run fulfilment), the browser-facing
 * routes swallow it (tracking must never break a checkout).
 */
export async function sendCapiEvent(e: CapiEvent): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !token) {
    throw new Error('META_PIXEL_ID or META_CAPI_ACCESS_TOKEN is not set');
  }

  const u = e.user;
  /* Undefined entries are stripped below: an empty string counts as a supplied
     but unmatchable key and drags the match quality score down. */
  const userData: Record<string, unknown> = {
    em: hashed(u.email, norm.email),
    ph: hashed(u.phone, norm.phone),
    fn: hashed(u.firstName, norm.name),
    ln: hashed(u.lastName, norm.name),
    ct: hashed(u.city, norm.city),
    country: hashed(u.country, norm.country),
    /* A stable pseudonymous id. The email hash is the obvious choice: no new
       identifier to store, and consistent across all three events. On
       atc_event there is no email yet, so it is simply absent. */
    external_id: hashed(u.email, norm.email),
    fbp: u.fbp || undefined,
    fbc: u.fbc || undefined,
    client_ip_address: u.clientIp || undefined,
    client_user_agent: u.clientUserAgent || undefined,
  };
  for (const k of Object.keys(userData)) {
    if (userData[k] === undefined) delete userData[k];
  }

  /* ── HEALTH & WELLNESS RESTRICTION · PHI-FREE PAYLOAD ─────────────────
     This dataset is categorised "Health and wellness condition" in Events
     Manager, so Meta blocks mid/lower-funnel STANDARD events by name and
     scans custom events for sensitive content. The three names this funnel
     sends are already neutral and custom (atc_event, ic_event, sales), which
     is what keeps them flowing — but the payload has to stay clean too.

     content_name is REMOVED. It carried "5-Day Pain Reset Challenge", and
     "Pain Reset" is exactly the kind of condition string that gets a custom
     event reclassified as sensitive and filtered. Value and currency are all
     Meta needs to optimise; the product is identifiable from the pixel.

     Do not reintroduce a product, category or content string here. */
  const customData: Record<string, unknown> = {};
  if (typeof e.value === 'number') customData.value = e.value;
  if (e.currency) customData.currency = e.currency;

  const event = {
    event_name: e.eventName,
    event_time: e.eventTime,
    event_id: e.eventId,
    action_source: 'website',
    /* HOST-ONLY, never the full URL. Core setup strips the path and query for
       a restricted dataset anyway, but sending them means handing Meta the
       landing page's UTMs and fbclid on every event first. Reduced here, in
       the one function every event passes through, so no call site can leak
       a full URL by forgetting. */
    event_source_url: hostOnly(e.eventSourceUrl),
    user_data: userData,
    custom_data: customData,
  };

  const body: Record<string, unknown> = { data: [event] };
  /* Set only while testing, so events appear in Events Manager's Test Events
     tab. It must be UNSET in production or the events are treated as tests and
     excluded from optimisation. */
  const testCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (testCode) body.test_event_code = testCode;

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    /* The token is in the URL, never in the log line. */
    const detail = await res.text().catch(() => '');
    throw new Error(`Meta CAPI returned ${res.status}: ${detail.slice(0, 300)}`);
  }

  console.info(`[capi] ${e.eventName} sent, event_id=${e.eventId}`);
}

/**
 * The two match keys every request from a real browser can supply itself.
 *
 * NEVER call this from the Stripe webhook: that request is Stripe's, so it
 * would attribute the sale to a Stripe datacentre.
 */
export function browserContext(req: Request) {
  return {
    /* x-forwarded-for is a list, oldest client first, so the first entry is
       the real client rather than the proxy chain. */
    clientIp: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim().slice(0, 100),
    clientUserAgent: (req.headers.get('user-agent') ?? '').slice(0, 400),
  };
}
