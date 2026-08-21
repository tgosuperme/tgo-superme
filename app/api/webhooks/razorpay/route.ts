import { createHmac, timingSafeEqual } from 'node:crypto';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { capiConfigured, externalIdFor, sendCapiEvent } from '@/lib/meta-capi';
import { pabblyConfigured, sendSaleToPabbly, type SalePayload } from '@/lib/pabbly';
import { decodeRefId, fbclidFrom } from '@/lib/refid';

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
 *     first_name, last_name, email, phone, city, ref_id
 *   }
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

  /* Absent or corrupt attribution is NOT an error. Someone who opened the
     payment link directly has none to recover, and a lower-EMQ conversion
     beats a dropped one. */
  const attr = decodeRefId(notes.ref_id);
  if (!attr) {
    console.warn(
      `[razorpay-webhook] no usable ref_id on ${e.id}; reporting with Razorpay's fields only`,
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
