import type Stripe from 'stripe';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { pabblyConfigured, sendSaleToPabbly } from '@/lib/pabbly';
import { getStripe, stripeConfigured } from '@/lib/stripe';

/**
 * Stripe webhook for the 5-Day Pain Reset.
 *
 * This is the ONLY trustworthy record that money moved. The thank-you page is
 * a redirect the buyer can close, refuse or never reach, so nothing that must
 * happen (fulfilment, tracking, the seat count) may depend on it.
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
        await onPaid(session);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        console.warn(
          `[stripe-webhook] refund on ${charge.id} (${charge.amount_refunded} ${charge.currency}), remove the seat and the Zoom invite`,
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
 * Runs once per paid seat.
 *
 * Sends the sale to Pabbly, which writes the row into the sales sheet. Errors
 * are NOT swallowed: a throw here becomes a 500 above, which makes Stripe
 * retry the event, and a retried sale is recoverable while a dropped one is
 * not. That is also why the payload carries stripe_session_id as a dedupe key
 * for the Pabbly side.
 */
async function onPaid(session: Stripe.Checkout.Session) {
  const m = session.metadata ?? {};
  const firstName = m.firstName ?? '';
  const lastName = m.lastName ?? '';
  const minor = session.amount_total ?? CHECKOUT_CONFIG.amountPence;

  const sale = {
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`.trim(),
    email: session.customer_details?.email ?? session.customer_email ?? '',
    /* The number the buyer typed on our form is the contactable one. Stripe
       only holds a phone if the session was told to collect one, and this one
       is not. */
    phone: m.phone ?? session.customer_details?.phone ?? '',

    amount: (minor / 100).toFixed(2),
    amount_minor: minor,
    currency: (session.currency ?? CHECKOUT_CONFIG.currency).toUpperCase(),
    payment_status: session.payment_status,

    stripe_session_id: session.id,
    stripe_payment_intent:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? ''),
    /* Stripe's own timestamp rather than the server clock, so a retried event
       does not land in the sheet with the wrong time. */
    paid_at: new Date(session.created * 1000).toISOString(),
    live_mode: session.livemode,

    funnel: m.funnel ?? CHECKOUT_CONFIG.funnelSlug,
    offer: '5-Day Pain Reset Challenge',
    cohort_start_date: m.startDate ?? CHECKOUT_CONFIG.startDate,
    session_times: m.sessionTimes ?? CHECKOUT_CONFIG.sessionTimes,
  };

  /* Logged before the hand-off, so the sale exists in the platform logs even
     if every Pabbly attempt fails and the row never appears in the sheet. */
  console.info('[stripe-webhook] paid', JSON.stringify(sale));

  if (!pabblyConfigured()) {
    /* Not a throw: a missing URL is a configuration gap that retrying for
       three days cannot close, and the sale is already in the log above. */
    console.error(
      `[stripe-webhook] PABBLY_WEBHOOK_URL is not set, ${session.id} did not reach the sheet`,
    );
    return;
  }

  await sendSaleToPabbly(sale);

  /* TODO(fulfilment): send the joining email with the Zoom link and both
     daily session times, and add the buyer to the cohort list. Whatever does
     that has to be safe to run twice: a Pabbly failure replays this entire
     handler on Stripe's retry, and nobody wants the same buyer emailed four
     times because a sheet was briefly unreachable. */

  /* TODO(tracking): fire the Meta CAPI Purchase from here, using session.id as
     the event_id so it de-duplicates against a browser pixel if one is ever
     added. CHECKOUT_CONFIG.capi already holds the event names and value. There
     is no pixel on this site yet, so there is nothing to de-duplicate against
     and nothing to fire into. */
}
