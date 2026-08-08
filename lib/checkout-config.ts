/**
 * SuperMe · 5-Day Pain Reset — offer config (single source of truth).
 *
 * UK offer, so the currency is GBP and every price on the page reads from here.
 *
 *     NEXT_PUBLIC_OFFER_PRICE_GBP=6            # what the user pays
 *     NEXT_PUBLIC_START_DATE=18th August       # cohort start
 *     NEXT_PUBLIC_SESSION_TIMES=7 AM & 7 PM    # the two daily session times
 *
 * NOTE ON UK COMPLIANCE: there is deliberately no list price, no "was" price
 * and no savings figure here. The advertising rules this page is built to
 * forbid price-rise pressure and value stacking, so the shape that the
 * postpartum page uses (strikethrough + SAVE badge) must not be reintroduced.
 */

function parsePriceEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const PRICE_GBP = parsePriceEnv(process.env.NEXT_PUBLIC_OFFER_PRICE_GBP, 6);
const START_DATE = process.env.NEXT_PUBLIC_START_DATE?.trim() || '18th August';
const SESSION_TIMES =
  process.env.NEXT_PUBLIC_SESSION_TIMES?.trim() || '7 AM & 7 PM';

export const CHECKOUT_CONFIG = {
  amountPence: PRICE_GBP * 100,
  amountGbpString: String(PRICE_GBP),
  amountGbpNumeric: PRICE_GBP,
  currency: 'GBP',
  currencySymbol: '£',

  capi: {
    standardEventName: 'Purchase',
    customEventName: 'sales',
    value: PRICE_GBP,
    currency: 'GBP',
    productionHosts: [] as string[],
    fallbackEventSourceUrl: '',
  },

  checkoutPath: '/checkout',
  thankYouPath: '/thank-you',
  funnelSlug: 'superme-pain-reset',
  utmSessionKey: 'superme_utm',

  startDate: START_DATE,
  sessionTimes: SESSION_TIMES,
};
