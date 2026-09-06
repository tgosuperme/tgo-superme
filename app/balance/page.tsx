import type { Metadata } from 'next';

import BrandMark from '@/components/BrandMark';
import { inr, OFFER } from '@/lib/offer';

import { C } from '../_landing/shared';

/**
 * /balance · Part C, step three. Sent by the SuperMe team AFTER the call, with
 * ?plan=30 or ?plan=60.
 *
 * ── THE HOLD IS DEDUCTED HERE, AND THE ARITHMETIC IS SHOWN ──────────────────
 * The page states the full price, subtracts the hold, and shows what is left —
 * rather than quoting a net figure and expecting the buyer to remember what
 * they paid on Day 5. Someone paying ₹21,999 minus a hold has every right to
 * see the sum, and a mismatch between what they remember paying and what they
 * are charged is the fastest route to a chargeback on a five-figure payment.
 *
 * VIP is NOT deducted here. The spec mentions a VIP credit; whether that
 * applies is a commercial decision nobody has confirmed, and silently applying
 * or silently omitting it are both wrong. It is left out and flagged, so the
 * caller can say what is true rather than the page guessing.
 *
 * ── WHY THIS IS RAZORPAY AND NOT A STRIPE LINK ──────────────────────────────
 * The same reason the challenge is. SuperMe's Stripe fails for Indian cards
 * without international payments enabled and has no UPI, and a lost ₹21,999 is
 * an expensive way to rediscover that. If SuperMe later prefers its own link
 * for the balance, these pages stay as the fallback the caller sends when a
 * card fails.
 */

export const metadata: Metadata = {
  title: 'Your programme balance | SuperMe',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function BalancePage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  /* Defaults to 30 rather than erroring: this link is pasted by hand into a
     WhatsApp message after a call, and a stripped or mistyped parameter must
     not leave a buyer staring at an error page. The plan is restated in the
     copy so a wrong one is obvious to them and to the caller. */
  const is60 = searchParams.plan === '60';
  const p = is60 ? OFFER.programme.p60 : OFFER.programme.p30;
  const payUrl = (is60 ? OFFER.balancePage60Url : OFFER.balancePage30Url) || '';

  const balance = Math.max(0, p.challenge - OFFER.holdPrice);

  return (
    <main className="min-h-screen font-body" style={{ background: C.paleBlue, color: C.ink }}>
      <header className="bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-center px-5 py-4 sm:justify-start md:px-8">
          <BrandMark height={40} priority />
        </div>
      </header>

      <div className="mx-auto max-w-[620px] px-4 py-10 sm:py-14">
        <h1
          className="text-center font-heading text-[26px] font-bold leading-tight sm:text-[32px]"
          style={{ color: C.ink }}
        >
          {p.sessions} sessions over {p.months} months
        </h1>
        <p className="mt-3 text-center text-[15px]" style={{ color: C.inkSoft }}>
          Starting {OFFER.batchStartDate}, live with Atul.
        </p>

        <div
          className="mt-8 rounded-3xl bg-white p-6 sm:p-8"
          style={{ border: `1px solid ${C.lineStrong}` }}
        >
          {/* The sum, shown. Not a net figure the buyer has to take on trust. */}
          <dl className="grid gap-3 text-[14.5px]">
            <div className="flex items-baseline justify-between">
              <dt style={{ color: C.inkSoft }}>Challenge price</dt>
              <dd className="font-semibold" style={{ color: C.ink }}>
                {inr(p.challenge)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt style={{ color: C.inkSoft }}>Seat hold already paid</dt>
              <dd className="font-semibold" style={{ color: C.greenInk }}>
                &minus; {inr(OFFER.holdPrice)}
              </dd>
            </div>
          </dl>

          <div className="my-5 h-px" style={{ background: C.lineStrong }} />

          <div className="flex items-baseline justify-between">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: C.ink }}
            >
              Balance due
            </span>
            <span
              className="font-heading text-[32px] font-bold leading-none"
              style={{ color: C.goldDeep }}
            >
              {inr(balance)}
            </span>
          </div>

          {payUrl ? (
            <a
              href={payUrl}
              className="lego-press lego-pulse-glow mt-6 inline-flex min-h-[56px] w-full items-center justify-center rounded-full px-8 text-[16px] font-semibold text-white"
              style={{ background: C.blueFill }}
            >
              Pay the balance · {inr(balance)}
            </a>
          ) : (
            <p
              className="mt-6 rounded-2xl px-4 py-4 text-center text-[13.5px]"
              style={{ background: C.lightBlue, color: C.ink }}
            >
              Your payment link is on its way from Atul&rsquo;s team. If it has not
              arrived, message them on WhatsApp and they will send it.
            </p>
          )}

          <p className="mt-4 text-center text-[12px]" style={{ color: C.inkMuted }}>
            {p.sessions} live sessions · {p.months} months · one month of streaming
            classes included, worth {inr(OFFER.programme.bonusValue)}
          </p>
        </div>

        <p className="mt-6 text-center text-[12px] leading-relaxed" style={{ color: C.inkMuted }}>
          Wrong option? Message Atul&rsquo;s team before paying and they will send the
          other one — the hold applies to either.
        </p>
      </div>
    </main>
  );
}
