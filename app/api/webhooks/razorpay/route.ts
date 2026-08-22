import { createHmac, timingSafeEqual } from 'node:crypto';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { capiConfigured, externalIdFor, sendCapiEvent } from '@/lib/meta-capi';
import { pabblyConfigured, sendSaleToPabbly, type SalePayload } from '@/lib/pabbly';
import { decodeRefId, fbclidFrom, joinRefId, REF_ID_PREFIX } from '@/lib/refid';

/**
 * Razorpay webhook — the only trustworthy record that money moved.
 *
 * Subscribe it to `payment.captured` and NOTHING else. `payment.authorized`
 * fires before the money is actually captured, and subscribing to both runs
 * this handler twice per sale.
 *
 * Endpoint: POST /api/webhooks/razorpay
 *
 * ── PAYLOAD SHAPE ───────────────────────────────────────────────────────────
 * Written against a real captured payload, not a guess. A ₹1 test produced:
 *
 *   payload.payment.entity.notes = {
 *     first_name, last_name, email, phone, city, ref_id, ref_id2
 *   }
 *
 * ref_id is CHUNKED. Razorpay caps each notes value at 512 characters on
 * submit — a longer one prefills fine and then rejects the payment with
 * "Notes value cannot be greater 512 characters" — so the token arrives in two
 * pieces that joinRefId() concatenates before decoding.
 *   payload.payment.entity.{ id, order_id, amount, currency, email, contact,
 *                            created_at, status }
 *
 * `amount` is in PAISE — 100 for ₹1 — which lines up with amountMinor.
 * First and last name arrive as separate fields, so there is no name splitting
 * to do and multi-part names are not mangled.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Entity = {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  email?: string;
  contact?: string;
  created_at?: number;
  status?: string;
  notes?: Record<string, string>;
};

/** Constant-time compare, so a forged signature cannot be found by timing. */
function signatureValid(raw: string, header: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(header, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set');
    return new Response('Webhook not configured', { status: 503 });
  }

  /* RAW body. Signature verification runs against the exact bytes Razorpay
     signed; parsing first would change them and every signature would fail. */
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  if (!signature || !signatureValid(raw, signature, secret)) {
    console.error('[razorpay-webhook] signature verification failed');
    return new Response('Invalid signature', { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: Entity } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  /* Anything else is acknowledged so Razorpay stops retrying it. */
  if (event.event !== 'payment.captured') {
    return Response.json({ received: true, ignored: event.event });
  }

  const e = event.payload?.payment?.entity ?? {};
  const notes = e.notes ?? {};

  /* ── OWNERSHIP GATE ─────────────────────────────────────────────────────
     THIS RAZORPAY ACCOUNT IS SHARED. It carries payment pages for several
     unrelated products, and a webhook subscribed to `payment.captured` is
     subscribed at the ACCOUNT level — so this endpoint is handed EVERY
     captured payment on the account, not only ours.

     That is not theoretical. Before this gate existed, a ₹1,999 sale and a
     ₹7,076 sale from other products reached the sheet and fired `sales` to
     Meta with their amounts, poisoning both the CRM and the ad dataset.

     Under Stripe the handler deliberately carried on when attribution was
     missing, on the grounds that a low-EMQ conversion beats a dropped one.
     That reasoning does not survive a shared account: reporting a stranger's
     purchase as ours is far worse than missing an occasional direct-link
     buyer of our own. So a payment must now PROVE it is ours.

     Two accepted proofs:

       1. notes.ref_id begins with the token prefix. /go sets it on every
          buyer who reaches the page through our site, and nothing else on
          this account produces that shape.
       2. notes.funnel matches our slug — for a static marker field on the
          Payment Page, if one is added later.

     Anything else gets a 200 and is dropped. A 200, not a 4xx: the event is
     valid and correctly delivered, it simply is not ours, and a non-2xx
     would make Razorpay retry someone else's payment at us for days. */
  const isOurs =
    (notes.ref_id ?? '').startsWith(REF_ID_PREFIX) ||
    notes.funnel === CHECKOUT_CONFIG.funnelSlug;

  if (!isOurs) {
    console.warn(
      `[razorpay-webhook] IGNORED ${e.id} — not this funnel ` +
        `(amount=${e.amount}, notes=${Object.keys(notes).join(',') || 'none'})`,
    );
    return Response.json({ received: true, ignored: 'not-this-funnel' });
  }

  const attr = decodeRefId(joinRefId(notes));
  if (!attr) {
    /* Past the gate, so this IS our sale — the token is merely unreadable,
       most likely a missing ref_id2 chunk. Report it with what Razorpay gave
       us rather than dropping a real buyer. */
    console.warn(
      `[razorpay-webhook] ${e.id} is ours but ref_id would not decode; ` +
        'reporting without the browser match keys',
    );
  }

  /* Not a gate, a canary. If our own page starts producing a different
     amount, the price and the config have drifted apart and somebody needs
     to know before the whole cohort is charged the wrong figure. */
  if (typeof e.amount === 'number' && e.amount !== CHECKOUT_CONFIG.amountMinor) {
    console.warn(
      `[razorpay-webhook] ${e.id} amount ${e.amount} != configured ${CHECKOUT_CONFIG.amountMinor}`,
    );
  }

  const minor = typeof e.amount === 'number' ? e.amount : CHECKOUT_CONFIG.amountMinor;
  const email = notes.email || e.email || '';
  const firstName = notes.first_name ?? '';
  const lastName = notes.last_name ?? '';
  const city = notes.city ?? '';
  const phone = notes.phone || e.contact || '';
  const paidAt = new Date((e.created_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
  /* The id /go minted, so atc_event and this sale describe one person and a
     replayed webhook dedupes at Meta's end. Falls back to Razorpay's payment
     id when attribution is missing, which is still stable across retries. */
  const eventId = attr?.i || e.id || '';

  const sale: SalePayload = {
    lead_id: eventId,
    created_at: paidAt,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    city,
    country_code: 'IN',
    fbc: attr?.c ?? '',
    fbp: attr?.p ?? '',
    client_ip_address: attr?.a ?? '',
    client_user_agent: attr?.u ?? '',
    external_id: externalIdFor(email),
    event_source_url: attr?.l ?? '',
    amount: (minor / 100).toFixed(2),
    is_test: e.id?.startsWith('pay_') && process.env.RAZORPAY_KEY_ID?.includes('_test_')
      ? 'true'
      : 'false',
    purchase_event_id: eventId,
    utm_source: attr?.s ?? '',
    utm_medium: attr?.m ?? '',
    utm_campaign: attr?.n ?? '',
    utm_content: attr?.o ?? '',
    utm_term: attr?.t ?? '',
    fbclid: fbclidFrom(attr),
    referrer: attr?.r ?? '',
    landing_url: attr?.l ?? '',

    full_name: `${firstName} ${lastName}`.trim(),
    amount_minor: minor,
    currency: (e.currency ?? CHECKOUT_CONFIG.currency).toUpperCase(),
    payment_status: e.status ?? 'captured',
    razorpay_payment_id: e.id ?? '',
    razorpay_order_id: e.order_id ?? '',
    paid_at: paidAt,
    live_mode: !process.env.RAZORPAY_KEY_ID?.includes('_test_'),
    gclid: '',
    utm_id: attr?.d ?? '',
    funnel: CHECKOUT_CONFIG.funnelSlug,
    offer: '5-Day Pain Reset Challenge',
    cohort_start_date: CHECKOUT_CONFIG.startDate,
    session_times: CHECKOUT_CONFIG.sessionTimes,
  };

  /* Logged before either hand-off, so the sale survives in the platform logs
     even if both downstreams fail. */
  console.info('[razorpay-webhook] paid', JSON.stringify(sale));

  /* ── `sales` to Meta ────────────────────────────────────────────────────
     Sent BEFORE Pabbly so a sheet outage cannot cost an ad-platform
     conversion. Logged, never thrown: a throw becomes a 500, Razorpay retries
     the whole handler, and the sale is POSTed to Pabbly a second time. */
  if (capiConfigured()) {
    try {
      await sendCapiEvent({
        eventName: CHECKOUT_CONFIG.capi.events.sale,
        eventId,
        eventTime: e.created_at ?? Math.floor(Date.now() / 1000),
        eventSourceUrl: attr?.l ?? '',
        user: {
          email,
          phone,
          firstName,
          lastName,
          city,
          country: 'IN',
          fbp: attr?.p,
          fbc: attr?.c,
          clientIp: attr?.a,
          clientUserAgent: attr?.u,
        },
        value: minor / 100,
        currency: sale.currency,
      });
    } catch (err) {
      console.error(`[razorpay-webhook] CAPI sales failed for ${e.id}`, err);
    }
  }

  if (!pabblyConfigured()) {
    console.error(`[razorpay-webhook] PABBLY_WEBHOOK_URL unset, ${e.id} did not reach the sheet`);
    return Response.json({ received: true });
  }

  try {
    await sendSaleToPabbly(sale);
  } catch (err) {
    /* A 500 makes Razorpay retry with backoff, which is what we want for a
       transient Pabbly failure. razorpay_payment_id is the dedupe key on the
       Pabbly side, so a retried sale updates rather than duplicates. */
    console.error(`[razorpay-webhook] Pabbly failed for ${e.id}`, err);
    return new Response('Handler error', { status: 500 });
  }

  return Response.json({ received: true });
}
