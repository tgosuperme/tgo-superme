'use client';

import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  Clock,
  Crown,
  Lightning,
  PlayCircle,
  ShieldCheck,
  Star,
  VideoCamera,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import BrandMark from '@/components/BrandMark';
import { getFbc, readCookie } from '@/components/MetaPixel';
import RegisterModal, { type RegisterIntent } from '@/components/RegisterModal';
import { OFFER_CONFIG } from '@/lib/offer-config';
import { restoreParams } from '@/lib/track';

import { FREE_BONUSES, VIP_BONUSES } from '../_landing/bonus-data';
import { legoBrick, legoDelay } from '../_landing/lego-style';
import { C, SESSION_TIMES, START_DATE } from '../_landing/shared';

/**
 * The OTO's two choices.
 *
 * ── WHAT THIS PAGE IS NOT ───────────────────────────────────────────────────
 * It is not a checkout, not a required step, and not a second chance to
 * register. The free seat is already held. Everything here is written so that
 * choosing "free" reads as a complete, respectable answer rather than a
 * refusal — the free button is a real button with a real label, not a grey
 * "no thanks" link hiding under the paid one.
 *
 * That is a conversion decision as much as an ethical one: a dark-patterned
 * decline turns a registered attendee into someone who feels tricked before
 * Day One, and this funnel's whole promise is that the challenge costs
 * nothing.
 *
 * ── THE MOBILE STICKY CHOOSER ───────────────────────────────────────────────
 * On a phone the two cards stack, so the second one is a screen away and
 * comparing them means scrolling back and forth. The docked bar solves that:
 * one checkbox, always in reach, that flips the single Continue button between
 * the two destinations. It is ALWAYS visible rather than stepping aside for
 * the in-flow buttons the way MobileCtaBar does elsewhere, because here it is
 * the primary control rather than a duplicate of one.
 *
 * Above lg it is hidden entirely: both cards are on screen at once there and
 * each has its own button.
 */

const VIP = OFFER_CONFIG.vip;

/* The free tier, in the OTO doc's order and wording. */
const FREE_POINTS = [
  { icon: VideoCamera, text: `Five live, coach-led sessions with Atul, both timings ${SESSION_TIMES}` },
  { icon: CheckCircle, text: "Real-time form correction, so you can't get it wrong" },
  { icon: ShieldCheck, text: 'Your own Day 1 to Day 4 progress score' },
];

/* What VIP adds. Deliberately phrased as additions — the card's header
   already says everything in the free seat is included. */
const VIP_POINTS = [
  {
    icon: PlayCircle,
    title: 'Full recordings of all 5 sessions',
    body: 'So you never miss a day and can redo any session at your pace. Kept for life.',
  },
  {
    icon: Star,
    title: 'VIP attention in the room',
    body: 'Priority for your form corrections and your questions, plus extra support between sessions.',
  },
];

