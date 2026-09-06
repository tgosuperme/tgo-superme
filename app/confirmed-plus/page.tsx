import type { Metadata } from 'next';

import JoinTracker from '@/components/JoinTracker';
import { OFFER, resolveOffer } from '@/lib/offer';

import ThankYou from '../confirmed/ThankYou';

/**
 * /confirmed-plus — the confirmation for a buyer who took the VIP Pass.
 *
 * ── ONE COMPONENT, TWO PAGES ────────────────────────────────────────────────
 * This renders the SAME <ThankYou> as /confirmed, with `vip` set. Everything a
 * VIP buyer needs — the dates, the WhatsApp step, the prep, the policy — is
 * identical, and duplicating the page to add one block would guarantee the two
 * drift apart the first time a session time changes.
 *
 * What `vip` changes is exactly two things:
 *
 *   · the VIP block becomes "your pass is active" plus what it gets them,
 *     instead of the "add the VIP pass" card
 *   · THE ADD-VIP BUTTON IS GONE. That is the point of this route existing.
 *     An upsell card on the page someone reaches BY buying the upsell reads as
 *     the purchase not having gone through, and produces exactly the support
 *     message it is meant to prevent.
 *
 * ── `vpid` IS THE VIP PAYMENT, `pid` IS THE CHALLENGE ────────────────────────
 * Both are display-only. The entitlement lives on the CRM row, written by the
 * signed webhook. Forging either grants nothing — the recordings are sent by a
 * human working from that row — and the opposite mistake would be costly:
 * gating this on a lookup we cannot do reliably would tell a genuine VIP buyer
 * their pass is not active because Razorpay's redirect beat its own webhook,
 * which it usually does.
 */

export const metadata: Metadata = {
  title: "You're in, with VIP | 5-Day Pain Reset",
  description:
    'Your place on the 5-Day Pain Reset Challenge is confirmed and your VIP pass is active.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function ThankYouVipPage({
  searchParams,
}: {
  searchParams: { name?: string; email?: string; pid?: string; vpid?: string };
}) {
  const offer = resolveOffer();

  return (
    <>
      <JoinTracker />
      <ThankYou
        firstName={searchParams.name ?? ''}
        email={searchParams.email ?? ''}
        pid={(searchParams.pid ?? '').slice(0, 120)}
        pricePaidLabel={offer.vipPriceLabel}
        vipPaymentId={(searchParams.vpid ?? '').slice(0, 120)}
        vip
        morningLabel={OFFER.sessionTime1}
        eveningLabel={OFFER.sessionTime2}
      />
    </>
  );
}
