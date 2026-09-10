import type { Metadata } from 'next';

import JoinTracker from '@/components/JoinTracker';
import { loadConfirmation } from '@/lib/confirmation';

import ThankYou from '../thank-you/ThankYou';

/**
 * /confirmed-plus · where a VIP buyer lands once Stripe has confirmed.
 *
 * The same page as /confirmed, with one difference: a VIP panel above the
 * diary facts, listing the four things the upgrade adds. Everything below it —
 * the WhatsApp step, the community list, the policy, the prep — is identical,
 * because it IS identical: the VIP pass is an addition to the challenge, not a
 * different challenge, and rewriting the shared half here would let the two
 * pages drift apart on facts that must not differ.
 *
 * Verified independently of the /thank-you forward that sends buyers here.
 * Without that, typing this address would hand out the VIP joining detail.
 */

export const metadata: Metadata = {
  title: "You're in · VIP | 5-Day Pain Reset",
  description:
    'Your VIP place on the 5-Day Pain Reset Challenge is confirmed. One step left: join the WhatsApp community for your session links.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Search = {
  searchParams: { session_id?: string; preview?: string; name?: string };
};

export default async function ConfirmedPlusPage({ searchParams }: Search) {
  const { paid, firstName, email } = await loadConfirmation(searchParams.session_id);

  /* Off unless NEXT_PUBLIC_PREVIEW_CONFIRMATION=1 — see the note in /confirmed. */
  const preview =
    process.env.NEXT_PUBLIC_PREVIEW_CONFIRMATION === '1' &&
    searchParams.preview === '1';

  return (
    <>
      <JoinTracker />
      <ThankYou
        vip
        paid={paid || preview}
        firstName={firstName || (preview ? (searchParams.name ?? '') : '')}
        email={email}
      />
    </>
  );
}
