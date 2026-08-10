import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

/**
 * Checkout session for the 5-Day Pain Reset.
 *
 * NOT WIRED YET, deliberately. This is a GBP offer, so it needs Stripe rather
 * than the Razorpay flow the postpartum funnel uses, and that needs decisions
 * nobody has made yet: which Stripe account, whether the £6 is a one-off Price
 * or an inline amount, and where the refund is actioned from.
 *
 * The seam is here so the form has something real to post to and fails with a
 * clear message rather than a silent dead button.
 *
 * To finish it:
 *   1. add STRIPE_SECRET_KEY (and the webhook secret) to the host env
 *   2. create the Checkout Session below, amount from CHECKOUT_CONFIG so the
 *      price still has exactly one source of truth
 *   3. return { url: session.url } and the client will redirect to it
 *   4. add /api/webhooks/stripe for checkout.session.completed, and fire the
 *      Meta CAPI Purchase from THERE, not from the success page. A buyer who
 *      pays and closes the tab must still be counted.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { firstName?: string; lastName?: string; email?: string; phone?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* an empty body is still a bad request below */
  }

  const email = (body.email ?? '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'A valid email is required.' }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[checkout] STRIPE_SECRET_KEY is not set, cannot open a session');
    return Response.json(
      {
        error:
          'Payment is not switched on yet. Please email us and we will hold your place.',
      },
      { status: 503 },
    );
  }

  /* The amount is read from config on the server and never from the request,
     so a crafted body cannot open checkout at a lower price. */
  const amount = CHECKOUT_CONFIG.amountPence;
  const currency = CHECKOUT_CONFIG.currency.toLowerCase();
  console.warn(
    `[checkout] Stripe session not implemented (would charge ${amount} ${currency})`,
  );

  return Response.json(
    { error: 'Payment is not switched on yet.' },
    { status: 503 },
  );
}
