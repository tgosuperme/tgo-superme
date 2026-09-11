/**
 * The India offer, in one place: dates, session times, the price ladder, the
 * anchor, the VIP add-on, and the rules that decide which of those is live
 * right now.
 *
 * ── WHY THIS EXISTS SEPARATELY FROM checkout-config.ts ──────────────────────
 * checkout-config holds ONE price, read from an env var at module load. That
 * was right when there was one price. There are now three, and which one is
 * live depends on the clock:
 *
 *     ₹497   until 13 Sep 23:59 IST
 *     ₹697   until 20 Sep 23:59 IST
 *     ₹997   until registrations close, 22 Sep 23:59 IST
 *
 * A module-scope constant cannot express that. Module scope is evaluated once
 * per lambda cold start, so a warm function would happily serve ₹497 for hours
 * after the boundary — the exact failure this ladder exists to avoid, and one
 * nobody would notice until the reconciliation.
 *
 * So the price is RESOLVED PER RENDER by resolveOffer(), called in the Server
 * Component and threaded down as props. It is deliberately not exported as a
 * constant, and no client component may call it: a client clock is the
 * visitor's clock, which is wrong often enough to matter and would hydrate
 * differently from the server on every device with a skewed time.
 *
 * ── "EDITABLE WITHOUT DEPLOY" ───────────────────────────────────────────────
 * The spec asks for the price step to switch with no deploy, and this delivers
 * exactly that: the STEP DATES are the config, and the step itself is computed
 * from the clock. Nothing has to be touched on the 13th or the 20th — the page
 * changes on its own, including which Razorpay page every CTA opens.
 *
 * Changing the dates or the amounts themselves is an env edit on Vercel, which
 * redeploys automatically. That is a minute, and it is the honest boundary of
 * what a statically-rendered page can do without an external config service.
 */

/* ── how fresh the price can be ──────────────────────────────────────────────
   The landing page is statically rendered, so without this the price would be
   frozen at build time and the ladder would never move. 300s means a step
   boundary is reflected within five minutes, and the page still serves from
   cache the rest of the time. Imported by app/page.tsx as its `revalidate`. */
export const OFFER_REVALIDATE_SECONDS = 300;

