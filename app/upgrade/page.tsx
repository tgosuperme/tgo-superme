import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { OFFER_CONFIG } from '@/lib/offer-config';

import UpgradeChoice from './UpgradeChoice';

/**
 * /upgrade · the one-time offer, shown once, immediately after registering.
 *
 * ── THE PLACE IS ALREADY HELD BEFORE ANYONE SEES THIS ───────────────────────
 * /api/register wrote the row and fired registration_complete before the
 * redirect here. That is the single most important fact about this page: it
 * can only ever ADD to what someone already has. Nothing on it gates the free
 * challenge, and closing the tab here costs them nothing.
 *
 * It also means this page must never imply otherwise. No "complete your
 * registration", no progress bar suggesting a missing step, no countdown
 * implying the free place expires. The reader is done; this is a genuine
 * either/or.
 *
 * ── NO REDIRECT GATE ────────────────────────────────────────────────────────
 * This used to bounce anyone without the registration cookie to /register.
 * That was wrong twice over: it made the page impossible to open and review,
 * and — worse — a cookie that had expired, been blocked, or been dropped by an
 * in-app browser would throw a reader who HAD just registered back to a form
 * they had already filled in.
 *
 * So the page always renders. What it cannot do without a registration is take
 * a payment, and that is enforced where it actually matters: /api/checkout
 * reads the buyer's identity from the httpOnly cookie and returns 401 without
 * it. The VIP button then shows its ordinary "not available right now, your
 * free place is still held" message. Nothing here is worth gating a page for —
 * it is an offer, not a fulfilment.
 *
 * The cookie is still read, for the greeting alone.
 */

export const metadata: Metadata = {
  title: 'One step before you pick your slot | 5-Day Pain Reset',
  description:
    'Your free seat is confirmed either way. Choose whether to add VIP access with the recordings, priority attention and two extra guides.',
  /* An offer page behind a registration gate has nothing to give search, and
     indexing it would send people to a page that just bounces them. */
  robots: { index: false, follow: false },
};

/* Reads a cookie, so this can never be statically rendered. */
export const dynamic = 'force-dynamic';

type Search = { searchParams: { cancelled?: string } };

export default function UpgradePage({ searchParams }: Search) {
  const raw = cookies().get(OFFER_CONFIG.registrationCookie)?.value;

  let firstName = '';
  if (raw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as { firstName?: string };
      firstName = parsed.firstName ?? '';
    } catch {
      /* A malformed cookie only costs the greeting. The headline reads
         correctly with or without a name. */
    }
  }

  return (
    <UpgradeChoice
      firstName={firstName}
      /* THE COOKIE IS httpOnly, so the client cannot answer this for itself —
         it has to be told. Without it, someone who reaches this page without
         registering (a shared link, an expired cookie, a direct visit) presses
         a button and gets "we could not find your details" from the API, which
         is a dead end. Knowing here means the page can open the registration
         dialog instead and carry their choice through it. */
      hasRegistration={Boolean(raw)}
      /* Stripe's cancel_url lands back here with ?cancelled=1. Coming back
         from an abandoned payment must read as "nothing happened", not as a
         failure — their free place was never at stake. */
      cancelled={searchParams.cancelled === '1'}
    />
  );
}
