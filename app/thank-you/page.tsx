import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { loadConfirmation } from '@/lib/confirmation';

import ThankYou from './ThankYou';

/**
 * Stripe's success_url, and now a JUNCTION rather than a destination.
 *
 * The funnel sells two products and each has its own confirmation page, but
 * Stripe takes a single success_url per session. So the session lands here, is
 * verified server-side, and the buyer is forwarded to the page for what they
 * actually bought:
 *
 *     seat → /confirmed
 *     vip  → /confirmed-plus
 *
 * The session id rides along so the destination can verify for itself; it does
 * not trust this redirect. See lib/confirmation.ts for why.
 *
 * A session that is NOT paid is not forwarded anywhere — it renders the pending
 * panel right here. Someone who types this URL, whose session expired, or who
 * abandoned Stripe gets "we are confirming your payment", never joining detail.
 *
 * Nothing is fulfilled here and nothing is tracked here. Both live in the
 * webhook, because a buyer who pays and closes the tab never loads this page.
 */

export const metadata: Metadata = {
  title: "You're in | 5-Day Pain Reset",
  description:
    'Your place on the 5-Day Pain Reset Challenge is confirmed. One step left: join the WhatsApp community for your session links.',
  robots: { index: false, follow: false },
};

/* Stripe redirects here, so this can never be statically rendered. */
export const dynamic = 'force-dynamic';

type Search = { searchParams: { session_id?: string } };

export default async function ThankYouPage({ searchParams }: Search) {
  const sessionId = searchParams.session_id;
  const { paid, plan, email } = await loadConfirmation(sessionId);

  if (paid) {
    /* encodeURIComponent because the id goes back into a query string. Stripe's
       own ids are URL-safe, but this value arrived from the address bar and is
       not ours to assume anything about. */
    redirect(`${plan.confirmPath}?session_id=${encodeURIComponent(sessionId ?? '')}`);
  }

  return <ThankYou paid={false} email={email} />;
}
