import type { Metadata } from 'next';

import ThankYou from '../thank-you/ThankYou';

/**
 * /confirmed · the designed confirmation page with NO registration gate.
 *
 * This exists so the page can be looked at, reviewed and signed off without
 * filling the form in. /thank-you is the real post-registration URL and it
 * checks for the registration cookie, which means it shows the "no place held
 * yet" state to anyone who simply types the address — correct behaviour, but
 * useless for reviewing the design.
 *
 * It renders the SAME component as /thank-you, not a copy, so the two can
 * never drift apart. Only `confirmed` is different: hard-coded true here.
 *
 * ── BEFORE LAUNCH ────────────────────────────────────────────────────────
 * This route shows the full joining instructions to anyone who visits. It is
 * noindex/nofollow, but that is a crawler hint, not access control. Delete
 * this directory once the page is approved, or gate it behind an env flag if
 * it needs to stay.
 */

export const metadata: Metadata = {
  title: 'Confirmation preview | 5-Day Pain Reset',
  robots: { index: false, follow: false },
};

/* Query params are read below, so this cannot be static. */
export const dynamic = 'force-dynamic';

export default function ConfirmedPreviewPage({
  searchParams,
}: {
  searchParams: { name?: string; email?: string };
}) {
  return (
    <ThankYou
      confirmed
      firstName={searchParams.name ?? ''}
      email={searchParams.email ?? ''}
    />
  );
}
