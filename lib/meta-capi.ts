import { createHash } from 'node:crypto';

import { OFFER_CONFIG } from '@/lib/offer-config';

/**
 * Meta Conversions API for the 5-Day Pain Reset.
 *
 * ── THE THREE EVENTS ────────────────────────────────────────────────────────
 * This funnel reports CUSTOM events, not Meta's standard ones. No AddToCart,
 * no InitiateCheckout, no Purchase. The ad account optimises on these three
 * and nothing else:
 *
 *     atc_event              a CTA tap, which opens the registration modal
 *     ic_event               the reader completes step 1 of the form
 *     registration_complete  the registration is recorded — the free
 *                            conversion, and the one carrying the volume
 *     sales                  a VIP upgrade is paid for, from the Stripe
 *                            webhook
 *
 * REGISTERING IS FREE; THE VIP UPGRADE IS NOT. So `sales` is the only event
 * that carries a value and a currency, and the other three deliberately carry
 * neither. `sales` counts upgrades ONLY, never registrations — the two numbers
 * are supposed to be far apart.
 *
 * Custom events are sent exactly like standard ones: the name simply is not
 * one Meta reserves, so it arrives as a custom conversion and gets used from
 * Events Manager.
 *
 * ── THIS PIXEL IS HEALTH & WELLNESS RESTRICTED ──────────────────────────────
 * That is not a style preference, it changes what may be sent, and it is the
 * reason for three things in this file that would otherwise look arbitrary:
 *
 *   1. CUSTOM EVENT NAMES, NOT STANDARD ONES. A restricted data source has
 *      Meta's standard events blocked BY NAME — AddToCart, InitiateCheckout,
 *      Purchase would be dropped. Custom names are not, which is what keeps
 *      this funnel reporting at all.
 *   2. custom_data CARRIES MONEY AND NOTHING ELSE. No content_name, no
 *      content_category. A price is not health data; "Pain Reset" is.
 *   3. event_source_url IS THE ORIGIN ONLY. The path names the funnel step
 *      and the query string carries every UTM and the fbclid, and a campaign
 *      name is exactly where a condition string ends up by accident.
 *
 * Match keys are UNAFFECTED — email, phone, name, city, country, fbc, fbp, IP
 * and user agent are all still sent, so EMQ does not move. The restriction is
 * about describing the CONDITION, not about identifying the person.
 *
 * ── SERVER ONLY. THE BROWSER FIRES NOTHING BUT PageView ─────────────────────
 * All three events are sent from here and ONLY from here. There is no browser
 * half to deduplicate against.
 *
 * The Pixel stays on the page for its cookies — `_fbp`, and `_fbc` from the ad
 * click — because those are two of the strongest match keys these server
 * events carry. It just is not asked to report conversions, which it does
 * badly: ad blockers, ITP and iOS all cost it events the server never loses.
 *
 * Every event still carries an event_id. With one copy there is no pair to
 * collapse, but the id is what makes a retry or a double-submit land as one
 * conversion rather than several.
 *
 * ── THE PARAMETER PROBLEM, AND HOW IT IS SOLVED ─────────────────────────────
 * An event is only as good as its match keys, and four of them exist ONLY in
 * the reader's browser:
 *
 *     _fbp                 the Pixel's own browser cookie
 *     _fbc                 the click id, derived from ?fbclid on the ad click
 *     client_ip_address    the reader's IP
 *     client_user_agent    the reader's browser
 *
 * THIS IS NOW THE EASY CASE, and it is worth saying why. All three events are
 * sent from a request the reader's own browser made — the CTA tap through
 * /api/track, and both form events through /api/register — so the IP and user
 * agent come straight off that request and the cookies come in the body:
 *
 *     browser  ──POST /api/register──▶  server reads IP + UA from THIS
 *     (_fbp, _fbc, page URL, details)   request, mints an event_id, fires
 *                                       registration_complete, and forwards
 *                                       the same set to Pabbly on the CRM row
 *
 * The paid build could not do that. Its conversion fired from the Stripe
 * webhook, a request from Stripe's own servers with none of the reader's
 * cookies, IP or user agent, so all four had to be captured at checkout time
 * and smuggled through the payment in the session metadata. Removing the
 * payment removed that entire relay — and with it the match-quality loss that
 * came from carrying stale values across a redirect.
 */

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || 'v21.0';

