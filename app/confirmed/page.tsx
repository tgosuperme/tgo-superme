import type { Metadata } from 'next';

import JoinTracker from '@/components/JoinTracker';
import { loadConfirmation } from '@/lib/confirmation';

import ThankYou from '../thank-you/ThankYou';

/**
 * /confirmed · where a SEAT buyer lands once Stripe has confirmed the payment.
 *
 * Reached by forward from /thank-you, which is Stripe's success_url. It does
 * not take that forward on trust: the session id is re-verified here, so typing
 * this address shows the pending panel rather than the joining instructions.
 *
 * The VIP equivalent is /confirmed-plus. Both render the same component with
 * the same content; only the top block differs.
 *
 * ── PREVIEWING THE DESIGN ─────────────────────────────────────────────────
 * `?preview=1` renders the confirmed state without a payment, so the page can
 * be reviewed and signed off. It only works while
 * NEXT_PUBLIC_PREVIEW_CONFIRMATION=1 is set, and it is OFF unless that variable
 * is present.
 *
 * TURN IT OFF BEFORE LAUNCH. While it is on, anyone who guesses the query
 * string sees the full joining instructions — the WhatsApp step, the community
 * detail, the prep — with no proof of purchase. noindex is a crawler hint, not
 * access control. It is an env variable rather than a code change precisely so
 * switching it off is a redeploy and not a pull request.
 */

export const metadata: Metadata = {
  title: "You're in | 5-Day Pain Reset",
  description:
    'Your place on the 5-Day Pain Reset Challenge is confirmed. One step left: join the WhatsApp community for your session links.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Search = {
  searchParams: { session_id?: string; preview?: string; name?: string };
};

export default async function ConfirmedPage({ searchParams }: Search) {
  const { paid, firstName, email } = await loadConfirmation(searchParams.session_id);

  /* Off unless the env flag is explicitly set — see the note above. */
  const preview =
    process.env.NEXT_PUBLIC_PREVIEW_CONFIRMATION === '1' &&
    searchParams.preview === '1';

  return (
    <>
      {/* GA join_whatsapp, on all three WhatsApp buttons. */}
      <JoinTracker />
      <ThankYou
        paid={paid || preview}
        firstName={firstName || (preview ? (searchParams.name ?? '') : '')}
        email={email}
      />
    </>
  );
}
