/**
 * SuperMe India · 5-Day Pain Reset — offer config (single source of truth).
 *
 * INDIA OFFER. The currency is INR and every price on the page reads from
 * here. Every date, time and session label on the site also reads from here,
 * so a cohort change is an env edit and a redeploy, never a code change:
 *
 *     NEXT_PUBLIC_OFFER_PRICE_INR=497                     # what the user pays
 *     NEXT_PUBLIC_START_DATE=18th August                  # cohort start
 *     NEXT_PUBLIC_SESSION_TIMES=7 AM & 7 PM               # the two daily session times
 *     NEXT_PUBLIC_SESSIONS_LABEL=Live Sessions, Twice A Day
 *     NEXT_PUBLIC_SESSION_TIMEZONE=IST                    # appended where a zone reads naturally
 *     NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL=https://chat.whatsapp.com/…
 *
 * These are NEXT_PUBLIC_* because the same strings render in the server HTML
 * and in client components; they are inlined at build time, so changing one
 * needs a rebuild, not just a restart.
 *
 * ── WHAT CARRIED OVER FROM THE UK BUILD, AND WHY ────────────────────────────
 * This page was originally reviewed against UK advertising rules, which forbid
 * price-rise pressure and value stacking. Those constraints are KEPT here even
 * though the audience has moved, because India's own advertising code (ASCI)
 * and the Consumer Protection Act 2019's rules on misleading advertisements
 * land in the same place: no invented "was" price, no savings badge, no
 * guaranteed-outcome claim. The shape the postpartum page uses (strikethrough
 * + SAVE badge) must not be reintroduced.
 */

/**
 * parseFLOAT, not parseInt.
 *
 * This was parseInt, which silently truncated: a price set to "4.99" produced
 * 4, so the page read "£4" and Stripe charged 400p. Nothing errored — it just
 * quietly charged the wrong amount, which is the worst way for a price to be
 * wrong.
 *
 * Kept as parseFloat for INR even though rupee prices are almost always whole
 * numbers: the guard costs nothing, and the day someone sets 499.50 it is the
 * difference between charging that and charging 499.
 *
 * Guarded to two decimals, because a price is money and "496.999" is not a
 * thing anyone can be charged.
 */
function parsePriceEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(n * 100) / 100;
}

