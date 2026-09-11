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
 * ── THIS DATASET IS HEALTH & WELLNESS RESTRICTED ────────────────────────────
 * That is not a style preference, it decides what may be sent, and it is why
 * three things in this file look the way they do:
 *
 *   1. CUSTOM NAMES, NOT STANDARD ONES. A restricted dataset has Meta's
 *      standard events blocked BY NAME — AddToCart, InitiateCheckout and
 *      Purchase would be dropped. Custom names keep flowing and keep
 *      optimising, which is the only reason this funnel reports at all.
 *   2. custom_data CARRIES MONEY AND NOTHING ELSE. No content_name, no
 *      content_category. A price is not health data; "pain_reset" is.
 *   3. event_source_url IS THE ORIGIN ONLY. The path names the funnel step and
 *      the query carries every UTM and the fbclid.
 *
 * MATCH KEYS ARE UNAFFECTED — email, phone, name, city, country, fbc, fbp, IP
 * and user agent all still go, so EMQ does not move. The restriction is about
 * describing the CONDITION, never about identifying the person.
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
  /* THERE IS NO `contentName` HERE ANY MORE, and it must not come back.
     It carried `pain_reset_uk` / `vip_uk` into custom_data.content_name on
     every event; "pain_reset" is a condition string and this dataset is
     Health & Wellness restricted. The two products are separated by `value`
     instead — see the note in sendCapiEvent. The field is REMOVED rather than
     ignored so a caller cannot pass one believing it still does something. */
};

/**
 * "https://5day.mysuperme.com/checkout?plan=vip&utm_campaign=…"
 *   → "https://5day.mysuperme.com"
 *
 * Returns undefined for a blank or unparseable value, so a malformed URL is
 * simply omitted rather than becoming a rejected event. The host itself is the
 * last residual signal and this one is clean: `5day.mysuperme.com` carries no
 * condition word. A subdomain that did would need renaming, not stripping.
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

  /* ── HEALTH & WELLNESS · custom_data CARRIES MONEY AND NOTHING ELSE ───
     This dataset is categorised "Health and wellness condition" in Events
     Manager. Under that restriction nothing sent to Meta may describe a
     health condition, symptom or treatment.

     content_name IS GONE. It carried `pain_reset_uk` / `vip_uk` on every
     event, and "pain_reset" is a condition string — exactly what gets a
     custom event reclassified as sensitive and filtered, which would take
     the whole funnel's reporting down rather than just that one field.

     ── HOW THE TWO PRODUCTS ARE STILL TOLD APART ───────────────────────
     By `value`. The seat reports 1.99 and VIP reports 9.99 under the same
     `sales` name, which is the separation the ad account actually bids on,
     and a price is not health data. The human-readable split lives on the
     Pabbly row, where `plan`, `plan_name` and `content_name` all survive —
     that sheet is ours and is not subject to this restriction.

     DO NOT reintroduce a product, category or content string here. A
     "neutral" code word is not worth the re-review it risks. */
  const customData: Record<string, unknown> = {};
  if (typeof e.value === 'number') customData.value = e.value;
  if (e.currency) customData.currency = e.currency;

  const event = {
    event_name: e.eventName,
    event_time: e.eventTime,
    event_id: e.eventId,
    action_source: 'website',
    /* ── HEALTH & WELLNESS · ORIGIN ONLY, NEVER THE FULL URL ─────────
       The full URL leaked two things a restricted dataset must not receive:
       the PATH, which names the funnel step, and the QUERY STRING, which
       carries every UTM and the fbclid. A campaign name written by someone
       not thinking about compliance is the likeliest way a condition string
       ever reaches Meta from this funnel.

       Attribution is untouched — Meta attributes on fbc/fbp, never on this
       field — and the full URL with its UTMs still reaches the CRM row,
       which is where anything actually reads it. */
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
