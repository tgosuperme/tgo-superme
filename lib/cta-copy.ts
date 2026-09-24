import type { ResolvedOffer } from './offer';

/**
 * Every call-to-action label on the site, in one file.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * The same button text was written out at seven call sites across four files.
 * They drifted, quietly and in both directions: some carried a closed-state
 * fallback and some kept selling a challenge that had already started, and the
 * guarantee line appeared as both "Money-Back" and "Money Back" on the same
 * screen. None of that is visible while you are editing one file.
 *
 * Standardising means one definition, not a careful find-and-replace. Change a
 * label here and it changes everywhere, including the places nobody remembered.
 *
 * ── THE SEPARATOR IS "•", NOT "·" ───────────────────────────────────────────
 * A heavier bullet, because in a button the price is a second fact rather than
 * a continuation of the phrase, and the lighter middle dot lets it collapse
 * into the sentence at 14px. Used only in CTA labels and the sticky bar's
 * reassurance line; running text elsewhere keeps its own punctuation.
 */

/** Shown on every CTA once registrations have closed. */
export const CTA_CLOSED = 'Join the next batch';

/**
 * The primary CTA: hero, the banner link, and every CTA down the page.
 *
 * Carries the price, because a button that names the number is the whole
 * reason this funnel does not need a separate price section.
 */
export function ctaPrimaryLabel(offer: ResolvedOffer): string {
  return offer.closed ? CTA_CLOSED : `Start Your 5-Day Reset • ${offer.priceLabel}`;
}

/**
 * "Reserve" rather than "Start": used by the hero's offer card, under the
 * system image, and by the button on /checkout.
 *
 * Both are the same words because both are the same act — holding a place,
 * not beginning the challenge. The hero card omits the price because the card
 * it sits in already prints it a few lines above; /checkout appends the total,
 * because there the number is what the button is confirming.
 */
export const CTA_RESERVE = 'Reserve My Spot';

/**
 * The docked bar's button.
 *
 * Different wording from the primary CTA on purpose. The bar follows the
 * reader down the whole page, so by the time it is pressed they have usually
 * read the offer — "Get Instant Access" answers "what happens when I press
 * this", where a second copy of the hero's label just repeats the hero.
 */
export function ctaStickyLabel(offer: ResolvedOffer): string {
  return offer.closed ? CTA_CLOSED : `Get Instant Access • ${offer.priceLabel}`;
}

/** Under 360px, where the full sticky label and the arrow stop fitting. */
export const CTA_STICKY_SHORT = 'Get Instant Access';

/**
 * The reassurance, spelled ONE way.
 *
 * Hyphenated: "money-back" is a compound adjective modifying "guarantee". It
 * appeared both ways across the page, twice within one viewport.
 */
export const GUARANTEE_LABEL = '100% Money-Back Guarantee';