/** Trim an env string and fall back when it is missing or blank. */
function text(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

/**
 * ONE price variable, read once, rendered everywhere.
 *
 * The NEXT_PUBLIC_OFFER_PRICE_GBP fallback that used to sit here is REMOVED.
 * It existed to cover a host still carrying the old key during migration, but
 * this branch deploys to its own fresh Vercel project where that key never
 * existed. Left in, it was a live hazard: importing the UK project's env by
 * mistake would have quietly set the India price to the GBP figure — ₹4.99
 * instead of ₹497, with nothing erroring to say so.
 */
const PRICE_INR = parsePriceEnv(process.env.NEXT_PUBLIC_OFFER_PRICE_INR, 497);

/**
 * Indian digit grouping, and no trailing ".00".
 *
 * `en-IN` is the point of this, not decoration: Indian grouping is 2-2-3 above
 * a thousand, so 100000 reads 1,00,000 and NOT 100,000. At ₹497 the two are
 * identical, which is exactly why it has to be set now — the difference only
 * appears the day someone raises the price to five figures, and by then nobody
 * is looking at this function.
 *
 * Whole rupees print bare (₹497, not ₹497.00) because that is how a price is
 * written in India; a price with paise still prints both decimals rather than
 * one, because "₹499.5" is not a price anyone writes.
 */
export function formatInr(amount: number): string {
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

const START_DATE = text(process.env.NEXT_PUBLIC_START_DATE, '18th August');
const SESSION_TIMES = text(process.env.NEXT_PUBLIC_SESSION_TIMES, '7 AM & 7 PM');
const SESSIONS_LABEL = text(
  process.env.NEXT_PUBLIC_SESSIONS_LABEL,
  'Live Sessions, Twice A Day',
);
/* "IST", not "India time". It is what every Indian reader already scans for on
   a webinar page, and it is unambiguous in a way "India time" is not. */
const SESSION_TIMEZONE = text(process.env.NEXT_PUBLIC_SESSION_TIMEZONE, 'IST');

/* The thank-you page's one required action. Fills both "Join the Community"
   buttons there. An empty value still renders them, flat and non-clickable, so
   a missing invite is visible rather than a dead href. */
const WHATSAPP_COMMUNITY_URL = text(
  process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL,
  '',
);

/* The single address the legal pages route every question to. One variable, so
   privacy, terms and refunds can never end up quoting three different inboxes
   — which is the usual way these pages rot.

   STILL THE UK FALLBACK, deliberately left for NEXT_PUBLIC_CONTACT_EMAIL to
   replace on the host. Set it before running traffic: an India page routing
   support to a .co.uk inbox is the kind of detail a buyer notices. */
const CONTACT_EMAIL = text(
  process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  'hello@superme.co.uk',
);

export const CHECKOUT_CONFIG = {
  /* ROUNDED. Stripe takes an integer of minor units and rejects anything else,
     and float maths does not oblige: 4.99 * 100 is not reliably 499 across
     every value. This is the number the buyer is actually charged, so it is
     forced to an integer here rather than hoped about at the call site.

     INR's minor unit is the paise, 100 to the rupee, so the ×100 that GBP
     needed is the same arithmetic here. ₹497 is 49700 paise. */
  amountMinor: Math.round(PRICE_INR * 100),
  /* "497", or "1,00,000" once the price is large enough for grouping to show.
     The SYMBOL IS NOT INCLUDED — every caller pairs it with currencySymbol, so
     including it here would double it up. */
  amountString: formatInr(PRICE_INR),
  amountNumeric: PRICE_INR,
  currency: 'INR',
  currencySymbol: '₹',

  /* Meta reporting. This funnel sends THREE CUSTOM events and no standard
     ones: no AddToCart, no InitiateCheckout, no Purchase. The names below are
     the only ones the browser Pixel and the Conversions API are allowed to
     send, and the ad account optimises on them.

         atc_event  a CTA tap on the landing page
         ic_event   the pay button on the checkout page
         sales      the confirmed payment, from the Stripe webhook

     Each event is sent twice, once from the browser and once from the server,
     sharing one event_id so Meta collapses the pair. See lib/meta-capi.ts.

     `value` is the RAW NUMBER, never the formatted string: Meta wants 497, and
     an "₹497" or a "1,00,000" here silently breaks ROAS reporting. */
  capi: {
    events: {
      addToCart: 'atc_event',
      initiateCheckout: 'ic_event',
      sale: 'sales',
    },
    /* contentName is GONE, not merely unused. It read "5-Day Pain Reset
       Challenge" and rode on every event as custom_data.content_name. On a
       Health-and-Wellness-categorised dataset that is a condition string in
       the payload, and it is what gets a custom event reclassified as
       sensitive and filtered. Do not add a product or category string back. */
    value: PRICE_INR,
    currency: 'INR',
  } as const,

  /* /go, not /checkout. There is no checkout page of ours any more: the CTA
     lands on a server route that captures the browser-only Meta match keys,
     fires atc_event, and redirects to the hosted Razorpay page. Changing it
     here moves every CTA on the site, because they all read CHECKOUT_HREF. */
  checkoutPath: '/go',
  /* Razorpay redirects here. There is no /thank-you any more: its only job was
     the Stripe session check, which Razorpay gives us nothing to perform. */
  thankYouPath: '/confirmed',
  funnelSlug: 'superme-pain-reset',
  utmSessionKey: 'superme_utm',

  startDate: START_DATE,
  sessionTimes: SESSION_TIMES,
  sessionsLabel: SESSIONS_LABEL,
  sessionTimezone: SESSION_TIMEZONE,
  /* "7 AM & 7 PM IST" — the zone-qualified form, used where the reader is
     about to put something in a diary rather than merely skim it. It earns its
     place harder in India than it did in the UK: this audience books across a
     dozen time zones' worth of diaspora traffic, and a bare "7 AM" is a missed
     session waiting to happen. */
  sessionTimesWithZone: SESSION_TIMEZONE
    ? `${SESSION_TIMES} ${SESSION_TIMEZONE}`
    : SESSION_TIMES,

  whatsappCommunityUrl: WHATSAPP_COMMUNITY_URL,
  contactEmail: CONTACT_EMAIL,

  privacyPath: '/privacy',
  termsPath: '/terms',
  refundsPath: '/refunds',
};
