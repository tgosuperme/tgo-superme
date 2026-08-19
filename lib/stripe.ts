import Stripe from 'stripe';

import { SITE_URL } from '@/lib/site';

/**
 * Stripe client for the 5-Day Pain Reset.
 *
 * INR is a PRESENTMENT currency here, not a settlement one: the account is the
 * existing non-Indian one, and Stripe converts. See lib/payments.ts for the
 * decision and what it rules out.
 *
 * Constructed lazily on first use, never at module scope. A build or a page
 * render must not fall over just because the key is absent from an environment
 * that never takes a payment (preview builds, local design work). The routes
 * that need it check for the key first and return a clean 503.
 *
 * apiVersion is deliberately not pinned here: the SDK sends its own pinned
 * version, which is the one its types are generated against. Pinning a string
 * by hand is how these files rot.
 */

let client: Stripe | null = null;

/**
 * Is there a key, AND does it look like a key?
 *
 * The shape check is not pedantry — it exists because of a real failure. A key
 * pasted without its `sk_test_` / `sk_live_` prefix is a non-empty string, so
 * the old `Boolean(...)` test passed it happily, the route went on to call
 * Stripe, Stripe rejected it, and the buyer saw "Could not open the payment
 * page. Please try again." — which is the one message that is actively
 * misleading here, because trying again cannot possibly help.
 *
 * The half a key that survives that mis-paste (`51RWexQBgu…`) is the account
 * identifier, and it is IDENTICAL in test and live mode, so it looks
 * convincingly key-shaped to a human scanning an env file. Hence a check the
 * machine does instead.
 *
 * Deliberately a prefix test and nothing more. Length and alphabet vary across
 * Stripe's key formats, and a validator that rejects a real key is far worse
 * than one that lets a malformed key through to Stripe's own error.
 */
export function stripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return false;
  return /^(sk_test_|sk_live_|rk_test_|rk_live_)/.test(key);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  if (!client) {
    client = new Stripe(key, {
      appInfo: { name: 'SuperMe 5-Day Pain Reset', version: '1.0.0' },
    });
  }
  return client;
}

/**
 * Absolute origin for success and cancel URLs.
 *
 * Stripe requires absolute URLs, and the host header is the only thing that
 * knows whether this is localhost, a Vercel preview or the live domain. The
 * env var wins when set, so a custom domain behind a proxy can be forced.
 *
 * The host header is kept AHEAD of the hard-coded SITE_URL deliberately: on
 * the live domain the two are the same string, but on localhost and Vercel
 * previews the header is the only thing that keeps a test purchase returning
 * to the deployment it started from rather than bouncing to production.
 * SITE_URL is the last resort, for a request that arrives with no host at all.
 */
export function siteOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;

  const headers = req.headers;
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  const proto =
    headers.get('x-forwarded-proto') ??
    (host?.startsWith('localhost') || host?.startsWith('127.') ? 'http' : 'https');

  if (host) return `${proto}://${host}`;
  return SITE_URL;
}
