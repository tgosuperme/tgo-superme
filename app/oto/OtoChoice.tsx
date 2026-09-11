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
 * TWO PACKAGES, PICK ONE — NOT A BASKET
 * The cards are a RADIO PAIR, defaulting to the seat. They are alternatives:
 * £9.99 is a total that already contains the seat, not an amount added to it,
 * so £1.99 + £9.99 is never a thing anyone pays. That is the one point this
 * page has to land without being read twice, which is why the VIP price carries
 * "total, seat included" directly under it and the total row restates the single
 * figure that will be charged.
 *
 * It was a checkbox on the VIP card before. A checkbox says the other card is a
 * fixed baseline with something bolted on top — exactly the misreading above.
 * A radio pair cannot say that, and it also removes the empty state: one option
 * is always chosen, so the continue button never needs guarding against nothing
 * being selected.
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
  ShieldCheck,
  VideoCamera,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import BrandMark from '@/components/BrandMark';
import PaymentLogos from '@/components/PaymentLogos';
import { DEFAULT_PLAN, type PlanId, PLANS, VIP_BENEFITS } from '@/lib/checkout-config';
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

/**
 * One of the two plan cards.
 *
 * A RADIO, not a checkbox. The two cards are alternatives — £9.99 is a total
 * that already contains the seat, not an amount added to it — and a radio pair
 * is the control that says so. A checkbox on one card implies the other is a
 * fixed baseline with something bolted on, which is the misreading this page
 * exists to prevent.
 *
 * THE WHOLE CARD IS THE CONTROL. A card this size that only responds on one
 * small row reads as broken: people tap the price, the title, or the benefit
 * they actually care about, and nothing happens. So the <section> carries the
 * role, the checked state, focus and the keys, and the pill inside is an
 * aria-hidden span that shows state without owning it. Nesting a real input in
 * a clickable card would double-fire and is invalid markup besides.
 */
function PlanRadio({
  selected,
  onSelect,
  onArrow,
  label,
  delay,
  innerRef,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  /** Arrow keys move within a radiogroup, and moving also selects. */
  onArrow: () => void;
  label: string;
  delay: number;
  innerRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}) {
  return (
    <section
      ref={innerRef}
      role="radio"
      aria-checked={selected}
      aria-label={label}
      /* Roving tabindex: one stop for the whole group, on the chosen option,
         which is how a radiogroup is meant to behave. Two tab stops would make
         the pair feel like two unrelated controls. */
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onSelect();
        } else if (
          e.key === 'ArrowRight' ||
          e.key === 'ArrowDown' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowUp'
        ) {
          /* With exactly two options every arrow lands on the other one, so
             there is no wrap-around logic to get wrong. */
          e.preventDefault();
          onArrow();
        }
      }}
      data-lego=""
      className="relative flex cursor-pointer flex-col rounded-3xl p-6 transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:p-7"
      style={{
        ...legoDelay(delay, 90),
        background: C.white,
        /* Selection is carried by the border and the shadow, not by a
           background change: the card holds a list the reader is still reading,
           and re-tinting the bed underneath moves the contrast of every line at
           the moment they are deciding. */
        border: `2px solid ${selected ? C.gold : C.line}`,
        boxShadow: selected ? '0 26px 54px -30px rgba(16,84,194,0.45)' : 'none',
        ['--tw-ring-color' as string]: C.goldDeep,
      }}
    >
      {children}
    </section>
  );
}

/** The state indicator inside a plan card. Shows; does not own. */
function RadioPill({
  selected,
  children,
}: {
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden
      className="mt-5 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors duration-200"
      style={{
        background: selected ? C.goldSoft : C.paleBlue,
        border: `1px solid ${selected ? C.gold : C.lineStrong}`,
      }}
    >
      {/* Round, with a dot. A square with a tick would say checkbox, and the
          whole point of this pass is that these two are alternatives. */}
      <span
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors duration-200"
        style={{
          background: C.white,
          border: `1.5px solid ${selected ? C.goldDeep : C.lineStrong}`,
        }}
      >
        {selected && (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: C.goldDeep }}
          />
        )}
      </span>
      <span className="text-[14px] font-semibold leading-snug" style={{ color: C.ink }}>
        {children}
      </span>
    </span>
  );
}

