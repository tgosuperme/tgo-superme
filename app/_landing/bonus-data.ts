/**
 * The four registration bonuses — the single source of truth for their names,
 * values and artwork.
 *
 * In its OWN directive-free module because two places need it: the landing
 * page's bonuses section and the checkout order summary. Keeping one list
 * means a bonus cannot be renamed or repriced on the page while the checkout
 * still quotes the old figure, which is exactly the kind of drift that gets
 * noticed by a buyer mid-purchase.
 *
 * Same reasoning as ./lego-style: a module imported by both client and server
 * trees must not carry a 'use client' directive.
 *
 * ── ON THE STATED VALUES ─────────────────────────────────────────────────
 * SuperMe-Bonus-PDFs-Copy.md records a prior compliance decision AGAINST
 * stated values on bonuses ("Appendix A: the pound values come off, the
 * contents stay on"), on value-stacking grounds. The client has since asked
 * for the values, a struck total and a savings percentage. Implemented as
 * asked and flagged here rather than silently dropped.
 *
 * ── THE FIGURES ADD UP TO 40, AND THAT IS THE POINT ──────────────────────
 * The client set the arithmetic: AED 5 a guide, four guides, so AED 20 of
 * written material; AED 20 for the five live days (NEXT_PUBLIC_ANCHOR_PRICE_
 * AED); AED 40 for a place, struck through, given away.
 *
 * It replaces an earlier set sized to keep a discount headline near 70%. That
 * reasoning died with the seat price: at zero the discount is 100% whatever
 * these say, so there is no percentage left to tune and nothing to be gained
 * by keeping the numbers small. What matters now is only that they are
 * defensible and that they sum to the figure the page strikes through.
 *
 * TWO HALVES THAT MUST STAY EQUAL. 20 and 20 is a deliberate shape — the
 * guides are worth what the live days are worth — so if one moves the other
 * should be looked at, and the struck total follows both automatically.
 *
 * The values below sum to BONUS_TOTAL, the bonus figure on its own. The
 * checkout adds the challenge price to it (FULL_VALUE = PRICE + BONUS_TOTAL)
 * to reach the number it strikes through, so this total is a COMPONENT of that
 * sum and must never be edited to "make" the struck figure on its own — the
 * price moves, and the arithmetic is done in code precisely so the two cannot
 * drift apart.
 */
import { CHECKOUT_CONFIG, VIP_BONUSES, type VipBonus } from '@/lib/checkout-config';

import { C } from './shared';

export type Bonus = {
  n: string;
  title: string;
  /** Whole AED. Drives the card, the value block and the checkout summary. */
  value: number;
  body: string;
  src: string;
  alt: string;
  /** Bed + ink for the badge and value line: one accent each, so the four
      read as a deliberate set rather than four unrelated products. */
  bed: string;
  ink: string;
};

export const BONUSES: Bonus[] = [
  {
    n: 'Bonus 1',
    title: 'The Back Pain Relief Guide',
    value: 5,
    body: 'The five postures and two breathing techniques Atul uses to take the load off a guarding lower back, in the order that matters: unload first, strengthen after.',
    src: '/bonuses/back-pain-relief-guide.png',
    alt: 'The Back Pain Relief Guide',
    bed: C.coralBed,
    ink: C.coralInk,
  },
  {
    n: 'Bonus 2',
    title: 'The Knee Support Guide',
    value: 5,
    body: 'Learn which of the two knees you actually have, load-related or arthritic, and the exact strengthening work Atul uses to take pressure off the joint without ever bending a sore knee first.',
    src: '/bonuses/knee-support-guide.png',
    alt: 'The Knee Support Guide',
    bed: C.mintBed,
    ink: C.mintInk,
  },
  {
    n: 'Bonus 3',
    title: 'The Neck & Shoulder Relief Guide',
    value: 5,
    body: "Atul's posture corrections and daily habit fixes for a neck that's been carrying a decade of screen time, paired with a calming breath practice to ease tension through the shoulders.",
    src: '/bonuses/neck-shoulder-relief-guide.png',
    alt: 'The Neck and Shoulder Relief Guide',
    bed: C.lavenderBed,
    ink: C.lavenderInk,
  },
  {
    n: 'Bonus 4',
    title: 'The Unload Breath Guide',
    value: 5,
    body: 'Four techniques explained simply, Nadi Shodhana, Ujjayi, diaphragmatic breathing and Kapalabhati: which one calms which kind of tension, and why breath comes before every movement in the Inner Brace Method.',
    src: '/bonuses/unload-breath-guide.png',
    alt: 'The Unload Breath Guide',
    bed: C.peachBed,
    ink: C.peachInk,
  },
];

