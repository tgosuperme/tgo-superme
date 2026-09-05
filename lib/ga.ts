/**
 * Google Analytics 4 events.
 *
 * SEPARATE FROM META, but both conversion events are deliberately the SAME
 * WORD in both systems. GA gets these five:
 *
 *     add_to_cart            a CTA tap on the landing page
 *     initiate_checkout      the reader completes step 1 of the form
 *     registration_complete  the registration is recorded — the free
 *                            conversion, and the volume event
 *     sales                  a VIP upgrade is paid for, on /thank-you-vip
 *     join_whatsapp          the WhatsApp button on either thank-you page
 *
 * ── WHY THE CONVERSION NAME MATCHES META'S ──────────────────────────────────
 * The first two names differ between the systems for historical reasons and
 * are left alone. The conversion does not: `registration_complete` is the same
 * string here and in Meta, so that when someone compares the two dashboards —
 * which is the whole reason both are installed — they are visibly looking at
 * the same event rather than guessing whether `sign_up` and `sales` are
 * supposed to be the same number.
 *
 * `sign_up` is gone — it was this side's name for the free conversion before
 * the two were aligned. `sales` is NOT a leftover: it means the VIP upgrade,
 * and only that.
 *
 * These are browser-only. There is no server-side Measurement Protocol call,
 * so a blocked GA script simply means no event, which for funnel-shape
 * reporting is an acceptable trade the ad-side events cannot make. Note the
 * asymmetry that follows: Meta's copies are sent server-side — from
 * /api/register and from the Stripe webhook — and are never blocked, so GA
 * will always report FEWER registrations and FEWER sales than Meta does. That
 * gap is expected and is not a bug.
 *
 * ONLY `sales` CARRIES A VALUE. Registering is free and worth £0, and
 * attaching `value: 0` to those events trains GA's own reporting on a stream
 * of zeroed conversions. A free registration is a count, not an amount. The
 * VIP upgrade is real money and is reported as such.
 *
 * NOTE ON THE NAMES: only `add_to_cart` is a GA4 built-in. `initiate_checkout`
 * (GA4's own is `begin_checkout`), `registration_complete` (GA4's own is
 * `sign_up`), `sales` (GA4's own is `purchase`) and `join_whatsapp` all arrive
 * as CUSTOM events, and each needs registering in GA4 ▸ Admin ▸ Events before
 * it can be used in a report or marked as a key event.
 */

export const GA_EVENTS = {
  addToCart: 'add_to_cart',
  initiateCheckout: 'initiate_checkout',
  registrationComplete: 'registration_complete',
  vipSale: 'sales',
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
