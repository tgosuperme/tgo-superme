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
 *     NEXT_PUBLIC_OFFER_PRICE_AED=4.99                    # the seat hold
 *     NEXT_PUBLIC_VIP_PRICE_AED=19.99                     # seat + VIP pass
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
 * ── TWO PRODUCTS, ONE CHECKOUT ───────────────────────────────────────────
 * The funnel sells a seat hold and an upgraded VIP seat. They are ALTERNATIVES,
 * not a basket: the VIP price is the whole thing, not an amount added to the
 * seat. The seat is always in, and the choice on the OTO page is only whether
 * to take it plain or upgraded — which is why `seat` cannot be deselected.
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

const PRICE_AED = parsePriceEnv(process.env.NEXT_PUBLIC_OFFER_PRICE_AED, 4.99);
const VIP_PRICE_AED = parsePriceEnv(process.env.NEXT_PUBLIC_VIP_PRICE_AED, 19.99);
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

/** "AED 4.99" from 4.99, "AED 9" from 9 — a trailing ".00" is noise. */
function money(amount: number): string {
  return `${SYMBOL}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

/* ── the two products ─────────────────────────────────────────────────── */

export type PlanId = 'seat' | 'vip';

export type Plan = {
  id: PlanId;
  /** ROUNDED to an integer. See the note on amountPence below. */
  pricePence: number;
  priceAed: number;
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
    pricePence: pence(PRICE_AED),
    priceAed: PRICE_AED,
    priceLabel: money(PRICE_AED),
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
 * What the VIP upgrade adds over the plain seat.
 *
 * Lives here rather than in the OTO page because the confirmation page lists
 * the same four things back to a VIP buyer, and two hand-maintained copies of
 * a feature list is how a funnel ends up promising something it does not send.
 */
export const VIP_BENEFITS: string[] = [
  'Recordings of all five sessions, yours for 5 days after each one, so a missed morning is never a missed day',
  'Two extra guides: the Desk Reset (six minutes, twice a day) and the Sleep Position Guide',
  'Priority correction: your camera is in Atul’s first row in every session',
  `The full ${money(VIP_PRICE_AED)} is credited to the programme if you continue after Day 5`,
];

export const CHECKOUT_CONFIG = {
  /* The DEFAULT plan's figures, kept under their original names because the
     landing page, the hero card and the sticky bar all quote the seat price and
     have no notion of plans. Anything that needs the VIP price reads PLANS. */
  amountPence: PLANS.seat.pricePence,
  amountAedString: String(PRICE_AED),
  amountAedNumeric: PRICE_AED,
  currency: 'AED',
  currencySymbol: SYMBOL,

  /* The struck comparison on the price card. A real figure: five live group
     sessions at the SuperMe app's own per-session rate. */
  anchorAedNumeric: ANCHOR_PRICE_AED,
  anchorLabel: money(ANCHOR_PRICE_AED),

  vipPence: PLANS.vip.pricePence,
  vipAedNumeric: VIP_PRICE_AED,
  vipLabel: money(VIP_PRICE_AED),

  /* Meta reporting. This funnel sends THREE CUSTOM events and no standard
     ones: no AddToCart, no InitiateCheckout, no Purchase. The names below are
     the only ones the browser Pixel and the Conversions API are allowed to
     send, and the ad account optimises on them.

         atc_event  a CTA tap on the landing page
         ic_event   the pay button on the checkout page
         sales      the confirmed payment, from the Stripe webhook

     Each event is sent twice, once from the browser and once from the server,
     sharing one event_id so Meta collapses the pair. See lib/meta-capi.ts.

     The EVENT NAMES are deliberately unchanged for the UK build. The market is
     carried on content_name (pain_reset_uk / vip_uk, from PLANS) instead,
     because these three names are what the live ad account already optimises
     on and renaming them resets that learning. */
  capi: {
    events: {
      addToCart: 'atc_event',
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
    value: PRICE_AED,
    currency: 'AED',
  } as const,

  /* ── the funnel's four steps ───────────────────────────────────────────
     Landing → OTO → checkout → confirmation. The OTO sits between the landing
     page and the checkout, so every landing CTA points at otoPath, NOT at the
     checkout: a buyer who reaches the form without passing the upgrade choice
     has silently been sold the cheaper thing. */
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
