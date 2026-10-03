'use client';

/**
 * Turns every CTA on the landing page into a button that opens the
 * registration modal, without any of them knowing that is what they do.
 *
 * ── WHY A DELEGATED LISTENER, AGAIN ───────────────────────────────────────
 * This replaces CtaTracker and keeps its central trick for the same reasons.
 * The hero and the sections below it are Server Components with no JavaScript
 * on the critical path; giving each CTA an onClick would turn every one of them
 * into a Client Component and undo that. There are also a lot of them — hero,
 * section closes, the price card, the sticky bar, the docked mobile bar — and
 * one listener catches all of them, including any added later, with no chance
 * of one being forgotten.
 *
 * ── WHAT CHANGED FROM CtaTracker ──────────────────────────────────────────
 * It used to let the click through and navigate to the OTO. It now PREVENTS
 * the navigation and opens the modal in place.
 *
 * `atc_event` STILL FIRES, and it fires here rather than on the way out,
 * because the tap no longer goes anywhere: the event's meaning is now "the
 * registration form opened", which is the moment below. It carries fbp, fbc,
 * IP and user agent and no PII, because at this instant nobody has told us who
 * they are — so it is a volume number, not something to bid on.
 * `registration_complete` is the first event with the full match set.
 *
 * ONE LISTENER, NOT TWO. CtaTracker used to own a second delegated click
 * handler for exactly these hrefs. Firing from inside this one keeps the event
 * and the modal on the same code path, so they can never disagree about what
 * counts as a CTA — which is the bug that once silently killed every CTA
 * event when the OTO shipped and only one of the two lists was updated.
 *
 * ── THE ONE CASE THAT STILL NAVIGATES ─────────────────────────────────────
 * Somebody who has already registered in this tab. Re-asking them for details
 * they just gave is the kind of thing that loses a sale, so for them the CTA
 * goes to the OTO as it always did.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { GA_EVENTS, gaEvent } from '@/lib/ga';
import { readRegistration } from '@/lib/registration-client';

import { getFbc, newEventId, readCookie } from './MetaPixel';
import RegisterModal from './RegisterModal';

/* The hrefs that mean "start". Read from the config rather than typed here, so
   the funnel can rename a step and this follows it — the bug that silently
   killed every CTA event once before, when the OTO shipped and this list was
   left pointing at the old path. */
const CTA_PATHS = [CHECKOUT_CONFIG.otoPath, CHECKOUT_CONFIG.checkoutPath];

export default function RegisterGate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  /**
   * atc_event to Meta, add_to_cart to GA4. One form-open, two reporting
   * systems that deliberately use different names.
   *
   * SERVER ONLY on the Meta side. The Pixel is not asked to fire this; the
   * POST below hands it to /api/track and the Conversions API sends the single
   * copy, so there is no browser/server pair to deduplicate.
   *
   * The event id is minted in the browser rather than on the server: it is
   * what makes a double-tap collapse into one conversion at Meta's end.
   *
   * `keepalive` is kept from the old CtaTracker even though this click no
   * longer navigates. It costs nothing and still covers the reader who taps a
   * CTA and closes the tab a moment later.
   */
  const report = useCallback(() => {
    /* No value params. GA_VALUE is the VIP price, and booking £4.99 against a
       form-open would put imaginary revenue in the GA4 reports. */
    gaEvent(GA_EVENTS.addToCart);

    try {
      void fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: CHECKOUT_CONFIG.capi.events.addToCart,
          eventId: newEventId(),
          fbp: readCookie('_fbp'),
          fbc: getFbc(),
          eventSourceUrl: window.location.href,
        }),
        keepalive: true,
      });
    } catch {
      /* Tracking never blocks a registration. */
    }
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      /* Leave modified clicks alone: a middle-click or cmd-click is someone
         deliberately asking for a new tab, and hijacking it is rude. */
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      const link = target?.closest?.('a');
      if (!link) return;

      /* getAttribute, not link.href: the latter is resolved to an absolute URL
         and would need parsing to compare. */
      const href = link.getAttribute('href') ?? '';
      if (!CTA_PATHS.some((p) => href.startsWith(p))) return;

      e.preventDefault();

      /* Already registered in this tab — send them on rather than asking
         again. */
      report();

      if (readRegistration()) {
        router.push(CHECKOUT_CONFIG.otoPath);
        return;
      }

      setOpen(true);
    }

    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [router, report]);

  return <RegisterModal open={open} onClose={close} />;
}
