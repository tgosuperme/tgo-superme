import type { Metadata } from 'next';

import BrandMark from '@/components/BrandMark';
import { inr, OFFER } from '@/lib/offer';

import { C } from '../_landing/shared';

/**
 * /hold · Part C, step one. Shown on Day 5 of the challenge, never linked from
 * the landing page.
 *
 * ── WHAT A "HOLD" HAS TO MEAN TO BE ONE ─────────────────────────────────────
 * Three promises, and the page is only defensible while all three are true:
 *
 *   · fully refundable
 *   · credited in full to whichever option they choose
 *   · locks the challenge price until the call
 *
 * Take any one away and this stops being a seat hold and becomes a
 * non-refundable deposit collected before the buyer has been told what they
 * are buying — which is what the Consumer Protection Act 2019's rules on
 * unfair contracts are aimed at. They are stated on the page, in the Razorpay
 * page's own description, and in the terms. If the client ever wants the hold
 * to be non-refundable, the copy has to change with it.
 *
 * ── THE SEAT COUNTER IS A REAL NUMBER ───────────────────────────────────────
 * NEXT_PUBLIC_HOLD_SEATS_LEFT is maintained by hand by TGO. It is deliberately
 * NOT a countdown that ticks on its own, and not derived from a timer: an
 * invented scarcity number is the single most common thing ASCI acts on in
 * this category. If nobody is updating it, the honest fix is to remove it, not
 * to animate it.
 *
 * noindex: this is a page for people already in the cohort.
 */

export const metadata: Metadata = {
  title: 'Hold the challenge price | SuperMe',
  robots: { index: false, follow: false },
};

const OPTIONS = [
  {
    key: '30',
    sessions: OFFER.programme.p30.sessions,
    months: OFFER.programme.p30.months,
    website: OFFER.programme.p30.website,
    challenge: OFFER.programme.p30.challenge,
  },
  {
    key: '60',
    sessions: OFFER.programme.p60.sessions,
    months: OFFER.programme.p60.months,
    website: OFFER.programme.p60.website,
    challenge: OFFER.programme.p60.challenge,
    popular: true,
  },
];

export default function HoldPage() {
  const holdHref = OFFER.holdPageUrl || '#';
  const seatsKnown = OFFER.seatsLeft > 0 && OFFER.seatsTotal > 0;

  return (
    <main className="min-h-screen font-body" style={{ background: C.paleBlue, color: C.ink }}>
      <header className="bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-center px-5 py-4 sm:justify-start md:px-8">
          <BrandMark height={40} priority />
        </div>
      </header>

      <div className="mx-auto max-w-[900px] px-4 py-10 sm:py-14">
        <div className="text-center">
          <h1
            className="font-heading text-[28px] font-bold leading-tight sm:text-[36px]"
            style={{ color: C.ink }}
          >
            Hold the challenge price
          </h1>
          <p
            className="mx-auto mt-3 max-w-[560px] text-[15.5px] leading-relaxed"
            style={{ color: C.inkSoft }}
          >
            You have seen what five days can do. This holds your seat at the
            challenge price while you and Atul work out which option is right for
            you.
          </p>

          {seatsKnown && (
            <p
              className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold"
              style={{ background: C.peachBed, color: C.peachInk }}
            >
              {OFFER.seatsLeft} of {OFFER.seatsTotal} challenge-price seats left
            </p>
          )}
        </div>

        {/* ── the two options, side by side ─────────────────────────────────
            Both prices shown for each: what the app charges, and what a
            challenge participant pays. The saving is left for the reader to
            see rather than badged, because unlike the ₹497 offer this is a
            conversation that continues on a call — a discount badge here would
            be selling before Atul has heard what they need. */}
        <ul className="mt-9 grid gap-4 sm:grid-cols-2">
          {OPTIONS.map((o) => (
            <li
              key={o.key}
              className="relative rounded-3xl bg-white p-6 sm:p-7"
              style={{
                border: `1px solid ${o.popular ? C.lineStrong : C.line}`,
                boxShadow: o.popular ? '0 20px 50px -34px rgba(24,59,86,0.3)' : 'none',
              }}
            >
              {o.popular && (
                <span
                  className="absolute right-5 top-5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ background: C.lightBlue, color: C.blue }}
                >
                  Most chosen
                </span>
              )}
              <p
                className="font-heading text-[20px] font-bold sm:text-[22px]"
                style={{ color: C.ink }}
              >
                {o.sessions} sessions
              </p>
              <p className="mt-1 text-[13.5px]" style={{ color: C.inkMuted }}>
                Over {o.months} months, live with Atul
              </p>

              <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className="font-heading text-[30px] font-bold leading-none"
                  style={{ color: C.ink }}
                >
                  {inr(o.challenge)}
                </span>
                <span
                  aria-hidden
                  className="text-[16px] font-semibold line-through"
                  style={{ color: C.inkMuted }}
                >
                  {inr(o.website)}
                </span>
              </div>
              <p className="mt-2 text-[12.5px]" style={{ color: C.inkMuted }}>
                {inr(o.website)} is the price on the SuperMe app. The lower figure is
                the challenge price.
              </p>
            </li>
          ))}
        </ul>

        <p
          className="mt-4 rounded-2xl px-5 py-4 text-center text-[13.5px]"
          style={{ background: C.mintBed, color: '#0F5A2C' }}
        >
          Either option includes one month of streaming classes, worth{' '}
          {inr(OFFER.programme.bonusValue)}.
        </p>

        {/* ── the hold ─────────────────────────────────────────────────────── */}
        <div
          className="mt-8 rounded-3xl bg-white p-6 text-center sm:p-8"
          style={{ border: `1px solid ${C.lineStrong}` }}
        >
          <a
            href={holdHref}
            className="lego-press lego-pulse-glow inline-flex min-h-[58px] w-full items-center justify-center rounded-full px-8 text-[17px] font-semibold text-white"
            style={{ background: C.blueFill }}
          >
            Hold my seat · {inr(OFFER.holdPrice)}
          </a>

          <ul
            className="mt-5 grid gap-2 text-[13.5px] sm:grid-cols-3"
            style={{ color: C.inkSoft }}
          >
            <li>Fully refundable</li>
            <li>Credited to whichever option you choose</li>
            <li>Locks the challenge price until your call</li>
          </ul>
        </div>

        <p className="mt-6 text-center text-[12px] leading-relaxed" style={{ color: C.inkMuted }}>
          Nothing else is charged today, and nothing renews. After the hold you book
          a call with Atul to decide between the two options — or to decide against
          both, in which case the hold comes back.
        </p>
      </div>
    </main>
  );
}
