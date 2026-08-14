import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

/**
 * Google Analytics 4 events.
 *
 * SEPARATE FROM META ON PURPOSE. GA gets these three; the Pixel and the
 * Conversions API get atc_event, ic_event and sales. Two systems, two sets of
 * names, no overlap:
 *
 *     add_to_cart         a CTA tap on the landing page
 *     initiate_checkout   the pay button on the checkout page
 *     join_whatsapp       the WhatsApp button on the thank-you page
 *
 * These are browser-only. There is no server-side Measurement Protocol call,
 * so a blocked GA script simply means no event, which for funnel-shape
 * reporting is an acceptable trade the ad-side events cannot make.
 *
 * NOTE ON THE NAMES: GA4's own built-in checkout event is `begin_checkout`,
 * not `initiate_checkout`. The name below is the one that was asked for, so
 * all three arrive as custom events and each needs registering in GA4 before
 * it can be used in reports or conversions. See the note in the setup steps.
 */

export const GA_EVENTS = {
  addToCart: 'add_to_cart',
  initiateCheckout: 'initiate_checkout',
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

/** The money params GA4 expects on the two commerce events. */
export const GA_VALUE = {
  value: CHECKOUT_CONFIG.capi.value,
  currency: CHECKOUT_CONFIG.capi.currency,
};
