import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import JoinTracker from '@/components/JoinTracker';
import { OFFER_CONFIG } from '@/lib/offer-config';

import ThankYou from './ThankYou';

/**
 * Post-registration page.
 *
 * ── NO GATE ─────────────────────────────────────────────────────────────────
 * The paid build reached this page as Stripe's success_url and re-retrieved
 * the session server-side, because a redirect is not proof that money moved.
 * A later version gated on the registration cookie instead. Both are gone: the
 * page renders the confirmation for anyone who opens it.
 *
 * The only thing behind it is a WhatsApp invite to a FREE challenge, which is
 * worth nothing to someone who has not registered — while a cookie that had
 * expired, been blocked, or been dropped by an in-app browser would have shown
 * a genuine registrant a screen saying their place was not held. Gating cost
 * more than it protected.
 *
 * The cookie is still read, for the greeting alone. Nothing identifying
 * travels in the URL, which is the one thing a query-string handover would
 * have got wrong — an email address in a URL ends up in referrer headers and
 * analytics.
 *
 * Nothing is fulfilled here and nothing is reported here. Both happen in
 * /api/register, because a reader who registers and closes the tab never loads
 * this page.
 */

export const metadata: Metadata = {
  title: "You're in | 5-Day Pain Reset",
  description:
    'Your free place on the 5-Day Pain Reset Challenge is confirmed. One step left: join the WhatsApp community for your session links.',
  robots: { index: false, follow: false },
};

/* Reads a cookie and a query param, so this can never be statically rendered. */
export const dynamic = 'force-dynamic';

export default function ThankYouPage() {
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
    } catch {
      /* A malformed cookie only costs the greeting. The page reads correctly
         with or without a name. */
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
      <ThankYou firstName={firstName} email={email} />
    </>
  );
}
