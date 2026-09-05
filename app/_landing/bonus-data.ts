/**
 * The four registration bonuses — the single source of truth for their names,
 * values and artwork.
 *
 * In its OWN directive-free module because two places need it: the landing
 * page's bonuses section and the registration form's summary. Keeping one list
 * means a bonus cannot be renamed on the page while the form still names the
 * old one.
 *
 * Same reasoning as ./lego-style: a module imported by both client and server
 * trees must not carry a 'use client' directive.
 *
 * ── ON THE POUND VALUES ──────────────────────────────────────────────────
 * SuperMe-Bonus-PDFs-Copy.md records a prior compliance decision AGAINST
 * stated pound values on bonuses ("Appendix A: the pound values come off, the
 * contents stay on"), on value-stacking grounds. The client subsequently asked
 * for the values, a struck total and a savings percentage.
 *
 * THE SAVINGS PERCENTAGE IS NOW GONE, and not as a preference. It was
 * `(BONUS_TOTAL − price) / BONUS_TOTAL`, so with the challenge free it
 * evaluates to a flat 100% on every render — "You save 100%" — which is the
 * purest possible form of the device the compliance note warns about, and
 * reads as a gimmick besides. The per-bonus values and the total survive: they
 * describe what the guides are worth, which is a statement about the guides
 * rather than a discount on a price that no longer exists.
 *
 * The registration form's summary deliberately does not show them at all. On a
 * page where nothing is being paid, a column of pound figures next to a "Total
 * to pay: Free" is a comparison nobody asked for.
 */
import { C } from './shared';

export type Bonus = {
  n: string;
  title: string;
  /** Whole pounds. Drives the bonus card and the total in the value block. */
  value: number;
  body: string;
  src: string;
  alt: string;
  /** Bed + ink for the badge and value line: one accent each, so the four
      read as a deliberate set rather than four unrelated products. */
  bed: string;
  ink: string;
  /**
   * Which tier this guide belongs to.
   *
   * TWO come with the free place and TWO are part of the VIP upgrade. This
   * flag is the single source of that split: the landing page's bonuses
   * section, the registration form's summary, the OTO's two cards and both
   * thank-you pages all read it, so the free tier cannot end up promising a
   * guide the OTO then sells. Getting that wrong is not a cosmetic bug — it
   * is a page promising something it takes back one screen later.
   */
  tier: 'free' | 'vip';
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
    tier: 'free',
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
    tier: 'vip',
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
    tier: 'vip',
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
    tier: 'free',
  },
];

/** Summed, never typed in, so it cannot disagree with the list above. */
export const BONUS_TOTAL = BONUSES.reduce((sum, b) => sum + b.value, 0);

/* The two halves of the split, derived rather than hand-listed. Every surface
   that names guides reads one of these, so the free tier and the OTO can never
   disagree about which two are which. */
export const FREE_BONUSES = BONUSES.filter((b) => b.tier === 'free');
export const VIP_BONUSES = BONUSES.filter((b) => b.tier === 'vip');
