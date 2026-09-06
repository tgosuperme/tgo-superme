import type { Metadata } from 'next';

import JoinTracker from '@/components/JoinTracker';
import { OFFER, resolveOffer } from '@/lib/offer';

import ThankYou from './ThankYou';

/**
 * /confirmed · where Razorpay sends a Standard Pass buyer after payment.
 *
 * There is no payment gate. Razorpay's hosted Payment Page gives us no
 * session of ours to verify, so the redirect is taken at face value and the
 * page is noindex. Fulfilment does not depend on it — see below.
 *
 * NOTHING IS FULFILLED OR TRACKED HERE. A buyer can pay and close the tab
 * before the redirect lands, and on a phone a meaningful share of them do. The
 * `sales` event and the CRM row both fire from /api/webhooks/razorpay, which is
 * the only thing that always runs.
 *
 * ── `vip=1` IS A DISPLAY HINT, NOT A RECORD ─────────────────────────────────
 * It arrives on the redirect from the VIP Payment Page and decides which of
 * the two VIP blocks this page shows. It is trivially forgeable by typing it
 * into the URL, and that is fine: forging it grants nothing. The VIP
 * entitlement lives on the CRM row, written by the signed webhook, and the
 * recordings are delivered by a human from that row. The worst a forger
 * achieves is a nicer sentence on their own screen.
 *
 * The opposite mistake would be costly: gating this on a server lookup we
 * cannot do, and telling a genuine VIP buyer their pass is not active because
 * Razorpay's redirect beat its own webhook — which it usually does.
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
  searchParams: { name?: string; email?: string; pid?: string; vip?: string };
}) {
  const offer = resolveOffer();

  return (
    <>
      {/* GA join_whatsapp, on all three WhatsApp buttons. */}
      <JoinTracker />
      <ThankYou
        firstName={searchParams.name ?? ''}
        email={searchParams.email ?? ''}
        pid={(searchParams.pid ?? '').slice(0, 120)}
        pricePaidLabel={offer.priceLabel}
        vip={searchParams.vip === '1'}
        morningLabel={OFFER.sessionTime1}
        eveningLabel={OFFER.sessionTime2}
      />
    </>
  );
}
