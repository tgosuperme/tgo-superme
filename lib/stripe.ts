import Stripe from 'stripe';

/**
 * Stripe client for the 5-Day Pain Reset (GBP offer, UK account).
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

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
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
  return new URL(req.url).origin;
}
