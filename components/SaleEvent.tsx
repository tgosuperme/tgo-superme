'use client';

import { useEffect, useRef } from 'react';

/**
 * The browser half of the `sales` event.
 *
 * The server already sends this sale through the Conversions API from the
 * Stripe webhook, which is the copy that always lands. This one exists for
 * redundancy: the two channels fail in different ways (the browser gets
 * blocked, the server can lose a token), and between them the sale is
 * reported either way.
 *
 * ── COUNTED ONCE, THREE TIMES OVER ──────────────────────────────────────────
 * 1. `eventId` is the SAME id the server uses. It is minted in /api/checkout
 *    and stored on the Stripe session, so both halves of one sale share it and
 *    Meta collapses them into a single conversion.
 * 2. The ref below stops a double fire inside one page view, which React's
 *    development strict mode would otherwise cause.
 * 3. localStorage stops it firing again ON RELOAD. This is the case the first
 *    two miss: a reload is a fresh mount, so the ref resets, and the id is
 *    stable, so the same event goes out again. Meta's deduplication window is
 *    48 hours, which covers an immediate refresh but NOT someone reopening
 *    this URL from their history a week later. Without this guard that stale
 *    reload would land as a brand new conversion.
 *
 * Keyed by event id, not by a fixed string, so a second genuine purchase by
 * the same person on the same device still reports.
 */

type Fbq = (...args: unknown[]) => void;

const STORAGE_PREFIX = 'sm_sale_sent:';

/** Both helpers fail open: if storage is unavailable the event still fires,
    and Meta's own 48-hour window remains as the backstop. Losing a real sale
    is worse than the rare stale duplicate this is guarding against. */
function alreadySent(eventId: string): boolean {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + eventId) !== null;
  } catch {
    return false;
  }
}

function markSent(eventId: string) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + eventId, '1');
  } catch {
    /* Private mode, or storage full. Nothing to do. */
  }
}

export default function SaleEvent({
  eventName,
  eventId,
  value,
  currency,
  contentName,
}: {
  eventName: string;
  eventId: string;
  value: number;
  currency: string;
  contentName: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !eventId) return;
    fired.current = true;

    if (alreadySent(eventId)) return;

    const w = window as unknown as { fbq?: Fbq };
    if (typeof w.fbq !== 'function') return; // no pixel id, or blocked

    /* trackCustom, not track: `sales` is a custom event, and fbq('track',
       'sales') would be rejected as an unknown standard event. */
    w.fbq(
      'trackCustom',
      eventName,
      { value, currency, content_name: contentName },
      { eventID: eventId },
    );
    markSent(eventId);
  }, [eventName, eventId, value, currency, contentName]);

  return null;
}
