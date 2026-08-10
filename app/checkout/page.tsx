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

export default function CheckoutPage() {
  return <CheckoutForm />;
}
