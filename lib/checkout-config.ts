/**
 * SuperMe · 5-Day Pain Reset — offer config (single source of truth).
 *
 * GULF OFFER, PRICED IN AED. The currency, every price, and every date, time
 * and session label on the site read from here, so a cohort or a market change
 * is an env edit and a redeploy, never a code change:
 *
 *     NEXT_PUBLIC_CURRENCY=AED                            # default; GBP AED USD EUR INR
 *     NEXT_PUBLIC_VIP_PRICE_GBP=4.99                      # the optional VIP pass
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

/**
 * THE SEAT IS FREE. There is no NEXT_PUBLIC_OFFER_PRICE_GBP any more: a seat
 * costs nothing, so there is no number to configure and no way to accidentally
 * configure one. The only price in the funnel is the VIP upgrade.
 *
 * ── THE _GBP SUFFIX IS NOW A LIE, AND IS KEPT ANYWAY ───────────────
 * These two read AED since the funnel moved to the Gulf. The names are left
 * alone because they are already set in the host's environment settings, and
 * renaming an env var that is live is how a price silently falls back to its
 * default mid-campaign. Read them as "the price, in whatever
 * NEXT_PUBLIC_CURRENCY says". Renaming is a job for a quiet day, with the
 * host's variables changed in the same deploy.
 */
const VIP_PRICE_GBP = parsePriceEnv(process.env.NEXT_PUBLIC_VIP_PRICE_GBP, 4.99);
const ANCHOR_PRICE_GBP = parsePriceEnv(process.env.NEXT_PUBLIC_ANCHOR_PRICE_GBP, 23);

/**
 * Currency, as a pair that must move together.
 *
 * CODE is what Stripe charges in and what Meta receives; SYMBOL is what the
 * page prints. They are one env edit rather than two literals scattered across
 * the codebase, because a page reading "£4.99" while Stripe charges 4.99 of
 * something else is the worst kind of pricing bug — it does not error, it just
 * takes the wrong amount.
 *
 * Changing CODE is not only a config edit: the Stripe account has to be able
 * to settle in that currency, and every figure quoted anywhere — the struck
 * comparison, the bonus values in _landing/bonus-data.ts — is denominated in
 * it. Those are plain numbers: switching the code reprints them against a new
 * symbol without converting them.
 */
const CURRENCY_CODE = text(process.env.NEXT_PUBLIC_CURRENCY, 'AED').toUpperCase();
const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  AED: 'AED ',
  USD: '$',
  EUR: '€',
  INR: '₹',
};

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

const SYMBOL = CURRENCY_SYMBOLS[CURRENCY_CODE] ?? `${CURRENCY_CODE} `;

