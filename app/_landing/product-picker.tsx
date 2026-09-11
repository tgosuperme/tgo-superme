'use client';

/**
 * The two-pass selector on /checkout.
 *
 * ── THE STANDARD PASS IS LOCKED ON ──────────────────────────────────────────
 * This was radio buttons once and that was wrong. With radios, choosing VIP
 * visually DESELECTS the ₹497 row, which reads as "instead of" when the truth
 * is "on top of". The Standard Pass is what everyone buys; VIP is an upgrade.
 *
 * So the base row is a disabled, checked checkbox — it cannot be turned off,
 * and assistive tech announces it as a ticked control that will not change.
 * VIP is a real toggle beside it, and both rows stay lit when it is on.
 *
 * ── ₹999 IS THE TOTAL, NOT ₹497 + ₹999 ──────────────────────────────────────
 * Turning VIP on REPLACES the total, it does not add to it. Three things
 * enforce that and none of them is decoration: the "not on top" line inside
 * the VIP card, the Total row that updates live, and the button label. Someone
 * who believes the upgrade costs ₹999 ON TOP of ₹497 does not buy it, and
 * someone who discovers at the payment page that it does not feels misled.
 *
 * The VIP strike-through is its OWN anchor (₹4,999), never ₹497 — striking the
 * cheaper price beside the dearer one would say the price went up.
 *
 * ── ONE STATE, TWO PLACES IT IS SHOWN ───────────────────────────────────────
 * The cards and the sticky mobile bar are rendered from this one component
 * against one `vipOn`, so they cannot disagree. Ticking either updates both.
 * The in-flow total and button are hidden below `sm` precisely because the
 * sticky bar already carries them there; showing both would stack two
 * identical buttons at the bottom of a phone screen.
 */

import { ArrowRight, CheckCircle, Lock, Sparkle } from '@phosphor-icons/react/dist/ssr';
import { useState } from 'react';

import type { ResolvedOffer } from '@/lib/offer';

import { C } from './shared';

/** The names as they should read on a receipt, not internal keys. */
const BASE_NAME = 'SuperMe 5-Day Pain Reset Challenge';
const VIP_NAME = 'SuperMe 5-Day Pain Reset Challenge + VIP Access';

const BASE_INCLUDES = [
  '5 days of live, coach-led sessions with Atul Mishra',
  'Both daily slots — 7 AM or 7 PM IST, attend either',
  'Day 1 to Day 4 pain assessment and tracking',
  'Real-time, on-camera technique correction',
  'Closed WhatsApp group for daily links and support',
];

const VIP_EXTRAS = [
  'Lifetime replay library — all 5 sessions, both slots',
  '15-minute extended Q&A after each session with Atul',
  'Downloadable pain-relief quick-reference cheat sheets',
  /* Deliberately the LAST of the four. The Standard card already promises
     "Real-time, on-camera technique correction", so this one only adds the
     word "Priority" — read first it looks like a duplicate of a line the
     buyer just saw, and read last it lands as the upgrade to it. */
  'Priority real-time, on-camera technique correction',
];

/* The bar is 96px on a phone: two rows (toggle, then total + button) rather
   than the single row the landing page's bar uses. Exported so the page can
   reserve the space rather than letting the bar cover its own footer. */
/**
 * How much clearance the fixed mobile bar needs at the bottom of the page.
 *
 * Applied by the PAGE as bottom padding on its outermost container, never by
 * this component as an in-flow spacer — a spacer here lands inside the host
 * card and shows up as a hole in the middle of it. Tailwind `pb-28` is this
 * value; keep the two in step.
 */
export const PICKER_BAR_SPACE = 112;

function Tick({ on }: { on: boolean }) {
  return (
    <CheckCircle
      weight="fill"
      className="mt-0.5 h-3.5 w-3.5 shrink-0"
      style={{ color: on ? C.greenInk : C.line }}
    />
  );
}

