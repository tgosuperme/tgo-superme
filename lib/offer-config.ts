/**
 * SuperMe · 5-Day Pain Reset — offer config (single source of truth).
 *
 * ── TWO TIERS ───────────────────────────────────────────────────────────────
 * The challenge itself is FREE and always will be. A paid VIP upgrade is
 * offered ONCE, on the OTO page, after the reader has already registered:
 *
 *     FREE   the five live sessions, both timings, real-time correction, the
 *            Day 1 to Day 4 score, and two of the four guides
 *     VIP    everything above plus the recordings of all five sessions kept
 *            for life, priority attention in the room, and the other two
 *            guides. One payment of £4.99, no subscription.
 *
 * THE ORDER MATTERS AND IS DELIBERATE. The registration is recorded the moment
 * the form is submitted, BEFORE the upgrade is offered. Someone who abandons
 * the OTO is still a registered attendee with a row in the sheet — the upsell
 * can only ever add, never gate.
 *
 * Every date, time and session label on the site reads from here, so a cohort
 * change is an env edit and a redeploy, never a code change:
 *
 *     NEXT_PUBLIC_START_DATE=18th August                  # cohort start
 *     NEXT_PUBLIC_SESSION_TIMES=7 AM & 7 PM               # the two daily session times
 *     NEXT_PUBLIC_SESSIONS_LABEL=Live Sessions, Twice A Day
 *     NEXT_PUBLIC_SESSION_TIMEZONE=UK time                # appended where a zone reads naturally
 *     NEXT_PUBLIC_VIP_PRICE_GBP=4.99                      # the VIP upgrade only
 *     NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL=https://chat.whatsapp.com/…
 *
 * These are NEXT_PUBLIC_* because the same strings render in the server HTML
 * and in client components; they are inlined at build time, so changing one
 * needs a rebuild, not just a restart.
 *
 * NOTE ON UK COMPLIANCE: there is deliberately no list price, no "was" price
 * and no savings figure on the VIP tier. The advertising rules this funnel was
 * reviewed against forbid price-rise pressure and value stacking, so the shape
 * the postpartum page uses (strikethrough + SAVE badge) must not be
 * reintroduced. £4.99 is stated once, plainly, as what it is.
 */

/**
 * parseFLOAT, not parseInt.
 *
 * This lesson is carried over from the original paid build, where it was
 * parseInt and silently truncated: a price of "4.99" produced 4, so the page
 * read "£4" and Stripe charged 400p. Nothing errored — it just quietly charged
 * the wrong amount, which is the worst way for a price to be wrong.
 *
 * Guarded to two decimals, because a price is money and "4.999" is not a thing
 * anyone can be charged.
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

const START_DATE = text(process.env.NEXT_PUBLIC_START_DATE, '18th August');
const SESSION_TIMES = text(process.env.NEXT_PUBLIC_SESSION_TIMES, '7 AM & 7 PM');
const SESSIONS_LABEL = text(
  process.env.NEXT_PUBLIC_SESSIONS_LABEL,
  'Live Sessions, Twice A Day',
);
const SESSION_TIMEZONE = text(process.env.NEXT_PUBLIC_SESSION_TIMEZONE, 'UK time');

/** The VIP upgrade price. The free tier has no price and never gets one. */
const VIP_PRICE_GBP = parsePriceEnv(process.env.NEXT_PUBLIC_VIP_PRICE_GBP, 4.99);

/* The thank-you page's one required action. Fills both "Join the Community"
   buttons there. An empty value still renders them, flat and non-clickable, so
   a missing invite is visible rather than a dead href. */
const WHATSAPP_COMMUNITY_URL = text(
  process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL,
  '',
);

/* The single address the legal pages route every question to. One variable, so
   privacy, terms and cancellations can never end up quoting three different
   inboxes — which is the usual way these pages rot. */
const CONTACT_EMAIL = text(
  process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  'hello@superme.co.uk',
);

