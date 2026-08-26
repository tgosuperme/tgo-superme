/**
 * Google Analytics 4 events.
 *
 * SEPARATE FROM META, but the conversion event is deliberately the SAME WORD
 * in both. GA gets these four; the Pixel and the Conversions API get
 * atc_event, ic_event and registration_complete:
 *
 *     add_to_cart            a CTA tap on the landing page
 *     initiate_checkout      the reader completes step 1 of the form
 *     registration_complete  the registration is recorded — the conversion
 *     join_whatsapp          the WhatsApp button on the thank-you page
 *
 * ── WHY THE CONVERSION NAME MATCHES META'S ──────────────────────────────────
 * The first two names differ between the systems for historical reasons and
 * are left alone. The conversion does not: `registration_complete` is the same
 * string here and in Meta, so that when someone compares the two dashboards —
 * which is the whole reason both are installed — they are visibly looking at
 * the same event rather than guessing whether `sign_up` and `sales` are
 * supposed to be the same number.
 *
 * It was `sign_up` here and `sales` there. Both are gone.
 *
 * These are browser-only. There is no server-side Measurement Protocol call,
 * so a blocked GA script simply means no event, which for funnel-shape
 * reporting is an acceptable trade the ad-side events cannot make. Note the
 * asymmetry that follows: Meta's copy of the conversion is sent server-side
 * from /api/register and is never blocked, so GA will always report FEWER
 * registrations than Meta does. That gap is expected and is not a bug.
 *
 * NO VALUE OR CURRENCY IS SENT WITH ANY OF THEM. The challenge is free, and
 * attaching `value: 0` to every event trains GA's own reporting on a stream of
 * zeroed conversions. A free registration is a count, not an amount.
 *
 * NOTE ON THE NAMES: only `add_to_cart` is a GA4 built-in. `initiate_checkout`
 * (GA4's own is `begin_checkout`), `registration_complete` (GA4's own is
 * `sign_up`) and `join_whatsapp` all arrive as CUSTOM events, and each needs
 * registering in GA4 ▸ Admin ▸ Events before it can be used in a report or
 * marked as a key event.
 */

export const GA_EVENTS = {
  addToCart: 'add_to_cart',
  initiateCheckout: 'initiate_checkout',
  registrationComplete: 'registration_complete',
  joinWhatsapp: 'join_whatsapp',
} as const;

type Gtag = (...args: unknown[]) => void;

/**
 * Fires one GA4 event. Silent when gtag is absent, which covers local
 * development (where the tag is deliberately not loaded) and anyone running a
 * blocker. Tracking never breaks a page.
 */
export function gaEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { gtag?: Gtag };
  if (typeof w.gtag !== 'function') return;
  w.gtag('event', name, params);
}
