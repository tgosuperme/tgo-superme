import type { Metadata } from 'next';

import CheckoutForm from './CheckoutForm';

export const metadata: Metadata = {
  title: 'Reserve your place | 5-Day Pain Reset',
  description:
    'Hold your place on the 5-Day Pain Reset Challenge. Live, coach-led, on Zoom.',
  /* A checkout has nothing to offer search, and indexing it splits traffic
     away from the landing page it is supposed to be reached from. */
  robots: { index: false, follow: false },
};

/* Stripe's cancel_url lands back here with ?cancelled=1, which the form reads
   to explain the return. Passed down as a prop rather than read with
   useSearchParams, so the client component keeps its static shell. */
export default function CheckoutPage({
  searchParams,
}: {
  searchParams: { cancelled?: string };
}) {
  return <CheckoutForm cancelled={searchParams.cancelled === '1'} />;
}