export const OFFER_CONFIG = {
  /* The word the page uses wherever the FREE tier's price would sit. Defined
     once so the hero card, the docked bars and the CTA labels cannot end up
     saying three different things ("Free", "£0", "No cost"). */
  priceLabel: 'Free',
  /* The reassurance line under every CTA on the landing page and the form.
     Note this describes REGISTERING, which is genuinely free and genuinely
     needs no card. It must not be repeated on the OTO or anywhere past it,
     where a card is being asked for. */
  ctaNote: '100% Free · No Card Needed',

  /* ── the VIP upgrade ─────────────────────────────────────────────────
     ROUNDED to an integer of minor units. Stripe takes pence and rejects
     anything else, and float maths does not oblige: 4.99 * 100 is not
     reliably 499 across every value. This is the number the buyer is actually
     charged, so it is forced to an integer here rather than hoped about at
     the call site. */
  vip: {
    amountPence: Math.round(VIP_PRICE_GBP * 100),
    amountGbpString: String(VIP_PRICE_GBP),
    amountGbpNumeric: VIP_PRICE_GBP,
    currency: 'GBP',
    currencySymbol: '£',
    /** "£4.99" — the one place the VIP price is composed. */
    priceLabel: `£${VIP_PRICE_GBP}`,
    productName: '5-Day Pain Reset — VIP Access',
  },

  /* Meta reporting. This funnel sends FOUR CUSTOM events and no standard
     ones: no AddToCart, no InitiateCheckout, no Purchase.

         atc_event              a CTA tap on the landing page, which opens the
                                registration modal
         ic_event               the reader completes step 1 of the form
         registration_complete  the registration is recorded — the FREE
                                conversion, and the one the ad account
                                optimises on
         sales                  a VIP upgrade is paid for, confirmed by the
                                Stripe webhook

     ── ON `sales` COMING BACK ──────────────────────────────────────────
     It was retired when the funnel went free, on the grounds that a
     conversion named for a sale is a lie when nothing is sold. A sale now
     exists again — the VIP upgrade — so the name is accurate once more and
     is reused rather than invented afresh, which keeps whatever history the
     old custom conversion still carries.

     BE PRECISE ABOUT WHAT IT MEANS NOW. `sales` counts VIP upgrades ONLY,
     never registrations. The volume will be a fraction of
     registration_complete, and anyone reading the two side by side needs to
     know that is correct rather than a tracking fault.

     `sales` is the ONLY event that carries a value and a currency. The other
     three are free actions worth £0, and telling Meta so on every one of them
     would train value-based bidding on a stream of zeros. */
  capi: {
    events: {
      addToCart: 'atc_event',
      initiateCheckout: 'ic_event',
      registrationComplete: 'registration_complete',
      vipSale: 'sales',
    },
    /* THERE IS NO `contentName` HERE ANY MORE, and it must not come back.
       This pixel's data source is categorised HEALTH & WELLNESS. Under that
       restriction nothing sent to Meta may describe a health condition,
       symptom or treatment, and "5-Day Pain Reset Challenge" — which is what
       this key held, on every event — is a condition string.

       Custom event NAMES survive the restriction; PAYLOADS describing the
       condition do not. That is precisely why this funnel reports atc_event /
       ic_event / registration_complete / sales rather than Meta's standard
       AddToCart / InitiateCheckout / Purchase: standard events are blocked by
       name for a restricted source, custom ones are not.

       See lib/meta-capi.ts, where custom_data is now money-only and
       event_source_url is reduced to the origin. */
  } as const,

  /* ── routes, in funnel order ──────────────────────────────────────────
     /               landing, CTAs open the registration modal
     /upgrade        the OTO, shown once, immediately after registering
     /thank-you      free confirmation
     /thank-you-vip  VIP confirmation, everything the free one says plus the
                     VIP extras

     THERE IS NO /register ROUTE. Registration happens only in the modal on the
     landing page, so the CTAs point at a fragment rather than a URL — there is
     no page for them to fall back to.

     WHAT THAT COSTS, stated plainly rather than discovered later: without
     JavaScript the CTAs do nothing. There is no no-JS path to registering any
     more. If that matters, the fix is to bring back a /register page rendering
     the same component, not to make the modal cleverer. */
  registerAnchor: '#register',
  upgradePath: '/upgrade',
  thankYouPath: '/thank-you',
  thankYouVipPath: '/thank-you-vip',
  funnelSlug: 'superme-pain-reset',
  utmSessionKey: 'superme_utm',

  /* Set by /api/register on the response that records a registration. Read by
     /upgrade and /thank-you to personalise, and by /api/checkout to attach the
     VIP purchase to the SAME person without trusting anything the browser
     says. httpOnly, so no script can read the identity it carries. */
  registrationCookie: 'superme_reg',
  registrationCookieMaxAge: 60 * 60 * 2, // two hours, enough to finish the OTO

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
