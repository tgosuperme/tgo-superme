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
 * ── THE FIGURES ARE SIZED TO A ~70% HEADLINE, NOT TO A MARKET RATE ───────
 * AED 2 for a guide is low for Dubai. It is what the arithmetic allows: the
 * seat is AED 4.99, and a ~70% discount puts the whole stack at AED 17. Raise
 * these and the discount climbs past 90%, which is the louder claim and the
 * one the advertising rules care about. The brief asked for ~70%, so the
 * stack was sized to it rather than the other way round.
 *
 * The values below sum to BONUS_TOTAL, the bonus figure on its own. The
 * checkout adds the challenge price to it (FULL_VALUE = PRICE + BONUS_TOTAL)
 * to reach the number it strikes through, so this total is a COMPONENT of that
 * sum and must never be edited to "make" the struck figure on its own — the
 * price moves, and the arithmetic is done in code precisely so the two cannot
 * drift apart.
 */
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
    value: 2,
    body: 'The five postures and two breathing techniques Atul uses to take the load off a guarding lower back, in the order that matters: unload first, strengthen after.',
    src: '/bonuses/back-pain-relief-guide.png',
    alt: 'The Back Pain Relief Guide',
    bed: C.coralBed,
    ink: C.coralInk,
  },
  {
    n: 'Bonus 2',
    title: 'The Knee Support Guide',
    value: 2,
    body: 'Learn which of the two knees you actually have, load-related or arthritic, and the exact strengthening work Atul uses to take pressure off the joint without ever bending a sore knee first.',
    src: '/bonuses/knee-support-guide.png',
    alt: 'The Knee Support Guide',
    bed: C.mintBed,
    ink: C.mintInk,
  },
  {
    n: 'Bonus 3',
    title: 'The Neck & Shoulder Relief Guide',
    value: 2,
    body: "Atul's posture corrections and daily habit fixes for a neck that's been carrying a decade of screen time, paired with a calming breath practice to ease tension through the shoulders.",
    src: '/bonuses/neck-shoulder-relief-guide.png',
    alt: 'The Neck and Shoulder Relief Guide',
    bed: C.lavenderBed,
    ink: C.lavenderInk,
  },
  {
    n: 'Bonus 4',
    title: 'The Unload Breath Guide',
    value: 1,
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
 * panel. It appears as a line in the value block instead, and counts toward
 * INCLUDED_TOTAL.
 */
export const SCORE_REPORT = {
  title: 'Your Day 1 and Day 4 Pain Score Report',
  value: 1,
};

/** Everything included with a seat, guides plus the score report. */
export const INCLUDED_TOTAL = BONUS_TOTAL + SCORE_REPORT.value;

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

export const VIP_EXTRAS: VipExtra[] = [
  { title: 'Recordings of all five sessions', value: 29 },
  { title: 'The Desk Reset Guide', value: 6 },
  { title: 'The Sleep Position Guide', value: 6 },
  { title: 'Priority on-camera correction', value: 9 },
];

/** Summed, never typed in, so it cannot disagree with the list above. */
export const VIP_EXTRAS_TOTAL = VIP_EXTRAS.reduce((sum, x) => sum + x.value, 0);
