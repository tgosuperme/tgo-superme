/**
 * Which payment rails this deployment can ACTUALLY take, in one flag.
 *
 * ── THE DECISION ────────────────────────────────────────────────────────────
 * Settled with the client: the existing (non-Indian) Stripe account stays, and
 * INR is used as a PRESENTMENT currency on it. The buyer is quoted ₹497 and
 * charged ₹497; Stripe converts and settles into the account's own currency,
 * taking a conversion fee on the way.
 *
 * The consequence that matters here: UPI, netbanking and wallets are NOT
 * available. All three require a Stripe account registered to an Indian
 * entity. This deployment takes international cards and nothing else.
 *
 * ── WHY THE PAGE MUST NOT CLAIM OTHERWISE ───────────────────────────────────
 * A UPI mark is not decoration — it is a promise, and for an Indian buyer it
 * is the single most likely reason they start a payment at all. Showing it on
 * a card-only checkout produces the worst available failure: the buyer
 * commits, taps UPI, finds it is not there, and leaves. The money is lost at
 * the exact moment it was won.
 *
 * So the flag is false, and the page says "Credit & Debit Cards" because that
 * is the whole truth of what it can take.
 *
 * ── THE FAILURE MODE THIS FLAG CANNOT FIX ───────────────────────────────────
 * Every charge on this setup is a cross-border transaction to the buyer's
 * bank. Indian cards frequently ship with international transactions disabled,
 * and the issuer declines them at the payment sheet — after the form is filled
 * and after Stripe has been reached. That is a property of the rail and no
 * amount of copy on this page prevents it. It is the reason to test with a
 * real Indian card before running spend, and the reason an Indian account is
 * worth revisiting if decline rates come back high.
 *
 * ── IF THE DECISION IS EVER REVISITED ───────────────────────────────────────
 * Register an Indian entity, move to a Stripe India account, enable UPI on it,
 * then flip this ONE constant to true. The payment-method logo strip, the
 * trust line under the CTA and the checkout's reassurance copy all read from
 * it, so nothing else needs editing and nothing can be left half-switched.
 *
 * Add 'upi' to `payment_method_types` in app/api/checkout/route.ts at the same
 * time — this flag governs what the page CLAIMS, and that array governs what
 * Stripe actually OFFERS. Flipping one without the other reintroduces exactly
 * the mismatch this flag exists to prevent.
 */
export const INDIA_RAILS_LIVE = false;

/**
 * The one-line trust label under a CTA. Read, never hard-coded, so the two
 * places that show it can never drift apart.
 */
export const PAYMENT_METHODS_LABEL = INDIA_RAILS_LIVE
  ? 'UPI · Cards · Netbanking · Wallets'
  : 'Credit & Debit Cards';