export default function UpgradeChoice({
  firstName = '',
  cancelled = false,
  hasRegistration = false,
}: {
  firstName?: string;
  cancelled?: boolean;
  /** Server-read, because the registration cookie is httpOnly. */
  hasRegistration?: boolean;
}) {
  const router = useRouter();
  /* Set when someone presses a button WITHOUT having registered. Holds which
     button they pressed, which both opens the dialog and tells it what to do
     when the form succeeds. Null means the dialog is closed. */
  const [needsRegistration, setNeedsRegistration] =
    useState<RegisterIntent | null>(null);
  /* The docked bar's checkbox. Unchecked is the free path, which is the
     honest default: nobody should arrive on this page already opted in to a
     payment they have not read about yet. */
  const [wantsVip, setWantsVip] = useState(false);
  const [busy, setBusy] = useState<'free' | 'vip' | null>(null);
  const [failed, setFailed] = useState('');

  const goFree = () => {
    if (busy) return;
    /* No registration behind this visit, so there is nothing to confirm yet.
       Collect the details first and come back to this same action. */
    if (!hasRegistration) {
      setNeedsRegistration('free');
      return;
    }
    setBusy('free');
    /* A plain navigation. The registration is already recorded and the
       confirmation cookie is already set, so /thank-you needs nothing from
       here beyond being asked for. */
    router.push(OFFER_CONFIG.thankYouPath);
  };

  /**
   * Opens Stripe. NO registration guard — the caller has already established
   * that a registration exists, either because the page was loaded with the
   * cookie or because the dialog just created one.
   *
   * Split out from goVip precisely so the post-registration path can reuse it:
   * calling goVip there would re-run its guard against the `hasRegistration`
   * prop, which is server-rendered and still false, and bounce the reader
   * straight back into the form they just completed.
   */
  const startVipCheckout = async () => {
    setBusy('vip');
    setFailed('');

    /* Meta's browser-only match keys and the attribution set, read HERE
       because this is the last moment they exist. The buyer is about to be
       handed to Stripe, and the webhook that fires `sales` runs on Stripe's
       infrastructure: no cookies, no fbclid, none of this. Sent with the
       request and parked in the Checkout Session's metadata. */
    const attr = restoreParams();

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          /* NO identity is sent. /api/checkout reads the name, email and phone
             from the httpOnly registration cookie, so a crafted request cannot
             attach someone else to a payment. */
          fbp: readCookie('_fbp'),
          fbc: getFbc(),
          eventSourceUrl: window.location.href,
          utm: {
            source: attr.source ?? '',
            medium: attr.medium ?? '',
            campaign: attr.campaign ?? '',
            content: attr.content ?? '',
            term: attr.term ?? '',
          },
          fbclid: attr.fbclid ?? '',
          fbclidTs: attr.ts ?? 0,
          gclid: attr.gclid ?? '',
          referrer: attr.referrer ?? '',
          landingUrl: attr.landing_url ?? '',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setFailed(
          json.error ||
            'We could not open the payment page. Your free place is still held.',
        );
        setBusy(null);
        return;
      }
      window.location.href = json.url;
    } catch {
      setFailed(
        'Could not reach the payment service. Your free place is still held — you can continue without VIP.',
      );
      setBusy(null);
    }
  };

  const goVip = () => {
    if (busy) return;
    /* Same as goFree, and it matters more here: /api/checkout builds the
       Stripe session from the registration cookie, so without one it can only
       return 401. Opening the form is the answer to that, not an error. */
    if (!hasRegistration) {
      setNeedsRegistration('vip');
      return;
    }
    void startVipCheckout();
  };

  /**
   * Runs once the dialog's form has recorded a registration.
   *
   * Carries out the choice they made BEFORE the form appeared, so pressing
   * "Add VIP" on a page with no registration behind it costs one detour
   * through the form and then goes exactly where it was always going.
   *
   * The free branch is a HARD navigation, not router.push: /thank-you reads
   * the registration cookie that was set on the response a moment ago, and a
   * soft transition can render from the client cache before it is in play.
   */
  const afterRegistration = async () => {
    if (needsRegistration === 'vip') {
      await startVipCheckout();
      return;
    }
    window.location.href = OFFER_CONFIG.thankYouPath;
  };

  return (
    <main className="min-h-screen font-body" style={{ background: C.paleBlue, color: C.ink }}>
      {/* ── header ─────────────────────────────────────────────────── */}
      <header style={{ background: C.white, borderBottom: `1px solid ${C.line}` }}>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <BrandMark height={34} priority />
          {/* Reassurance, not navigation. The one thing a reader on this page
              needs to know is that the free seat is already theirs. */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
            style={{ background: C.greenBed, color: C.greenInk }}
          >
            <CheckCircle weight="fill" className="h-3 w-3" />
            Seat confirmed
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8 md:py-14">
        {/* ── masthead ─────────────────────────────────────────────── */}
        <div className="mx-auto max-w-[720px] text-center">
          <span
            data-lego=""
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
            style={{ background: C.lightBlue, color: C.skyInk }}
          >
            <Lightning weight="fill" className="h-3 w-3" />
            One step before you pick your slot
          </span>

          <h1
            data-lego=""
            className="mt-4 font-heading text-[30px] font-bold leading-[1.12] sm:text-[40px]"
            style={{ ...legoDelay(1, 80), color: C.ink }}
          >
            {firstName ? `${firstName}, how would you ` : 'How would you '}
            like to <span style={{ color: C.goldDeep }}>start?</span>
          </h1>

          <p
            data-lego=""
            className="mx-auto mt-4 max-w-[620px] text-[15.5px] leading-relaxed"
            style={{ ...legoDelay(2, 80), color: C.inkSoft }}
          >
            Your free seat in the 5-Day Pain Reset is included either way. The
            only question is whether you also want the recordings, extra guides
            and Atul&rsquo;s closer attention waiting for you the moment you
            register.
          </p>

          {/* Coming back from an abandoned Stripe session otherwise looks
              identical to a dead button — and on this page it also needs to
              say, plainly, that nothing was lost. */}
          {cancelled && (
            <p
              className="mx-auto mt-5 flex max-w-[520px] items-start gap-2.5 rounded-2xl p-3.5 text-left text-[13px] leading-snug"
              style={{ background: C.lightBlue, color: C.ink }}
              role="status"
            >
              <CheckCircle
                weight="fill"
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: C.greenInk }}
              />
              You came back before the payment finished, so nothing was charged.
              Your free seat is still held — carry on below either way.
            </p>
          )}

          {failed && (
            <p
              className="mx-auto mt-5 flex max-w-[520px] items-start gap-2.5 rounded-2xl p-3.5 text-left text-[13px] leading-snug"
              style={{ background: C.coralBed, color: C.coralInk }}
              role="alert"
            >
              <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
              {failed}
            </p>
          )}
        </div>

        {/* ── the two cards ────────────────────────────────────────────
            Free FIRST in the DOM, so it is the first thing reached by keyboard
            and by a screen reader, and the first card on a phone. The VIP card
            is visually emphasised, not positionally privileged. */}
        {/* NO `items-start`. It was there and it was the bug: it stops grid
            items stretching, so each card sized to its own content, the two
            ended at different heights, and `h-full` on the cards resolved
            against an unstretched track. The grid default (stretch) is what
            makes both cards the same height and both buttons line up. */}
        <div className="mx-auto mt-10 grid max-w-[980px] gap-5 lg:grid-cols-2">
          {/* ── LEFT · the free seat ─────────────────────────────── */}
          <section
            data-lego=""
            className="flex h-full flex-col rounded-3xl p-6 sm:p-7"
            style={{
              ...legoDelay(3, 80),
              background: C.white,
              /* 2px, matching the VIP card's border rather than the 1px this
                 had. A 1px difference either side is 2px of inner height, and
                 that is enough to leave the two buttons visibly out of line
                 once everything else is fixed. Same box, different colour. */
              border: `2px solid ${C.line}`,
            }}
          >
            <span
              className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ background: C.greenBed, color: C.greenInk }}
            >
              <CheckCircle weight="fill" className="h-3 w-3" />
              Already yours
            </span>

            <h2
              className="mt-3.5 font-heading text-[20px] font-bold leading-snug"
              style={{ color: C.ink }}
            >
              Free Seat &mdash; 5-Day Pain Reset
            </h2>

            <p className="mt-3 flex items-baseline gap-2">
              <span
                className="font-heading text-[34px] font-bold leading-none"
                style={{ color: C.ink }}
              >
                Free
              </span>
              <span className="text-[13px]" style={{ color: C.inkMuted }}>
                to start
              </span>
            </p>

            <p className="mt-3 text-[14px] leading-relaxed" style={{ color: C.inkSoft }}>
              The full live challenge on its own. You show up for 5 days and
              leave knowing your root cause and exactly what to do about it.
            </p>

            <ul className="mt-5 grid gap-2.5">
              {FREE_POINTS.map(({ icon: Icon, text }, i) => (
                <li key={text} className="flex items-start gap-2.5" style={legoBrick(i, 55)}>
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
              {/* The two free guides, named. Reads from bonus-data's tier flag,
                  so this list cannot promise a guide the VIP card also sells. */}
              <li className="flex items-start gap-2.5" style={legoBrick(3, 55)}>
                <span
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                  style={{ background: 'rgba(159,218,203,0.34)' }}
                >
                  <CheckCircle weight="bold" className="h-2.5 w-2.5" style={{ color: C.mintInk }} />
                </span>
                <span className="text-[13.5px] leading-snug" style={{ color: C.inkSoft }}>
                  Plus {FREE_BONUSES.length} free guides:{' '}
                  {FREE_BONUSES.map((b) => b.title).join(' and ')}
                </span>
              </li>
            </ul>

            {/* ── the button, in a wrapper ─────────────────────────────
                `mt-auto` was ON THE BUTTON, which is why the taller card's
                button ended up jammed against the text above it: auto margin
                distributes LEFTOVER space, and the tallest card has none, so
                the gap collapsed to zero.

                Moving it to a wrapper that also carries `pt-7` fixes both
                halves at once — the padding is a floor the gap can never go
                below, and the auto margin still absorbs whatever is left over
                so the two buttons sit on the same line. */}
            <div className="mt-auto pt-7">
              <button
                type="button"
                onClick={goFree}
                disabled={busy !== null}
                className="lego-press inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold disabled:cursor-progress disabled:opacity-70"
                style={{
                  background: C.white,
                  border: `1.5px solid ${C.blueFill}`,
                  color: C.blueFill,
                }}
              >
                {busy === 'free' ? 'Taking you through…' : 'Continue with the free seat'}
                {busy !== 'free' && <ArrowRight weight="bold" className="h-4 w-4" />}
              </button>
            </div>
          </section>

          {/* ── RIGHT · VIP ──────────────────────────────────────── */}
          <section
            data-lego=""
            className="relative flex h-full flex-col rounded-3xl p-6 sm:p-7"
            style={{
              ...legoDelay(4, 80),
              background: C.white,
              border: `2px solid ${C.blueFill}`,
              boxShadow: '0 26px 60px -34px rgba(16,84,194,0.55)',
            }}
          >
            <span
              className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
              style={{ background: C.blueFill }}
            >
              <Crown weight="fill" className="h-3 w-3" />
              Most chosen
            </span>

            <h2
              className="mt-3.5 font-heading text-[20px] font-bold leading-snug"
              style={{ color: C.ink }}
            >
              Free Seat + VIP Access
            </h2>

            <p className="mt-3 flex items-baseline gap-2">
              {/* One price, stated once. NO struck "was" figure and no savings
                  badge — the same rule the landing page follows. */}
              <span
                className="font-heading text-[34px] font-bold leading-none"
                style={{ color: C.goldDeep }}
              >
                {VIP.priceLabel}
              </span>
              <span className="text-[13px]" style={{ color: C.inkMuted }}>
                all in
              </span>
            </p>

            <p className="mt-3 text-[14px] leading-relaxed" style={{ color: C.inkSoft }}>
              Everything in the free seat, plus the recordings, Atul&rsquo;s
              closer attention and 2 more guides. One payment, yours to keep, no
              subscription.
            </p>

            <p
              className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: C.inkMuted }}
            >
              Everything in the free seat, plus:
            </p>

            <ul className="mt-2.5 grid gap-3">
              {VIP_POINTS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="flex items-start gap-2.5" style={legoBrick(i, 55)}>
                  <span
                    className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                    style={{ background: C.lightBlue }}
                  >
                    <Icon weight="fill" className="h-3.5 w-3.5" style={{ color: C.blueFill }} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block text-[13.5px] font-semibold leading-snug"
                      style={{ color: C.ink }}
                    >
                      {title}
                    </span>
                    <span
                      className="mt-0.5 block text-[13px] leading-snug"
                      style={{ color: C.inkSoft }}
                    >
                      {body}
                    </span>
                  </span>
                </li>
              ))}
              <li className="flex items-start gap-2.5" style={legoBrick(2, 55)}>
                <span
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                  style={{ background: C.lightBlue }}
                >
                  <Lightning weight="fill" className="h-3.5 w-3.5" style={{ color: C.blueFill }} />
                </span>
                <span className="min-w-0">
                  <span
                    className="block text-[13.5px] font-semibold leading-snug"
                    style={{ color: C.ink }}
                  >
                    {VIP_BONUSES.length} more guides
                  </span>
                  <span
                    className="mt-0.5 block text-[13px] leading-snug"
                    style={{ color: C.inkSoft }}
                  >
                    {VIP_BONUSES.map((b) => b.title).join(' and ')}.
                  </span>
                </span>
              </li>
            </ul>

            {/* Same wrapper, same padding, as the free card — that identical
                `pt-7` is what keeps the two buttons on one line. */}
            <div className="mt-auto pt-7">
              <button
                type="button"
                onClick={goVip}
                disabled={busy !== null}
                className="lego-press lego-pulse-glow group inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
                style={{
                  background: C.blueFill,
                  boxShadow: '0 10px 24px -10px rgba(16,84,194,0.55)',
                }}
              >
                {busy === 'vip'
                  ? 'Opening secure checkout…'
                  : `Add VIP Access · ${VIP.priceLabel}`}
                {busy !== 'vip' && (
                  <ArrowRight
                    weight="bold"
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                )}
              </button>
            </div>
          </section>
        </div>

        {/* ── reassurance bar ──────────────────────────────────────── */}
        <div
          data-lego=""
          className="mx-auto mt-5 flex max-w-[980px] items-start gap-3 rounded-2xl px-5 py-4"
          style={{
            ...legoDelay(5, 80),
            background: 'rgba(159,218,203,0.28)',
            color: C.ink,
            border: '1px solid #BFE9E3',
          }}
        >
          <PlayCircle
            weight="fill"
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: C.mintInk }}
          />
          <p className="text-[13.5px] leading-snug">
            <strong>The recordings unlock the moment the challenge starts</strong>
            , not weeks later, so you can rewatch each day the same evening while
            it&rsquo;s fresh.
          </p>
        </div>

        {/* The two diary facts, so the decision is made with the dates in
            view rather than from memory. */}
        <ul className="mx-auto mt-5 grid max-w-[980px] gap-3 sm:grid-cols-2">
          {[
            { icon: CalendarBlank, label: 'Challenge starts', value: START_DATE },
            { icon: Clock, label: 'Live, twice a day', value: SESSION_TIMES },
          ].map(({ icon: Icon, label, value }, i) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
              style={{ ...legoBrick(i, 70), background: C.white, border: `1px solid ${C.line}` }}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                style={{ background: C.lightBlue }}
              >
                <Icon weight="bold" className="h-4 w-4" style={{ color: C.skyInk }} />
              </span>
              <span className="leading-tight">
                <span
                  className="block text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: C.inkMuted }}
                >
                  {label}
                </span>
                <span
                  className="mt-0.5 block font-heading text-[15px] font-bold"
                  style={{ color: C.ink }}
                >
                  {value}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Reserves the docked chooser's height so the last card is never sat
          on. Mobile and tablet only, like the bar itself. */}
      <div aria-hidden className="lg:hidden" style={{ height: 132 }} />

      {/* ── docked chooser · mobile and tablet ───────────────────────── */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: `1px solid ${C.line}`,
          boxShadow: '0 -10px 34px -22px rgba(0,32,98,0.4)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="mx-auto max-w-[560px] px-4 py-3">
          {/* The whole row is the label, so the tap target is the full width
              rather than a 20px box. htmlFor + a real <input type=checkbox>
              rather than a styled div, so it is announced and operated as a
              checkbox by assistive tech and togglable with Space. */}
          <label
            htmlFor="vip-toggle"
            className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors"
            style={{
              background: wantsVip ? C.lightBlue : C.paleBlue,
              border: `1.5px solid ${wantsVip ? C.blueFill : C.line}`,
            }}
          >
            <input
              id="vip-toggle"
              type="checkbox"
              checked={wantsVip}
              onChange={(e) => setWantsVip(e.target.checked)}
              className="h-5 w-5 shrink-0 cursor-pointer accent-[#1054C2]"
            />
            <span className="min-w-0 flex-1 leading-tight">
              <span
                className="block text-[13.5px] font-semibold"
                style={{ color: C.ink }}
              >
                Add VIP Access &middot;{' '}
                <span style={{ color: C.goldDeep }}>{VIP.priceLabel}</span>
              </span>
              <span className="mt-0.5 block text-[11.5px]" style={{ color: C.inkMuted }}>
                Recordings for life, priority attention, {VIP_BONUSES.length} more
                guides
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={wantsVip ? goVip : goFree}
            disabled={busy !== null}
            className="lego-press group mt-2.5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
            style={{ background: C.blueFill }}
          >
            {busy
              ? busy === 'vip'
                ? 'Opening secure checkout…'
                : 'Taking you through…'
              : wantsVip
                ? `Continue with VIP · ${VIP.priceLabel}`
                : 'Continue with the free seat'}
            {!busy && (
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            )}
          </button>
        </div>
      </div>

      {/* ── the registration dialog ──────────────────────────────────────
          Controlled, unlike the landing page's copy: there are no #register
          links on this page to intercept, so the two buttons above open it
          directly and pass which one was pressed. */}
      <RegisterModal
        open={needsRegistration !== null}
        onClose={() => setNeedsRegistration(null)}
        intent={needsRegistration ?? undefined}
        onRegistered={afterRegistration}
      />
    </main>
  );
}
