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
 * ── ON THE POUND VALUES ──────────────────────────────────────────────────
 * SuperMe-Bonus-PDFs-Copy.md records a prior compliance decision AGAINST
 * stated pound values on bonuses ("Appendix A: the pound values come off, the
 * contents stay on"), on value-stacking grounds. The client has since asked
 * for the values, a struck total and a savings percentage. Implemented as
 * asked and flagged here rather than silently dropped.
 */
import { C } from './shared';

export type Bonus = {
  n: string;
  title: string;
  /** Whole pounds. Drives the card, the value block and the checkout summary. */
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
    value: 9,
    body: 'The five postures and two breathing techniques Atul uses to take the load off a guarding lower back, in the order that matters: unload first, strengthen after.',
    src: '/bonuses/back-pain-relief-guide.png',
    alt: 'The Back Pain Relief Guide',
    bed: C.coralBed,
    ink: C.coralInk,
  },
  {
    n: 'Bonus 2',
    title: 'The Knee Support Guide',
    value: 6,
    body: 'Learn which of the two knees you actually have, load-related or arthritic, and the exact strengthening work Atul uses to take pressure off the joint without ever bending a sore knee first.',
    src: '/bonuses/knee-support-guide.png',
    alt: 'The Knee Support Guide',
    bed: C.mintBed,
    ink: C.mintInk,
  },
  {
    n: 'Bonus 3',
    title: 'The Neck & Shoulder Relief Guide',
    value: 7,
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

/** Derived from the live offer price, so the headline saving cannot go stale. */
export function savingPercent(price: number): number {
  return Math.round(((BONUS_TOTAL - price) / BONUS_TOTAL) * 100);
}