/** Summed, never typed in, so it cannot disagree with the list above. */
export const BONUS_TOTAL = BONUSES.reduce((sum, b) => sum + b.value, 0);

/**
 * The fifth included item, added when the challenge gained its own scoring.
 *
 * It has no cover artwork, which is why it is not a BONUSES entry: that list
 * drives an image grid and a member without a `src` would render an empty
 * panel. It appears as a line in the value block instead.
 *
 * ── IT CARRIES NO PRICE, DELIBERATELY ────────────────────────────────────
 * It was AED 1, which read as an apology rather than a value. More to the
 * point, the stack is now four guides at 5 and the live days at 20, summing
 * to the 40 the page strikes through — and a priced fifth item would make
 * that sum wrong by exactly its own figure.
 *
 * It is also the one included thing with no market price to borrow: it is a
 * report generated from the reader's own two scores, not a product anybody
 * sells. Stating it as included and leaving the money out is both the honest
 * description and the one that keeps the arithmetic whole.
 *
 * Give it a value only alongside a decision about what the struck total
 * should then become.
 */
export const SCORE_REPORT = {
  title: 'Your Day 1 and Day 4 Pain Score Report',
  value: 0,
};

/** Everything included with a seat, guides plus the score report. */
export const INCLUDED_TOTAL = BONUS_TOTAL + SCORE_REPORT.value;

/**
 * WHAT A PLACE IS WORTH, and the figure struck through on both the landing
 * page's value block and the checkout's order summary: the five live days
 * plus everything written that comes with them.
 *
 * Derived here so the two surfaces cannot disagree. The checkout used to do
 * this addition itself, which meant a repriced guide moved one of the two
 * struck totals and left the other behind.
 */
export const PLACE_FULL_VALUE = Math.round(
  CHECKOUT_CONFIG.anchorAedNumeric + INCLUDED_TOTAL,
);

/** Derived from the live offer price, so the headline saving cannot go stale. */
export function savingPercent(price: number): number {
  return Math.round(((INCLUDED_TOTAL - price) / INCLUDED_TOTAL) * 100);
}

/**
 * What the VIP pass adds, priced the same way the seat's stack is.
 *
 * SEPARATE from BONUSES because these are not registration bonuses — nobody
 * gets them for showing up, they are what the upgrade buys. The seat summary
 * must never list them, and the VIP summary must never omit them.
 *
 * ── THE SAME ITEM NEVER CARRIES TWO PRICES ──────────────────────────────
 * The VIP total is the seat's stack PLUS these, not a second valuation of the
 * same things at a higher number. A buyer who reads both pages sees one price
 * list, which is the only version of this that survives being compared.
 *
 *     seat   AED 17  (sessions + four guides + score report)
 *     VIP    AED 67  (all of that, plus the four lines below)
 *
 * At AED 4.99 and AED 19.99 those land at 71% and 70% off respectively.
 */
export type VipExtra = { title: string; value: number };

/**
 * DERIVED from VIP_BONUSES in lib/checkout-config.ts, which is where the VIP
 * products and their prices now live.
 *
 * This was a second hand-written list of the same four things, carrying the
 * same four figures. The OTO page needs them with headings and prose, the
 * order summary needs them as priced one-liners, and both reading from one
 * list is what stops the checkout quoting a product the OTO has renamed.
 *
 * The credit is filtered out rather than given a zero: it is not a product and
 * has no price, and a zero would be summed into the struck total as though it
 * were worth nothing.
 */
export const VIP_EXTRAS: VipExtra[] = VIP_BONUSES.filter(
  (b): b is VipBonus & { value: number } => typeof b.value === 'number',
).map((b) => ({ title: b.summaryTitle, value: b.value }));

export { VIP_EXTRAS_TOTAL } from '@/lib/checkout-config';
