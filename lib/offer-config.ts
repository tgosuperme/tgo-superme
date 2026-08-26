/**
 * SuperMe · 5-Day Pain Reset — offer config (single source of truth).
 *
 * THE CHALLENGE IS FREE. There is no price, no currency and no payment
 * processor anywhere in this funnel: the reader fills in a short stepwise form
 * at /register and their place is held. Everything the old paid build carried
 * about money — amountPence, amountGbpString, the currency symbol, Stripe — is
 * gone rather than zeroed, so nothing can quietly render "£0.00" or open a
 * checkout for nothing.
 *
 * Every date, time and session label on the site still reads from here, so a
 * cohort change is an env edit and a redeploy, never a code change:
 *
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
 * and no savings figure here, and now no price at all. The advertising rules
 * this page is built to satisfy forbid price-rise pressure and value stacking,
 * so the shape the postpartum page uses (strikethrough + SAVE badge) must not
 * be reintroduced — and on a free offer a "you save 100%" device would be the
 * worst version of it.
 */

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
  /* The word the page uses wherever a price used to sit. Defined once so the
     hero card, the docked bars and the CTA labels cannot end up saying three
     different things ("Free", "£0", "No cost"). */
  priceLabel: 'Free',
  /* The reassurance line under every CTA, in place of the old money-back
     guarantee. Same rule: one string, used everywhere. */
  ctaNote: '100% Free · No Card Needed',

  /* Meta reporting. This funnel sends THREE CUSTOM events and no standard
     ones: no AddToCart, no InitiateCheckout, no Purchase. The names below are
     the only ones the browser Pixel and the Conversions API are allowed to
     send, and the ad account optimises on them.

         atc_event              a CTA tap on the landing page, which is now a
                                link to /register
         ic_event               the reader completes step 1 of the form
         registration_complete  the registration is recorded — the conversion

     ── ON THE CONVERSION EVENT'S NAME ──────────────────────────────────
     It was `sales`, and it is renamed because the word became a lie: nothing
     is sold. A conversion named `sales` sitting in Events Manager against a
     free offer is the kind of thing that reads fine to whoever built it and
     misleads everyone afterwards — including anyone judging cost-per-sale
     against a funnel that has no sales.

     THIS IS A BREAKING CHANGE ON THE META SIDE and cannot be avoided by code:
     `registration_complete` arrives as a NEW custom event with no history, so
     a custom conversion has to be created against it and every ad set
     optimising for `sales` has to be repointed. Until that is done the ad
     account is optimising toward an event nothing sends any more. The
     learning on the old event does not transfer.

     The other two names are deliberately untouched, precisely so that this
     re-pointing is limited to the one event that had to move.

     What also changed is `ic_event`'s trigger. There is no pay button to tap
     any more, so it fires when the reader finishes the first step of the form
     — the first real commitment they make — which keeps a genuine mid-funnel
     signal between the CTA tap and the completed registration.

     No `value` and no `currency` are sent. A free registration is worth £0 and
     telling Meta so on every event would train value-based bidding on zeros;
     omitting the fields entirely is what a lead event is supposed to look
     like. */
  capi: {
    events: {
      addToCart: 'atc_event',
      initiateCheckout: 'ic_event',
      registrationComplete: 'registration_complete',
    },
    contentName: '5-Day Pain Reset Challenge',
  } as const,

  registerPath: '/register',
  thankYouPath: '/thank-you',
  funnelSlug: 'superme-pain-reset',
  utmSessionKey: 'superme_utm',

  /* Set by /api/register on the response that completes a registration, read
     by /thank-you to personalise the confirmation. httpOnly and short-lived:
     it carries a first name and an email address and has no business being
     readable by script or surviving the session. */
  registrationCookie: 'superme_reg',
  registrationCookieMaxAge: 60 * 60, // one hour

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
