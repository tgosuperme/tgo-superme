import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import JoinTracker from '@/components/JoinTracker';
import { OFFER_CONFIG } from '@/lib/offer-config';

import ThankYou from './ThankYou';

/**
 * Post-registration page.
 *
 * ── WHAT REPLACED THE STRIPE GATE ───────────────────────────────────────────
 * The paid build reached this page as Stripe's success_url and re-retrieved
 * the session server-side, because a redirect is not proof that money moved.
 * With nothing to pay there is no session to check and nothing to protect: the
 * only thing behind this gate is a WhatsApp invite for a free challenge.
 *
 * So the gate is now the short-lived httpOnly cookie /api/register sets on the
 * response that records the registration. It does two jobs: it says a
 * registration just happened in this browser, and it carries the first name
 * and email the page greets the reader with. Nothing identifying travels in
 * the URL, which is the one thing a query-string handover would have got
 * wrong — an email address in a URL ends up in referrer headers and analytics.
 *
 * `?registered=1` is a FALLBACK, not a second gate. If the cookie is refused
 * or dropped, a reader who genuinely just registered still lands on the
 * confirmation instead of the pending panel; they simply are not greeted by
 * name. Someone typing that query by hand sees the joining instructions, and
 * that is an accepted trade for a free offer — the alternative is telling real
 * registrants that nothing happened.
 *
 * Nothing is fulfilled here and nothing is reported here. Both happen in
 * /api/register, because a reader who registers and closes the tab never loads
 * this page.
 *
 * This file is the GATE; ./ThankYou is what the registrant actually sees.
 */

export const metadata: Metadata = {
  title: "You're in | 5-Day Pain Reset",
  description:
    'Your free place on the 5-Day Pain Reset Challenge is confirmed. One step left: join the WhatsApp community for your session links.',
  robots: { index: false, follow: false },
};

/* Reads a cookie and a query param, so this can never be statically rendered. */
export const dynamic = 'force-dynamic';

type Search = { searchParams: { registered?: string } };

export default function ThankYouPage({ searchParams }: Search) {
  let confirmed = searchParams.registered === '1';
  let firstName = '';
  let email = '';

  const raw = cookies().get(OFFER_CONFIG.registrationCookie)?.value;
  if (raw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as {
        firstName?: string;
        email?: string;
      };
      firstName = parsed.firstName ?? '';
      email = parsed.email ?? '';
      confirmed = true;
    } catch {
      /* A malformed cookie is treated as absent rather than thrown on. The
         query fallback above may still confirm, and the pending panel is a
         safe landing either way. */
    }
  }

  return (
    <>
      {/* No registration_complete event fires here. Meta's copy is sent
          server-side from /api/register and GA's is fired by the form itself,
          both at the moment the registration is actually recorded —
          /api/register is the only place that always runs, since a reader who
          registers and closes the tab never loads this page at all. The
          browser Pixel fires PageView and nothing else. */}
      {/* GA join_whatsapp, on all three WhatsApp buttons. */}
      <JoinTracker />
      <ThankYou confirmed={confirmed} firstName={firstName} email={email} />
    </>
  );
}