export default function OtoChoice() {
  const router = useRouter();
  /* One of the two is ALWAYS chosen, starting on the seat. There is no empty
     state to guard the continue button against — which is the point of a radio
     pair rather than a checkbox that can be left off. */
  const [planId, setPlanId] = useState<PlanId>(DEFAULT_PLAN);
  const [busy, setBusy] = useState(false);

  const plan = PLANS[planId];
  const vip = planId === 'vip';

  const seatRef = useRef<HTMLElement>(null);
  const vipRef = useRef<HTMLElement>(null);

  /* The selection guard is not fussiness: the cards are mostly prose, and
     without it a reader who drags across a benefit line to read it more
     carefully changes their plan the moment they let go. A click that ends a
     text selection is not a click on the card. */
  const select = (id: PlanId) => {
    if (typeof window !== 'undefined' && window.getSelection()?.toString()) return;
    setPlanId(id);
  };

  /* Arrow keys select AND move focus, which is what a radiogroup does. */
  const moveTo = (id: PlanId) => {
    setPlanId(id);
    (id === 'vip' ? vipRef : seatRef).current?.focus();
  };

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
        <div
          role="radiogroup"
          aria-label="Choose your place on the 5-Day Pain Reset"
          className="mt-10 grid gap-4 lg:grid-cols-2 lg:gap-5"
        >
          {/* ── the seat · selected by default ───────────────────── */}
          <PlanRadio
            selected={!vip}
            onSelect={() => select('seat')}
            onArrow={() => moveTo('vip')}
            label={`${PLANS.seat.productName} for ${PLANS.seat.priceLabel}`}
            delay={0}
            innerRef={seatRef}
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

            <RadioPill selected={!vip}>
              Just the seat — {PLANS.seat.priceLabel}
            </RadioPill>

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
          </PlanRadio>

          {/* ── the VIP seat ─────────────────────────────────────── */}
          <PlanRadio
            selected={vip}
            onSelect={() => select('vip')}
            onArrow={() => moveTo('seat')}
            label={`${PLANS.vip.productName} for ${PLANS.vip.priceLabel} total, seat included`}
            delay={1}
            innerRef={vipRef}
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
                  Seat + VIP Pass
                </h2>
                {/* "Everything in the seat", not "everything on the left" —
                    the cards stack on a phone, where the other one is above. */}
                <p className="mt-1 text-[12.5px]" style={{ color: C.inkMuted }}>
                  Everything in the seat, plus four things you keep
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

            <RadioPill selected={vip}>
              Seat + VIP Pass — {PLANS.vip.priceLabel} total
            </RadioPill>

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
              The challenge is the same either way. Choose this one only if you
              want the recordings and the guides to keep.
            </p>
          </PlanRadio>
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
              : `One payment. The VIP option above is ${PLANS.vip.priceLabel} in total.`}
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
          Carries the choice as well as the button. On a phone the two package
          cards are a long scroll, so a reader who has reached the bottom and
          sees a total they want to change would otherwise have to scroll back
          up to find the control. It is the same state, not a second copy of
          it — both write the same planId.

          A SEGMENTED PAIR, matching the cards. It used to be a single "Add the
          VIP Pass" checkbox, which said the seat was a baseline and VIP was an
          extra on top; the cards now say the opposite, and a bar that disagreed
          with the page it is docked to is worse than no bar. */}
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
          <div
            role="radiogroup"
            aria-label="Choose your place"
            className="flex w-full gap-2"
          >
            {([
              { id: 'seat' as PlanId, text: 'Seat', price: PLANS.seat.priceLabel },
              { id: 'vip' as PlanId, text: 'Seat + VIP', price: PLANS.vip.priceLabel },
            ]).map((opt) => {
              const on = planId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`${opt.text}, ${opt.price}`}
                  onClick={() => setPlanId(opt.id)}
                  className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 transition-colors duration-200"
                  style={{
                    background: on ? C.goldSoft : C.paleBlue,
                    border: `1px solid ${on ? C.gold : C.line}`,
                  }}
                >
                  <span
                    aria-hidden
                    className="grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full transition-colors duration-200"
                    style={{
                      background: C.white,
                      border: `1.5px solid ${on ? C.goldDeep : C.lineStrong}`,
                    }}
                  >
                    {on && (
                      <span
                        className="h-[7px] w-[7px] rounded-full"
                        style={{ background: C.goldDeep }}
                      />
                    )}
                  </span>
                  <span
                    className="truncate text-[12px] font-semibold"
                    style={{ color: C.ink }}
                  >
                    {opt.text}
                  </span>
                  <span
                    className="shrink-0 font-heading text-[12px] font-bold"
                    style={{ color: on ? C.goldDeep : C.inkMuted }}
                  >
                    {opt.price}
                  </span>
                </button>
              );
            })}
          </div>
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
