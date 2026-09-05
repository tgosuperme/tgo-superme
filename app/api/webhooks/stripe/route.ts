import type Stripe from 'stripe';

import { capiConfigured, externalIdFor, sendCapiEvent } from '@/lib/meta-capi';
import { OFFER_CONFIG } from '@/lib/offer-config';
import { pabblyVipConfigured, sendVipToPabbly, type LeadPayload } from '@/lib/pabbly';
import { getStripe, stripeConfigured } from '@/lib/stripe';

/**
 * Stripe webhook for the VIP upgrade.
 *
 * This is the ONLY trustworthy record that money moved. /thank-you-vip is a
 * redirect the buyer can close, refuse or never reach, so nothing that must
 * happen — the `sales` event, the VIP sheet row — may depend on it.
 *
 * NOTE WHAT IS *NOT* HERE. The free registration was already recorded by
 * /api/register before this person ever saw the OTO, and this handler does not
 * touch it. A failure anywhere below costs a VIP row, never a registration.
 *
 * Signature verification runs against the RAW body. Next parses JSON for you
 * everywhere else; here that would change the bytes and every signature would
 * fail, which is why this reads req.text() and never req.json().
 *
 * Point the endpoint at:  POST /api/webhooks/stripe
 * Subscribe it to:        checkout.session.completed
 *                         checkout.session.async_payment_succeeded
 *                         charge.refunded
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !secret) {
    console.error('[stripe-webhook] keys missing, refusing the event');
    return new Response('Webhook not configured', { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    /* Anything that fails here is either a forgery or a secret mismatch, and
       both must be a 400 so Stripe surfaces them in the dashboard. */
    console.error('[stripe-webhook] signature verification failed', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        /* A session can complete before an asynchronous method has actually
           cleared, so paid is checked rather than assumed. */
        if (session.payment_status !== 'paid') {
          console.warn(
            `[stripe-webhook] ${session.id} completed but payment_status=${session.payment_status}, not fulfilling yet`,
          );
          break;
        }
        await onVipPaid(session);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        console.warn(
          `[stripe-webhook] refund on ${charge.id} (${charge.amount_refunded} ${charge.currency}), remove the VIP extras — the free place stays`,
        );
        break;
      }

      default:
        /* Anything else is acknowledged so Stripe stops retrying it. */
        break;
    }
  } catch (err) {
    /* A 500 makes Stripe retry with backoff, which is what we want for a
       transient failure inside fulfilment. */
    console.error(`[stripe-webhook] handler failed for ${event.type}`, err);
    return new Response('Handler error', { status: 500 });
  }

  return Response.json({ received: true });
}

/**
 * Runs once per paid VIP upgrade.
 *
 * Sends `sales` to Meta, then the row to the VIP Pabbly workflow. The Pabbly
 * error is NOT swallowed: a throw becomes a 500 above, which makes Stripe
 * retry, and a retried row is recoverable while a dropped one is not. That is
 * also why the payload carries stripe_session_id as the dedupe key for the
 * Pabbly side.
 */