function env(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

function envNum(key: string, fallback: number): number {
  const n = Number.parseFloat(process.env[key]?.trim() ?? '');
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : fallback;
}

/**
 * Indian digit grouping. 2-2-3 above a thousand, so 2499 reads ₹2,499 and a
 * five-figure programme price reads ₹17,499 rather than ₹17499.
 *
 * Whole rupees print bare. Every price in this offer is a whole rupee, but the
 * guard costs nothing and "₹497.00" on a sales page looks like a bug.
 */
export function inr(amount: number): string {
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * The struck-through "regular" price, derived from what is actually charged.
 *
 * ── WHY DERIVED ─────────────────────────────────────────────────────────────
 * Both prices live in env so they can be changed at any time, and a hard-coded
 * anchor beside a variable price is a bug waiting for the first price change:
 * set the offer to ₹997 and a fixed ₹2,499 anchor silently becomes a 60% claim
 * on a page that still says 80%. Deriving it means one variable moves and
 * every figure on the site — anchor, savings, percentage — moves with it.
 *
 * ── THE MULTIPLE IS NOT ARBITRARY ───────────────────────────────────────────
 * ×5 is five live group sessions at the SuperMe app's own published
 * per-session rate. That is what makes the anchor a price the business
 * actually charges rather than a number chosen to size the discount — the
 * distinction ASCI's code and the Consumer Protection Act 2019 turn on. At
 * ₹497 it lands on ₹2,499, which is the figure the brief specifies.
 *
 * If the app's per-session rate changes, change the multiplier. If someone
 * wants a specific anchor for a campaign, NEXT_PUBLIC_ANCHOR_PRICE and
 * NEXT_PUBLIC_VIP_ANCHOR_PRICE override it outright — but an override has to
 * be defensible the same way.
 *
 * Rounds to the nearest x99, because ₹2,485 reads as a calculation and ₹2,499
 * reads as a price.
 */
export function deriveAnchor(price: number, multiplier: number): number {
  const raw = price * multiplier;
  return Math.max(price, Math.round(raw / 100) * 100 - 1);
}

/**
 * "23rd September" → "23rd Sept". Used where a row is too tight for the full
 * month — the mobile sticky bar, where the full date pushed the session times
 * under the button.
 *
 * Abbreviates rather than truncating, so the reader never sees a clipped word,
 * and leaves May/June/July alone because shortening them saves nothing and
 * "Jun"/"Jul" read as abbreviations of something longer. Any string without a
 * recognised month comes back unchanged, so a hand-set NEXT_PUBLIC_START_DATE
 * in another format is passed through rather than mangled.
 */
const MONTH_SHORT: Record<string, string> = {
  January: 'Jan',
  February: 'Feb',
  March: 'Mar',
  April: 'Apr',
  August: 'Aug',
  September: 'Sept',
  October: 'Oct',
  November: 'Nov',
  December: 'Dec',
};

export function shortenMonth(label: string): string {
  for (const [full, short] of Object.entries(MONTH_SHORT)) {
    if (label.includes(full)) return label.replace(full, short);
  }
  return label;
}

export type PriceStep = {
  /** Rupees. */
  amount: number;
  /**
   * The instant this step stops being live, as an ISO string WITH the +05:30
   * offset. The offset is not optional and not decoration: the server runs in
   * UTC, so "2026-09-13T23:59:59" without it is 05:29 IST on the 14th and the
   * price would rise five and a half hours late. `null` marks the final step.
   */
  until: string | null;
};

/** Every date and price, and the only place any of them is written down. */
export const OFFER = {
  /* ── dates ─────────────────────────────────────────────────────────────
     Written the way they should READ on the page, not as machine dates —
     these are printed, never parsed. The machine-readable ones are the ISO
     boundaries below, which are the only ones any logic touches. */
  startDate: env('NEXT_PUBLIC_START_DATE', '23rd September'),
  endDate: env('NEXT_PUBLIC_END_DATE', '27th September'),
  /** "23rd to 27th September" — the form used wherever the run is described. */
  dateRange: env('NEXT_PUBLIC_DATE_RANGE', '23rd to 27th September'),

  sessionTime1: env('NEXT_PUBLIC_SESSION_TIME_1', '7 AM'),
  sessionTime2: env('NEXT_PUBLIC_SESSION_TIME_2', '7 PM'),
  timezone: env('NEXT_PUBLIC_SESSION_TIMEZONE', 'IST'),

  /* ── the ladder ────────────────────────────────────────────────────────
     TWO rungs, not three: ₹497 until the deadline, then ₹997. Order matters —
     resolveOffer walks these in sequence and takes the first whose `until`
     has not passed.

     Each rung is a SEPARATE Razorpay page, because a hosted Payment Page's
     amount is fixed in the dashboard and cannot be passed in. Which page a
     step opens is resolved at request time by paymentPageFor() below, not
     stored here — see the note there on build-time inlining. */
  priceSteps: [
    {
      amount: envNum('NEXT_PUBLIC_OFFER_PRICE_INR', 497),
      until: env('NEXT_PUBLIC_PRICE_STEP_1_UNTIL', '2026-09-21T23:59:59+05:30'),
    },
    {
      amount: envNum('NEXT_PUBLIC_PRICE_STEP_2', 997),
      until: null,
    },
  ] as PriceStep[],

  /** After this, every CTA becomes the waiting list. */
  registrationsClose: env(
    'NEXT_PUBLIC_REGISTRATIONS_CLOSE',
    '2026-09-22T23:59:59+05:30',
  ),

  /**
   * ── THE VIP PRODUCT ────────────────────────────────────────────────────
   * NOT an add-on price. ₹999 is the TOTAL a VIP buyer pays, and it includes
   * everything in the ₹497 tier. That is why the two are radio options on one
   * card rather than a base price with an upsell bolted on, and why nothing
   * anywhere adds vipPrice to basePrice — doing so would quote ₹1,496.
   */
  vipPrice: envNum('NEXT_PUBLIC_VIP_PRICE', 999),


  /* ── the anchors ───────────────────────────────────────────────────────
     Multiplier by default so both struck prices track their live price; an
     explicit value overrides. 0 means "derive". See deriveAnchor above. */
  anchorMultiplier: envNum('NEXT_PUBLIC_ANCHOR_MULTIPLIER', 5),
  anchorPriceOverride: envNum('NEXT_PUBLIC_ANCHOR_PRICE', 0),
  vipAnchorPriceOverride: envNum('NEXT_PUBLIC_VIP_ANCHOR_PRICE', 0),

  whatsappCommunityUrl: env('NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL', ''),
  waitingListUrl: env('NEXT_PUBLIC_WAITING_LIST_URL', ''),

  /* ── Part C · the Day 5 seat hold ──────────────────────────────────────
     Sold on Day 5 of the challenge, not from the landing page. The hold is
     REFUNDABLE and CREDITED, which is what makes it a hold rather than a
     deposit-shaped way of taking ₹999 from someone who has not decided —
     both facts are stated on the page and both must stay. */
  holdPrice: envNum('NEXT_PUBLIC_HOLD_PRICE', 999),
  holdPageUrl: env('NEXT_PUBLIC_RAZORPAY_PAGE_HOLD', ''),

  /* Seats left, updated by hand by TGO. A real number they maintain, not a
     script counting down — a counter that ticks on its own is the thing the
     advertising rules on manufactured scarcity are written about. */
  seatsTotal: envNum('NEXT_PUBLIC_HOLD_SEATS_TOTAL', 20),
  seatsLeft: envNum('NEXT_PUBLIC_HOLD_SEATS_LEFT', 20),

  /* The two programme options, exactly as the Day 5 deck states them. Website
     price is what the app charges; challenge price is what a challenge
     participant pays. Both are real published prices. */
  programme: {
    p30: {
      sessions: 30,
      months: 3,
      website: envNum('NEXT_PUBLIC_P30_WEBSITE', 17499),
      challenge: envNum('NEXT_PUBLIC_P30_CHALLENGE', 12999),
    },
    p60: {
      sessions: 60,
      months: 6,
      website: envNum('NEXT_PUBLIC_P60_WEBSITE', 32999),
      challenge: envNum('NEXT_PUBLIC_P60_CHALLENGE', 21999),
    },
    /* One month of streaming classes, included with either option. */
    bonusValue: envNum('NEXT_PUBLIC_PROGRAMME_BONUS_VALUE', 9999),
  },

  /** When the programme batch starts, printed on /balance. */
  batchStartDate: env('NEXT_PUBLIC_BATCH_START_DATE', '28th September'),
  /**
   * Calendly (or the SuperMe booking tool) embed, shown on /call.
   *
   * The default is the live Calendly, not '', because /call is a POST-PAYMENT
   * page: somebody has just paid the hold and the booking embed is the only
   * thing on it that does anything. An unset variable used to fall back to a
   * "we will message you on WhatsApp" card, which is a worse experience the
   * buyer has already paid for. The env var still overrides, so the link can
   * be changed on Vercel without a deploy of this file.
   *
   * hide_gdpr_banner keeps Calendly's own cookie strip out of a 720px iframe,
   * where it covers the slot list on a phone. It suppresses the BANNER only —
   * Calendly still honours its own consent rules, and the embed is sandboxed
   * in app/call/page.tsx.
   */
  bookingUrl: env(
    'NEXT_PUBLIC_BOOKING_URL',
    'https://calendly.com/hello-mysuperme-yoga/10min?hide_gdpr_banner=1',
  ),
  /** Razorpay pages for the balance, one per option. */
  balancePage30Url: env('NEXT_PUBLIC_RAZORPAY_PAGE_BALANCE_30', ''),
  balancePage60Url: env('NEXT_PUBLIC_RAZORPAY_PAGE_BALANCE_60', ''),
} as const;

/** "7 AM & 7 PM IST" — the zone-qualified form used wherever a reader is about
    to put something in a diary rather than merely skim it. */
export const SESSION_TIMES = `${OFFER.sessionTime1} & ${OFFER.sessionTime2}`;
export const SESSION_TIMES_TZ = OFFER.timezone
  ? `${SESSION_TIMES} ${OFFER.timezone}`
  : SESSION_TIMES;

export type ResolvedOffer = {
  /** Rupees, raw. For Meta's `value` and any arithmetic. Never rendered. */
  price: number;
  /** "₹497". The only string any component should print for the price. */
  priceLabel: string;
  /** "₹2,499", struck through beside the price. */
  anchorLabel: string;
  /** "₹2,002" — the arithmetic, never typed in. */
  savingLabel: string;
  /** 80, for the "80% OFF" badge. Floored, so it can never round up. */
  savingPercent: number;
  /** Where every CTA points. `/go` when a page is configured for this step. */
  ctaHref: string;
  /** True once registrations have closed. Every CTA becomes the waiting list. */
  closed: boolean;
  /** The urgency line under the price. Empty on the final step. */
  urgencyLine: string;
  /**
   * "₹997" — what the NEXT rung costs, for the offer strip's rising-price
   * fact. EMPTY STRING ON THE FINAL STEP, and callers must render nothing when
   * it is empty rather than substituting the current price: once the ladder is
   * at its top there is no rise left, and "price increases to ₹997 soon" on a
   * page already charging ₹997 is a false urgency claim, not a stale string.
   */
  nextPriceLabel: string;
  /** Which step is live, 1-based, for reporting and for the CTA's page. */
  stepIndex: number;
  vipPrice: number;
  vipPriceLabel: string;
  /** "₹4,999", struck beside the VIP price. Derived the same way. */
  vipAnchorLabel: string;
  vipSavingLabel: string;
  vipSavingPercent: number;
  /**
   * The two products, as the selector renders them.
   *
   * `price` on VIP is the TOTAL, not a delta — a VIP buyer pays ₹999 and gets
   * everything in the base tier too. Nothing may add these two together.
   */
  products: {
    key: 'base' | 'vip';
    price: number;
    priceLabel: string;
    anchorLabel: string;
    savingLabel: string;

  }[];
  /* The dates, carried on the offer so a component needs ONE prop rather than
     a prop plus a second import. They do not vary by step; they ride along
     because every place that prints a price also prints a date. */
  /** "23rd September" — when the challenge starts. */
  startsLabel: string;
  /** "23rd Sept" — the same date with the month abbreviated, for tight rows. */
  startsShortLabel: string;
  /** "23rd to 27th September" — the whole run. */
  dateRange: string;
  /** "7 AM & 7 PM IST". */
  sessionTimes: string;
};

/**
 * Which price is live, and everything derived from it.
 *
 * CALL THIS IN A SERVER COMPONENT ONLY, and pass the result down. See the note
 * at the top of this file for why a client must never compute it.
 *
 * `now` is injectable so the step boundaries can be tested without waiting for
 * September.
 */
export function resolveOffer(now: Date = new Date()): ResolvedOffer {
  const t = now.getTime();

  const closeAt = Date.parse(OFFER.registrationsClose);
  const closed = Number.isFinite(closeAt) && t > closeAt;

  /* First step whose deadline has not passed. A step with an unparseable
     `until` is treated as still live rather than skipped: a typo in a date
     must not silently jump the price to the top of the ladder. */
  let index = OFFER.priceSteps.findIndex((s) => {
    if (s.until === null) return true;
    const until = Date.parse(s.until);
    return !Number.isFinite(until) || t <= until;
  });
  if (index < 0) index = OFFER.priceSteps.length - 1;

  const step = OFFER.priceSteps[index];
  const next = OFFER.priceSteps[index + 1];

  /* Anchors track their live price unless explicitly overridden, so changing
     NEXT_PUBLIC_OFFER_PRICE_INR moves the struck figure, the savings and the
     percentage with it. See deriveAnchor. */
  const anchor =
    OFFER.anchorPriceOverride > 0
      ? OFFER.anchorPriceOverride
      : deriveAnchor(step.amount, OFFER.anchorMultiplier);
  const vipAnchor =
    OFFER.vipAnchorPriceOverride > 0
      ? OFFER.vipAnchorPriceOverride
      : deriveAnchor(OFFER.vipPrice, OFFER.anchorMultiplier);

  const saving = Math.max(0, anchor - step.amount);
  const vipSaving = Math.max(0, vipAnchor - OFFER.vipPrice);

  /* FLOORED. A rounded 79.6 prints "80% OFF" against a saving that is not
     quite 80%, which is the kind of small overstatement these rules are
     written about. Clamped at 0 so a price above the anchor — a config
     mistake — cannot print a negative discount at a buyer. */
  const pct = (save: number, of: number) =>
    of > 0 ? Math.max(0, Math.floor((save / of) * 100)) : 0;
  const savingPercent = pct(saving, anchor);
  const vipSavingPercent = pct(vipSaving, vipAnchor);

  /* The urgency line states the CURRENT price and its deadline, then the next
     one. It is a statement of fact about a published ladder, which is what
     separates it from manufactured scarcity. On the last step there is no
     "then", so the line is empty rather than invented. */
  const urgencyLine =
    next && step.until
      ? `${inr(step.amount)} until ${formatDeadline(step.until)} · then ${inr(next.amount)}`
      : '';

  /* Deliberately NOT gated on `step.until` the way urgencyLine is. That line
     names a specific deadline and so needs a parseable one; the strip says
     only "soon", which stays true whenever a higher rung exists at all. */
  const nextPriceLabel = next ? inr(next.amount) : '';

  return {
    price: step.amount,
    priceLabel: inr(step.amount),
    anchorLabel: inr(anchor),
    savingLabel: inr(saving),
    savingPercent,
    /**
     * Every CTA on the landing page points at /checkout, NOT at /go and never
     * at Razorpay directly.
     *
     * /checkout is where the two passes are chosen. The landing page sells the
     * challenge at one price; putting the upgrade decision on it as well asks
     * the reader to make two decisions at once, in the middle of being
     * persuaded of the first. Choosing the tier belongs after "yes".
     *
     * /checkout then hands off to /go?product=…, which is the only thing that
     * can capture the browser-only attribution before the buyer leaves for a
     * payment page we do not host.
     */
    ctaHref: closed ? OFFER.waitingListUrl || '#waiting-list' : '/checkout',
    closed,
    urgencyLine,
    nextPriceLabel,
    stepIndex: index + 1,
    vipPrice: OFFER.vipPrice,
    vipPriceLabel: inr(OFFER.vipPrice),
    vipAnchorLabel: inr(vipAnchor),
    vipSavingLabel: inr(vipSaving),
    vipSavingPercent,
    products: [
      {
        key: 'base',
        price: step.amount,
        priceLabel: inr(step.amount),
        anchorLabel: inr(anchor),
        savingLabel: inr(saving),

      },
      {
        key: 'vip',
        price: OFFER.vipPrice,
        priceLabel: inr(OFFER.vipPrice),
        anchorLabel: inr(vipAnchor),
        savingLabel: inr(vipSaving),

      },
    ],
    startsLabel: OFFER.startDate,
    startsShortLabel: shortenMonth(OFFER.startDate),
    dateRange: OFFER.dateRange,
    sessionTimes: SESSION_TIMES_TZ,
  };
}

/**
 * The Razorpay page for the step that is live right now.
 *
 * Used by /go, which is a server route and so may read the clock directly.
 * Falls back to step one's page when a later step has no page configured yet —
 * a CTA that opens the wrong price is recoverable, a CTA that opens nothing is
 * a lost sale.
 */
/**
 * Read an env var at CALL time rather than at module load.
 *
 * ── WHY THE INDEXED ACCESS MATTERS ──────────────────────────────────────────
 * Next.js replaces `process.env.NEXT_PUBLIC_FOO` with its literal value at
 * BUILD time, everywhere — server code included. So a NEXT_PUBLIC_ page URL
 * read the ordinary way is frozen into the bundle: set it after the build and
 * nothing changes until a rebuild, which is exactly the trap this funnel fell
 * into (links set, CTAs still dead).
 *
 * `process.env[name]` with a computed key cannot be statically replaced, so
 * the value is read from the real environment on every request. These URLs are
 * only ever used server-side, so that is strictly better: change the variable,
 * the next click uses it.
 *
 * Names are tried in order, so the non-public name wins where both exist and
 * anything already set as NEXT_PUBLIC_ keeps working untouched.
 */
function envAtRuntime(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/**
 * The Razorpay Payment Page for a tier, resolved per request.
 *
 * A Payment Page's amount is fixed in the Razorpay dashboard and cannot be
 * passed in, so each price is its own page.
 *
 * Deliberately NO cross-tier fallback. An unconfigured VIP page used to fall
 * back to the base page, which quietly charges a VIP buyer ₹497 — money taken
 * at the wrong price, invisible until reconciliation. An empty string instead
 * makes /go bounce the buyer back with a message naming the missing variable.
 */
export function paymentPageFor(
  product: 'base' | 'vip' = 'base',
  now: Date = new Date(),
): string {
  if (product === 'vip') {
    return envAtRuntime('RAZORPAY_PAGE_VIP', 'NEXT_PUBLIC_RAZORPAY_PAGE_VIP');
  }

  const { stepIndex } = resolveOffer(now);
  if (stepIndex >= 2) {
    const risen = envAtRuntime(
      'RAZORPAY_PAGE_BASE_STEP_2',
      'NEXT_PUBLIC_RAZORPAY_PAGE_BASE_STEP_2',
    );
    /* Falls back to the step-1 page when the risen one is unset: a buyer
       paying the old price is recoverable, a dead button is a lost sale. */
    if (risen) return risen;
  }
  return envAtRuntime('RAZORPAY_PAGE_BASE', 'NEXT_PUBLIC_RAZORPAY_PAGE_BASE');
}

/** "Sunday 13th September" — how a deadline reads in the urgency line. */
function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  /* Formatted IN IST regardless of where the server runs, so a deadline of
     23:59 IST never prints as the previous day because the box is in UTC. */
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = Number(get('day'));
  return `${get('weekday')} ${day}${ordinal(day)} ${get('month')}`;
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
