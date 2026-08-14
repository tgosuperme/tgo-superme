'use client';

import { useEffect } from 'react';

import { GA_EVENTS, GA_VALUE, gaEvent } from '@/lib/ga';

import { getFbc, newEventId, readCookie, trackCustom } from './MetaPixel';

/**
 * Fires the landing page's CTA-tap events: `atc_event` to Meta and
 * `add_to_cart` to GA4. One click, one listener, two reporting systems that
 * deliberately use different names.
 *
 * Implemented as ONE delegated listener on the document rather than an onClick
 * on each button, for three reasons:
 *
 *   · The hero and the sections below it are Server Components with no
 *     JavaScript on the critical path. Adding a handler to the shared CTA
 *     would turn every one of them into a Client Component and undo that.
 *   · There are many CTAs (hero, section closes, the sticky bar, the mobile
 *     docked bar). A delegated listener catches all of them, including any
 *     added later, with no chance of one being forgotten.
 *   · One listener, one bundle cost, no re-renders.
 *
 * Sent twice on purpose: once from the Pixel and once via /api/track, sharing
 * an event_id so Meta collapses the pair. The POST uses `keepalive` because
 * the click is about to navigate away, and a normal fetch would be cancelled
 * mid-flight by the navigation.
 */

const CHECKOUT_PATH = '/checkout';

export default function CtaTracker({ eventName }: { eventName: string }) {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const link = target?.closest?.('a');
      if (!link) return;

      /* getAttribute, not link.href: the latter is resolved to an absolute URL
         and would need parsing to compare. */
      const href = link.getAttribute('href') ?? '';
      if (!href.startsWith(CHECKOUT_PATH)) return;

      const eventId = newEventId();
      trackCustom(eventName, eventId);
      /* GA4 gets its own name and no event id: it has no server half here, so
         there is nothing to deduplicate against. */
      gaEvent(GA_EVENTS.addToCart, GA_VALUE);

      try {
        void fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: eventName,
            eventId,
            fbp: readCookie('_fbp'),
            fbc: getFbc(),
            eventSourceUrl: window.location.href,
          }),
          /* Survives the navigation this click is about to cause. */
          keepalive: true,
        });
      } catch {
        /* Tracking never blocks a buyer. */
      }
    }

    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [eventName]);

  return null;
}
