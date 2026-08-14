'use client';

import { useEffect } from 'react';

import { GA_EVENTS, gaEvent } from '@/lib/ga';

/**
 * Fires GA4's `join_whatsapp` when the buyer taps the WhatsApp button on the
 * thank-you page.
 *
 * There are three of those buttons (the green card, the navy band, and the
 * docked mobile bar), all rendered by the same JoinButton and all tagged
 * `data-ga-join`. One delegated listener catches every one of them, and the
 * thank-you page stays a Server Component.
 *
 * GA only. Meta's three events do not include this one.
 *
 * Not deduplicated on purpose: this measures intent to join, and a buyer who
 * taps twice really did tap twice. The number that matters is how many people
 * tapped at least once, which GA reports as users rather than event count.
 */

export default function JoinTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest?.('[data-ga-join]')) return;
      gaEvent(GA_EVENTS.joinWhatsapp);
    }

    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
