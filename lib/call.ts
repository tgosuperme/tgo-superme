/* What the call is, in the copy doc's own words, read by the booking page and
   the thank-you so the two can never describe different calls. */

/* The Calendly event the booking page embeds. */
export const CALENDLY_URL = 'https://calendly.com/hello-mysuperme-yoga/10min';

export const CALL_TERMS = 'Free 30-minute call · No obligation · Few spots left this week';

export const CALL_PURPOSE =
  'On your call, this is the team that maps where your pain really comes from, and what to do about it.';

export const CALL_FIRST_STEP = {
  title: 'Pain Assessment & Personal Map',
  body: "We understand your pain, your history, and how you actually move, then map where it's really coming from.",
} as const;
