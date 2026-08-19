/**
 * SuperMe India — the site's own address.
 *
 * HARD-CODED on purpose, not read from env. This deployment has exactly one
 * live home, and the tracking that hangs off it (GA4, Clarity, the Pixel) is
 * pinned to the same property set. An env var here would let a stale value on
 * the host silently repoint canonical URLs and Stripe redirects at the UK
 * site, which is precisely the failure this constant exists to prevent.
 *
 * Change it here, in one place, if the domain ever moves.
 */
export const SITE_URL = 'https://india.mysuperme.com';

/** The same value as a URL, for `metadataBase` and anything resolving paths. */
export const SITE_ORIGIN = new URL(SITE_URL);
