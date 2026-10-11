/* What the call is, in the copy doc's own words, read by the booking page and
   the thank-you so the two can never describe different calls. */

/**
 * The Calendly event the booking page embeds.
 *
 * ── AN ENV VAR, SO THE LINK CAN CHANGE WITHOUT A DEPLOY FROM A DEVELOPER ──
 * This was hardcoded, and the hardcoded value pointed at the /10min event
 * while CALL_TERMS below promised a 30-minute call. That is the failure mode
 * worth designing against: the booking link is owned by whoever runs the
 * calendar, not by whoever ships the code, so it drifts the moment the two
 * are different people.
 *
 * NEXT_PUBLIC_ because the booking page is a Client Component — the widget
 * needs `window` — so the value has to be inlined into the browser bundle.
 * It is a public URL that appears in the page source either way, so there is
 * nothing to protect.
 *
 * Changing it in Vercel needs a REDEPLOY. NEXT_PUBLIC_ variables are baked in
 * at build time, not read at request time; editing it in the dashboard alone
 * changes nothing.
 *
 * The fallback is the live link, so an unset variable still books a call
 * rather than rendering an empty widget.
 */
export const CALENDLY_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() ||
  'https://calendly.com/hello-mysuperme-yoga/30min';

export const CALL_TERMS = 'Free 30-minute call · No obligation · Few spots left this week';

export const CALL_PURPOSE =
  'On your call, this is the team that maps where your pain really comes from, and what to do about it.';

export const CALL_FIRST_STEP = {
  title: 'Pain Assessment & Personal Map',
  body: "We understand your pain, your history, and how you actually move, then map where it's really coming from.",
} as const;
