import type { Metadata } from 'next';

import JoinTracker from '@/components/JoinTracker';
import SaleEvent from '@/components/SaleEvent';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { getStripe, stripeConfigured } from '@/lib/stripe';

import ThankYou from './ThankYou';

/**
 * Post-payment page, and the Stripe success_url.
 *
 * The session id in the query string is NOT trusted as proof of payment: it is
 * retrieved from Stripe on the server and the payment_status is read from the
 * response. Someone who types the URL by hand gets the pending state, not a
 * confirmation.
 *
 * Nothing is fulfilled here and nothing is tracked here. Both live in the
 * webhook, because a buyer who pays and closes the tab never loads this page.
 *
 * This file is the GATE; ./ThankYou is what the confirmed buyer actually sees.
 * They were written separately — the Stripe check on one branch, the designed
 * page on another — and are merged here rather than one replacing the other:
 * the verification is the part that must not be lost, and the page is the part
 * the client signed off.
 */

export const metadata: Metadata = {
  title: "You're in | 5-Day Pain Reset",
  description:
    'Your place on the 5-Day Pain Reset Challenge is confirmed. One step left: join the WhatsApp community for your session links.',
  robots: { index: false, follow: false },
};

/* Stripe redirects here, so this can never be statically rendered. */
export const dynamic = 'force-dynamic';

type Search = { searchParams: { session_id?: string } };

export default async function ThankYouPage({ searchParams }: Search) {
  const sessionId = searchParams.session_id;

  let paid = false;
  let firstName = '';
  let email = '';
  /* Read back off the session so the browser Purchase can carry the SAME
     event_id the webhook's Conversions API event uses. Meta then counts one
     conversion instead of two. */
  let capiEventId = '';
  let value = 0;
  let currency = '';

  if (sessionId && stripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === 'paid';
      firstName = session.metadata?.firstName ?? '';
      email = session.customer_details?.email ?? session.customer_email ?? '';
      capiEventId = session.metadata?.capiEventId ?? '';
      value = (session.amount_total ?? 0) / 100;
      currency = (session.currency ?? '').toUpperCase();
    } catch (err) {
      /* A bad or expired id lands in the pending state below rather than a
         crash: the payment may well have gone through, and telling a paying
         customer that something broke is worse than telling them to watch
         their inbox. */
      console.error('[thank-you] could not retrieve session', err);
    }
  }

  return (
    <>
      {/* Deliberately mounted HERE and not inside <ThankYou>: /confirmed
          renders that same component with paid hard-coded true so the design
          can be reviewed, and a design preview must never report a sale. */}
      {paid && (
        <SaleEvent
          eventName={CHECKOUT_CONFIG.capi.events.sale}
          eventId={capiEventId}
          value={value}
          currency={currency}
          contentName={CHECKOUT_CONFIG.capi.contentName}
        />
      )}
      {/* GA join_whatsapp, on all three WhatsApp buttons. */}
      <JoinTracker />
      <ThankYou paid={paid} firstName={firstName} email={email} />
    </>
  );
}