export default function ProductPicker({ offer }: { offer: ResolvedOffer }) {
  const [vipOn, setVipOn] = useState(false);

  const base = offer.products.find((p) => p.key === 'base')!;
  const vip = offer.products.find((p) => p.key === 'vip')!;
  /* The TOTAL, not a sum. See the note at the top of this file. */
  const total = vipOn ? vip : base;
  const href = `/go?product=${vipOn ? 'vip' : 'base'}`;

  return (
    <div className="mt-6">
      {/* gap-5, not gap-3. The VIP card's ribbon overhangs its top edge by
          11px, so at a 12px gap it nearly touched the card above and the two
          read as one block with a bar between them. 20px gives the ribbon room
          to sit in and lets each card read as its own choice. */}
      <div className="grid gap-5">
        {/* ══ standard · locked on ═══════════════════════════════════════ */}
        <div
          className="rounded-2xl p-4 sm:p-5"
          style={{ background: C.lightBlue, border: `2px solid ${C.blueFill}` }}
        >
          <div className="flex gap-3">
            <input
              type="checkbox"
              checked
              disabled
              readOnly
              aria-label={`${BASE_NAME} — always included`}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#1054C2]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <p className="min-w-0 text-[15px] font-bold leading-snug" style={{ color: C.ink }}>
                  {BASE_NAME}
                </p>
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                  style={{ background: C.white, color: C.blue }}
                >
                  <Lock weight="fill" className="h-2.5 w-2.5" />
                  Included
                </span>
              </div>

              <p className="mt-2 flex items-baseline gap-2">
                <span
                  className="font-heading text-[24px] font-bold leading-none"
                  style={{ color: C.ink }}
                >
                  {base.priceLabel}
                </span>
                <span
                  aria-hidden
                  className="text-[13.5px] font-semibold line-through"
                  style={{ color: C.inkMuted }}
                >
                  {base.anchorLabel}
                </span>
              </p>

              <ul className="mt-2.5 grid gap-1.5">
                {BASE_INCLUDES.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Tick on />
                    <span className="text-[13px] leading-snug" style={{ color: C.inkSoft }}>
                      {line}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Stated on the tier that does not include them. Someone who
                  assumes recordings and finds out on Day 2 is a refund
                  request, not a customer. Dropped once VIP is on, because it
                  stops being true. */}
              {!vipOn && (
                <p className="mt-2.5 text-[12px] font-medium" style={{ color: C.peachInk }}>
                  Live access only — recordings are not included.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ══ vip · the upgrade, and it has to look like one ══════════════
            Given weight the rest of the page does not use: a permanent
            2px blue ring, a coloured cap rule, a ribbon and a lifted shadow.
            The design system keeps colour off large areas, so none of this is
            a filled panel — the card earns its prominence from an edge, a
            badge and elevation rather than from a block of colour. */}
        <label
          className="relative block cursor-pointer rounded-2xl transition-shadow"
          style={{
            background: vipOn ? C.lightBlue : C.white,
            /* The accent "cap" is the card's OWN top border, thickened.
               It used to be an absolutely-positioned bar with its own radius,
               which could not follow the card's rounded corners — a 4px-tall
               strip given a 14px radius rendered as square ends poking past
               the curve. A border needs no radius of its own: it inherits the
               element's, so the corners are correct by construction. */
            border: `2px solid ${C.blueFill}`,
            borderTopWidth: 6,
            boxShadow: vipOn
              ? '0 18px 44px -22px rgba(16,84,194,0.55)'
              : '0 12px 32px -20px rgba(16,84,194,0.35)',
          }}
        >
          {/* The ribbon. Sits ON the border, which is what makes it read as a
              label attached to the card rather than a pill inside it. */}
          <span
            className="absolute -top-[13px] left-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white"
            style={{ background: C.blueFill }}
          >
            <Sparkle weight="fill" className="h-2.5 w-2.5" />
            Most chosen
          </span>

          <div className="flex gap-3 p-4 pt-5 sm:p-5 sm:pt-6">
            <input
              type="checkbox"
              checked={vipOn}
              onChange={(e) => setVipOn(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#1054C2]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <p className="min-w-0 text-[15px] font-bold leading-snug" style={{ color: C.ink }}>
                  {VIP_NAME}
                </p>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                  style={{ background: C.peachBed, color: C.peachInk }}
                >
                  Recordings included
                </span>
              </div>

              <p className="mt-2 flex items-baseline gap-2">
                <span
                  className="font-heading text-[26px] font-bold leading-none"
                  style={{ color: C.blueFill }}
                >
                  {vip.priceLabel}
                </span>
                <span
                  aria-hidden
                  className="text-[13.5px] font-semibold line-through"
                  style={{ color: C.inkMuted }}
                >
                  {vip.anchorLabel}
                </span>
              </p>

              {/* The one line in this component that cannot be cut. */}
              <p
                className="mt-2 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold"
                style={{ background: vipOn ? C.white : C.lightBlue, color: C.blueFill }}
              >
                {vip.priceLabel} total — not on top. Everything above, plus:
              </p>

              <ul className="mt-2.5 grid gap-1.5">
                {VIP_EXTRAS.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Tick on={vipOn} />
                    <span className="text-[13px] leading-snug" style={{ color: C.inkSoft }}>
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </label>
      </div>

      {/* ══ in-flow total + CTA · sm and up ════════════════════════════════
          Hidden on a phone because the sticky bar below carries both there.
          Two identical buttons stacked at the bottom of a phone screen is
          the thing this split avoids. */}
      <div className="hidden sm:block">
        <div
          className="mt-4 flex items-baseline justify-between rounded-2xl px-4 py-3.5"
          style={{ background: C.white, border: `1px solid ${C.lineStrong}` }}
        >
          <span
            className="text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: C.ink }}
          >
            Total due today
          </span>
          <span className="flex items-baseline gap-2.5">
            <span
              aria-hidden
              className="font-heading text-[17px] font-semibold leading-none line-through"
              style={{ color: C.inkMuted }}
            >
              {total.anchorLabel}
            </span>
            <span
              className="font-heading text-[30px] font-bold leading-none"
              style={{ color: C.goldDeep }}
            >
              {total.priceLabel}
            </span>
          </span>
        </div>

        {offer.closed ? (
          <p
            className="mt-4 rounded-2xl px-4 py-4 text-center text-[15px] font-semibold"
            style={{ background: C.lightBlue, color: C.ink }}
          >
            Registrations closed.{' '}
            <a href={offer.ctaHref} className="underline" style={{ color: C.blueFill }}>
              Join the next batch
            </a>
          </p>
        ) : (
          <a
            href={href}
            data-cta="checkout"
            className="lego-press lego-pulse-glow group mt-4 inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-full px-6 text-[16px] font-semibold text-white"
            style={{ background: C.blueFill }}
          >
            Reserve My Spot · {total.priceLabel}
            <ArrowRight
              weight="bold"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </a>
        )}
      </div>

      <p
        className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[12.5px] font-medium"
        style={{ color: C.inkMuted }}
      >
        <Lock weight="fill" className="h-3 w-3" />
        100% Secure · UPI · Cards · NetBanking
      </p>

      {/* The billing name, BEFORE the buyer leaves rather than after. The
          payment page carries TrainerGoesOnline's branding, not SuperMe's, and
          a buyer meeting an unfamiliar company name for the first time on the
          page asking for their card abandons. Said here it is context; said
          nowhere it is a red flag. */}
      <p className="mt-2 text-center text-[11.5px] leading-relaxed" style={{ color: C.inkMuted }}>
        Payments in India are collected by TrainerGoesOnline, SuperMe&rsquo;s authorised
        India delivery partner. That name appears on the payment page and on your
        statement.
      </p>

      {/* ══ sticky bar · phones only ═══════════════════════════════════════
          Carries the VIP toggle as well as the button, because on a phone the
          VIP card scrolls out of view long before the reader reaches a CTA —
          an upgrade they cannot see is an upgrade they do not take. The toggle
          here is the SAME state as the card above, so ticking either moves
          both. */}
      {!offer.closed && (
        <>
          {/* NO FLOW SPACER HERE. It used to be a 112px-tall div at this
              point in the tree, which is INSIDE whatever card the picker is
              placed in — so on a phone it punched a visible hole through the
              middle of the checkout card between the payment note and the
              card's bottom edge.

              A fixed bar covers whatever is LAST on the page, so the clearance
              belongs at the end of the PAGE, not in the middle of a component.
              The consumer applies it as bottom padding on its own container;
              PICKER_BAR_SPACE below is the number to use. */}
          <div
            className="bw-edge-safe fixed inset-x-0 bottom-0 z-50 sm:hidden"
            style={{
              background: C.white,
              borderTop: `1px solid ${C.lineStrong}`,
              boxShadow: '0 -10px 30px -18px rgba(24,59,86,0.4)',
              /* Clears the iOS home indicator, which otherwise sits on top of
                 the button's lower third. */
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <label
              className="flex cursor-pointer items-center gap-2.5 px-4 pb-2 pt-2.5"
              style={{ background: vipOn ? C.lightBlue : C.white }}
            >
              <input
                type="checkbox"
                checked={vipOn}
                onChange={(e) => setVipOn(e.target.checked)}
                className="h-[18px] w-[18px] shrink-0 accent-[#1054C2]"
              />
              <span className="min-w-0 flex-1 text-[13px] font-semibold" style={{ color: C.ink }}>
                Add VIP Access
                <span className="font-normal" style={{ color: C.inkMuted }}>
                  {' '}
                  — recordings &amp; Q&amp;A
                </span>
              </span>
              <span className="shrink-0 text-[13px] font-bold" style={{ color: C.blueFill }}>
                {vip.priceLabel} total
              </span>
            </label>

            <div className="flex items-center gap-3 px-4 pb-3">
              <span className="shrink-0 leading-none">
                <span
                  className="block text-[9.5px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: C.inkMuted }}
                >
                  Total
                </span>
                <span
                  className="mt-1 block font-heading text-[20px] font-bold leading-none"
                  style={{ color: C.goldDeep }}
                >
                  {total.priceLabel}
                </span>
              </span>
              <a
                href={href}
                data-cta="checkout-sticky"
                className="lego-press lego-pulse-glow group inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold text-white"
                style={{ background: C.blueFill }}
              >
                Reserve My Spot
                <ArrowRight weight="bold" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