/** The only three names this funnel is allowed to send. */
export const CAPI_EVENTS = OFFER_CONFIG.capi.events;
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
  /** Meta's dedupe key. One copy is sent, so this collapses retries. */
  eventId: string;
  /** Unix SECONDS. Meta rejects milliseconds. */
  eventTime: number;
  eventSourceUrl?: string;
  user: CapiUser;
  /**
   * Money. ONLY `sales` sets these — it is the one paid thing in the funnel.
   *
   * Left undefined on the other three, deliberately: they are free actions
   * worth £0, and a `value: 0` is worse than the field being absent because it
   * is a real number that value-based bidding will happily optimise toward.
   */
  value?: number;
  currency?: string;
};

/**
 * "https://5day.mysuperme.com/upgrade?utm_campaign=…" → "https://5day.mysuperme.com"
 *
 * Returns undefined for a blank or unparseable value, so a malformed URL never
 * becomes a rejected event — the field is simply omitted, which costs nothing.
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
 * Throws on failure. Each caller decides what that means: /api/register logs
 * and carries on (the registration itself has already succeeded and must not
 * be failed over a reporting outage), and /api/track swallows it outright.
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

  /* ── HEALTH & WELLNESS: custom_data CARRIES MONEY AND NOTHING ELSE ────
     `content_name: '5-Day Pain Reset Challenge'` USED TO BE HERE and has been
     removed. This pixel's data source is categorised Health & Wellness, and
     under that restriction a payload may not describe a health condition,
     symptom, treatment or the care someone is seeking. "Pain Reset" is a
     condition string by any reasonable reading of that rule, sent on every
     single event in the funnel.

     Nothing replaces it. There is no sanitised product name worth the risk
     here: the funnel sells one thing, the pixel only ever receives events
     from this funnel, and `event_name` already says which step it is. The
     field was decoration.

     Value and currency stay, and are attached ONLY when the caller supplies
     them — which in this funnel means `sales` and nothing else. A price is
     not health data. The three free events omit both deliberately: a
     `value: 0` is worse than an absent field, because it is a real number
     that value-based bidding will happily optimise toward. */
  const customData: Record<string, unknown> = {};
  if (typeof e.value === 'number') customData.value = e.value;
  if (e.currency) customData.currency = e.currency;

  const event = {
    event_name: e.eventName,
    event_time: e.eventTime,
    event_id: e.eventId,
    action_source: 'website',
    /* ── HEALTH & WELLNESS: ORIGIN ONLY, NEVER THE FULL URL ──────────
       The full URL was leaking two things Meta must not receive from a
       restricted source: the PATH, which names the funnel step ("/upgrade",
       and on other builds paths that describe the condition outright), and
       the QUERY STRING, which carries every UTM and the fbclid — campaign
       names written by a marketer who was not thinking about compliance are
       exactly where a condition string ends up.

       Reduced to the origin, so Meta learns the site and nothing more.
       Attribution is NOT harmed: Meta attributes on fbc/fbp, never on this
       field, and the full URL with all its UTMs still reaches the CRM row
       where it is actually read. */
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
 * Safe to call from any of this funnel's routes, because all of them are
 * requests the reader's own browser made. It would NOT be safe from a
 * third-party webhook — that request belongs to the sender, so these two
 * fields would describe their datacentre rather than the reader.
 */
export function browserContext(req: Request) {
  return {
    /* x-forwarded-for is a list, oldest client first, so the first entry is
       the real client rather than the proxy chain. */
    clientIp: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim().slice(0, 100),
    clientUserAgent: (req.headers.get('user-agent') ?? '').slice(0, 400),
  };
}
