import { type Plan, resolvePlan } from './checkout-config';
import { getStripe, stripeConfigured } from './stripe';

/**
 * The one place a Stripe session is turned into "who is this and what did they
 * buy", shared by /thank-you, /confirmed and /confirmed-plus.
 *
 * WHY THREE ROUTES READ THE SAME SESSION
 * Stripe redirects to a single success_url, but the funnel sells two products
 * and each has its own confirmation page. /thank-you is that success_url: it
 * looks the session up, sees which plan was bought, and forwards. The two
 * confirmation pages then verify INDEPENDENTLY rather than trusting the
 * forward, because a URL a buyer can read is a URL anyone can type, and
 * `/confirmed-plus` unverified would hand the VIP joining detail to whoever
 * asked for it.
 *
 * That costs one extra retrieve per purchase, on one page load, once. Cheap
 * next to a confirmation page that can be opened by typing its address.
 *
 * The session id is NEVER treated as proof on its own. `paid` comes from
 * Stripe's own payment_status and nothing else.
 */

export type Confirmation = {
  /** Stripe says this session is paid. False for a typed URL or an expired id. */
  paid: boolean;
  /** What they bought. Meaningless unless `paid` — defaults to the seat. */
  plan: Plan;
  firstName: string;
  email: string;
};

const UNPAID = (plan: Plan): Confirmation => ({
  paid: false,
  plan,
  firstName: '',
  email: '',
});

/**
 * Looks a checkout session up and reports whether it is paid.
 *
 * Never throws. A bad id, an expired session or a Stripe outage all return the
 * unpaid shape, because the pages built on this show a "checking your payment"
 * panel in that case — and telling a customer who has actually paid that
 * something broke is worse than asking them to watch their inbox for a moment.
 */
export async function loadConfirmation(
  sessionId: string | undefined,
): Promise<Confirmation> {
  const fallback = resolvePlan(undefined);
  if (!sessionId || !stripeConfigured()) return UNPAID(fallback);

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const plan = resolvePlan(session.metadata?.plan);
    return {
      paid: session.payment_status === 'paid',
      plan,
      firstName: session.metadata?.firstName ?? '',
      email: session.customer_details?.email ?? session.customer_email ?? '',
    };
  } catch (err) {
    console.error('[confirmation] could not retrieve session', err);
    return UNPAID(fallback);
  }
}
