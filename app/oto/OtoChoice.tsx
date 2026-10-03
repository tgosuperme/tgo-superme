'use client';

/**
 * The OTO · one offer, not a choice between two.
 *
 * WHERE THIS SITS
 * Landing → registration modal → OTO → (VIP only) checkout → confirmation.
 * By the time anyone reads this page their place is already registered: the
 * Pabbly row and the registration_complete event both went out when the modal
 * was submitted. So this page sells exactly one thing — the VIP pass — and the
 * reader loses nothing by declining it.
 *
 * ── IT WAS A RADIO PAIR, AND THAT WAS THE PROBLEM ─────────────────────────
 * The page used to present two cards, a seat and a VIP seat, as alternatives
 * to pick between. Asked to make the page dedicated to VIP, and it is worth
 * writing down WHY a comparison was the wrong frame here rather than just
 * noting that it changed:
 *
 *   · The comparison had no tension left. Once the seat went free, the two
 *     columns read "free" against "4.99", which is not a decision anyone
 *     deliberates — it is a reason to take the free one and leave.
 *   · A radio pair asks "which of these?". That question has a cheap answer.
 *     One offer with a decline link asks "do you want this?", which is the
 *     question the page is actually for.
 *   · Half the page was spent restating what the reader already agreed to on
 *     the landing page, and none of that space was selling anything.
 *
 * So: no second column, no price next to a price, no "total today" row
 * reconciling two numbers. The page names what VIP adds, shows it, and asks
 * once.
 *
 * ── THE DECLINE LINK STAYS ────────────────────────────────────────────────
 * Quiet, under the button, and it is not optional to keep. The seat is real
 * and already registered, so a reader who does not want the pass still has
 * somewhere to be: /confirmed, with the joining instructions. A page that
 * registered someone for a free challenge and then gave them no way to reach
 * it would be a trap, and would strand the funnel's main conversion one click
 * from the finish line.
 *
 * ── WHAT THIS PAGE MAY NOT CLAIM ──────────────────────────────────────────
 * The four guides and the score report belong to a PLACE, not to VIP — the
 * landing page says so in writing, with values, in its bonuses section. They
 * are absent here on purpose. See the note above VIP_BONUSES in
 * lib/checkout-config.ts.
 */
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  CalendarBlank,
  Crown,
  Lightning,
  Monitor,
  Moon,
  ShieldCheck,
  VideoCamera,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import BrandMark from '@/components/BrandMark';
import PaymentLogos from '@/components/PaymentLogos';
import {
  CHECKOUT_CONFIG,
  PLANS,
  VIP_BONUSES,
  type VipBonus,
} from '@/lib/checkout-config';
import { GA_EVENTS, gaEvent } from '@/lib/ga';
import { readRegistration, type StoredRegistration } from '@/lib/registration-client';

import { legoBrick, legoDelay } from '../_landing/lego-style';
import MobileCtaBar, { MOBILE_CTA_BAR_SPACE } from '../_landing/mobile-cta-bar';
import { C, DATE_RANGE, SESSION_TIMES_TZ, START_DATE } from '../_landing/shared';

const VIP = PLANS.vip;

/* Icons live here rather than in the config, which is imported by server code
   that has no business pulling in a component library. Keyed on VipBonus.key
   so neither side matches on prose. */
const BONUS_ICON: Record<VipBonus['key'], typeof VideoCamera> = {
  recordings: VideoCamera,
  desk: Monitor,
  sleep: Moon,
  priority: Crown,
  credit: ArrowsClockwise,
};

/**
 * One bonus, as a card rather than a bullet.
 *
 * The brief asked for the bonuses highlighted, and a list of ticks is not that
 * — it is the same list the checkout shows in its order summary, where it is
 * meant to be scanned and forgotten. Here each one gets its own bed, its own
 * icon and a line of prose, because this page has nothing else to do.
 *
 * The first card is given the full width on every breakpoint: the recordings
 * are the reason people buy this pass, and a grid that treats them as one of
 * five equal tiles buries the only item most readers need to see.
 */
