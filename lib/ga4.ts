'use client';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function send(name: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
      return;
    }
    // Tag not loaded yet: queue exactly as gtag would, so it replays on load.
    window.dataLayer = window.dataLayer || [];
    function gtagShim() {
      // eslint-disable-next-line prefer-rest-params
      (window.dataLayer as unknown[]).push(arguments);
    }
    (gtagShim as (...args: unknown[]) => void)('event', name, params);
  } catch {
    /* never throw into a click */
  }
}

export const ga4ViewItem = (page: 'landing' | 'booking') =>
  send('view_item', { item_list_name: page });

export const ga4Event = (name: 'registration_completed' | 'call_booked') =>
  send(name, { value: 0, currency: 'INR' });

/* Session-scoped by default; a durable key would stop a returning visitor ever
   producing another view. Keys prefixed `booked_` are durable, because one
   booking must never count twice. The flag is stamped before firing so a
   double-click still dedupes, and this gate never checks for gtag: Meta must
   not go dark because GA4 is missing. */
export function once(key: string, fire: () => void) {
  if (typeof window === 'undefined') return;
  const durable = key.startsWith('booked_');
  const k = `sm_evt_${key}`;
  try {
    const store = durable ? window.localStorage : window.sessionStorage;
    if (store.getItem(k)) return;
    store.setItem(k, '1');
  } catch {
    /* private mode: fire anyway rather than lose the event */
  }
  fire();
}
