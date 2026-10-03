/**
 * SuperMe · 5-Day Pain Reset (UAE) — offer config (single source of truth).
 *
 * DUBAI offer, so the currency is AED, the clock is GST, and every price and
 * time on the page reads from here. This was a GBP/UK build; the market moved
 * and the env var NAMES moved with it, so a stale GBP value left in Vercel
 * cannot be picked up silently by a name that still matches.
 * Every date, time and session label on the site also reads from here, so a
 * cohort change is an env edit and a redeploy, never a code change:
 *
 *     NEXT_PUBLIC_VIP_PRICE_AED=4.99                      # the optional VIP pass
 *     NEXT_PUBLIC_ANCHOR_PRICE_AED=9                      # five live sessions, one part of the struck figure
 *     NEXT_PUBLIC_START_DATE=14th October                 # cohort start
 *     NEXT_PUBLIC_END_DATE=18th October
 *     NEXT_PUBLIC_REGISTRATIONS_CLOSE=13th October         # last day to book
 *     NEXT_PUBLIC_SESSION_TIMES=5:30 AM & 5:30 PM         # the two daily session times
 *     NEXT_PUBLIC_SESSIONS_LABEL=Live Sessions, Twice A Day
 *     NEXT_PUBLIC_SESSION_TIMEZONE=GST                    # appended where a zone reads naturally
 *     NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL=https://chat.whatsapp.com/…
 *
 * These are NEXT_PUBLIC_* because the same strings render in the server HTML
 * and in client components; they are inlined at build time, so changing one
 * needs a rebuild, not just a restart.
 *
 * ── ONE PRODUCT IS SOLD; THE OTHER IS GIVEN AWAY ─────────────────────────
 * THE SEAT IS FREE. It is still a plan, with a name, a confirmation page and
 * a Meta content_name, because the funnel has to be able to say which of the
 * two somebody has — but it has no price, never reaches Stripe, and is
 * registered by the modal form on the landing page instead.
 *
 * So the only price in the funnel is the VIP pass, and the only checkout is
 * the VIP checkout. A zero-amount line item is rejected by Stripe outright,
 * which is a useful property: the free route CANNOT be sent to a till by
 * accident.
 *
 * Every price the buyer sees, the amount Stripe charges, the Meta content_name,
 * and which confirmation page they land on all derive from the same PLANS entry,
 * so a plan can never be priced one way on the page and another at the till.
 *
 * NOTE ON UK COMPLIANCE: the struck anchor is a REAL comparison — five live
 * group sessions at the SuperMe app's own per-session rate — not an invented
 * "was" price. It is stated once, as a comparison, and never as a former price
 * of this offer. Percentage outcome claims stay out entirely.
 */

/**
 * parseFLOAT, not parseInt.
 *
 * This was parseInt, which silently truncated: an offer price set
 * to "4.99" produced 4, so the page read "AED 4" and Stripe charged 400 fils.
 * Nothing
 * errored — it just quietly charged the wrong amount, which is the worst way
 * for a price to be wrong.
 *
 * Guarded to two decimals, because a price is money and "4.999" is not a
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
 * THE SEAT IS FREE, so there is no NEXT_PUBLIC_OFFER_PRICE_AED any more: no
 * number to configure, and no way to accidentally configure one. The only
 * price in the funnel is the VIP upgrade.
 *
 * 4.99, NOT THE 19.99 THIS BRANCH CARRIED. 19.99 was the VIP price when the
 * seat cost 4.99 and the pass was the dearer of two things to choose between.
 * The brief for the free funnel named 4.99 for the pass, so that is the
 * default here. It is env-driven either way: if the intended price really is
 * 19.99, set NEXT_PUBLIC_VIP_PRICE_AED and nothing in the code changes.
 */
const VIP_PRICE_AED = parsePriceEnv(process.env.NEXT_PUBLIC_VIP_PRICE_AED, 4.99);
/* The struck comparison: five live group sessions at the app's own rate. ONE
   component of the figure the checkout strikes through, never that figure
   itself — the rest comes from the guides in bonus-data.ts. */
const ANCHOR_PRICE_AED = parsePriceEnv(process.env.NEXT_PUBLIC_ANCHOR_PRICE_AED, 9);

const START_DATE = text(process.env.NEXT_PUBLIC_START_DATE, '14th October');
const END_DATE = text(process.env.NEXT_PUBLIC_END_DATE, '18th October');
const REGISTRATIONS_CLOSE = text(
  process.env.NEXT_PUBLIC_REGISTRATIONS_CLOSE,
  '13th October',
);
const SESSION_TIMES = text(process.env.NEXT_PUBLIC_SESSION_TIMES, '5:30 AM & 5:30 PM');
const SESSIONS_LABEL = text(
  process.env.NEXT_PUBLIC_SESSIONS_LABEL,
  'Live Sessions, Twice A Day',
);
const SESSION_TIMEZONE = text(process.env.NEXT_PUBLIC_SESSION_TIMEZONE, 'GST');

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