/** "£4.99" from 4.99, "£23" from 23 — trailing ".00" is noise on a whole unit. */
function money(amount: number): string {
  return `${SYMBOL}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

/** What a free seat prints wherever a price would otherwise go. */
const FREE_LABEL = 'Free';

/* ── the two products ─────────────────────────────────────────────────── */

export type PlanId = 'seat' | 'vip';

export type Plan = {
  id: PlanId;
  /** ROUNDED to an integer. See the note on amountPence below. Zero = free. */
  pricePence: number;
  priceGbp: number;
  /** "£4.99", or "Free" — the string every surface prints, derived once. */
  priceLabel: string;
  /**
   * No money changes hands for this plan.
   *
   * Read it rather than testing `pricePence === 0` at call sites: a free plan
   * must never reach Stripe (it rejects a zero-amount line item) and must go to
   * the free Pabbly webhook rather than the paid one, and those two decisions
   * should not each re-derive the same fact.
   */
  free: boolean;
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
    pricePence: 0,
    priceGbp: 0,
    priceLabel: FREE_LABEL,
    free: true,
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
    free: false,
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
 * What the VIP upgrade adds over the plain seat — the OTO page's whole subject.
 *
 * Lives here rather than in the OTO page because the checkout's order summary
 * and the confirmation page list the same things back, and three
 * hand-maintained copies of a feature list is how a funnel ends up promising
 * something it does not send.
 *
 * ── EVERY ITEM HERE IS VIP-ONLY, AND THAT IS LOAD-BEARING ───────────
 * The landing page already gives the four guides and the score report away
 * with a place, in writing, as the value stack under the bonuses section. So
 * NOTHING from that list may be restated here as something VIP unlocks: the
 * reader has the landing page open in another tab, and the two pages
 * contradicting each other costs more than the upgrade is worth.
 *
 * The split that keeps both pages honest: the five live days and the guides
 * come with a place; what VIP adds is everything that still exists on Day 6 —
 * the recordings, two further guides, priority correction — plus the credit.
 *
 * ── NO MONETARY VALUES ───────────────────────────────────
 * Deliberately absent, unlike BONUSES in _landing/bonus-data.ts, which carries
 * client-supplied figures. Nobody has priced the Desk Reset or the Sleep
 * Position guide, and inventing a number to stack against the pass price would
 * be a made-up claim about a real product. Add them here if the client gives
 * them; do not estimate them.
 */
export type VipBonus = {
  /** Stable id, so a page can map one to an icon without matching on prose. */
  key: 'recordings' | 'desk' | 'sleep' | 'priority' | 'credit';
  title: string;
  body: string;
};

export const VIP_BONUSES: VipBonus[] = [
  {
    key: 'recordings',
    title: 'Every session, recorded',
    body: 'All five sessions, yours for 5 days after each one, so a missed morning is never a missed day.',
  },
  {
    key: 'desk',
    title: 'The Desk Reset Guide',
    body: 'Six minutes, twice a day, for a back that has been at a desk since breakfast.',
  },
  {
    key: 'sleep',
    title: 'The Sleep Position Guide',
    body: 'How to lie down so the night stops undoing what the day put right.',
  },
  {
    key: 'priority',
    title: 'A place in Atul’s first row',
    body: 'Priority correction in every session: your camera is looked at first, not last.',
  },
  {
    key: 'credit',
    title: `Your ${money(VIP_PRICE_GBP)} credited back`,
    body: 'The full amount comes off the programme if you continue after Day 5.',
  },
];

/**
 * The same list as flat prose, for the two places that want a plain bullet:
 * the checkout's order summary and the VIP confirmation panel. DERIVED, never
 * typed out again — that is the whole point of the structure above.
 */
export const VIP_BENEFITS: string[] = VIP_BONUSES.map((b) => `${b.title}. ${b.body}`);

export const CHECKOUT_CONFIG = {
  /* The DEFAULT plan is the free seat, so these read "Free" and zero. Kept
     under their original names because the landing page and the sticky bar have
     no notion of plans. Anything that needs the VIP price reads PLANS. */
  amountPence: PLANS.seat.pricePence,
  amountGbpString: PLANS.seat.priceLabel,
  amountGbpNumeric: PLANS.seat.priceGbp,
  currency: CURRENCY_CODE,
  currencySymbol: SYMBOL,
  freeLabel: FREE_LABEL,

  /* The struck comparison on the price card. A real figure: five live group
     sessions at the SuperMe app's own per-session rate. */
  anchorGbpNumeric: ANCHOR_PRICE_GBP,
  anchorLabel: money(ANCHOR_PRICE_GBP),

  vipPence: PLANS.vip.pricePence,
  vipGbpNumeric: VIP_PRICE_GBP,
  vipLabel: money(VIP_PRICE_GBP),

  /* Meta reporting. This funnel sends CUSTOM events and no standard ones: no
     AddToCart, no InitiateCheckout, no Purchase. The names below are the only
     ones the Conversions API is allowed to send, and the ad account optimises
     on them.

         atc_event              a landing-page CTA was tapped
         registration_complete  the free form was submitted
         ic_event               the pay button on the VIP checkout
         sales                  the confirmed VIP payment, from the webhook

     ── WHAT atc_event IS, AND WHAT IT CANNOT BE ──────────────────────────
     It reports the top of the funnel: a CTA was tapped and the registration
     form opened. That is the whole of its meaning now — the tap no longer
     navigates anywhere, so this is a form-open, not a step change.

     It is the ONE event in this funnel that cannot carry identity, because
     at the moment it fires nobody has told us who they are. Its match set is
     fbp, fbc, IP and user agent, and that is a ceiling, not an oversight.

     SO DO NOT OPTIMISE THE AD ACCOUNT ON IT. It is a volume number for the
     funnel report. registration_complete is the first event worth bidding
     on, and it fires seconds later with the full match set.

     EMQ IS THE POINT OF THE NEW ORDER. Identity is captured at the form
     rather than at the checkout, so every event after this one carries em,
     ph, fn, ln, ct, country, external_id, fbp, fbc, IP and user agent. See
     the user_data block in lib/meta-capi.ts. */
  capi: {
    events: {
      /* The landing page CTA tap. Browser-initiated, relayed by /api/track. */
      addToCart: 'atc_event',
      registrationComplete: 'registration_complete',
      initiateCheckout: 'ic_event',
      sale: 'sales',
    },
    /* `contentName` was here and is deliberately gone: nothing sends a
       content_name to Meta any more, because this dataset is Health & Wellness
       restricted. PLANS[].contentName survives — it still labels the Pabbly
       row and the Stripe metadata, neither of which is Meta. */
    value: VIP_PRICE_GBP,
    currency: CURRENCY_CODE,
  } as const,

  /* ── the funnel's steps ────────────────────────────────────────────────
     Landing → register modal → OTO → (VIP only) checkout → confirmation.

     THE MODAL REPLACED THE LANDING PAGE'S LINK OUT. A CTA no longer navigates;
     it opens the registration form in place. Nobody reaches the OTO without
     having registered, which is what lets the OTO greet them by name and the
     checkout prefill itself. */
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
