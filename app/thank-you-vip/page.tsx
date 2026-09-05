import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import JoinTracker from '@/components/JoinTracker';
import VipSaleTracker from '@/components/VipSaleTracker';
import { OFFER_CONFIG } from '@/lib/offer-config';
import { getStripe, stripeConfigured } from '@/lib/stripe';

import ThankYou from '../thank-you/ThankYou';

/**
 * /thank-you-vip · Stripe's success_url for the VIP upgrade.
 *
 * ── THE PAGE IS OPEN; THE TRACKING IS NOT ───────────────────────────────────
 * Like every other page here, this one renders for anyone who opens it. No
 * redirect, no fallback to the free version, no "we cannot find your payment"
 * screen for a buyer whose session lookup happened to fail.
 *
 * But the `sales` EVENT is a different question from the PAGE. A conversion
 * that fires on a hand-typed URL is revenue reported that never happened, and
 * it poisons both Meta's optimisation and any cost-per-sale figure read off
 * GA. So the session id in the query string is still retrieved from Stripe on
 * the server, and GA's copy of `sales` fires ONLY when payment_status comes
 * back 'paid'.
 *
 * That split is the whole design of this file: open page, honest numbers.
 *
 * Nothing is fulfilled here and Meta's `sales` is NOT sent here. That lives in
 * the Stripe webhook, because a buyer who pays and closes the tab never loads
 * this page at all.
 */

export const metadata: Metadata = {
  title: "You're in, with VIP | 5-Day Pain Reset",
  description:
    'Your place and your VIP access are confirmed. One step left: join the WhatsApp community for your session links and recordings.',
  robots: { index: false, follow: false },
};

/* Stripe redirects here, so this can never be statically rendered. */
export const dynamic = 'force-dynamic';

type Search = { searchParams: { session_id?: string } };

export default async function ThankYouVipPage({ searchParams }: Search) {
  const sessionId = searchParams.session_id;

  /* Gates the EVENT, never the page. See the note above. */
  let paymentVerified = false;
  let firstName = '';
  let email = '';
  let amount = OFFER_CONFIG.vip.amountGbpNumeric;

  if (sessionId && stripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paymentVerified = session.payment_status === 'paid';
      firstName = session.metadata?.firstName ?? '';
      email = session.customer_details?.email ?? session.customer_email ?? '';
      amount = (session.amount_total ?? OFFER_CONFIG.vip.amountPence) / 100;
    } catch (err) {
      /* A bad or expired id costs the `sales` event and nothing else. The page
         still renders: the payment may well have gone through, and telling a
         paying customer that something broke is worse than showing them the
         confirmation and letting the webhook — which is the real record —
         report the sale. */
      console.error('[thank-you-vip] could not retrieve session', err);
    }
  }

  /* The registration cookie is the fallback for the greeting. Stripe's
     metadata is the better source and wins when present, but someone whose
     session lookup failed still gets their name from here. */
  if (!firstName || !email) {
    const raw = cookies().get(OFFER_CONFIG.registrationCookie)?.value;
    if (raw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as {
          firstName?: string;
          email?: string;
        };
        firstName = firstName || (parsed.firstName ?? '');
        email = email || (parsed.email ?? '');
      } catch {
        /* A malformed cookie just costs the greeting. */
      }
    }
  }

  return (
    <>
      {/* GA's copy of `sales`. Meta's is sent server-side from the Stripe
          webhook, which is the only place that always runs. Rendered ONLY when
          Stripe actually confirmed the payment, so a typed URL cannot report a
          sale that never happened — the one thing on this page that is still
          gated. */}
      {paymentVerified && (
        <VipSaleTracker value={amount} currency={OFFER_CONFIG.vip.currency} />
      )}
      {/* GA join_whatsapp, on all three WhatsApp buttons. */}
      <JoinTracker />
      {/* Always the VIP variant. This is the VIP page; anyone who opens it gets
          the VIP confirmation. */}
      <ThankYou vip firstName={firstName} email={email} />
    </>
  );
}