/* "AED " WITH the trailing space: the code precedes the figure in the Gulf
   convention — "AED 4.99", never "4.99 AED", and never the د.إ glyph, which
   renders inconsistently and flips the direction of the run it sits in. */
const SYMBOL = 'AED ';

/* What a free plan prints instead of a figure. A WORD, not "AED 0.00": the
   price of nothing is not a number anyone wants to read, and every surface
   that prints a price prints this through the same field. */
export const FREE_LABEL = 'Free';

/** "AED 4.99" from 4.99, "AED 9" from 9 — a trailing ".00" is noise. */
function money(amount: number): string {
  return `${SYMBOL}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

/* ── the two products ─────────────────────────────────────────────────── */

export type PlanId = 'seat' | 'vip';

export type Plan = {
  id: PlanId;
  /** ROUNDED to an integer. Zero for the free seat. */
  pricePence: number;
  priceAed: number;
  /** TRUE for the seat. Anything that could reach Stripe must check this. */
  free: boolean;
  /** "AED 4.99" — the string every surface prints, derived once. */
  priceLabel: string;
  /** What Stripe shows on the payment page and the statement line. */
  productName: string;
  productDescription: string;
  /** Meta content_name for this product, per the tracking spec. */
  contentName: string;
  /** Where a buyer of this plan lands once Stripe confirms the payment. */
  confirmPath: string;
  /** Short label for order summaries and the docked bar. */
  shortName: string;
};

/**
 * ROUNDED. Stripe takes an integer of minor units and rejects anything else,
 * and float maths does not oblige: 1.99 * 100 is not reliably 199 across every
 * value. This is the number the buyer is actually charged, so it is forced to
 * an integer here rather than hoped about at the call site.
 */
function pence(aed: number): number {
  return Math.round(aed * 100);
}

export const PLANS: Record<PlanId, Plan> = {
  seat: {
    id: 'seat',
    pricePence: 0,
    priceAed: 0,
    priceLabel: FREE_LABEL,
    free: true,
    productName: '5-Day Pain Reset Challenge',
    productDescription: `Live, coach-led on Zoom. Starts ${START_DATE}. Sessions at ${SESSION_TIMES} ${SESSION_TIMEZONE}.`,
    contentName: 'pain_reset_uae',
    confirmPath: '/confirmed',
    shortName: '5-Day Pain Reset',
  },
  vip: {
    id: 'vip',
    pricePence: pence(VIP_PRICE_AED),
    priceAed: VIP_PRICE_AED,
    priceLabel: money(VIP_PRICE_AED),
    free: false,
    productName: '5-Day Pain Reset Challenge + VIP Pass',
    productDescription: `Live, coach-led on Zoom. Starts ${START_DATE}. Sessions at ${SESSION_TIMES} ${SESSION_TIMEZONE}. Includes recordings, two extra guides and priority correction.`,
    contentName: 'vip_uae',
    confirmPath: '/confirmed-plus',
    shortName: '5-Day Pain Reset · VIP',
  },
};

export const DEFAULT_PLAN: PlanId = 'seat';

/**
 * Narrows anything — a query string, a form field, a crafted POST body — to a
 * real plan id, falling back to the seat.
 *
 * The server calls this before it prices anything, so a request asking for a
 * plan that does not exist buys the seat rather than throwing or, worse,
 * reaching Stripe with an undefined amount.
 */
export function resolvePlan(value: unknown): Plan {
  return value === 'vip' ? PLANS.vip : PLANS.seat;
}

/**
 * What the VIP upgrade adds over the plain seat — the OTO page's whole subject.
 *
 * Lives here rather than in the OTO page because the checkout's order summary
 * and the confirmation page list the same things back, and three
 * hand-maintained copies of a feature list is how a funnel ends up promising
 * something it does not send.
 *
 * EVERY ITEM HERE IS VIP-ONLY, AND THAT IS LOAD-BEARING. The landing page
 * already gives the four guides and the score report away with a place, in
 * writing, in its bonuses section. So nothing from that list may be restated
 * here as something VIP unlocks: the reader may have the landing page open in
 * another tab, and the two pages contradicting each other costs more than the
 * upgrade is worth.
 *
 * The split that keeps both pages honest: the five live days and the guides
 * come with a place; what VIP adds is everything that still exists on Day 6 —
 * the recordings, two further guides, priority correction — plus the credit.
 *
 * THE VALUES ARE THE CLIENT'S, NOT ESTIMATES. They arrived with the Dubai
 * move as a separate VIP_EXTRAS list in _landing/bonus-data.ts, describing
 * these same four things a second time. Two lists for one set of products is
 * the drift this file exists to prevent, so the figures moved here and
 * bonus-data now derives its list from this one. Do not add a value for
 * anything the client has not priced.
 */
export type VipBonus = {
  /** Stable id, so a page can map one to an icon without matching on prose. */
  key: 'recordings' | 'desk' | 'sleep' | 'priority' | 'credit';
  /** The OTO's heading: short, concrete, written to be read first. */
  title: string;
  /** The order summary's line: plainly descriptive, sits next to the price. */
  summaryTitle: string;
  body: string;
  /**
   * AED, from the client's VIP value stack. ABSENT ON THE CREDIT, which is not
   * a product and has no price to state — which is also why this is optional
   * rather than a zero. A zero would be added into the struck total as if the
   * credit were worth nothing, and it is the opposite.
   */
  value?: number;
};

export const VIP_BONUSES: VipBonus[] = [
  {
    key: 'recordings',
    title: 'Every session, recorded',
    summaryTitle: 'Recordings of all five sessions',
    body: 'All five sessions, yours for 5 days after each one, so a missed morning is never a missed day.',
    value: 29,
  },
  {
    key: 'desk',
    title: 'The Desk Reset Guide',
    summaryTitle: 'The Desk Reset Guide',
    body: 'Six minutes, twice a day, for a back that has been at a desk since breakfast.',
    value: 6,
  },
  {
    key: 'sleep',
    title: 'The Sleep Position Guide',
    summaryTitle: 'The Sleep Position Guide',
    body: 'How to lie down so the night stops undoing what the day put right.',
    value: 6,
  },
  {
    key: 'priority',
    title: 'A place in Atul’s first row',
    summaryTitle: 'Priority on-camera correction',
    body: 'Priority correction in every session: your camera is looked at first, not last.',
    value: 9,
  },
  {
    key: 'credit',
    title: `Your ${money(VIP_PRICE_AED)} credited back`,
    summaryTitle: `${money(VIP_PRICE_AED)} credited to the programme`,
    body: 'The full amount comes off the programme if you continue after Day 5.',
  },
];

/** The priced four, summed. Drives the struck total on the VIP order summary. */
export const VIP_EXTRAS_TOTAL = VIP_BONUSES.reduce((sum, b) => sum + (b.value ?? 0), 0);

/**
 * The same list as flat prose, for the two places that want a plain bullet:
 * the checkout's order summary and the VIP confirmation panel. DERIVED, never
 * typed out again — that is the point of the structure above.
 */
export const VIP_BENEFITS: string[] = VIP_BONUSES.map((b) => `${b.title}. ${b.body}`);

export const CHECKOUT_CONFIG = {
  /* The DEFAULT plan's figures, kept under their original names because the
     landing page, the hero card and the sticky bar all quote the seat price and
     have no notion of plans. Anything that needs the VIP price reads PLANS. */
  amountPence: PLANS.seat.pricePence,
  /* Reads "Free" and zero, because the default plan is the free seat. ALREADY
     A FINISHED LABEL — nothing may prefix currencySymbol onto it. Doing that
     printed "AED Free" across the hero, the sticky bar, both legal pages and
     the page description. */
  amountAedString: PLANS.seat.priceLabel,
  amountAedNumeric: PLANS.seat.priceAed,
  freeLabel: FREE_LABEL,
  currency: 'AED',
  currencySymbol: SYMBOL,

  /* The struck comparison on the price card. A real figure: five live group
     sessions at the SuperMe app's own per-session rate. */
  anchorAedNumeric: ANCHOR_PRICE_AED,
  anchorLabel: money(ANCHOR_PRICE_AED),

  vipPence: PLANS.vip.pricePence,
  vipAedNumeric: VIP_PRICE_AED,
  vipLabel: money(VIP_PRICE_AED),

  /* Meta reporting. This funnel sends CUSTOM events and no standard ones: no
     AddToCart, no InitiateCheckout, no Purchase. The names below are the only
     ones the Conversions API is allowed to send.

         atc_event              a CTA tap opens the registration form
         registration_complete  the free form was submitted
         ic_event               the pay button on the VIP checkout
         abandoned_cart         the VIP checkout opened and was not paid
         sales                  the confirmed VIP payment, from the webhook

     ALL OF THEM ARE SERVER-SENT. The browser Pixel fires PageView and
     nothing else, so there is no browser/server pair to deduplicate and no
     event an ad blocker can drop. See lib/meta-capi.ts.

     THE AD ACCOUNT OPTIMISES ON registration_complete AND sales. The other
     three are funnel numbers. atc_event in particular cannot carry identity
     — it fires before anyone has told us who they are, so its match set is
     fbp, fbc, IP and user agent, and that is a ceiling, not an oversight.

     EMQ IS THE POINT OF THE NEW ORDER. Identity is captured at the form
     rather than at the checkout, so every event after atc_event carries em,
     ph, fn, ln, ct, country, external_id, fbp, fbc, IP and user agent.

     The EVENT NAMES are deliberately unchanged across the market move. The
     market is carried on content_name (pain_reset_uae / vip_uae, from PLANS)
     instead, because these names are what the live ad account already
     optimises on and renaming them resets that learning. */
  capi: {
    events: {
      addToCart: 'atc_event',
      /* The free form was submitted. THE FIRST EVENT WITH THE FULL MATCH SET,
         and the funnel's main conversion now that the seat costs nothing. */
      registrationComplete: 'registration_complete',
      initiateCheckout: 'ic_event',
      /* THE POINT OF CAPTURING THE FORM SEPARATELY FROM THE PAYMENT.
         Fired the moment the details are submitted and the Stripe session
         opens — before the buyer has paid, and whether or not they ever do.

         Stripe Checkout is not our page. Someone who reaches it and closes
         the tab leaves no trace we can act on, and on a hosted checkout those
         people outnumber the buyers. This is the only event that reports them.

         It carries the FULL match set, because the details were typed on our
         own form seconds earlier — so it is a high-EMQ audience to retarget
         and build lookalikes from, not merely a counter. It does NOT carry
         money: nobody has paid, and AED 4.99s that never became revenue would
         teach value bidding the wrong thing. */
      abandonedCart: 'abandoned_cart',
      sale: 'sales',
    },
    /* `contentName` was here and is deliberately gone: nothing sends a
       content_name to Meta any more, because this dataset is Health & Wellness
       restricted. PLANS[].contentName survives — it still labels the Pabbly
       row and the Stripe metadata, neither of which is Meta. */
    /* THE VIP PRICE, because it is the only price there is. This was the seat
       price, which is now zero — and a value of 0 on every event teaches value
       bidding that the funnel is worthless. */
    value: VIP_PRICE_AED,
    currency: 'AED',
  } as const,

  /* ── the funnel's steps ──────────────────────────────────
     Landing → register modal → OTO → (VIP only) checkout → confirmation.

     THE MODAL REPLACED THE LANDING PAGE'S LINK OUT. A CTA no longer
     navigates; it opens the registration form in place. Nobody reaches the
     OTO without having registered, which is what lets the OTO greet them by
     name and the checkout prefill itself.

     Both paths below are watched by the CTA listener, because a CTA pointing
     straight at the checkout is still a CTA. Deriving them from here rather
     than typing them into the component is what stops the bug that once
     silently killed every CTA event, when the OTO shipped and the listener
     path list was left pointing at the old step. */
  otoPath: '/oto',
  checkoutPath: '/checkout',
  /* Stripe's success_url. It verifies the session and forwards to the
     plan's own confirmation page — see app/thank-you/page.tsx. */
  thankYouPath: '/thank-you',
  confirmedPath: PLANS.seat.confirmPath,
  confirmedPlusPath: PLANS.vip.confirmPath,
  importantInfoPath: '/important-information',

  funnelSlug: 'superme-pain-reset-uk',
  utmSessionKey: 'superme_utm',

  startDate: START_DATE,
  endDate: END_DATE,
  registrationsClose: REGISTRATIONS_CLOSE,
  sessionTimes: SESSION_TIMES,
  sessionsLabel: SESSIONS_LABEL,
  sessionTimezone: SESSION_TIMEZONE,
  /* "7 AM & 6 PM UK" — the zone-qualified form, used where the reader is about
     to put something in a diary rather than merely skim it. */
  sessionTimesWithZone: SESSION_TIMEZONE
    ? `${SESSION_TIMES} ${SESSION_TIMEZONE}`
    : SESSION_TIMES,
  /* "14th October to 18th October" — the full run, for the diary cards. */
  dateRange: `${START_DATE} to ${END_DATE}`,

  whatsappCommunityUrl: WHATSAPP_COMMUNITY_URL,
  contactEmail: CONTACT_EMAIL,

  privacyPath: '/privacy',
  termsPath: '/terms',
  refundsPath: '/refunds',
};
