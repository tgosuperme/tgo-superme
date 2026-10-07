/* What the call is, in the copy doc's own words, read by the booking page and
   the thank-you so the two can never describe different calls. */

export const CAL_ORIGIN = 'https://app.cal.com';

/* Accepts "team/event", "/team/event" or a full cal.com url. */
export const CAL_LINK = (process.env.NEXT_PUBLIC_CAL_LINK ?? '')
  .trim()
  .replace(/^https?:\/\/(app\.)?cal\.com\//, '')
  .replace(/^\/+|\/+$/g, '');

export const CAL_NAMESPACE = CAL_LINK.split('/').pop() || 'superme';
export const CAL_URL = CAL_LINK ? `https://cal.com/${CAL_LINK}` : '';

export const CALL_TERMS = 'Free 30-minute call · No obligation · Few spots left this week';

export const CALL_PURPOSE =
  'On your call, this is the team that maps where your pain really comes from, and what to do about it.';

export const CALL_FIRST_STEP = {
  title: 'Pain Assessment & Personal Map',
  body: "We understand your pain, your history, and how you actually move, then map where it's really coming from.",
} as const;
