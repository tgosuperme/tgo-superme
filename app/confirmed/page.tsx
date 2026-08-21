import type { Metadata } from 'next';

import JoinTracker from '@/components/JoinTracker';

import ThankYou from './ThankYou';

/**
 * /confirmed · where Razorpay sends the buyer after a successful payment.
 *
 * This was a design-preview route sitting beside a Stripe-gated /thank-you.
 * The gate verified a Checkout Session server-side, which Razorpay's hosted
 * Payment Page does not give us, so it had nothing left to verify and both it
 * and the /thank-you route are gone. This is now the real page.
 *
 * NOTHING IS FULFILLED OR TRACKED HERE. A buyer can pay and close the tab
 * before the redirect lands, and on a phone a meaningful share of them do. The
 * `sales` event and the CRM row both fire from /api/webhooks/razorpay, which is
 * the only thing that always runs.
 */

export const metadata: Metadata = {
  title: "You're in | 5-Day Pain Reset",
  description:
    'Your place on the 5-Day Pain Reset Challenge is confirmed. One step left: join the WhatsApp community for your session links.',
  /* noindex because it is reachable without proof of payment — see the note in
     ./ThankYou.tsx. The joining instructions are not a secret; the seat is. */
  robots: { index: false, follow: false },
};

/* Razorpay appends its own query params on the redirect, so this cannot be
   statically rendered. */
export const dynamic = 'force-dynamic';

export default function ConfirmedPage({
  searchParams,
}: {
  searchParams: { name?: string; email?: string };
}) {
  return (
    <>
      {/* GA join_whatsapp, on all three WhatsApp buttons. */}
      <JoinTracker />
      <ThankYou firstName={searchParams.name ?? ''} email={searchParams.email ?? ''} />
    </>
  );
}
