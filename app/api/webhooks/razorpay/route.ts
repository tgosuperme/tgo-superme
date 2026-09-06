import { createHmac, timingSafeEqual } from 'node:crypto';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { externalIdFor } from '@/lib/meta-capi';
import { pabblyConfigured, sendSaleToPabbly, type SalePayload } from '@/lib/pabbly';
import { OFFER } from '@/lib/offer';
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

  /**
   * Read a custom Payment Page field under any of the shapes its label might
   * have taken.
   *
   * Razorpay returns custom fields keyed by the LABEL typed into the
   * dashboard, normalised in ways that are not documented and have changed.
   * TGO owns that dashboard and can rename a field without telling anyone, so
   * matching one exact key would fail quietly — the sale still lands, the
   * column is just empty for weeks. Comparison is case- and separator-
   * insensitive, and the first hit wins.
   */
  function pickNote(source: Record<string, string>, candidates: string[]): string {
    const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const wanted = candidates.map(norm);
    for (const [k, v] of Object.entries(source)) {
      if (wanted.includes(norm(k)) && String(v ?? '').trim()) return String(v).trim();
    }
    return '';
  }

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
  if (typeof e.amount === 'number') {
    /* Checked against EVERY rung of the ladder, not one configured price.
       There are three live amounts now and a buyer can legitimately pay any
       of them — someone who opened the page at ₹497 and paid after the rise
       has an amount that matches step 2 while the server is on step 2. A
       single-price comparison would cry wolf on most of the cohort, and a
       canary that always fires is a canary nobody reads. */
    const known = [
      ...OFFER.priceSteps.map((s) => Math.round(s.amount * 100)),
      Math.round(OFFER.vipPrice * 100),
    ];
    if (!known.includes(e.amount)) {
      console.warn(
        `[razorpay-webhook] ${e.id} amount ${e.amount} matches no price step ` +
          `(${known.join(', ')}) — the page and the Razorpay pages have drifted`,
      );
    }
  }

  /**
   * Which tier was bought.
   *
   * Read from the token /go stamped, NOT inferred from the amount. With no API
   * keys there is no order of ours to look up, so the token is the only record
   * of what the buyer actually chose — and amount-sniffing would break the
   * first time either price changes, silently, by filing a VIP buyer as
   * standard and quietly never sending them recordings.
   *
   * Defaults to 'base' when the token is unreadable: a VIP buyer filed as
   * standard is a fixable support message, whereas a standard buyer filed as
   * VIP is three things given away for free with nobody noticing.
   */
  const product: 'base' | 'vip' = attr?.k === 'vip' ? 'vip' : 'base';
  const isVip = product === 'vip';

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

    /* The two dropdowns on the Payment Page. Razorpay hands custom fields
       back under the label TGO typed into the dashboard, and that label is
       editable by someone who will not think to tell us — so each is read
       through a list of the shapes it has plausibly been given rather than
       one exact key. An unmatched field costs a column, not the sale. */
    pain: pickNote(notes, ['pain', 'where_is_your_pain', 'where is your pain?']),
    seat_for: pickNote(notes, [
      'seat_for',
      'is_this_seat_for_you_or_for_a_parent_or_loved_one',
      'is this seat for you or for a parent or loved one?',
    ]),

    headline_variant: attr?.h ?? '',
    ad_pain: attr?.w ?? '',
    price_step: attr?.g ?? '',
    /* 'base' | 'vip' — which tier this buyer chose in the selector. */
    product,
    vip: isVip ? 'yes' : '',

    utm_id: attr?.d ?? '',
    funnel: CHECKOUT_CONFIG.funnelSlug,
    offer: '5-Day Pain Reset Challenge',
    cohort_start_date: CHECKOUT_CONFIG.startDate,
    session_times: CHECKOUT_CONFIG.sessionTimes,
  };

  /* Logged before either hand-off, so the sale survives in the platform logs
     even if both downstreams fail. */
  console.info('[razorpay-webhook] paid', JSON.stringify(sale));

  /* ── one row, one feed, both tiers ────────────────────────────────────
     `product` on the row says which pass was bought; Pabbly filters on it.
     See lib/pabbly.ts for why that beats a second webhook URL. */
  if (!pabblyConfigured()) {
    console.error(
      `[razorpay-webhook] PABBLY_WEBHOOK_URL unset, ${e.id} did not reach the sheet`,
    );
    return Response.json({ received: true, product });
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

  return Response.json({ received: true, product });
}
