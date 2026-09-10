/**
 * SuperMe · 5-Day Pain Reset (UK) — offer config (single source of truth).
 *
 * UK offer, so the currency is GBP and every price on the page reads from here.
 * Every date, time and session label on the site also reads from here, so a
 * cohort change is an env edit and a redeploy, never a code change:
 *
 *     NEXT_PUBLIC_OFFER_PRICE_GBP=1.99                    # the seat hold
 *     NEXT_PUBLIC_VIP_PRICE_GBP=9.99                      # seat + VIP pass
 *     NEXT_PUBLIC_ANCHOR_PRICE_GBP=23                     # the struck comparison
 *     NEXT_PUBLIC_START_DATE=30th September               # cohort start
 *     NEXT_PUBLIC_END_DATE=4th October
 *     NEXT_PUBLIC_REGISTRATIONS_CLOSE=29th September       # last day to book
 *     NEXT_PUBLIC_SESSION_TIMES=7 AM & 6 PM               # the two daily session times
 *     NEXT_PUBLIC_SESSIONS_LABEL=Live Sessions, Twice A Day
 *     NEXT_PUBLIC_SESSION_TIMEZONE=UK                     # appended where a zone reads naturally
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
 * This was parseInt, which silently truncated: NEXT_PUBLIC_OFFER_PRICE_GBP set
 * to "1.99" produced 1, so the page read "£1" and Stripe charged 100p. Nothing
 * errored — it just quietly charged the wrong amount, which is the worst way
 * for a price to be wrong.
 *
 * Guarded to two decimals, because a price is money and "1.999" is not a
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

const PRICE_GBP = parsePriceEnv(process.env.NEXT_PUBLIC_OFFER_PRICE_GBP, 1.99);
const VIP_PRICE_GBP = parsePriceEnv(process.env.NEXT_PUBLIC_VIP_PRICE_GBP, 9.99);
const ANCHOR_PRICE_GBP = parsePriceEnv(process.env.NEXT_PUBLIC_ANCHOR_PRICE_GBP, 23);

const START_DATE = text(process.env.NEXT_PUBLIC_START_DATE, '30th September');
const END_DATE = text(process.env.NEXT_PUBLIC_END_DATE, '4th October');
const REGISTRATIONS_CLOSE = text(
  process.env.NEXT_PUBLIC_REGISTRATIONS_CLOSE,
  '29th September',
);
const SESSION_TIMES = text(process.env.NEXT_PUBLIC_SESSION_TIMES, '7 AM & 6 PM');
const SESSIONS_LABEL = text(
  process.env.NEXT_PUBLIC_SESSIONS_LABEL,
  'Live Sessions, Twice A Day',
);
const SESSION_TIMEZONE = text(process.env.NEXT_PUBLIC_SESSION_TIMEZONE, 'UK');

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

const SYMBOL = '£';

/** "£1.99" from 1.99, "£23" from 23 — trailing ".00" is noise on a whole pound. */
function money(amount: number): string {
  return `${SYMBOL}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

/* ── the two products ─────────────────────────────────────────────────── */

export type PlanId = 'seat' | 'vip';

export type Plan = {
  id: PlanId;
  /** ROUNDED to an integer. See the note on amountPence below. */
  pricePence: number;
  priceGbp: number;
  /** "£1.99" — the string every surface prints, derived once. */
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
function pence(gbp: number): number {
  return Math.round(gbp * 100);
}

export const PLANS: Record<PlanId, Plan> = {
  seat: {
    id: 'seat',
    pricePence: pence(PRICE_GBP),
    priceGbp: PRICE_GBP,
    priceLabel: money(PRICE_GBP),
    productName: '5-Day Pain Reset Challenge',
    productDescription: `Live, coach-led on Zoom. Starts ${START_DATE}. Sessions at ${SESSION_TIMES} ${SESSION_TIMEZONE}.`,
    contentName: 'pain_reset_uk',
    confirmPath: '/confirmed',
    shortName: '5-Day Pain Reset',
  },
  vip: {
    id: 'vip',
    pricePence: pence(VIP_PRICE_GBP),
    priceGbp: VIP_PRICE_GBP,
    priceLabel: money(VIP_PRICE_GBP),
    productName: '5-Day Pain Reset Challenge + VIP Pass',
    productDescription: `Live, coach-led on Zoom. Starts ${START_DATE}. Sessions at ${SESSION_TIMES} ${SESSION_TIMEZONE}. Includes recordings, two extra guides and priority correction.`,
    contentName: 'vip_uk',
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
  `The full ${money(VIP_PRICE_GBP)} is credited to the programme if you continue after Day 5`,
];

export const CHECKOUT_CONFIG = {
  /* The DEFAULT plan's figures, kept under their original names because the
     landing page, the hero card and the sticky bar all quote the seat price and
     have no notion of plans. Anything that needs the VIP price reads PLANS. */
  amountPence: PLANS.seat.pricePence,
  amountGbpString: String(PRICE_GBP),
  amountGbpNumeric: PRICE_GBP,
  currency: 'GBP',
  currencySymbol: SYMBOL,

  /* The struck comparison on the price card. A real figure: five live group
     sessions at the SuperMe app's own per-session rate. */
  anchorGbpNumeric: ANCHOR_PRICE_GBP,
  anchorLabel: money(ANCHOR_PRICE_GBP),

  vipPence: PLANS.vip.pricePence,
  vipGbpNumeric: VIP_PRICE_GBP,
  vipLabel: money(VIP_PRICE_GBP),

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
      sale: 'sales',
    },
    contentName: PLANS.seat.contentName,
    value: PRICE_GBP,
    currency: 'GBP',
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
  /* "30th September to 4th October" — the full run, for the diary cards. */
  dateRange: `${START_DATE} to ${END_DATE}`,

  whatsappCommunityUrl: WHATSAPP_COMMUNITY_URL,
  contactEmail: CONTACT_EMAIL,

  privacyPath: '/privacy',
  termsPath: '/terms',
  refundsPath: '/refunds',
};
