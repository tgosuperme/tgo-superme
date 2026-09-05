'use client';

import { useEffect, useRef } from 'react';

import { GA_EVENTS, gaEvent } from '@/lib/ga';

/**
 * GA4's copy of `sales`, fired once on /thank-you-vip.
 *
 * ── WHY THIS IS BROWSER-SIDE WHEN META'S COPY IS NOT ────────────────────────
 * Meta gets `sales` from the Stripe webhook, which always runs. GA has no
 * server-side equivalent wired up in this project (no Measurement Protocol
 * call), so its only option is the browser — which means GA will under-report
 * VIP sales relative to Meta by however many buyers close the tab on Stripe's
 * redirect or run a blocker. That gap is expected. It is the same asymmetry
 * the free conversion already has, and it is documented in lib/ga.ts.
 *
 * ── FIRED ONCE, AND ONLY ON A VERIFIED PAYMENT ──────────────────────────────
 * The parent only renders this component when Stripe itself confirmed
 * payment_status === 'paid', so a hand-typed URL cannot report a sale. The ref
 * guard then stops React's development double-mount — and any future
 * re-render — from counting the same purchase twice.
 *
 * The value is passed in from the Stripe session rather than read from config,
 * so what GA records is what was actually charged, not what the page believes
 * the price to be. Those are the same number today and would silently diverge
 * the first time the price changed mid-cohort.
 */
export default function VipSaleTracker({
  value,
  currency,
}: {
  value: number;
  currency: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    gaEvent(GA_EVENTS.vipSale, { value, currency });
  }, [value, currency]);

  return null;
}
