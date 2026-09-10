import type { Metadata } from 'next';

import OtoChoice from './OtoChoice';

/**
 * /oto · the selection step between the landing page and the checkout.
 *
 * noindex: it is a step inside a paid funnel, not a page anyone should arrive
 * at from search, and indexing it would put a half-priced-looking figure in
 * results with none of the landing page's context around it.
 */

export const metadata: Metadata = {
  title: 'Choose your place | 5-Day Pain Reset',
  description:
    'Hold your seat on the live 5-Day Pain Reset Challenge, and choose whether to add the VIP pass.',
  robots: { index: false, follow: false },
};

export default function OtoPage() {
  return <OtoChoice />;
}
