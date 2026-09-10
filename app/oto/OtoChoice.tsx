'use client';

/**
 * The OTO · one choice, made before the form rather than after the payment.
 *
 * WHERE THIS SITS
 * Landing → OTO → checkout → confirmation. It is not a post-purchase upsell:
 * nothing has been paid when the reader arrives, so the page never says "your
 * seat is booked". It says "here is what you are about to buy, and here is the
 * one decision left".
 *
 * TWO PACKAGES, NOT A BASKET
 * The seat is always in and cannot be removed — that is the product. The VIP
 * pass is an UPGRADE of it, not a second line item, so £9.99 is the whole
 * price and not £1.99 plus £9.99. That distinction is the one thing this page
 * has to get across without being read twice, which is why the VIP price
 * carries "total, including your seat" directly under it and the total row
 * restates the single figure that will be charged.
 *
 * The choice travels to the checkout as ?plan=, and the checkout sends it to
 * /api/checkout, which prices it from the server's own table. Nothing here can
 * set a price; it can only name one of two plans.
 */
import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  Clock,
  Crown,
  Lock,
  ShieldCheck,
  VideoCamera,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import BrandMark from '@/components/BrandMark';
import PaymentLogos from '@/components/PaymentLogos';
import { PLANS, VIP_BENEFITS } from '@/lib/checkout-config';
import { GA_EVENTS, gaEvent } from '@/lib/ga';

import { legoBrick, legoDelay } from '../_landing/lego-style';
import MobileCtaBar, { MOBILE_CTA_BAR_SPACE_TALL } from '../_landing/mobile-cta-bar';
import {
  C,
  DATE_RANGE,
  SESSION_TIMES_TZ,
  START_DATE,
} from '../_landing/shared';

/* What the £1.99 seat buys. Deliberately the same four lines the checkout's
   order summary shows, so the reader sees the identical list twice rather than
   two overlapping descriptions of one thing. */
const SEAT_INCLUDES = [
  { icon: VideoCamera, text: 'Five live, coach-led sessions on Zoom' },
  { icon: Clock, text: `Both daily timings, ${SESSION_TIMES_TZ}, join whichever fits` },
  { icon: CheckCircle, text: 'Real-time form correction from Atul, so you cannot get it wrong' },
  { icon: ShieldCheck, text: 'Your own Day 1 to Day 4 progress score, see your own change' },
];

