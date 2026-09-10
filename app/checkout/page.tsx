import type { Metadata } from 'next';

import { resolvePlan } from '@/lib/checkout-config';

import CheckoutForm from './CheckoutForm';

export const metadata: Metadata = {
  title: 'Hold your seat | 5-Day Pain Reset',
  description:
    'Hold your seat on the 5-Day Pain Reset Challenge. Live, coach-led, on Zoom.',
  /* A checkout has nothing to offer search, and indexing it splits traffic
     away from the landing page it is supposed to be reached from. */
  robots: { index: false, follow: false },
};

/* Reads two things from the URL, both resolved on the server and handed down as
   plain props so the client component keeps its static shell:
 *
 *   ?plan=vip     what the reader chose on the OTO. Narrowed through
 *                 resolvePlan, so a typed or stale value falls back to the seat
 *                 rather than rendering an undefined price.
 *   ?cancelled=1  Stripe's cancel_url, which the form reads to explain the
 *                 return. It carries the plan back too, so an abandoned VIP
 *                 checkout does not quietly reopen as a seat.
 */
export default function CheckoutPage({
  searchParams,
}: {
  searchParams: { cancelled?: string; plan?: string };
}) {
  return (
    <CheckoutForm
      planId={resolvePlan(searchParams.plan).id}
      cancelled={searchParams.cancelled === '1'}
    />
  );
}