function BonusCard({ bonus, index }: { bonus: VipBonus; index: number }) {
  const Icon = BONUS_ICON[bonus.key];
  const lead = index === 0;

  return (
    <article
      data-lego=""
      className={`lego-hover-sm relative overflow-hidden rounded-3xl p-5 sm:p-6 ${
        lead ? 'sm:col-span-2' : ''
      }`}
      style={{
        ...legoBrick(index, 70),
        background: C.white,
        border: `1px solid ${lead ? C.gold : C.line}`,
        boxShadow: lead ? '0 18px 44px -32px rgba(0,32,98,0.45)' : 'none',
      }}
    >
      {/* A gold wash behind the lead card only, so the grid has one clear
          entry point instead of five things competing to be read first. */}
      {lead && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${C.goldSoft} 0%, rgba(255,255,255,0) 62%)`,
          }}
        />
      )}

      <div className="relative flex items-start gap-3.5">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
          style={{ background: C.goldSoft }}
        >
          <Icon weight="fill" className="h-5 w-5" style={{ color: C.goldDeep }} />
        </span>

        <div className="min-w-0">
          <h3
            className="font-heading text-[16px] font-bold leading-snug sm:text-[17px]"
            style={{ color: C.ink }}
          >
            {bonus.title}
          </h3>
          <p
            className="mt-1.5 text-[13.5px] leading-relaxed"
            style={{ color: C.inkSoft, textWrap: 'pretty' } as React.CSSProperties}
          >
            {bonus.body}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function OtoChoice() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  /* Typed into the modal a moment ago, so the page can greet them by name. */
  const [reg, setReg] = useState<StoredRegistration | null>(null);
  useEffect(() => setReg(readRegistration()), []);

  /* THE ONLY DESTINATION THAT IS A TILL. The pass is the single thing on this
     page, so there is no plan to resolve and nothing to branch on — the plan
     rides in the query string rather than storage so it survives a refresh,
     a shared link and a back button. */
  const upgrade = () => {
    if (busy) return;
    setBusy(true);

    gaEvent(GA_EVENTS.beginCheckout, {
      value: VIP.priceGbp,
      currency: CHECKOUT_CONFIG.currency,
      items: [{ item_id: VIP.id, item_name: VIP.productName, price: VIP.priceGbp }],
    });

    router.push('/checkout?plan=vip');
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

      <div className="mx-auto max-w-[900px] px-5 py-10 md:px-8 md:py-14">
        {/* ── the ask ────────────────────────────────────────────────
            Centred: this page has no form column to align to, it is one offer
            presented head-on. */}
        <div className="mx-auto max-w-[660px] text-center">
          <span
            data-lego=""
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
            style={{ background: C.goldSoft, color: C.goldDeep }}
          >
            <Crown weight="fill" className="h-3 w-3" />
            One-time upgrade offer
          </span>

          <h1
            data-lego=""
            className="mt-4 font-heading text-[clamp(28px,5.2vw,42px)] font-bold leading-[1.1] tracking-[-0.01em]"
            style={{ ...legoDelay(1, 80), color: C.ink, textWrap: 'balance' } as React.CSSProperties}
          >
            {reg?.firstName ? `${reg.firstName}, make it a ` : 'Make it a '}
            <span style={{ color: C.goldDeep }}>VIP seat</span>.
          </h1>

          <p
            data-lego=""
            className="mx-auto mt-3.5 max-w-[560px] text-[15.5px] leading-relaxed"
            style={{ ...legoDelay(2, 80), color: C.inkSoft, textWrap: 'pretty' } as React.CSSProperties}
          >
            Your place on the challenge is confirmed either way. This is the one
            chance to upgrade it — and it is only offered here, on this page,
            before the cohort starts.
          </p>

          {/* THE REAL REASON TO UPGRADE, said once and early. The five days are
              live: whatever is not recorded is simply gone when they end. That
              is a fact about the format rather than a pressure tactic, and it
              is the single most persuasive true thing this page can say. */}
          <p
            data-lego=""
            className="mx-auto mt-4 inline-flex max-w-[520px] items-start gap-2 rounded-2xl px-4 py-3 text-left text-[13.5px] leading-snug"
            style={{ ...legoDelay(3, 80), background: C.white, border: `1px solid ${C.gold}` }}
          >
            <Lightning
              weight="fill"
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: C.goldDeep }}
            />
            <span style={{ color: C.inkSoft }}>
              The sessions are live and nothing is kept after them.{' '}
              <strong style={{ color: C.ink }}>
                VIP is the only way to still have the five days on Day 6.
              </strong>
            </span>
          </p>
        </div>

        {/* ── the bonuses ────────────────────────────────────────────
            The page's centre of gravity, which is why it gets the heading and
            the grid rather than a column in a comparison table. */}
        <h2
          data-lego=""
          className="mt-12 text-center text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ ...legoDelay(1, 90), color: C.inkMuted }}
        >
          Everything the VIP pass adds
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {VIP_BONUSES.map((bonus, i) => (
            <BonusCard key={bonus.key} bonus={bonus} index={i} />
          ))}
        </div>

        {/* ── the price and the ask ──────────────────────────────────
            ONE figure on the page. There is no "total today" row reconciling a
            choice any more, because there is no choice to reconcile. */}
        <section
          data-lego=""
          className="mx-auto mt-10 max-w-[560px] rounded-3xl p-6 text-center sm:p-8"
          style={{
            ...legoDelay(2, 90),
            background: C.white,
            border: `1px solid ${C.gold}`,
            boxShadow: '0 22px 60px -40px rgba(0,32,98,0.5)',
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: C.inkMuted }}
          >
            {VIP.productName}
          </p>

          <p
            className="mt-2.5 font-heading text-[46px] font-bold leading-none"
            style={{ color: C.goldDeep }}
          >
            {VIP.priceLabel}
          </p>

          <p className="mt-2.5 text-[13px]" style={{ color: C.inkSoft }}>
            One payment, once — and it comes back off the programme if you
            continue after Day 5.
          </p>

          <button
            type="button"
            onClick={upgrade}
            disabled={busy}
            data-oto-cta=""
            className="lego-press lego-pulse-glow group mt-6 inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-full text-[15.5px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
            style={{ background: C.blueFill }}
          >
            {busy ? 'Opening…' : `Upgrade to VIP · ${VIP.priceLabel}`}
            {!busy && (
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            )}
          </button>

          <p
            className="mt-3.5 flex items-start justify-center gap-1.5 text-[12.5px] leading-snug"
            style={{ color: C.inkSoft }}
          >
            <ShieldCheck
              weight="fill"
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: C.mintInk }}
            />
            Come to Day 1. If it&apos;s not for you, message us by the end of
            that day and it&apos;s refunded in full.
          </p>

          <div className="mt-4">
            <PaymentLogos size="compact" />
          </div>
        </section>

        {/* ── the decline ────────────────────────────────────────────
            Deliberately plain: a text link, no card, no price, no second
            button competing with the one above it. It is still a real,
            reachable route to the joining instructions — see the note at the
            top of this file on why it cannot be removed. */}
        <p className="mt-6 text-center">
          <Link
            href={CHECKOUT_CONFIG.confirmedPath}
            className="text-[13.5px] underline decoration-1 underline-offset-4 transition-colors duration-200 hover:opacity-70"
            style={{ color: C.inkMuted }}
          >
            No thanks — continue with my standard seat
          </Link>
        </p>

        <p className="mt-8 text-center text-[12.5px]" style={{ color: C.inkMuted }}>
          <CalendarBlank
            weight="bold"
            className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]"
            style={{ color: C.skyInk }}
          />
          Starts {START_DATE} · {DATE_RANGE} · {SESSION_TIMES_TZ} · Live on Zoom
        </p>
      </div>

      {/* Reserves the docked bar's height in normal flow. The SHORT value now:
          the bar used to carry a segmented plan control above its button, and
          with the choice gone there is one row left to reserve. */}
      <div aria-hidden className="lg:hidden" style={{ height: MOBILE_CTA_BAR_SPACE }} />

      {/* ── docked CTA · mobile and tablet ───────────────────────────
          One button, mirroring the one above. Nothing to keep in sync any more:
          when this bar carried the plan radios it was a second copy of the
          page's state, and a bar that could disagree with the page it is docked
          to was the fiddliest thing on the route. */}
      <MobileCtaBar
        watch="[data-oto-cta]"
        label="VIP pass"
        trailing={VIP.priceLabel}
        note={
          <>
            <ShieldCheck weight="fill" className="h-3 w-3 shrink-0" style={{ color: C.mintInk }} />
            Refunded after Day 1
          </>
        }
      >
        <button
          type="button"
          onClick={upgrade}
          disabled={busy}
          className="lego-press lego-pulse-glow group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
          style={{ background: C.blueFill }}
        >
          {busy ? (
            'Opening…'
          ) : (
            <>
              {/* The price is already in the bar's trailing slot, so the narrow
                  label drops it rather than repeating it into a width that has
                  room for neither. */}
              <span className="min-[400px]:hidden">Upgrade</span>
              <span className="hidden min-[400px]:inline">Upgrade to VIP</span>
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