export default function OtoChoice() {
  const router = useRouter();
  const [vip, setVip] = useState(false);
  const [busy, setBusy] = useState(false);

  const plan = vip ? PLANS.vip : PLANS.seat;

  const go = () => {
    if (busy) return;
    setBusy(true);
    gaEvent(GA_EVENTS.addToCart, {
      value: plan.priceGbp,
      currency: 'GBP',
      items: [{ item_id: plan.id, item_name: plan.productName, price: plan.priceGbp }],
    });
    /* The plan rides in the query string rather than storage: it survives a
       refresh, a shared link and a back button, and the checkout can be linked
       to directly from an email without a prior visit here. */
    router.push(vip ? '/checkout?plan=vip' : '/checkout');
  };

  return (
    <main className="min-h-screen" style={{ background: C.paleBlue }}>
      {/* ── header ─────────────────────────────────────────────────── */}
      <header style={{ background: C.white, borderBottom: `1px solid ${C.line}` }}>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <BrandMark height={34} priority />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium"
            style={{ color: C.inkSoft }}
          >
            <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] px-5 py-10 md:px-8 md:py-14">
        {/* Centred throughout. Unlike the checkout, this page has no form
            column to align to — it is one decision presented head-on. */}
        <div className="mx-auto max-w-[640px] text-center">
          <span
            data-lego=""
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
            style={{ background: C.lightBlue, color: C.skyInk }}
          >
            <CalendarBlank weight="bold" className="h-3 w-3" />
            Cohort starts {START_DATE}
          </span>

          <h1
            data-lego=""
            className="mt-4 font-heading text-[clamp(27px,5vw,40px)] font-bold leading-[1.12] tracking-[-0.01em]"
            style={{ ...legoDelay(1, 80), color: C.ink, textWrap: 'balance' } as React.CSSProperties}
          >
            One choice, then{' '}
            <span style={{ color: C.goldDeep }}>you&apos;re in</span>.
          </h1>

          <p
            data-lego=""
            className="mx-auto mt-3 max-w-[520px] text-[15.5px] leading-relaxed"
            style={{ ...legoDelay(2, 80), color: C.inkSoft, textWrap: 'pretty' } as React.CSSProperties}
          >
            Your seat is held for {plan.priceLabel}, so the room is people who
            turn up. The only decision left is whether you want the recordings
            and the extra guides to keep afterwards.
          </p>
        </div>

        {/* ── the two packages ───────────────────────────────────────
            Equal columns from lg. Below that they stack, seat first, because
            the seat is what they already agreed to on the landing page and the
            upgrade only makes sense once it has been read. */}
        <div className="mt-10 grid gap-4 lg:grid-cols-2 lg:gap-5">
          {/* ── the seat · locked in ─────────────────────────────── */}
          <section
            data-lego=""
            className="relative flex flex-col rounded-3xl p-6 sm:p-7"
            style={{ background: C.white, border: `1px solid ${C.line}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span
                  className="text-[10.5px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: C.inkMuted }}
                >
                  Your seat
                </span>
                <h2
                  className="mt-1.5 font-heading text-[19px] font-bold leading-snug"
                  style={{ color: C.ink }}
                >
                  5-Day Pain Reset Challenge
                </h2>
                <p className="mt-1 text-[12.5px]" style={{ color: C.inkMuted }}>
                  Live · Coach-led · Zoom
                </p>
              </div>
              <span
                className="shrink-0 font-heading text-[26px] font-bold leading-none"
                style={{ color: C.ink }}
              >
                {PLANS.seat.priceLabel}
              </span>
            </div>

            {/* Not a control. It states that the seat is in and cannot be taken
                out, which is why it is a <span> with a lock rather than a
                checkbox rendered permanently checked — a checkbox that refuses
                to toggle reads as a broken one. */}
            <span
              className="mt-5 inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-[11.5px] font-semibold"
              style={{ background: C.mintBed, color: C.mintInk }}
            >
              <Lock weight="fill" className="h-3 w-3" />
              Always included
            </span>

            <ul className="mt-5 grid flex-1 gap-2.5">
              {SEAT_INCLUDES.map(({ icon: Icon, text }, i) => (
                <li
                  key={text}
                  data-lego=""
                  className="flex items-start gap-2.5"
                  style={legoBrick(i, 60)}
                >
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                    style={{ background: 'rgba(159,218,203,0.34)' }}
                  >
                    <Icon weight="bold" className="h-2.5 w-2.5" style={{ color: C.mintInk }} />
                  </span>
                  <span className="text-[13.5px] leading-snug" style={{ color: C.inkSoft }}>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── the VIP upgrade · the only control on the page ───── */}
          <section
            data-lego=""
            className="relative flex flex-col rounded-3xl p-6 transition-shadow duration-300 sm:p-7"
            style={{
              ...legoDelay(1, 90),
              background: C.white,
              /* The selected state is carried by the border and the shadow, not
                 by a background change: the card holds a list the reader is
                 still reading, and re-tinting the bed underneath it moves the
                 contrast of every line at the moment they are deciding. */
              border: `2px solid ${vip ? C.gold : C.line}`,
              boxShadow: vip ? '0 26px 54px -30px rgba(191,148,42,0.6)' : 'none',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span
                  className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: C.goldDeep }}
                >
                  <Crown weight="fill" className="h-3 w-3" />
                  Most complete
                </span>
                <h2
                  className="mt-1.5 font-heading text-[19px] font-bold leading-snug"
                  style={{ color: C.ink }}
                >
                  Add the VIP Pass
                </h2>
                <p className="mt-1 text-[12.5px]" style={{ color: C.inkMuted }}>
                  Everything above, plus four things you keep
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span
                  className="block font-heading text-[26px] font-bold leading-none"
                  style={{ color: C.goldDeep }}
                >
                  {PLANS.vip.priceLabel}
                </span>
                {/* THE line that stops this reading as £1.99 + £9.99. */}
                <span
                  className="mt-1 block text-[10.5px] leading-tight"
                  style={{ color: C.inkMuted }}
                >
                  total, seat
                  <br />
                  included
                </span>
              </span>
            </div>

            <button
              type="button"
              role="checkbox"
              aria-checked={vip}
              onClick={() => setVip((v) => !v)}
              className="lego-press mt-5 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors duration-200"
              style={{
                background: vip ? C.goldSoft : C.paleBlue,
                border: `1px solid ${vip ? C.gold : C.lineStrong}`,
              }}
            >
              <span
                aria-hidden
                className="grid h-5 w-5 shrink-0 place-items-center rounded-md transition-colors duration-200"
                style={{
                  background: vip ? C.goldDeep : C.white,
                  border: `1.5px solid ${vip ? C.goldDeep : C.lineStrong}`,
                }}
              >
                {vip && <CheckCircle weight="fill" className="h-3.5 w-3.5 text-white" />}
              </span>
              <span
                className="text-[14px] font-semibold leading-snug"
                style={{ color: C.ink }}
              >
                Yes, add the VIP Pass — {PLANS.vip.priceLabel} total
              </span>
            </button>

            <ul className="mt-5 grid flex-1 gap-2.5">
              {VIP_BENEFITS.map((line, i) => (
                <li
                  key={line}
                  data-lego=""
                  className="flex items-start gap-2.5"
                  style={legoBrick(i, 60)}
                >
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                    style={{ background: C.goldSoft }}
                  >
                    <CheckCircle weight="fill" className="h-3 w-3" style={{ color: C.goldDeep }} />
                  </span>
                  <span className="text-[13.5px] leading-snug" style={{ color: C.inkSoft }}>
                    {line}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-5 text-[12px] leading-snug" style={{ color: C.inkMuted }}>
              The challenge is the same either way. This is only if you want the
              recordings and the guides to keep.
            </p>
          </section>
        </div>

        {/* ── total and continue ─────────────────────────────────── */}
        <section
          data-lego=""
          className="mx-auto mt-6 max-w-[560px] rounded-3xl p-6 sm:p-7"
          style={{ ...legoDelay(2, 90), background: C.white, border: `1px solid ${C.line}` }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: C.ink }}
            >
              Total to pay
            </span>
            <span
              className="font-heading text-[34px] font-bold leading-none"
              style={{ color: C.goldDeep }}
            >
              {plan.priceLabel}
            </span>
          </div>

          <p className="mt-2 text-[12.5px]" style={{ color: C.inkMuted }}>
            {vip
              ? 'One payment. Your seat and the VIP pass together.'
              : 'One payment. Adding the VIP pass makes this £9.99.'}
          </p>

          <button
            type="button"
            onClick={go}
            disabled={busy}
            data-oto-cta=""
            className="lego-press lego-pulse-glow group mt-5 inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-full text-[15.5px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
            style={{ background: C.blueFill }}
          >
            {busy ? 'Opening…' : `Hold My Seat · ${plan.priceLabel}`}
            {!busy && (
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            )}
          </button>

          <p
            className="mt-3 flex items-start justify-center gap-1.5 text-center text-[12.5px] leading-snug"
            style={{ color: C.inkSoft }}
          >
            <ShieldCheck
              weight="fill"
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: C.mintInk }}
            />
            Come to Day 1. If it&apos;s not for you, message us by the end of
            that day and it&apos;s refunded.
          </p>

          <div className="mt-4">
            <PaymentLogos size="compact" />
          </div>
        </section>

        <p className="mt-6 text-center text-[12.5px]" style={{ color: C.inkMuted }}>
          {DATE_RANGE} · {SESSION_TIMES_TZ} · Live on Zoom
        </p>
      </div>

      {/* Reserves the docked bar's height in normal flow. The TALL value,
          because this bar carries the upgrade row as well as the button. */}
      <div aria-hidden className="lg:hidden" style={{ height: MOBILE_CTA_BAR_SPACE_TALL }} />

      {/* ── docked CTA · mobile and tablet ───────────────────────────
          Carries the VIP checkbox as well as the button. On a phone the two
          package cards are a long scroll and the checkbox sits near the top of
          the second one, so a reader who has reached the bottom and sees a
          total they want to change would otherwise have to scroll back up to
          find the control. This is the same state, not a second copy of it:
          both toggles call the same setVip. */}
      <MobileCtaBar
        watch="[data-oto-cta]"
        /* Short labels, because this bar is the tightest row on the site: two
           lines of text and a priced button inside 390px. "5-Day Pain Reset ·
           £1.99" truncated the price away, and the longer note clipped mid-word
           at "Refunded if it's not for". Both now fit whole. */
        label={vip ? 'Your VIP seat' : 'Your seat'}
        trailing={plan.priceLabel}
        note={
          <>
            <ShieldCheck weight="fill" className="h-3 w-3 shrink-0" style={{ color: C.mintInk }} />
            Refunded after Day 1
          </>
        }
        above={
          <button
            type="button"
            role="checkbox"
            aria-checked={vip}
            onClick={() => setVip((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors duration-200"
            style={{
              background: vip ? C.goldSoft : C.paleBlue,
              border: `1px solid ${vip ? C.gold : C.line}`,
            }}
          >
            <span
              aria-hidden
              className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded transition-colors duration-200"
              style={{
                background: vip ? C.goldDeep : C.white,
                border: `1.5px solid ${vip ? C.goldDeep : C.lineStrong}`,
              }}
            >
              {vip && <CheckCircle weight="fill" className="h-3 w-3 text-white" />}
            </span>
            <span
              className="min-w-0 flex-1 truncate text-[12.5px] font-semibold"
              style={{ color: C.ink }}
            >
              Add the VIP Pass
            </span>
            <span
              className="shrink-0 font-heading text-[12.5px] font-bold"
              style={{ color: C.goldDeep }}
            >
              {PLANS.vip.priceLabel} total
            </span>
          </button>
        }
      >
        <button
          type="button"
          onClick={go}
          disabled={busy}
          className="lego-press lego-pulse-glow group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
          style={{ background: C.blueFill }}
        >
          {busy ? (
            'Opening…'
          ) : (
            <>
              {/* The price is already in the bar's own trailing slot, so the
                  narrow label drops it rather than repeating it into a width
                  that has no room for either. */}
              <span className="min-[400px]:hidden">Hold My Seat</span>
              <span className="hidden min-[400px]:inline">
                Hold My Seat · {plan.priceLabel}
              </span>
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>
      </MobileCtaBar>
    </main>
  );
}
