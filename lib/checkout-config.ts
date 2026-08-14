/**
 * SuperMe · 5-Day Pain Reset — offer config (single source of truth).
 *
 * UK offer, so the currency is GBP and every price on the page reads from here.
 * Every date, time and session label on the site also reads from here, so a
 * cohort change is an env edit and a redeploy, never a code change:
 *
 *     NEXT_PUBLIC_OFFER_PRICE_GBP=6                       # what the user pays
 *     NEXT_PUBLIC_START_DATE=18th August                  # cohort start
 *     NEXT_PUBLIC_SESSION_TIMES=7 AM & 7 PM               # the two daily session times
 *     NEXT_PUBLIC_SESSIONS_LABEL=Live Sessions, Twice A Day
 *     NEXT_PUBLIC_SESSION_TIMEZONE=UK time                # appended where a zone reads naturally
 *     NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL=https://chat.whatsapp.com/…
 *
 * These are NEXT_PUBLIC_* because the same strings render in the server HTML
 * and in client components; they are inlined at build time, so changing one
 * needs a rebuild, not just a restart.
 *
 * NOTE ON UK COMPLIANCE: there is deliberately no list price, no "was" price
 * and no savings figure here. The advertising rules this page is built to
 * forbid price-rise pressure and value stacking, so the shape that the
 * postpartum page uses (strikethrough + SAVE badge) must not be reintroduced.
 */

function parsePriceEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Trim an env string and fall back when it is missing or blank. */
function text(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

const PRICE_GBP = parsePriceEnv(process.env.NEXT_PUBLIC_OFFER_PRICE_GBP, 6);
const START_DATE = text(process.env.NEXT_PUBLIC_START_DATE, '18th August');
const SESSION_TIMES = text(process.env.NEXT_PUBLIC_SESSION_TIMES, '7 AM & 7 PM');
const SESSIONS_LABEL = text(
  process.env.NEXT_PUBLIC_SESSIONS_LABEL,
  'Live Sessions, Twice A Day',
);
const SESSION_TIMEZONE = text(process.env.NEXT_PUBLIC_SESSION_TIMEZONE, 'UK time');

/* The thank-you page's one required action. Fills both "Join the Community"
   buttons there. An empty value still renders them, flat and non-clickable, so
   a missing invite is visible rather than a dead href. */
const WHATSAPP_COMMUNITY_URL = text(
  process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL,
  '',
);

/* The single address the legal pages route every question to. One variable, so
   privacy, terms and refunds can never end up quoting three different inboxes
   — which is the usual way these pages rot. */
const CONTACT_EMAIL = text(
  process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  'hello@superme.co.uk',
);

export const CHECKOUT_CONFIG = {
  amountPence: PRICE_GBP * 100,
  amountGbpString: String(PRICE_GBP),
  amountGbpNumeric: PRICE_GBP,
  currency: 'GBP',
  currencySymbol: '£',

  /* Meta reporting. This funnel sends THREE CUSTOM events and no standard
     ones: no AddToCart, no InitiateCheckout, no Purchase. The names below are
     the only ones the browser Pixel and the Conversions API are allowed to
     send, and the ad account optimises on them.

         atc_event  a CTA tap on the landing page
         ic_event   the pay button on the checkout page
         sales      the confirmed payment, from the Stripe webhook

     Each event is sent twice, once from the browser and once from the server,
     sharing one event_id so Meta collapses the pair. See lib/meta-capi.ts. */
  capi: {
    events: {
      addToCart: 'atc_event',
      initiateCheckout: 'ic_event',
      sale: 'sales',
    },
    contentName: '5-Day Pain Reset Challenge',
    value: PRICE_GBP,
    currency: 'GBP',
  } as const,

  checkoutPath: '/checkout',
  thankYouPath: '/thank-you',
  funnelSlug: 'superme-pain-reset',
  utmSessionKey: 'superme_utm',

  startDate: START_DATE,
  sessionTimes: SESSION_TIMES,
  sessionsLabel: SESSIONS_LABEL,
  sessionTimezone: SESSION_TIMEZONE,
  /* "7 AM & 7 PM UK time" — the zone-qualified form, used where the reader is
     about to put something in a diary rather than merely skim it. */
  sessionTimesWithZone: SESSION_TIMEZONE
    ? `${SESSION_TIMES} ${SESSION_TIMEZONE}`
    : SESSION_TIMES,

  whatsappCommunityUrl: WHATSAPP_COMMUNITY_URL,
  contactEmail: CONTACT_EMAIL,

  privacyPath: '/privacy',
  termsPath: '/terms',
  refundsPath: '/refunds',
};
