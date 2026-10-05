import type { Metadata } from 'next';

import JoinTracker from '@/components/JoinTracker';
import { loadConfirmation } from '@/lib/confirmation';

import ThankYou from '../thank-you/ThankYou';

/**
 * /confirmed · where a free registrant lands, and the end of the standard path.
 *
 * ── IT IS OPEN. THERE IS NOTHING LEFT TO GATE ─────────────────────────────
 * This page used to require proof: a Stripe session id, or the signed sm_reg
 * cookie issued by the registration form. Anyone else got the pending panel.
 * That was right while a seat cost money and this page was the receipt.
 *
 * It is wrong now, for two reasons.
 *
 * The gate was protecting the WhatsApp invite, and the invite is no longer a
 * secret this page keeps: the same join panel now sits at the foot of /oto,
 * which anybody can open. A lock on one of two doors to the same room is not
 * security, it is just a door that sometimes fails to open.
 *
 * And it did fail. The cookie lasts 12 hours and lives in one browser, so a
 * registrant who came back the next morning, or opened the link on a laptop
 * after registering on a phone, was shown "payment pending" for a free place
 * they already had. People who had done everything right were losing their
 * joining instructions, which is the single most expensive failure in the
 * funnel — the lead is already paid for by then.
 *
 * So the page renders its confirmed state for everyone. The cookie is still
 * read, because it carries the first name and email that personalise the page
 * when it is there; it is simply no longer required for the page to work.
 *
 * ── /confirmed-plus IS STILL LOCKED, AND MUST STAY THAT WAY ───────────────
 * That page carries the VIP joining detail and is the only thing AED 4.99
 * actually buys. It checks for a verified VIP purchase specifically — see the
 * note in its own file. Nothing here applies to it.
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
  /* Read, not required. A Stripe session or the registration cookie gives us a
     name and an email to greet them with; without either, the page still shows
     the joining instructions, just unpersonalised. See the note above. */
  const { firstName, email } = await loadConfirmation(searchParams.session_id);

  /* Kept only to fill a name in design review — the confirmed state no longer
     depends on it, because it is no longer conditional. */
  const preview =
    process.env.NEXT_PUBLIC_PREVIEW_CONFIRMATION === '1' &&
    searchParams.preview === '1';

  return (
    <>
      {/* GA join_whatsapp, on all three WhatsApp buttons. */}
      <JoinTracker />
      <ThankYou
        paid
        firstName={firstName || (preview ? (searchParams.name ?? '') : '')}
        email={email}
      />
    </>
  );
}