async function onVipPaid(session: Stripe.Checkout.Session) {
  const m = session.metadata ?? {};
  const firstName = m.firstName ?? '';
  const lastName = m.lastName ?? '';
  const minor = session.amount_total ?? OFFER_CONFIG.vip.amountPence;

  const email = session.customer_details?.email ?? session.customer_email ?? '';
  /* Stripe's own timestamp rather than the server clock, so a retried event
     does not land in the sheet with the wrong time. */
  const paidAt = new Date(session.created * 1000).toISOString();
  /* The event_id the `sales` event below uses. Stored on the row so dedup is
     auditable from the sheet alone. */
  const purchaseEventId = m.capiEventId || session.id;
  /* The thread back to the registration row on the OTHER sheet. Falls back to
     the session id only if a session somehow predates the metadata. */
  const leadId = m.leadId || session.id;

  const vipRow: LeadPayload = {
    /* ── A–Y · universal block ─────────────────────────────────────── */
    /* THE REGISTRATION ID, deliberately — not the Stripe session. This is what
       joins this row to the free row for the same person. The Stripe session
       has its own field below. */
    lead_id: leadId,
    created_at: paidAt,

    first_name: firstName,
    last_name: lastName,
    email,
    /* The number typed on our form is the contactable one. Stripe only holds a
       phone if the session was told to collect one, and this one is not. */
    phone: m.phone ?? session.customer_details?.phone ?? '',
    city: m.city ?? session.customer_details?.address?.city ?? '',
    /* The dialling country they picked. Stripe only has a billing country if
       the payment method supplied one, so this is the better signal. */
    country_code: m.phoneCountry || session.customer_details?.address?.country || '',

    /* All four captured in the browser at OTO time and carried here in the
       metadata. Raw, never hashed. This request is Stripe's, so it has none
       of them itself. */
    fbc: m.fbc ?? '',
    fbp: m.fbp ?? '',
    client_ip_address: m.clientIp ?? '',
    client_user_agent: m.clientUserAgent ?? '',
    /* Produced by the CAPI module itself, so the row and the event can never
       disagree about who this person is. */
    external_id: externalIdFor(email),

    event_source_url: m.eventSourceUrl ?? '',
    amount: (minor / 100).toFixed(2),
    /* String, not boolean, per the SOP: the sheet column stays text and a test
       row is filterable with a plain equals. */
    is_test: session.livemode ? 'false' : 'true',
    purchase_event_id: purchaseEventId,

    utm_source: m.utmSource ?? '',
    utm_medium: m.utmMedium ?? '',
    utm_campaign: m.utmCampaign ?? '',
    utm_content: m.utmContent ?? '',
    utm_term: m.utmTerm ?? '',
    fbclid: m.fbclid ?? '',
    referrer: m.referrer ?? '',
    landing_url: m.landingUrl ?? '',

    /* ── SuperMe extras ────────────────────────────────────────────── */
    full_name: `${firstName} ${lastName}`.trim(),
    tier: 'vip',
    amount_minor: minor,
    currency: (session.currency ?? OFFER_CONFIG.vip.currency).toUpperCase(),
    payment_status: session.payment_status,
    /* The real Stripe session, and the dedupe key for this sheet. */
    stripe_session_id: session.id,
    stripe_payment_intent:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? ''),
    paid_at: paidAt,
    live_mode: session.livemode,
    gclid: m.gclid ?? '',

    funnel: m.funnel ?? OFFER_CONFIG.funnelSlug,
    offer: '5-Day Pain Reset Challenge (VIP Upgrade)',
    cohort_start_date: m.startDate ?? OFFER_CONFIG.startDate,
    session_times: m.sessionTimes ?? OFFER_CONFIG.sessionTimes,
  };

  /* Logged before the hand-offs, so the sale exists in the platform logs even
     if Meta and Pabbly both fail and the row never appears in the sheet. */
  console.info('[stripe-webhook] vip paid', JSON.stringify(vipRow));

  /* ── Meta Conversions API · `sales` ───────────────────────────────────
     Fired here rather than on /thank-you-vip because this is the only event
     that always happens. A buyer who pays and closes the tab never loads the
     success page, and on mobile that is a meaningful share of them.

     THIS IS THE ONE EVENT IN THE FUNNEL THAT CARRIES MONEY. The other three
     are free actions and deliberately send no value at all.

     Sent BEFORE Pabbly so a sheet outage cannot cost an ad-platform
     conversion; the two are independent and neither should block the other. */
  if (capiConfigured()) {
    try {
      await sendCapiEvent({
        eventName: OFFER_CONFIG.capi.events.vipSale,
        /* The SAME value written to the row as purchase_event_id, taken from
           one variable so the two can never disagree. */
        eventId: purchaseEventId,
        eventTime: session.created,
        eventSourceUrl: m.eventSourceUrl ?? '',
        user: {
          email: vipRow.email,
          phone: vipRow.phone,
          firstName,
          lastName,
          city: vipRow.city,
          country: m.phoneCountry || session.customer_details?.address?.country || 'GB',
          /* All four captured at OTO time. This request is Stripe's, so it has
             none of them itself. */
          fbp: m.fbp,
          fbc: m.fbc,
          clientIp: m.clientIp,
          clientUserAgent: m.clientUserAgent,
        },
        value: minor / 100,
        currency: vipRow.currency,
      });
    } catch (err) {
      /* Logged, not thrown. A CAPI outage must not force Stripe to retry the
         whole handler, because that would re-send the row to Pabbly. The event
         is recoverable by hand from the log line above; a duplicated row is
         more annoying to unpick. */
      console.error(`[stripe-webhook] CAPI sales event failed for ${session.id}`, err);
    }
  } else {
    console.warn(
      `[stripe-webhook] Meta CAPI not configured, ${session.id} was not reported`,
    );
  }

  if (!pabblyVipConfigured()) {
    /* Not a throw: a missing URL is a configuration gap that retrying for
       three days cannot close, and the sale is already in the log above. */
    console.error(
      `[stripe-webhook] PABBLY_VIP_WEBHOOK_URL is not set, ${session.id} did not reach the VIP sheet`,
    );
    return;
  }

  await sendVipToPabbly(vipRow);

  /* TODO(fulfilment): grant the recordings and the two extra guides, and flag
     the person as VIP in the community. Whatever does that has to be safe to
     run twice: a Pabbly failure replays this entire handler on Stripe's retry,
     and nobody wants the same buyer emailed four times because a sheet was
     briefly unreachable. */
}
