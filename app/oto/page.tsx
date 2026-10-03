import type { Metadata } from 'next';

import OtoChoice from './OtoChoice';

/**
 * /oto · the VIP upgrade offer, between registration and the checkout.
 *
 * It is no longer a selection step: the place is already registered by the
 * time anyone arrives, so the page offers one thing and takes a decline. See
 * the note at the top of OtoChoice.
 *
 * noindex: a step inside a funnel, not a page anyone should arrive at from
 * search. Indexing it would put a bare price in results with none of the
 * landing page's context around it.
 */

export const metadata: Metadata = {
  title: 'Upgrade to VIP | 5-Day Pain Reset',
  description:
    'A one-time offer: add the VIP pass to your place on the live 5-Day Pain Reset Challenge and keep the recordings, two extra guides and priority correction.',
  robots: { index: false, follow: false },
};

export default function OtoPage() {
  return <OtoChoice />;
}
