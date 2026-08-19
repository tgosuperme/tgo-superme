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
 * ── ON THE RUPEE VALUES ─────────────────────────────────────────────────
 * SuperMe-Bonus-PDFs-Copy.md records a prior compliance decision AGAINST
 * stated money values on bonuses ("Appendix A: the pound values come off, the
 * contents stay on"), on value-stacking grounds. The client has since asked
 * for the values, a struck total and a savings percentage. Implemented as
 * asked and flagged here rather than silently dropped. The same caution
 * applies under India's ASCI code, which treats an unsubstantiated "worth
 * ₹2,700" the way the UK rules treat an invented "was" price: the figures
 * below need to be defensible as what these guides genuinely sell for.
 *
 * ── THE ₹ FIGURES ARE THE £ FIGURES × 100 ───────────────────────────────
 * 9/6/7/5 became 900/600/700/500. That multiple is not arbitrary and it is not
 * an exchange rate: the offer moved £4.99 → ₹497, which is also ×100, so
 * scaling the bonuses by the same factor holds the OFFER RATIO exactly where
 * the signed-off page had it. The saving stays 82%, the struck total stays the
 * same multiple of the price, and nothing about how the page reads changes.
 * Repricing one side without the other is what makes a stacked offer start
 * looking implausible.
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
  /** Whole rupees. Drives the card, the value block and the checkout summary. */
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
    value: 900,
    body: 'The five postures and two breathing techniques Atul uses to take the load off a guarding lower back, in the order that matters: unload first, strengthen after.',
    src: '/bonuses/back-pain-relief-guide.png',
    alt: 'The Back Pain Relief Guide',
    bed: C.coralBed,
    ink: C.coralInk,
  },
  {
    n: 'Bonus 2',
    title: 'The Knee Support Guide',
    value: 600,
    body: 'Learn which of the two knees you actually have, load-related or arthritic, and the exact strengthening work Atul uses to take pressure off the joint without ever bending a sore knee first.',
    src: '/bonuses/knee-support-guide.png',
    alt: 'The Knee Support Guide',
    bed: C.mintBed,
    ink: C.mintInk,
  },
  {
    n: 'Bonus 3',
    title: 'The Neck & Shoulder Relief Guide',
    value: 700,
    body: "Atul's posture corrections and daily habit fixes for a neck that's been carrying a decade of screen time, paired with a calming breath practice to ease tension through the shoulders.",
    src: '/bonuses/neck-shoulder-relief-guide.png',
    alt: 'The Neck and Shoulder Relief Guide',
    bed: C.lavenderBed,
    ink: C.lavenderInk,
  },
  {
    n: 'Bonus 4',
    title: 'The Unload Breath Guide',
    value: 500,
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
 * Derived from the live offer price, so the headline saving cannot go stale.
 *
 * CLAMPED TO 0–99, which it did not used to be. The price is an env variable
 * and it is now a three-figure number rather than a one-figure one, so the
 * fat-finger that used to be impossible is not: set NEXT_PUBLIC_OFFER_PRICE_INR
 * to 4970 instead of 497 and the old arithmetic returned -84, which the page
 * would happily have rendered as "SAVE -84%". A price above the bonus total is
 * a configuration mistake, but it must not be able to print a negative
 * discount at a buyer.
 */
export function savingPercent(price: number): number {
  const pct = Math.round(((BONUS_TOTAL - price) / BONUS_TOTAL) * 100);
  return Math.min(99, Math.max(0, pct));
}
