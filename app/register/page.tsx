import type { Metadata } from 'next';

import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
  title: 'Claim your free place | 5-Day Pain Reset',
  description:
    'Claim your free place on the 5-Day Pain Reset Challenge. Live, coach-led, on Zoom. No card needed.',
  /* A registration form has nothing to offer search, and indexing it splits
     traffic away from the landing page it is supposed to be reached from. */
  robots: { index: false, follow: false },
};

/**
 * /register · the free stepwise form.
 *
 * Replaces /checkout, which opened a Stripe Checkout Session. There is nothing
 * to pay and therefore nothing to cancel, so this page has no `?cancelled=1`
 * state and no searchParams of its own — the whole reason its predecessor
 * needed them was a buyer coming back from an abandoned payment.
 */
export default function RegisterPage() {
  return <RegisterForm />;
}
